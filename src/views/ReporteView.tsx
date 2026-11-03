/**
 * Reporte ejecutivo de población en PDF (D-74, v2 D-75): carta vertical, secciones de `config.reporte` que fluyen una
 * tras otra (sin una hoja por tema ni espacios en blanco; `nuevaHoja` fuerza el salto), gráficos con su valor a la
 * vista y poco texto. El encabezado del pie y el número de página van en el margen de la hoja (@page).
 * Se abre desde Informes en una pestaña nueva (`/informes/reporte?desde=&hasta=`) y abre el diálogo de impresión
 * («Guardar como PDF»). Solo equipo: sale de la capa privada. El PDF no muestra datos personales (solo conteos); el
 * Excel «matriz por persona» sí (nombre, documento, contacto) para armar los planes de acción y los grupos.
 * El cálculo está en lib/reporte.ts.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileSpreadsheet, Loader2, Printer } from 'lucide-react';
import { config, type CifraReporte, type GraficoReporte, type PaginaReporte } from '../lib/config';
import { useCohorte, type Persona } from '../lib/datos';
import { evaluar, indexar } from '../lib/etapas';
import {
  calcularCruce, distribucion, edadDe, esMujer, esOtros, grupoDe, lectura, MIN_COLUMNA, necesidadDe, pct, porcentajeDestacado,
  prioridadDe, senalesDe, tablaCalidad, tablaGrupos, tablaNecesidades, universo, valoresDe, type Contexto, type Dist,
} from '../lib/reporte';
import { diaBogota, fecha, fechaHora, num } from '../lib/formato';
import { descargarXlsx, hoja } from '../lib/excel';
import { DonutChart, SinDatos, toChart } from '../ui/Comunes';
import { ApiladaFilas, rampa } from '../ui/Graficos';
import { Aviso } from '../ui/Privado';

const HOMBRES = '#94a3b8';
const ANCHOS = new Set(['apilada', 'ranking', 'cruce', 'necesidades', 'grupos', 'embudo']);
const esAncho = (g: GraficoReporte) => g.ancho ?? ANCHOS.has(g.tipo);

function Tarjeta({ titulo, nota, n, children }: { titulo: string; nota?: string; n?: string; children: ReactNode }) {
  return (
    <div className="tarjeta border border-slate-200/70 rounded-xl p-3.5 flex flex-col gap-2.5 min-w-0 w-full [box-decoration-break:clone]">
      <div className="[break-after:avoid]">
        <h4 className="text-[11.5px] font-black text-slate-800 leading-tight">{titulo}</h4>
        {(nota || n) && <p className="text-[9px] font-bold text-slate-400 mt-0.5 leading-snug">{[nota, n].filter(Boolean).join(' · ')}</p>}
      </div>
      {children}
    </div>
  );
}

type Fila = { label: string; t: number; m: number; h: number; extra?: string };
/** Barras horizontales: total en marca; con género, dos barras finas (mujeres marca, hombres gris) y los tres %. */
function FilasBarras({ filas, porGenero, extra }: { filas: Fila[]; porGenero: boolean; extra?: string }) {
  if (!filas.length) return <SinDatos texto="Sin respuestas en este periodo" />;
  const cols = extra ? 'grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_4.2rem_minmax(0,1.1fr)]' : 'grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_4.2rem]';
  return (
    <div className="space-y-1.5">
      {extra && (
        <div className={`grid ${cols} gap-2.5 text-[8.5px] font-black text-slate-400 uppercase tracking-wider`}>
          <span /><span /><span className="text-right">%</span><span>{extra}</span>
        </div>
      )}
      {filas.map(f => (
        <div key={f.label} className={`grid ${cols} items-center gap-2.5 break-inside-avoid`} title={`${f.label}: ${f.t} %`}>
          <span className="text-[9.5px] font-bold text-slate-600 leading-tight">{f.label}</span>
          {porGenero ? (
            <div className="space-y-[2px]">
              <div className="h-[5px] rounded-sm bg-slate-100 overflow-hidden"><div className="h-full rounded-sm bg-brand" style={{ width: `${f.m}%` }} /></div>
              <div className="h-[5px] rounded-sm bg-slate-100 overflow-hidden"><div className="h-full rounded-sm" style={{ width: `${f.h}%`, background: HOMBRES }} /></div>
            </div>
          ) : (
            <div className="h-2 rounded-sm bg-slate-100 overflow-hidden"><div className="h-full rounded-sm bg-brand" style={{ width: `${f.t}%` }} /></div>
          )}
          <span className="text-right tnum leading-tight">
            <span className="text-[10.5px] font-black text-slate-800">{f.t} %</span>
            {porGenero && <span className="block text-[8px] font-bold text-slate-400">M {f.m} · H {f.h}</span>}
          </span>
          {extra && <span className="text-[9px] font-medium text-slate-500 leading-tight">{f.extra ?? '—'}</span>}
        </div>
      ))}
      {porGenero && (
        <div className="flex gap-3 pt-0.5">
          <span className="flex items-center gap-1.5 text-[8.5px] font-bold text-slate-500"><span className="size-2 rounded-sm bg-brand" />Mujeres</span>
          <span className="flex items-center gap-1.5 text-[8.5px] font-bold text-slate-500"><span className="size-2 rounded-sm" style={{ background: HOMBRES }} />Hombres</span>
          <span className="text-[8.5px] font-bold text-slate-400">· el número grande es el total</span>
        </div>
      )}
    </div>
  );
}

const filasDe = (d: Dist, top?: number): Fila[] => {
  let cats = d.cats;
  if (top && cats.length > top) {
    const resto = cats.slice(top);
    cats = [...cats.slice(0, top), resto.reduce((a, c) => ({ categoria: 'Resto de opciones', n: a.n + c.n, m: a.m + c.m, h: a.h + c.h }), { categoria: 'Resto de opciones', n: 0, m: 0, h: 0 })];
  }
  return cats.map(c => ({ label: c.categoria, t: pct(c.n, d.n), m: pct(c.m, d.m), h: pct(c.h, d.h) }));
};
/** «N personas» y, si la pregunta no la respondieron todas a quienes aplicaba, «de M a quienes aplica». */
const nTexto = (d: { n: number; u?: number }) => `${num(d.n)} personas${d.u != null && d.u > d.n ? ` de ${num(d.u)} a quienes aplica` : ''}`;

function Grafico({ g, ctx, personas, periodo }: { g: GraficoReporte; ctx: Contexto; personas: Persona[]; periodo: Persona[] }) {
  const titulo = (id: string) => ctx.preguntas.get(id)?.titulo ?? id;
  if (g.tipo === 'barras' || g.tipo === 'dona') {
    const d0 = distribucion(ctx, personas, (g.dato ?? g.pregunta)!, g.orden);
    // apartarOtros: «Otros» sale de las barras; los % siguen siendo sobre todas las personas que respondieron.
    const otros = g.apartarOtros ? d0.cats.filter(c => esOtros(c.categoria)) : [];
    const conOtros = otros.length ? personas.filter(p => valoresDe(ctx, p, (g.dato ?? g.pregunta)!)?.some(esOtros)).length : 0;
    const d: Dist = { ...d0, cats: d0.cats.filter(c => !otros.includes(c)) };
    const multiple = g.pregunta && ctx.preguntas.get(g.pregunta)?.tipo === 'multiple';
    const nota = [g.nota, multiple ? 'varias respuestas por persona' : null].filter(Boolean).join(' · ');
    return (
      <Tarjeta titulo={g.titulo} nota={nota || undefined} n={nTexto(d0)}>
        {g.tipo === 'dona'
          ? (d.n ? <DonutChart data={toChart(d.cats.map(c => ({ categoria: c.categoria, n: c.n })))} size={110} /> : <SinDatos texto="Sin respuestas en este periodo" />)
          : <FilasBarras filas={filasDe(d, g.top)} porGenero={g.porGenero !== false && d.m + d.h > 0} />}
        {conOtros > 0 && (
          <p className="text-[9px] font-bold text-amber-700 bg-amber-50 rounded-md px-2 py-1 leading-snug">
            {pct(conOtros, d0.n)} % marcó «Otros» sin especificar ({num(conOtros)} personas): no se muestra en las barras.
          </p>
        )}
      </Tarjeta>
    );
  }
  if (g.tipo === 'necesidades') {
    const filas = tablaNecesidades(ctx, personas);
    const n = Math.max(0, ...filas.map(f => f.n));
    return (
      <Tarjeta titulo={g.titulo} nota={g.nota} n={`hasta ${num(n)} personas por necesidad`}>
        <FilasBarras filas={filas.map(f => ({ label: f.titulo, t: f.t, m: f.m, h: f.h, extra: f.apoyo }))} porGenero={g.porGenero !== false} extra="Apoyo propuesto" />
      </Tarjeta>
    );
  }
  if (g.tipo === 'grupos') {
    const filas = tablaGrupos(ctx, personas);
    const conPrioridad = filas.some(f => f.prioridad != null);
    return (
      <Tarjeta titulo={g.titulo} nota={g.nota} n="una persona puede estar en varios grupos">
        <table className="w-full text-[9.5px] border-collapse">
          <thead>
            <tr className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider text-left">
              <th className="py-1 pr-2">Grupo</th><th className="py-1 px-1 text-right">Personas</th><th className="py-1 px-1 text-right">%</th>
              <th className="py-1 px-1 text-right">Mujeres</th>{conPrioridad && <th className="py-1 px-1 text-right">Prioridad</th>}
              <th className="py-1 pl-2">Servicio y canal</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(f => (
              <tr key={f.id} className="border-t border-slate-100 align-top">
                <td className="py-1.5 pr-2"><span className="font-black text-slate-700">{f.titulo}</span>{f.quienes && <span className="block text-[8.5px] font-medium text-slate-400 leading-tight">{f.quienes}</span>}</td>
                <td className="py-1.5 px-1 text-right font-black text-slate-800 tnum">{num(f.k)}</td>
                <td className="py-1.5 px-1 text-right tnum w-14 whitespace-nowrap">
                  <span className="font-black text-slate-800">{f.t} %</span>
                  <span className="block h-1 mt-1 rounded-sm bg-slate-100 overflow-hidden"><span className="block h-full bg-brand" style={{ width: `${f.t}%` }} /></span>
                </td>
                <td className="py-1.5 px-1 text-right font-bold text-slate-500 tnum">{f.k ? `${f.mujeres} %` : '—'}</td>
                {conPrioridad && <td className="py-1.5 px-1 text-right font-bold text-slate-500 tnum">{f.prioridad ?? '—'}</td>}
                <td className="py-1.5 pl-2 text-[9px] font-medium text-slate-500 leading-tight">{f.servicio ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {conPrioridad && config.reporte?.prioridad && (
          <p className="text-[8.5px] font-bold text-slate-400">Prioridad = {config.reporte.prioridad.label.toLowerCase()} (número de personas del grupo).</p>
        )}
      </Tarjeta>
    );
  }
  if (g.tipo === 'embudo') {
    const ix = indexar(ctx.d);
    const pasos = (g.pasos ?? []).map(s => ({ ...s, k: periodo.filter(p => evaluar(s.regla, p, ctx.d, ix) === true).length }));
    const base = pasos[0]?.k ?? 0;
    return (
      <Tarjeta titulo={g.titulo} nota={g.nota} n={`${num(periodo.length)} personas registradas en el periodo`}>
        <div className="space-y-1.5">
          {pasos.map((s, i) => (
            <div key={s.label} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)_5.5rem] items-center gap-2.5">
              <span className="text-[9.5px] font-bold text-slate-600 leading-tight">{s.label}{s.nota && <span className="block text-[8px] text-slate-400 font-medium">{s.nota}</span>}</span>
              <div className="h-3 rounded-sm bg-slate-100 overflow-hidden"><div className="h-full rounded-sm" style={{ width: `${pct(s.k, base)}%`, background: rampa(pasos.length - 1 - i, pasos.length) }} /></div>
              <span className="text-right tnum leading-tight"><span className="text-[10.5px] font-black text-slate-800">{num(s.k)}</span>
                <span className="text-[8.5px] font-bold text-slate-400"> · {pct(s.k, base)} %</span></span>
            </div>
          ))}
        </div>
      </Tarjeta>
    );
  }
  const dists = (g.preguntas ?? []).map(id => ({ id, d: distribucion(ctx, personas, id) })).filter(x => x.d.n > 0);
  const nMax = Math.max(0, ...dists.map(x => x.d.n));
  const nNota = dists.length ? `hasta ${num(nMax)} personas por pregunta` : undefined;
  if (g.tipo === 'apilada') {
    const categorias = [...new Set(dists.flatMap(x => x.d.cats.map(c => c.categoria)))];
    return (
      <Tarjeta titulo={g.titulo} nota={g.nota} n={nNota}>
        <ApiladaFilas paleta={g.paleta} categorias={categorias}
          filas={dists.map(x => ({ label: titulo(x.id), segmentos: x.d.cats.map(c => ({ categoria: c.categoria, n: c.n })),
            cifra: g.destacar?.length ? porcentajeDestacado(x.d, g.destacar).t : null }))} />
      </Tarjeta>
    );
  }
  if (g.tipo === 'ranking') {
    const filas = dists.map(x => ({ label: titulo(x.id), ...porcentajeDestacado(x.d, g.destacar!) }))
      .sort((a, b) => b.t - a.t).slice(0, g.top ?? 99);
    return <Tarjeta titulo={g.titulo} nota={g.nota} n={nNota}><FilasBarras filas={filas} porGenero={g.porGenero !== false} /></Tarjeta>;
  }
  // cruce: columnas = categorías de `por`; filas = preguntas (% que marca `destacar`) o categorías de `pregunta`.
  const { cols, filas } = calcularCruce(ctx, personas, g);
  return (
    <Tarjeta titulo={g.titulo} nota={g.nota} n={`columnas con ${MIN_COLUMNA} personas o más · debajo de cada columna, cuántas son`}>
      {!filas.length || !cols.length ? <SinDatos texto="Sin respuestas en este periodo" /> : (
        <table className="w-full table-fixed text-[9px] border-separate border-spacing-[2px]">
          <thead>
            <tr>
              <th className="w-[30%]" />
              {cols.map(c => <th key={c.categoria} className="font-black text-slate-500 text-center align-bottom px-1 leading-tight">{c.categoria}<span className="block font-bold text-slate-400">{c.n}</span></th>)}
            </tr>
          </thead>
          <tbody>
            {filas.map(f => (
              <tr key={f.id}>
                <td className="font-bold text-slate-600 pr-2 leading-tight">{f.label}</td>
                {f.celdas.map((v, i) => (
                  <td key={i} className="text-center font-black tnum rounded-sm py-[3px]"
                    style={{ background: v == null ? '#f8fafc' : rampa(Math.round((v / 100) * 9), 10), color: v != null && v >= 55 ? 'white' : '#1e293b' }}
                    title={`${f.label} · ${cols[i].categoria}: ${v ?? '—'} %`}>
                    {v == null ? '—' : `${v}%`}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Tarjeta>
  );
}

function Cifra({ c, ctx, personas, valorRegla }: { c: CifraReporte; ctx: Contexto; personas: Persona[]; valorRegla: (r: string) => number }) {
  let valor: string, sub: string | undefined = c.nota;
  if (c.tipo === 'personas') valor = num(personas.length);
  else if (c.tipo === 'mujeres') { valor = `${pct(personas.filter(esMujer).length, personas.length)} %`; sub ??= `${num(personas.filter(esMujer).length)} mujeres`; }
  else if (c.regla) { const v = valorRegla(c.regla); valor = `${c.negar ? 100 - v : v} %`; }
  else {
    const d = distribucion(ctx, personas, c.pregunta!);
    if (c.moda) {
      const top = [...d.cats].sort((a, b) => b.n - a.n)[0];
      valor = top?.categoria ?? '—'; sub ??= top ? `${pct(top.n, d.n)} % de quienes respondieron` : undefined;
    } else {
      valor = `${porcentajeDestacado(d, c.destacar!).t} %`;
      sub = [sub, `de ${num(d.n)} que respondieron`].filter(Boolean).join(' · ');
    }
  }
  return <CifraCaja label={c.label} valor={valor} sub={sub} />;
}
function CifraCaja({ label, valor, sub }: { label: string; valor: string; sub?: string }) {
  const largo = valor.length > 9;
  return (
    <div className="rounded-xl bg-slate-50 px-3.5 py-2.5 min-w-0 break-inside-avoid">
      <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest leading-tight">{label}</p>
      <p className={`${largo ? 'text-[14px]' : 'text-[24px]'} font-black text-slate-800 tracking-tight tnum leading-tight mt-0.5`}>{valor}</p>
      {sub && <p className="text-[8.5px] font-bold text-slate-400 leading-tight mt-0.5">{sub}</p>}
    </div>
  );
}

/** Recuadro de texto libre (lo recogido en territorio): se escribe en la vista previa; vacío no se imprime. */
function Observaciones({ clave, guia }: { clave: string; guia: string }) {
  const k = `reporte-obs:${clave}`;
  const [texto, setTexto] = useState(() => { try { return localStorage.getItem(k) ?? ''; } catch { return ''; } });
  const cambiar = (t: string) => { setTexto(t); try { localStorage.setItem(k, t); } catch { /* sin almacenamiento */ } };
  return (
    <div className={`rounded-xl border border-dashed border-slate-300 px-4 py-3 break-inside-avoid ${texto.trim() ? '' : 'print:hidden'}`}>
      <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Observaciones del equipo</p>
      <textarea value={texto} onChange={e => cambiar(e.target.value)} placeholder={guia} rows={Math.max(3, texto.split('\n').length + 1)}
        className="no-print w-full resize-y bg-transparent text-[10.5px] font-medium text-slate-700 leading-snug outline-none placeholder:text-slate-400" />
      <p className="hidden print:block whitespace-pre-wrap text-[10.5px] font-medium text-slate-700 leading-snug">{texto}</p>
    </div>
  );
}

function Calidad({ ctx, personas }: { ctx: Contexto; personas: Persona[] }) {
  const todas = tablaCalidad(ctx, personas);
  const filas = todas.slice(0, 15);
  return (
    <Tarjeta titulo="Calidad del dato" nota="Preguntas con menos del 90 % de respuesta entre a quienes aplica, o con 15 % o más de «Otros» sin especificar">
      {!filas.length ? <SinDatos texto="Ninguna pregunta con baja respuesta" /> : (
        <table className="w-full text-[9.5px] border-collapse">
          <thead>
            <tr className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider text-left">
              <th className="py-1 pr-2">Pregunta</th><th className="py-1 px-1 text-right">Aplica a</th><th className="py-1 px-1 text-right">Respondieron</th>
              <th className="py-1 px-1 text-right">% respuesta</th><th className="py-1 pl-1 text-right">«Otros»</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(f => (
              <tr key={f.id} className="border-t border-slate-100">
                <td className="py-1 pr-2 font-bold text-slate-600 leading-tight">{f.titulo}</td>
                <td className="py-1 px-1 text-right tnum text-slate-500">{num(f.aplica)}</td>
                <td className="py-1 px-1 text-right tnum text-slate-500">{num(f.respondieron)}</td>
                <td className={`py-1 px-1 text-right tnum font-black ${f.tasa < 90 ? 'text-amber-700' : 'text-slate-700'}`}>{f.tasa} %</td>
                <td className={`py-1 pl-1 text-right tnum font-black ${(f.otros ?? 0) >= 15 ? 'text-amber-700' : 'text-slate-400'}`}>{f.otros == null ? '—' : `${f.otros} %`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {todas.length > filas.length && <p className="text-[8.5px] font-bold text-slate-400">Las 15 con menor respuesta; {todas.length - filas.length} preguntas más quedan por debajo del umbral.</p>}
    </Tarjeta>
  );
}

/** Gráficos de una sección: los anchos a todo el ancho; los demás, seguidos, en dos columnas que se reparten solas. */
function Graficos({ graficos, render }: { graficos: GraficoReporte[]; render: (g: GraficoReporte) => ReactNode }) {
  const bloques: GraficoReporte[][] = [];
  for (const g of graficos) {
    const ultimo = bloques[bloques.length - 1];
    if (!esAncho(g) && ultimo && !esAncho(ultimo[0])) ultimo.push(g); else bloques.push([g]);
  }
  return (
    <>
      {/* Los anchos (tablas, rankings) pueden partirse entre hojas por filas: así no dejan media hoja en blanco. */}
      {bloques.map((b, i) => esAncho(b[0])
        ? <div key={i}>{render(b[0])}</div>
        : (
          <div key={i} className="dos-columnas">
            {b.map(g => <div key={g.titulo} className="break-inside-avoid mb-2.5">{render(g)}</div>)}
          </div>
        ))}
    </>
  );
}

const cssTexto = (t: string) => JSON.stringify(t.replace(/[\n\r]/g, ' '));

export default function ReporteView() {
  const [params] = useSearchParams();
  const desde = params.get('desde') || null, hasta = params.get('hasta') || null;
  const { datos, error } = useCohorte();
  const rep = config.reporte;
  const [exportando, setExportando] = useState(false);

  const calc = useMemo(() => {
    if (!datos || !rep) return null;
    const u = universo(datos, desde, hasta);
    const preguntas = new Map(config.preguntas.map(p => [p.id, p]));
    const ctx: Contexto = { d: datos, preguntas };
    const ix = indexar(datos);
    const valorRegla = (r: string) => pct(u.personas.filter(p => evaluar(r, p, datos, ix) === true).length, u.personas.length);
    const hallazgos = rep.paginas.flatMap(p => p.graficos).filter(g => g.hallazgo).map(g => lectura(ctx, u.personas, g)).filter(Boolean) as string[];
    return { u, ctx, valorRegla, hallazgos };
  }, [datos, rep, desde, hasta]);

  useEffect(() => {
    document.title = `${rep?.titulo ?? 'Reporte'} · ${config.identidad.nombre}`;
    if (!calc) return;
    const t = window.setTimeout(() => window.print(), 900);
    return () => window.clearTimeout(t);
  }, [calc, rep]);

  if (!rep) return <div className="p-8"><Aviso tono="red">Este proyecto no tiene el bloque «reporte» en su configuración.</Aviso></div>;
  if (error) return <div className="p-8"><Aviso tono="red">No se pudieron cargar los datos: {error}</Aviso></div>;
  if (!calc) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-brand" /></div>;

  const { u, ctx, valorRegla, hallazgos } = calc;
  const periodo = desde || hasta ? `${desde ? fecha(desde) : 'el inicio'} a ${hasta ? fecha(hasta) : 'hoy'}` : 'todo lo registrado';
  const pie = `${config.identidad.nombre} · ${rep.titulo} · registros de ${periodo}`;
  const completos = rep.completosTexto ?? rep.completos.join(' y ');
  const falta = rep.completosTexto ? `les falta ${rep.completosTexto.replace(/ y /, ' o ')}` : `les falta ${rep.completos.join(' o ')}`;

  /** Excel con datos personales: una fila por persona del reporte con su matriz de necesidades, grupos y prioridad. */
  const exportarMatriz = async () => {
    setExportando(true);
    try {
      const unir = (vs: string[] | null) => (vs?.length ? vs.join(', ') : '');
      const tituloVar = (id: string) => ctx.preguntas.get(id)?.titulo ?? { genero: 'Género', edad: 'Rango de edad', municipio: 'Municipio', nivel: 'Nivel educativo' }[id] ?? id;
      const sn = (v: boolean | null) => (v == null ? 'Sin dato' : v ? 'Sí' : 'No');
      type P = Persona;
      const personas = u.personas;
      const columnas = [
        { titulo: 'Nombre', valor: (p: P) => p.nombre },
        { titulo: 'Tipo de documento', valor: (p: P) => p.tipoDoc },
        { titulo: 'Documento', valor: (p: P) => p.documento },
        { titulo: 'Celular', valor: (p: P) => p.celular },
        { titulo: 'Correo', valor: (p: P) => p.correo },
        { titulo: 'Fecha de registro', valor: (p: P) => (p.registradaEl ? diaBogota(p.registradaEl) : '') },
        { titulo: 'Género', valor: (p: P) => p.genero },
        { titulo: 'Edad', valor: (p: P) => edadDe(p.nacimiento) },
        ...(rep.matriz?.columnas ?? []).map(id => ({ titulo: tituloVar(id), valor: (p: P) => unir(valoresDe(ctx, p, id)) })),
        { titulo: 'N.º de necesidades', valor: (p: P) => rep.necesidades.filter(n => necesidadDe(ctx, p, n) === true).length },
        ...rep.necesidades.map(n => ({ titulo: n.titulo, valor: (p: P) => sn(necesidadDe(ctx, p, n)) })),
        { titulo: 'Señales detectadas', valor: (p: P) => rep.necesidades.map(n => ({ n, s: senalesDe(ctx, p, n) })).filter(x => x.s.length).map(x => `${x.n.titulo}: ${x.s.join('; ')}`).join(' | ') },
        { titulo: 'Grupos', valor: (p: P) => rep.grupos.filter(g => grupoDe(ctx, p, g.id) === true).map(g => g.titulo).join(', ') },
        ...rep.grupos.map(g => ({ titulo: g.titulo, valor: (p: P) => sn(grupoDe(ctx, p, g.id)) })),
        ...(rep.prioridad ? [{ titulo: `Prioridad: ${rep.prioridad.label}`, valor: (p: P) => sn(prioridadDe(ctx, p)) }] : []),
      ];
      type Crit = { necesidad: string; senal: string; apoyo: string };
      const criterios: Crit[] = rep.necesidades.flatMap(n => n.senales.map(s => ({
        necesidad: n.titulo, apoyo: n.apoyo ?? '',
        senal: ('todas' in s ? s.todas : [s]).map(t => `${tituloVar(t.pregunta)} → ${t.en.join(' o ')}`).join(' y '),
      })));
      const nec = tablaNecesidades(ctx, personas), grp = tablaGrupos(ctx, personas);
      await descargarXlsx(`matriz-plan-de-accion-${diaBogota(new Date().toISOString())}.xlsx`, [
        hoja({ nombre: 'Matriz por persona', filas: personas, columnas }),
        hoja({ nombre: 'Necesidades', filas: nec, columnas: [
          { titulo: 'Necesidad', valor: f => f.titulo }, { titulo: 'Personas', valor: f => f.k }, { titulo: '% (de quienes tienen dato)', valor: f => f.t },
          { titulo: '% mujeres', valor: f => f.m }, { titulo: '% hombres', valor: f => f.h }, { titulo: 'Con dato', valor: f => f.n }, { titulo: 'Apoyo propuesto', valor: f => f.apoyo },
        ] }),
        hoja({ nombre: 'Grupos', filas: grp, columnas: [
          { titulo: 'Grupo', valor: f => f.titulo }, { titulo: 'Quiénes', valor: f => f.quienes }, { titulo: 'Personas', valor: f => f.k }, { titulo: '%', valor: f => f.t },
          { titulo: '% mujeres del grupo', valor: f => f.mujeres }, { titulo: 'Prioridad (personas)', valor: f => f.prioridad }, { titulo: 'Servicio y canal', valor: f => f.servicio },
        ] }),
        hoja({ nombre: 'Criterios', filas: criterios, columnas: [
          { titulo: 'Necesidad', valor: f => f.necesidad }, { titulo: 'Señal (basta una por necesidad)', valor: f => f.senal }, { titulo: 'Apoyo propuesto', valor: f => f.apoyo },
        ] }),
      ]);
    } finally { setExportando(false); }
  };

  return (
    <div className="reporte min-h-screen bg-slate-100 print:bg-white py-6 print:py-0">
      <style>{`@media print {
          @page { size: letter portrait; margin: 10mm 12mm 12mm;
            @bottom-left { content: ${cssTexto(pie)}; font: 700 7.5px system-ui, sans-serif; color: #94a3b8; text-transform: uppercase; letter-spacing: .08em; }
            @bottom-right { content: counter(page) " / " counter(pages); font: 700 7.5px system-ui, sans-serif; color: #94a3b8; } }
        }
        .reporte, .reporte * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .reporte .dos-columnas { columns: 2; column-gap: 10px; }
        .reporte h2, .reporte .cabeza { break-after: avoid; }
        .reporte tr { break-inside: avoid; }`}</style>
      <div className="no-print mx-auto max-w-[216mm] flex flex-wrap items-center justify-between gap-3 px-1 mb-4">
        <p className="text-[11px] font-bold text-slate-500">Vista previa · en el diálogo elige «Guardar como PDF», tamaño carta, vertical, márgenes predeterminados.</p>
        <div className="flex gap-2">
          {rep.necesidades.length > 0 && (
            <button type="button" onClick={exportarMatriz} disabled={exportando} title="Con datos personales: solo para el equipo"
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-widest disabled:opacity-50">
              {exportando ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} Matriz por persona
            </button>
          )}
          <button type="button" onClick={() => window.print()}
            className="flex items-center gap-2 bg-brand text-white rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-widest">
            <Printer size={14} /> Guardar PDF
          </button>
        </div>
      </div>

      <article className="bg-white mx-auto w-full max-w-[216mm] px-[12mm] py-[10mm] print:p-0 print:max-w-none shadow-sm print:shadow-none flex flex-col gap-5">
        <header className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-6 pb-3 border-b-2 border-brand">
            <div>
              <p className="text-[10px] font-black text-brand uppercase tracking-widest">{config.identidad.nombre}</p>
              <h1 className="text-[26px] font-black text-slate-800 tracking-tight leading-tight">{rep.titulo}</h1>
              <p className="text-[11px] font-bold text-slate-500">Personas registradas de {periodo} · generado el {fechaHora(new Date().toISOString())}</p>
            </div>
            {config.identidad.logoUrl && <img src={config.identidad.logoUrl} alt="" className="h-10 w-auto" />}
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            <CifraCaja label="Registradas en el periodo" valor={num(u.enRango)} sub="Con registro en la plataforma" />
            <CifraCaja label="Personas en el reporte" valor={num(u.personas.length)} sub={`Con ${completos}`} />
            <Cifra c={{ label: 'Mujeres', tipo: 'mujeres' }} ctx={ctx} personas={u.personas} valorRegla={valorRegla} />
            <CifraCaja label="Fuera del reporte" valor={num(u.incompletas)} sub={falta.charAt(0).toUpperCase() + falta.slice(1)} />
          </div>
          <ul className="text-[9.5px] font-medium text-slate-500 grid grid-cols-2 gap-x-6 gap-y-0.5">
            <li>· Solo entran las personas con {completos}. Las respuestas vacías no se cuentan.</li>
            <li>· Cada % es sobre quienes respondieron la pregunta. M = mujeres, H = hombres.</li>
            <li>· «de N a quienes aplica»: preguntas condicionadas o que no todos respondieron.</li>
            <li>· Las cifras cambian con la fecha en que se genera el reporte.</li>
          </ul>
        </header>

        {rep.paginas.map((p: PaginaReporte) => (
          <section key={p.titulo} className="flex flex-col gap-2.5" style={p.nuevaHoja ? { breakBefore: 'page' } : undefined}>
            <div className="cabeza flex items-baseline gap-3 border-b border-slate-200 pb-1">
              <h2 className="text-[16px] font-black text-slate-800 tracking-tight leading-tight">{p.titulo}</h2>
              {p.subtitulo && <p className="text-[10px] font-bold text-slate-400">{p.subtitulo}</p>}
            </div>
            {p.cifras.length > 0 && (
              <div className={`grid gap-2.5 ${p.cifras.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {p.cifras.map(c => <Cifra key={c.label} c={c} ctx={ctx} personas={u.personas} valorRegla={valorRegla} />)}
              </div>
            )}
            {p.hallazgos && hallazgos.length > 0 && (
              <div className="rounded-xl border-l-4 border-brand bg-brand/5 px-4 py-2.5 break-inside-avoid">
                <p className="text-[8.5px] font-black text-brand uppercase tracking-widest mb-1">Hallazgos clave · calculados por el sistema</p>
                <ul className="space-y-0.5">{hallazgos.map(h => <li key={h} className="text-[10px] font-bold text-slate-700 leading-snug">· {h}</li>)}</ul>
              </div>
            )}
            {p.graficos.length > 0 && (
              <Graficos graficos={p.graficos} render={g => <Grafico g={g} ctx={ctx} personas={u.personas} periodo={u.periodo} />} />
            )}
            {p.calidad && <Calidad ctx={ctx} personas={u.personas} />}
            {p.observaciones && <Observaciones clave={`${p.titulo}:${desde ?? ''}:${hasta ?? ''}`} guia={p.observaciones} />}
          </section>
        ))}
      </article>
    </div>
  );
}
