/**
 * Reporte ejecutivo de población en PDF (D-74): carta vertical, una página por tema de `config.reporte`, gráficos
 * con su valor a la vista y poco texto. Se abre desde Informes en una pestaña nueva (`/informes/reporte?desde=&hasta=`)
 * y abre el diálogo de impresión («Guardar como PDF»). Solo equipo: sale de la capa privada, pero no muestra
 * datos personales (solo conteos). El cálculo está en lib/reporte.ts.
 */
import { useEffect, useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Printer } from 'lucide-react';
import { config, type CifraReporte, type GraficoReporte, type PaginaReporte } from '../lib/config';
import { useCohorte, type Persona } from '../lib/datos';
import { evaluar, indexar } from '../lib/etapas';
import { distribucion, esMujer, lectura, pct, porcentajeDestacado, universo, valoresDe, type Contexto, type Dist } from '../lib/reporte';
import { fecha, fechaHora, num } from '../lib/formato';
import { DonutChart, SinDatos, toChart } from '../ui/Comunes';
import { ApiladaFilas, rampa } from '../ui/Graficos';
import { Aviso } from '../ui/Privado';

const HOMBRES = '#94a3b8';
const MIN_COLUMNA = 5;

function Pagina({ children, pie, primera }: { children: ReactNode; pie: string; primera?: boolean }) {
  return (
    <section className="reporte-pagina bg-white mx-auto w-full max-w-[216mm] px-[12mm] py-[11mm] flex flex-col gap-5 shadow-sm print:shadow-none"
      style={primera ? undefined : { breakBefore: 'page' }}>
      <div className="flex-1 flex flex-col gap-5">{children}</div>
      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest border-t border-slate-100 pt-2">{pie}</p>
    </section>
  );
}

function Tarjeta({ titulo, nota, n, children, ancho }: { titulo: string; nota?: string; n?: string; children: ReactNode; ancho?: boolean }) {
  return (
    <div className={`border border-slate-100 rounded-xl p-4 flex flex-col gap-3 min-w-0 break-inside-avoid ${ancho ? 'col-span-2' : ''}`}>
      <div>
        <h4 className="text-[12px] font-black text-slate-800 leading-tight">{titulo}</h4>
        {(nota || n) && <p className="text-[9.5px] font-bold text-slate-400 mt-0.5">{[nota, n].filter(Boolean).join(' · ')}</p>}
      </div>
      {children}
    </div>
  );
}

/** Barras horizontales: total en marca; con género, dos barras finas (mujeres marca, hombres gris) y los tres %. */
function FilasBarras({ filas, porGenero }: { filas: { label: string; t: number; m: number; h: number; n?: number }[]; porGenero: boolean }) {
  if (!filas.length) return <SinDatos texto="Sin respuestas en este periodo" />;
  return (
    <div className="space-y-2">
      {filas.map(f => (
        <div key={f.label} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_4.6rem] items-center gap-2.5" title={`${f.label}: ${f.t} %`}>
          <span className="text-[10px] font-bold text-slate-600 leading-tight">{f.label}</span>
          {porGenero ? (
            <div className="space-y-[2px]">
              <div className="h-[6px] rounded-sm bg-slate-100 overflow-hidden"><div className="h-full rounded-sm bg-brand" style={{ width: `${f.m}%` }} /></div>
              <div className="h-[6px] rounded-sm bg-slate-100 overflow-hidden"><div className="h-full rounded-sm" style={{ width: `${f.h}%`, background: HOMBRES }} /></div>
            </div>
          ) : (
            <div className="h-2 rounded-sm bg-slate-100 overflow-hidden"><div className="h-full rounded-sm bg-brand" style={{ width: `${f.t}%` }} /></div>
          )}
          <span className="text-right tnum leading-tight">
            <span className="text-[11px] font-black text-slate-800">{f.t} %</span>
            {porGenero && <span className="block text-[8.5px] font-bold text-slate-400">M {f.m} · H {f.h}</span>}
          </span>
        </div>
      ))}
      {porGenero && (
        <div className="flex gap-3 pt-0.5">
          <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500"><span className="size-2 rounded-sm bg-brand" />Mujeres</span>
          <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500"><span className="size-2 rounded-sm" style={{ background: HOMBRES }} />Hombres</span>
          <span className="text-[9px] font-bold text-slate-400">· el número grande es el total</span>
        </div>
      )}
    </div>
  );
}

const filasDe = (d: Dist, top?: number) => {
  let cats = d.cats;
  if (top && cats.length > top) {
    const resto = cats.slice(top);
    cats = [...cats.slice(0, top), resto.reduce((a, c) => ({ categoria: 'Otros', n: a.n + c.n, m: a.m + c.m, h: a.h + c.h }), { categoria: 'Otros', n: 0, m: 0, h: 0 })];
  }
  return cats.map(c => ({ label: c.categoria, t: pct(c.n, d.n), m: pct(c.m, d.m), h: pct(c.h, d.h) }));
};
const nTexto = (n: number) => `${num(n)} personas`;

function Grafico({ g, ctx, personas }: { g: GraficoReporte; ctx: Contexto; personas: Persona[] }) {
  const titulo = (id: string) => ctx.preguntas.get(id)?.titulo ?? id;
  if (g.tipo === 'barras' || g.tipo === 'dona') {
    const d = distribucion(ctx, personas, (g.dato ?? g.pregunta)!, g.orden);
    const multiple = g.pregunta && ctx.preguntas.get(g.pregunta)?.tipo === 'multiple';
    const nota = [g.nota, multiple ? 'varias respuestas por persona' : null].filter(Boolean).join(' · ');
    return (
      <Tarjeta titulo={g.titulo} nota={nota || undefined} n={nTexto(d.n)}>
        {g.tipo === 'dona'
          ? (d.n ? <DonutChart data={toChart(d.cats.map(c => ({ categoria: c.categoria, n: c.n })))} size={120} /> : <SinDatos texto="Sin respuestas en este periodo" />)
          : <FilasBarras filas={filasDe(d, g.top)} porGenero={g.porGenero !== false && d.m + d.h > 0} />}
      </Tarjeta>
    );
  }
  const dists = (g.preguntas ?? []).map(id => ({ id, d: distribucion(ctx, personas, id) })).filter(x => x.d.n > 0);
  const nMax = Math.max(0, ...dists.map(x => x.d.n));
  const nNota = dists.length ? `hasta ${nTexto(nMax)} por pregunta` : undefined;
  if (g.tipo === 'apilada') {
    const categorias = [...new Set(dists.flatMap(x => x.d.cats.map(c => c.categoria)))];
    return (
      <Tarjeta titulo={g.titulo} nota={g.nota} n={nNota} ancho>
        <ApiladaFilas paleta={g.paleta} categorias={categorias}
          filas={dists.map(x => ({ label: titulo(x.id), segmentos: x.d.cats.map(c => ({ categoria: c.categoria, n: c.n })),
            cifra: g.destacar?.length ? porcentajeDestacado(x.d, g.destacar).t : null }))} />
      </Tarjeta>
    );
  }
  if (g.tipo === 'ranking') {
    const filas = dists.map(x => ({ label: titulo(x.id), ...porcentajeDestacado(x.d, g.destacar!) }))
      .sort((a, b) => b.t - a.t).slice(0, g.top ?? 99);
    return <Tarjeta titulo={g.titulo} nota={g.nota} n={nNota} ancho><FilasBarras filas={filas} porGenero={g.porGenero !== false} /></Tarjeta>;
  }
  // cruce: filas = preguntas, columnas = categorías de `por`; celda = % que marca `destacar` dentro de esa columna.
  const cols = distribucion(ctx, personas, g.por!, g.orden).cats.filter(c => c.n >= MIN_COLUMNA);
  const grupo = (cat: string) => personas.filter(p => valoresDe(ctx, p, g.por!)?.some(v => v.toLowerCase().trim() === cat.toLowerCase().trim()));
  const porCol = cols.map(c => ({ c, ps: grupo(c.categoria) }));
  const filas = (g.preguntas ?? []).map(id => ({
    id, celdas: porCol.map(({ ps }) => { const d = distribucion(ctx, ps, id); return d.n ? porcentajeDestacado(d, g.destacar!).t : null; }),
  })).filter(f => f.celdas.some(x => x != null))
    .sort((a, b) => Math.max(...b.celdas.map(x => x ?? 0)) - Math.max(...a.celdas.map(x => x ?? 0)));
  return (
    <Tarjeta titulo={g.titulo} nota={g.nota} n={`columnas con ${MIN_COLUMNA} personas o más`} ancho>
      {!filas.length || !cols.length ? <SinDatos texto="Sin respuestas en este periodo" /> : (
        <table className="w-full text-[9.5px] border-separate border-spacing-[2px]">
          <thead>
            <tr>
              <th />
              {cols.map(c => <th key={c.categoria} className="font-black text-slate-500 text-center align-bottom px-1 leading-tight">{c.categoria}<span className="block font-bold text-slate-400">{c.n}</span></th>)}
            </tr>
          </thead>
          <tbody>
            {filas.map(f => (
              <tr key={f.id}>
                <td className="font-bold text-slate-600 pr-2 leading-tight">{titulo(f.id)}</td>
                {f.celdas.map((v, i) => (
                  <td key={i} className="text-center font-black tnum rounded-sm py-1"
                    style={{ background: v == null ? '#f8fafc' : rampa(Math.round((v / 100) * 9), 10), color: v != null && v >= 55 ? 'white' : '#1e293b' }}
                    title={`${titulo(f.id)} · ${cols[i].categoria}: ${v ?? '—'} %`}>
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
      sub ??= `de ${num(d.n)} que respondieron`;
    }
  }
  const largo = valor.length > 9;
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3 min-w-0 break-inside-avoid">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight">{c.label}</p>
      <p className={`${largo ? 'text-[15px]' : 'text-[26px]'} font-black text-slate-800 tracking-tight tnum leading-tight mt-1`}>{valor}</p>
      {sub && <p className="text-[9px] font-bold text-slate-400 leading-tight mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ReporteView() {
  const [params] = useSearchParams();
  const desde = params.get('desde') || null, hasta = params.get('hasta') || null;
  const { datos, error } = useCohorte();
  const rep = config.reporte;

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

  return (
    <div className="reporte min-h-screen bg-slate-100 print:bg-white py-6 print:py-0 space-y-6 print:space-y-0">
      <style>{`@media print { @page { size: letter portrait; margin: 0; } }
        .reporte, .reporte * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`}</style>
      <div className="no-print mx-auto max-w-[216mm] flex items-center justify-between gap-3 px-1">
        <p className="text-[11px] font-bold text-slate-500">Vista previa del PDF · en el diálogo elige «Guardar como PDF», tamaño carta, vertical.</p>
        <button type="button" onClick={() => window.print()}
          className="flex items-center gap-2 bg-brand text-white rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-widest">
          <Printer size={14} /> Guardar PDF
        </button>
      </div>

      <Pagina pie={pie} primera>
        <div className="flex-1 flex flex-col justify-center gap-8">
          {config.identidad.logoUrl && <img src={config.identidad.logoUrl} alt="" className="h-12 w-auto self-start" />}
          <div>
            <p className="text-[11px] font-black text-brand uppercase tracking-widest">{config.identidad.nombre}</p>
            <h1 className="text-[34px] font-black text-slate-800 tracking-tight leading-tight mt-1">{rep.titulo}</h1>
            <p className="text-sm font-bold text-slate-500 mt-2">Personas registradas de {periodo}</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Cifra c={{ label: 'Personas en el reporte', tipo: 'personas', nota: `Con ${rep.completos.join(' y ')}` }} ctx={ctx} personas={u.personas} valorRegla={valorRegla} />
            <Cifra c={{ label: 'Mujeres', tipo: 'mujeres' }} ctx={ctx} personas={u.personas} valorRegla={valorRegla} />
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fuera del reporte</p>
              <p className="text-[26px] font-black text-slate-800 tnum leading-tight mt-1">{num(u.incompletas)}</p>
              <p className="text-[9px] font-bold text-slate-400 leading-tight mt-0.5">de {num(u.enRango)} registradas en el periodo: les falta {rep.completos.join(' o ')}</p>
            </div>
          </div>
          <ul className="text-[10.5px] font-medium text-slate-500 space-y-1.5 max-w-xl">
            <li>· Solo entran las personas que respondieron {rep.completos.join(' y ')}. Las respuestas vacías no se cuentan.</li>
            <li>· Cada % es sobre quienes respondieron la pregunta; cada gráfico dice cuántas personas son. M = mujeres, H = hombres.</li>
            <li>· Generado el {fechaHora(new Date().toISOString())}. Las cifras cambian con la fecha en que se genera.</li>
          </ul>
        </div>
      </Pagina>

      {rep.paginas.map((p: PaginaReporte) => (
        <Pagina key={p.titulo} pie={pie}>
          <div>
            <h2 className="text-[20px] font-black text-slate-800 tracking-tight leading-tight">{p.titulo}</h2>
            {p.subtitulo && <p className="text-[11px] font-bold text-slate-400 mt-0.5">{p.subtitulo}</p>}
          </div>
          {p.cifras.length > 0 && (
            <div className={`grid gap-2.5 ${p.cifras.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {p.cifras.map(c => <Cifra key={c.label} c={c} ctx={ctx} personas={u.personas} valorRegla={valorRegla} />)}
            </div>
          )}
          {p.hallazgos && hallazgos.length > 0 && (
            <div className="rounded-xl border-l-4 border-brand bg-brand/5 px-4 py-3 break-inside-avoid">
              <p className="text-[9px] font-black text-brand uppercase tracking-widest mb-1.5">Hallazgos clave · calculados por el sistema</p>
              <ul className="space-y-1">{hallazgos.map(h => <li key={h} className="text-[10.5px] font-bold text-slate-700 leading-snug">{h}</li>)}</ul>
            </div>
          )}
          {p.graficos.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {p.graficos.map(g => <Grafico key={g.titulo} g={g} ctx={ctx} personas={u.personas} />)}
            </div>
          )}
        </Pagina>
      ))}
    </div>
  );
}
