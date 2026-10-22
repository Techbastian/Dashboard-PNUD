/**
 * Participantes (E4, patrón de FQSD): "¿en qué va cada persona?". Una columna por etapa de la ruta de la
 * config (D-37) — mismas reglas que el embudo del Dashboard — y una ficha lateral con el porqué:
 * datos, formularios, documentos, asistencia, postulaciones y colocación. Privada (PII).
 * D-44: columnas de `participantes.marcas` (p. ej. hoja de vida).
 * D-51..D-53: estado activo/inactivo (deserción interna sobre todas las personas), llamadas e historial en la ficha.
 * D-65: filtro tipo Excel en cada columna (se combinan con «Y»; varias casillas de una columna, con «O»), vistas
 * rápidas de la config, filtros en la dirección de la página (sin la búsqueda: es PII) y descarga en Excel de lo filtrado.
 */
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, ExternalLink, FileCheck2, FileX2, Loader2, X } from 'lucide-react';
import { useCohorte, estadoActual, type Persona, type DatosCohorte, type CambioEstado } from '../lib/datos';
import { etapasConRegla, evaluar, indexar, etapaActual, nombreEtapa, type Resultado } from '../lib/etapas';
import { fecha, diaBogota, diaLargo, hora, humano, norm, num } from '../lib/formato';
import { descargarXlsx, hoja, type Columna } from '../lib/excel';
import { config } from '../lib/config';
import { FormPostulacionExterna, BorrarPostulacion, FormColocacion, TerminarColocacion, NoCuenta } from '../ui/Gestion';
import { BarraDatos, Buscador, Cargando, ErrorDatos, PanelLateral, BloqueFicha, MarcaEtapa, Etiqueta, Vacio } from '../ui/Privado';
import { BotonFiltro, MenuFiltro, type OpcionFiltro, type Rango } from '../ui/FiltroExcel';
import { KPICard } from '../ui/Comunes';
import { BloqueEstado, BloqueLlamadas, BloqueHistorial, motivoLabel } from '../ui/Seguimiento';

/** `r` = etapas de la ruta; `m` = marcas de la config (D-44); `dia` = día de registro en Bogotá (YYYY-MM-DD). */
export type Fila = { p: Persona; r: Resultado[]; actual: number | null; m: Resultado[]; dia: string | null; baja: CambioEstado | null };

export function filasPersonas(d: DatosCohorte): Fila[] {
  const etapas = etapasConRegla();
  const ix = indexar(d);
  const est = estadoActual(d);
  return d.personas.map(p => {
    const r = etapas.map(e => evaluar(e.regla, p, d, ix));
    const m = config.participantes.marcas.map(x => evaluar(x.regla, p, d, ix));
    const e = est.get(p.id);
    return { p, r, actual: etapaActual(r), m, dia: p.registradaEl ? diaBogota(p.registradaEl) : null, baja: e?.estado === 'inactivo' ? e : null };
  });
}

/** Columnas del Excel de personas: las mismas en Participantes y Listados. */
export function columnasPersonas(d: DatosCohorte): Columna<Fila>[] {
  const etapas = etapasConRegla();
  const sn = (v: Resultado) => (v === null ? 'Sin fuente' : v ? 'Sí' : 'No');
  return [
    { titulo: 'Nombre', valor: f => f.p.nombre }, { titulo: 'Tipo doc.', valor: f => f.p.tipoDoc }, { titulo: 'Documento', valor: f => f.p.documento },
    { titulo: 'Correo', valor: f => f.p.correo }, { titulo: 'Celular', valor: f => f.p.celular }, { titulo: 'Ciudad', valor: f => f.p.ciudad },
    { titulo: 'Género', valor: f => f.p.genero }, { titulo: 'Estado postulación', valor: f => humano(f.p.estado) }, { titulo: 'Registro', valor: f => fecha(f.p.registradaEl) },
    ...etapas.map((e, i) => ({ titulo: nombreEtapa(e), valor: (f: Fila) => sn(f.r[i]) })),
    { titulo: 'Etapa actual', valor: f => (f.actual == null ? '' : etapas[f.actual].etapa) },
    { titulo: 'Programa', valor: f => (f.baja ? 'Inactiva' : 'Activa') },
    { titulo: 'Motivo inactivación', valor: f => (f.baja ? motivoLabel(f.baja.motivo) : '') },
    { titulo: 'Inactiva desde', valor: f => (f.baja ? fecha(f.baja.fechaEfectiva) : '') },
    { titulo: 'Llamadas', valor: f => d.llamadas.filter(l => l.personaId === f.p.id).length },
    ...config.participantes.marcas.map((m, i) => ({ titulo: m.titulo, valor: (f: Fila) => sn(f.m[i]) })),
    { titulo: 'Hoja de vida (enlace)', valor: f => f.p.hv },
  ];
}

const slug = (t: string) => norm(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const MARCA: Record<string, string> = { si: '✓ Sí', no: '— No', sf: 'Sin fuente' };
const sn = (v: Resultado) => (v === null ? 'sf' : v ? 'si' : 'no');

/**
 * Columna de la tabla con su filtro (D-65). `key` = nombre en la dirección de la página; `valor` = lo que se filtra;
 * `orden` = cómo se ordena (también ordena las casillas del menú); `nombre` = etapa o marca de la config (vistas
 * rápidas); `res` = resultado ✓/— de las columnas de la ruta y de las marcas.
 */
interface Col {
  key: string; titulo: string; detalle?: string; ayuda?: string; nombre?: string; cifra?: boolean;
  tipo: 'orden' | 'lista' | 'fecha';
  valor: (f: Fila) => string; label: (v: string) => string; orden: (f: Fila) => string | number; textosOrden: [string, string];
  res?: (f: Fila) => Resultado;
}

function construirColumnas(): Col[] {
  const etapas = etapasConRegla();
  const marcas = config.participantes.marcas;
  const usadas = new Set(['orden', 'persona', 'estado', 'programa', 'fecha', 'actual']);
  const clave = (t: string) => { let k = slug(t) || 'col'; while (usadas.has(k)) k = `c-${k}`; usadas.add(k); return k; };
  const AZ: [string, string] = ['A → Z', 'Z → A'];
  const etapaLabel = new Map<string, string>([['ninguna', 'Sin etapa'], ...etapas.map(e => [slug(e.etapa), e.etapa] as [string, string])]);
  const ruta = (titulo: string, res: (f: Fila) => Resultado, extra: Partial<Col>): Col => ({
    key: clave(titulo), titulo, nombre: titulo, tipo: 'lista', res,
    valor: f => sn(res(f)), label: v => MARCA[v] ?? v, orden: f => (res(f) === null ? -1 : res(f) ? 1 : 0), textosOrden: ['— primero', '✓ primero'], ...extra,
  });
  // D-63: las marcas con `despues` también tienen su cifra, justo después de la de su etapa.
  const marca = (j: number) => ruta(marcas[j].titulo, f => f.m[j], { ayuda: marcas[j].ayuda, cifra: Boolean(marcas[j].despues) });
  // D-60: las marcas sin `despues` van antes de las etapas; las demás, justo después de su etapa.
  return [
    { key: 'persona', titulo: 'Persona', tipo: 'orden', valor: () => '', label: v => v, orden: f => norm(f.p.nombre), textosOrden: AZ },
    { key: 'estado', titulo: 'Estado', ayuda: 'Estado de la postulación en la plataforma', tipo: 'lista', valor: f => f.p.estado ?? 'sin_estado', label: humano, orden: f => humano(f.p.estado ?? 'sin_estado'), textosOrden: AZ },
    { key: 'programa', titulo: 'Programa', ayuda: 'Activa o inactiva en el programa (deserción interna)', tipo: 'lista', valor: f => (f.baja ? 'inactiva' : 'activa'), label: v => (v === 'activa' ? 'Activa' : 'Inactiva'), orden: f => (f.baja ? 1 : 0), textosOrden: ['Activas primero', 'Inactivas primero'] },
    { key: 'fecha', titulo: 'Fecha de registro', tipo: 'fecha', valor: f => f.dia ?? '', label: v => fecha(v), orden: f => f.dia ?? '', textosOrden: ['Antigua → reciente', 'Reciente → antigua'] },
    { key: 'actual', titulo: 'Etapa actual', ayuda: 'La etapa más avanzada que tiene hoy', tipo: 'lista', valor: f => (f.actual == null ? 'ninguna' : slug(etapas[f.actual].etapa)), label: v => etapaLabel.get(v) ?? v, orden: f => f.actual ?? -1, textosOrden: ['Inicio → final', 'Final → inicio'] },
    ...marcas.flatMap((m, j) => (m.despues ? [] : [marca(j)])),
    ...etapas.flatMap((e, i) => [
      ruta(e.etapa, f => f.r[i], { detalle: e.detalle, cifra: true }),
      ...marcas.flatMap((m, j) => (m.despues === e.etapa ? [marca(j)] : [])),
    ]),
  ];
}

type Filtro = string[] | Rango;
const COLS: Record<number, string> = { 5: 'xl:grid-cols-5', 6: 'xl:grid-cols-6', 7: 'xl:grid-cols-7', 8: 'xl:grid-cols-4' };
const TH = 'px-3 py-2.5 text-[10px] font-black uppercase tracking-widest';

export default function ParticipantesView() {
  const { datos, error, cargando } = useCohorte();
  const vistas = config.participantes.vistas;
  const [q, setQ] = useState('');
  const [params, setParams] = useSearchParams();
  const [menu, setMenu] = useState<{ key: string; r: DOMRect } | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [bajando, setBajando] = useState(false);
  const [errExcel, setErrExcel] = useState<string | null>(null);
  const cerrarMenu = useCallback(() => setMenu(null), []);
  const etapas = etapasConRegla();
  const cols = useMemo(construirColumnas, []);
  const filas = useMemo(() => (datos ? filasPersonas(datos) : []), [datos]);

  if (error && !datos) return <ErrorDatos error={error} />;
  if (!datos) return <Cargando />;

  // Los filtros viven en la dirección de la página: sobreviven a recargar y se comparten por enlace.
  const filtros = new Map<string, Filtro>();
  for (const c of cols) {
    const v = params.get(c.key);
    if (!v || c.tipo === 'orden') continue;
    if (c.tipo === 'fecha') { const [desde = '', hasta = ''] = v.split('..'); if (desde || hasta) filtros.set(c.key, { desde, hasta }); }
    else filtros.set(c.key, v.split(','));
  }
  const o = params.get('orden');
  const orden = o ? { key: o.replace(/^-/, ''), dir: (o.startsWith('-') ? -1 : 1) as 1 | -1 } : null;
  const cambiar = (fn: (p: URLSearchParams) => void) => setParams(prev => { const n = new URLSearchParams(prev); fn(n); return n; }, { replace: true });
  const ponerFiltro = (key: string, v: Filtro | null) => cambiar(p => {
    if (!v) p.delete(key); else p.set(key, Array.isArray(v) ? v.join(',') : `${v.desde}..${v.hasta}`);
  });

  const pasa = (f: Fila, c: Col, fl: Filtro) => {
    const v = c.valor(f);
    return Array.isArray(fl) ? fl.includes(v) : (!fl.desde || v >= fl.desde) && (!fl.hasta || (v !== '' && v <= fl.hasta));
  };
  const nq = norm(q);
  const coincide = (f: Fila, sin?: string) =>
    (!nq || [f.p.nombre, f.p.documento, f.p.correo, f.p.celular].some(v => norm(v).includes(nq))) &&
    cols.every(c => c.key === sin || !filtros.has(c.key) || pasa(f, c, filtros.get(c.key)!));
  const cmp = (c: Col) => (a: Fila, b: Fila) => { const x = c.orden(a), y = c.orden(b); return x < y ? -1 : x > y ? 1 : 0; };
  const colOrden = orden ? cols.find(c => c.key === orden.key) ?? null : null;
  let visibles = filas.filter(f => coincide(f));
  if (colOrden && orden) visibles = [...visibles].sort((a, b) => cmp(colOrden)(a, b) * orden.dir);

  /** Casillas del menú, como en Excel: cuentan sobre lo que dejan los OTROS filtros. */
  const opcionesDe = (c: Col): OpcionFiltro[] => {
    const n = new Map<string, number>();
    [...filas].sort(cmp(c)).forEach(f => { const v = c.valor(f); n.set(v, (n.get(v) ?? 0) + (coincide(f, c.key) ? 1 : 0)); });
    const sel = filtros.get(c.key);
    return [...n].filter(([v, k]) => k > 0 || (Array.isArray(sel) && sel.includes(v))).map(([v, k]) => ({ valor: v, label: c.label(v), n: k }));
  };

  const textoFiltro = (c: Col, fl: Filtro) => {
    if (!Array.isArray(fl)) return [fl.desde && `desde ${fecha(fl.desde)}`, fl.hasta && `hasta ${fecha(fl.hasta)}`].filter(Boolean).join(' ');
    if (c.res && fl.length === 1) return ({ si: 'con ✓', no: 'sin ✓', sf: 'sin fuente' } as Record<string, string>)[fl[0]] ?? fl[0];
    return fl.length > 3 ? `${fl.length} valores` : fl.map(c.label).join(' o ');
  };
  const nombreCol = (c: Col) => (c.detalle ? `${c.titulo} (${c.detalle})` : c.titulo);
  const aplicados = cols.filter(c => filtros.has(c.key)).map(c => ({ key: c.key, campo: nombreCol(c), texto: textoFiltro(c, filtros.get(c.key)!) }));
  const chips = [...(q.trim() ? [{ key: 'q', campo: 'Búsqueda', texto: `«${q.trim()}»` }] : []), ...aplicados];
  const limpiar = () => { setQ(''); setParams({}, { replace: true }); };

  const claveDe = (nombre: string) => cols.find(c => c.nombre === nombre)!.key;
  const vistaActiva = vistas.findIndex(v => {
    const quiere = new Map<string, string>([...v.con.map(n => [claveDe(n), 'si'] as const), ...v.sin.map(n => [claveDe(n), 'no'] as const)]);
    return quiere.size === filtros.size && [...quiere].every(([k, x]) => { const fl = filtros.get(k); return Array.isArray(fl) && fl.length === 1 && fl[0] === x; });
  });
  const aplicarVista = (i: number) => {
    setQ('');
    cambiar(p => {
      cols.forEach(c => p.delete(c.key));
      vistas[i].con.forEach(n => p.set(claveDe(n), 'si'));
      vistas[i].sin.forEach(n => p.set(claveDe(n), 'no'));
    });
  };

  async function bajar() {
    setBajando(true); setErrExcel(null);
    try {
      const ahora = new Date().toISOString();
      const resumen: [string, string][] = [
        ['Descargado', `${fecha(diaBogota(ahora))} ${hora(ahora)}`],
        ['Personas', `${visibles.length} de ${filas.length}`],
        ...chips.map(a => [a.campo, a.texto] as [string, string]),
      ];
      if (colOrden && orden) resumen.push(['Orden', `${nombreCol(colOrden)}: ${colOrden.textosOrden[orden.dir === 1 ? 0 : 1]}`]);
      if (!chips.length) resumen.push(['Filtros', 'Ninguno: todas las personas']);
      await descargarXlsx(`${slug(config.identidad.nombre)}-participantes-${diaBogota(ahora)}.xlsx`, [
        hoja({ nombre: 'Participantes', filas: visibles, columnas: columnasPersonas(datos!) }),
        hoja({ nombre: 'Filtros', filas: resumen, columnas: [{ titulo: 'Filtro', valor: r => r[0] }, { titulo: 'Valor', valor: r => r[1] }] }),
      ]);
    } catch (e) { setErrExcel(`No se pudo armar el Excel: ${(e as Error).message}`); }
    finally { setBajando(false); }
  }

  const fila = filas.find(f => f.p.id === abierta) ?? null;
  // D-52: deserción en general = inactivas / todas las personas de la cohorte (sin filtros); sigue contando en los acumulados.
  const inactivas = filas.filter(f => f.baja).length;
  const desercion = filas.length ? Math.round((inactivas / filas.length) * 1000) / 10 : 0;
  const cifras = cols.filter(c => c.cifra);
  const colMenu = menu ? cols.find(c => c.key === menu.key) ?? null : null;
  const filtroMenu = colMenu ? filtros.get(colMenu.key) : undefined;

  return (
    <div className={`space-y-6 ${cargando ? 'opacity-80' : ''}`}>
      <BarraDatos />

      <div className={`grid grid-cols-2 md:grid-cols-3 ${COLS[Math.min(cifras.length + 2, 8)] ?? 'xl:grid-cols-5'} gap-4`}>
        <KPICard label="Personas" value={num(visibles.length)} color="text-slate-800" />
        <KPICard label={`Inactivas · ${desercion.toLocaleString('es-CO')} %`} title="Sobre todas las personas de la cohorte, sin filtros" value={num(inactivas)} color="text-red-600" />
        {cifras.map(c => {
          const sinFuente = filas.length > 0 && filas.every(f => c.res!(f) === null);
          return <KPICard key={c.key} label={c.titulo} title={c.ayuda} value={sinFuente ? null : num(visibles.filter(f => c.res!(f) === true).length)} color="text-brand" />;
        })}
      </div>

      <div className="glass-card p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Buscador valor={q} onCambio={setQ} placeholder="Buscar por nombre, documento, correo o celular…" />
          <p className="flex items-baseline gap-1.5 px-1 tnum" aria-live="polite">
            <span className="text-2xl font-black text-brand">{num(visibles.length)}</span>
            <span className="text-xs font-bold text-slate-400">de {num(filas.length)} personas</span>
          </p>
          <button type="button" onClick={bajar} disabled={bajando || visibles.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white text-[11px] font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-40">
            {bajando ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Descargar Excel · {num(visibles.length)}
          </button>
        </div>
        {errExcel && <p className="text-xs font-bold text-red-600">{errExcel}</p>}

        {vistas.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Vistas rápidas</span>
            {vistas.map((v, i) => (
              <button key={v.titulo} type="button" onClick={() => aplicarVista(i)} aria-pressed={vistaActiva === i}
                className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-colors ${
                  vistaActiva === i ? 'border-brand bg-brand/10 text-brand' : 'border-dashed border-slate-300 text-slate-600 hover:border-solid hover:text-brand'}`}>
                {v.titulo}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Filtros aplicados</span>
          {chips.length === 0 && <span className="text-xs font-bold text-slate-400">Ninguno: estás viendo a todas las personas. Usa el ▾ de cada columna.</span>}
          {chips.map((a, i) => (
            <span key={a.key} className="inline-flex items-center gap-2">
              {i > 0 && <span className="text-[10px] font-black text-slate-300 tracking-widest">Y</span>}
              <span className="inline-flex items-center gap-1 bg-brand/10 text-brand rounded-full pl-3 pr-1 py-1 text-xs font-bold">
                {a.campo}: {a.texto}
                <button type="button" aria-label={`Quitar ${a.campo}`} onClick={() => (a.key === 'q' ? setQ('') : ponerFiltro(a.key, null))}
                  className="size-5 inline-flex items-center justify-center rounded-full hover:bg-brand/15"><X size={12} strokeWidth={3} /></button>
              </span>
            </span>
          ))}
          {(chips.length > 0 || orden) && (
            <button type="button" onClick={limpiar} className="ml-auto text-[10px] font-black uppercase tracking-widest text-brand hover:opacity-80">Limpiar todo</button>
          )}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1100px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {cols.map((c, i) => {
                  const activo = filtros.has(c.key);
                  return (
                    <th key={c.key} title={c.ayuda} className={`${TH} ${i === 0 ? 'sticky left-0 z-10 pl-6' : ''} ${activo ? 'bg-brand/10 text-brand' : 'bg-gray-50 text-slate-400'}`}>
                      <div className={`flex items-center gap-2 ${c.res ? 'justify-center' : 'justify-between'}`}>
                        <span className="whitespace-nowrap">{c.titulo}{c.detalle && <span className="normal-case tracking-normal font-bold"> ({c.detalle})</span>}</span>
                        <BotonFiltro activo={activo || orden?.key === c.key} titulo={nombreCol(c)} onAbrir={r => setMenu(m => (m?.key === c.key ? null : { key: c.key, r }))} />
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visibles.map(f => (
                <tr key={f.p.id} onClick={() => setAbierta(f.p.id)} className={`hover:bg-gray-50/60 cursor-pointer ${f.baja ? 'opacity-55' : ''}`}>
                  <td className="px-6 py-3 sticky left-0 bg-white">
                    <p className="text-sm font-bold text-slate-800 whitespace-nowrap">{f.p.nombre}</p>
                    <p className="text-[11px] text-slate-400 whitespace-nowrap">{f.p.documento ?? '—'} · {f.p.correo ?? 'sin correo'}</p>
                  </td>
                  <td className="px-3 py-3"><Etiqueta>{humano(f.p.estado)}</Etiqueta></td>
                  <td className="px-3 py-3" title={f.baja ? `${motivoLabel(f.baja.motivo)} · ${fecha(f.baja.fechaEfectiva)}` : undefined}>
                    {f.baja ? <Etiqueta tono="red">Inactiva</Etiqueta> : <Etiqueta tono="emerald">Activa</Etiqueta>}
                  </td>
                  <td className="px-3 py-3 text-xs font-bold text-slate-600 whitespace-nowrap tnum">{fecha(f.dia)}</td>
                  <td className="px-3 py-3">{f.actual != null ? <Etiqueta tono="brand">{etapas[f.actual].etapa}</Etiqueta> : <span className="text-xs text-slate-300">—</span>}</td>
                  {cols.filter(c => c.res).map(c => <td key={c.key} className="px-3 py-3 text-center"><MarcaEtapa v={c.res!(f)} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visibles.length === 0 && <Vacio texto="Nadie coincide con estos filtros. Quita alguno en «Filtros aplicados»." />}
      </div>

      {menu && colMenu && (
        <MenuFiltro key={menu.key} titulo={nombreCol(colMenu)} anchor={menu.r} tipo={colMenu.tipo} textosOrden={colMenu.textosOrden}
          orden={orden?.key === colMenu.key ? orden.dir : 0}
          opciones={colMenu.tipo === 'lista' ? opcionesDe(colMenu) : undefined}
          seleccion={Array.isArray(filtroMenu) ? filtroMenu : null}
          rango={filtroMenu && !Array.isArray(filtroMenu) ? filtroMenu : null}
          onOrden={dir => cambiar(p => p.set('orden', `${dir === -1 ? '-' : ''}${colMenu.key}`))}
          onLista={v => ponerFiltro(colMenu.key, v)} onRango={r => ponerFiltro(colMenu.key, r)} onCerrar={cerrarMenu} />
      )}

      {fila && <Ficha key={fila.p.id} f={fila} datos={datos} onCerrar={() => setAbierta(null)} />}
    </div>
  );
}

function Ficha({ f, datos, onCerrar }: { f: Fila; datos: DatosCohorte; onCerrar: () => void }) {
  const { p } = f;
  const [registrando, setRegistrando] = useState<'postulacion' | 'colocacion' | null>(null);
  const [inactivarCon, setInactivarCon] = useState<string | null>(null);
  const usado = useCallback(() => setInactivarCon(null), []);
  const etapas = etapasConRegla();
  const asist = datos.asistencias.filter(a => a.personaId === p.id)
    .map(a => ({ a, e: datos.eventos.find(e => e.id === a.eventoId) })).filter(x => x.e)
    .sort((x, y) => x.e!.inicio.localeCompare(y.e!.inicio));
  const posts = datos.postulaciones.filter(x => x.personaId === p.id);
  const cols = datos.colocaciones.filter(x => x.personaId === p.id);
  const docs = datos.formularios.flatMap(fm => fm.preguntas.filter(q => q.tipo === 'file_upload').map(q => ({ fm, q, v: p.respuestas[fm.bloque]?.[q.clave] })));
  const dato = (l: string, v: string | null | undefined) => (
    <div><dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{l}</dt><dd className="text-sm font-bold text-slate-700 break-words">{v || '—'}</dd></div>
  );

  return (
    <PanelLateral abierto onCerrar={onCerrar} titulo={p.nombre}
      subtitulo={<>{p.tipoDoc ?? 'Doc.'} {p.documento ?? '—'} · registrada {fecha(p.registradaEl)}</>}>
      <BloqueFicha titulo="Ruta de la persona">
        <ol className="space-y-2">
          {etapas.map((e, i) => (
            <li key={e.etapa} className="flex items-center gap-3">
              <MarcaEtapa v={f.r[i]} />
              <span className={`text-sm font-bold ${f.r[i] ? 'text-slate-800' : 'text-slate-400'}`}>{nombreEtapa(e)}</span>
              {f.actual === i && <Etiqueta tono="brand">Etapa actual</Etiqueta>}
            </li>
          ))}
        </ol>
        {config.participantes.marcas.length > 0 && (
          <ul className="mt-3 pt-3 border-t border-slate-100 space-y-2">
            {config.participantes.marcas.map((m, i) => (
              <li key={m.titulo} className="flex items-center gap-3">
                <MarcaEtapa v={f.m[i]} />
                <span className={`text-sm font-bold ${f.m[i] ? 'text-slate-800' : 'text-slate-400'}`}>{m.titulo}</span>
              </li>
            ))}
          </ul>
        )}
      </BloqueFicha>

      <BloqueEstado persona={p} datos={datos} etapa={f.actual != null ? etapas[f.actual]?.etapa ?? null : null} inactivarCon={inactivarCon} onInactivarUsado={usado} />
      <BloqueLlamadas persona={p} datos={datos} onNoContinua={nota => setInactivarCon(nota)} />

      <BloqueFicha titulo="Datos de contacto">
        <dl className="grid grid-cols-2 gap-3">
          {dato('Correo', p.correo)}{dato('Celular', p.celular)}{dato('Ciudad', p.ciudad)}{dato('Género', p.genero)}
          {dato('Nacimiento', fecha(p.nacimiento))}{dato('Estado', humano(p.estado))}
          {dato('Matrícula', p.matricula ? `${humano(p.matricula.estado)} · ${fecha(p.matricula.fecha)}` : 'No matriculada')}
          <div><dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hoja de vida</dt><dd className="text-sm font-bold text-slate-700">
            {p.hv ? (/^https?:\/\//.test(p.hv)
              ? <a href={p.hv} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand">Abrir <ExternalLink size={13} /></a>
              : 'Cargada') : 'No cargada'}
          </dd></div>
        </dl>
      </BloqueFicha>

      <BloqueFicha titulo="Formularios">
        <ul className="space-y-1.5">
          {datos.formularios.map(fm => {
            const r = p.respuestas[fm.bloque];
            const n = r ? Object.values(r).filter(v => v != null && String(v).trim() !== '').length : 0;
            return (
              <li key={fm.bloque} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-bold text-slate-700">{humano(fm.nombre)}</span>
                {r ? <Etiqueta tono="emerald">{n} respuestas</Etiqueta> : <Etiqueta>Sin responder</Etiqueta>}
              </li>
            );
          })}
        </ul>
      </BloqueFicha>

      {docs.length > 0 && (
        <BloqueFicha titulo="Documentos">
          <ul className="space-y-1.5">
            {docs.map(({ fm, q, v }) => {
              const ok = v != null && String(v).trim() !== '';
              const url = ok && /^https?:\/\//.test(String(v)) ? String(v) : null;
              return (
                <li key={fm.bloque + q.clave} className="flex items-center gap-2 text-sm">
                  {ok ? <FileCheck2 size={15} className="text-emerald-500 shrink-0" /> : <FileX2 size={15} className="text-slate-300 shrink-0" />}
                  <span className={`flex-1 ${ok ? 'text-slate-700 font-bold' : 'text-slate-400'}`}>{q.etiqueta}</span>
                  {url && <a href={url} target="_blank" rel="noreferrer" className="text-brand" aria-label="Abrir documento"><ExternalLink size={14} /></a>}
                </li>
              );
            })}
          </ul>
          {Object.keys(config.grupos).length > 0 && <p className="text-[10px] font-bold text-slate-400 mt-2">Grupos de la config: {Object.keys(config.grupos).join(', ')}</p>}
        </BloqueFicha>
      )}

      <BloqueFicha titulo={`Eventos (${asist.length})`}>
        {asist.length === 0 ? <p className="text-xs text-slate-400 font-bold">Sin eventos registrados.</p> : (
          <ul className="space-y-1.5">
            {asist.map(({ a, e }) => (
              <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0"><span className="block font-bold text-slate-700 truncate">{e!.nombre}</span><span className="block text-[11px] text-slate-400">{diaLargo(e!.inicio)} · {hora(e!.inicio)}</span></span>
                <Etiqueta tono={a.estado === 'asistio' ? 'emerald' : a.estado === 'no_asistio' ? 'red' : 'amber'}>{humano(a.estado)}</Etiqueta>
              </li>
            ))}
          </ul>
        )}
      </BloqueFicha>

      <BloqueFicha titulo={`Postulaciones a vacantes (${posts.length})`}>
        {posts.length === 0 ? <p className="text-xs text-slate-400 font-bold">Sin postulaciones.</p> : (
          <ul className="space-y-1.5">
            {posts.map(x => (
              <li key={x.id} className="text-sm flex items-start justify-between gap-2">
                <span>
                  <span className="font-bold text-slate-700">{x.vacante}</span>
                  <span className="text-[11px] text-slate-400"> · {x.empresa ?? 'empresa sin dato'} · {fecha(x.fecha)} · {x.origen === 'externa' ? 'externa' : humano(x.estado)}</span>
                  {' '}<NoCuenta motivo={x.excluida} />
                </span>
                <BorrarPostulacion p={x} />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2">
          {registrando === 'postulacion'
            ? <FormPostulacionExterna persona={p} onListo={() => setRegistrando(null)} onCancelar={() => setRegistrando(null)} />
            : <button type="button" onClick={() => setRegistrando('postulacion')} className="text-[11px] font-black uppercase tracking-widest text-brand">+ Postulación externa</button>}
        </div>
      </BloqueFicha>

      <BloqueFicha titulo="Colocación">
        {cols.length === 0 ? <p className="text-xs text-slate-400 font-bold">Sin colocación registrada.</p> : cols.map(c => (
          <div key={c.id} className="text-sm">
            <span className="font-bold text-slate-700">{c.cargo}</span>
            <span className="text-[11px] text-slate-400"> · {c.empresa ?? '—'} · desde {fecha(c.inicio)}{c.activa ? '' : ' · terminada'}</span>
            {' '}<NoCuenta motivo={c.excluida} />
            <div><TerminarColocacion c={c} /></div>
          </div>
        ))}
        <div className="mt-2">
          {registrando === 'colocacion'
            ? <FormColocacion persona={p} onListo={() => setRegistrando(null)} onCancelar={() => setRegistrando(null)} />
            : <button type="button" onClick={() => setRegistrando('colocacion')} className="text-[11px] font-black uppercase tracking-widest text-brand">+ Colocación</button>}
        </div>
      </BloqueFicha>

      <BloqueHistorial persona={p} datos={datos} />
    </PanelLateral>
  );
}
