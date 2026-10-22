/**
 * Filtro de columna tipo Excel (D-65): ordenar, buscar valor y casillas con el conteo de cada valor, o rango de
 * fechas con atajos. No sabe nada del proyecto: recibe las opciones ya contadas y devuelve lo elegido.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownZA, ArrowUpAZ, ChevronDown, Funnel } from 'lucide-react';
import { diaBogota, norm } from '../lib/formato';

export interface OpcionFiltro { valor: string; label: string; n: number }
export interface Rango { desde: string; hasta: string }
export type TipoFiltro = 'orden' | 'lista' | 'fecha';

/** Botón ▾ del encabezado; con filtro aplicado muestra el embudo relleno. */
export function BotonFiltro({ activo, titulo, onAbrir }: { activo: boolean; titulo: string; onAbrir: (r: DOMRect) => void }) {
  return (
    <button type="button" aria-label={`Filtrar ${titulo}`} onClick={e => { e.stopPropagation(); onAbrir(e.currentTarget.getBoundingClientRect()); }}
      className={`size-6 shrink-0 inline-flex items-center justify-center rounded-md border transition-colors ${
        activo ? 'bg-brand border-brand text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'}`}>
      {activo ? <Funnel size={12} strokeWidth={2.6} /> : <ChevronDown size={13} strokeWidth={2.6} />}
    </button>
  );
}

const ANCHO = 288;
const BOTON = 'px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border';

export function MenuFiltro({ titulo, anchor, tipo, textosOrden, orden, opciones = [], seleccion = null, rango = null, onOrden, onLista, onRango, onCerrar }: {
  titulo: string; anchor: DOMRect; tipo: TipoFiltro;
  textosOrden: [string, string]; orden: 1 | -1 | 0;
  opciones?: OpcionFiltro[]; seleccion?: string[] | null; rango?: Rango | null;
  onOrden: (dir: 1 | -1) => void; onLista: (vals: string[] | null) => void; onRango: (r: Rango | null) => void; onCerrar: () => void;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(anchor.bottom + 6);
  const [q, setQ] = useState('');
  const [marcadas, setMarcadas] = useState<Set<string>>(() => new Set(seleccion ?? opciones.map(o => o.valor)));
  const [desde, setDesde] = useState(rango?.desde ?? '');
  const [hasta, setHasta] = useState(rango?.hasta ?? '');
  const visibles = useMemo(() => opciones.filter(o => norm(o.label).includes(norm(q))), [opciones, q]);
  const todas = visibles.length > 0 && visibles.every(o => marcadas.has(o.valor));
  const algunas = visibles.some(o => marcadas.has(o.valor));
  const left = Math.max(16, Math.min(anchor.right - ANCHO, window.innerWidth - ANCHO - 16));

  useLayoutEffect(() => {
    const h = caja.current?.offsetHeight ?? 0;
    setTop(Math.max(16, Math.min(anchor.bottom + 6, window.innerHeight - h - 16)));
  }, [anchor]);

  useLayoutEffect(() => {
    const fuera = (e: Event) => { if (!caja.current?.contains(e.target as Node)) onCerrar(); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('scroll', fuera, true);
    document.addEventListener('keydown', tecla);
    window.addEventListener('resize', onCerrar);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('scroll', fuera, true);
      document.removeEventListener('keydown', tecla);
      window.removeEventListener('resize', onCerrar);
    };
  }, [onCerrar]);

  const alternar = (v: string) => setMarcadas(s => { const n = new Set(s); if (n.has(v)) n.delete(v); else n.add(v); return n; });
  const todo = () => setMarcadas(s => { const n = new Set(s); visibles.forEach(o => (todas ? n.delete(o.valor) : n.add(o.valor))); return n; });
  const atajo = (dias: number | 'mes' | 'anterior') => {
    const hoy = diaBogota(new Date().toISOString());
    const [y, m] = hoy.split('-').map(Number);
    if (dias === 'mes') { setDesde(`${hoy.slice(0, 7)}-01`); setHasta(hoy); return; }
    if (dias === 'anterior') {
      const py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1;
      const fin = new Date(Date.UTC(py, pm, 0)).getUTCDate();
      setDesde(`${py}-${String(pm).padStart(2, '0')}-01`); setHasta(`${py}-${String(pm).padStart(2, '0')}-${fin}`); return;
    }
    const d = new Date(`${hoy}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - dias);
    setDesde(d.toISOString().slice(0, 10)); setHasta(hoy);
  };
  const aceptar = () => {
    if (tipo === 'fecha') onRango(desde || hasta ? { desde, hasta } : null);
    if (tipo === 'lista') onLista(opciones.every(o => marcadas.has(o.valor)) ? null : opciones.filter(o => marcadas.has(o.valor)).map(o => o.valor));
    onCerrar();
  };
  const aplicado = tipo === 'fecha' ? rango != null : seleccion != null;

  return (
    <div ref={caja} role="dialog" aria-label={`Filtro de ${titulo}`} style={{ top, left, width: ANCHO }}
      className="fixed z-50 max-w-[calc(100vw-32px)] bg-white border border-slate-200 rounded-2xl shadow-[0_18px_40px_-10px_rgba(15,23,42,0.35)] overflow-hidden">
      <div className="p-3 border-b border-slate-100 space-y-1.5">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ordenar</p>
        <div className="flex gap-1.5">
          {([1, -1] as const).map((d, i) => (
            <button key={d} type="button" onClick={() => { onOrden(d); onCerrar(); }}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-bold border ${
                orden === d ? 'border-brand bg-brand/10 text-brand' : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-800'}`}>
              {d === 1 ? <ArrowUpAZ size={13} /> : <ArrowDownZA size={13} />}{textosOrden[i]}
            </button>
          ))}
        </div>
      </div>

      {tipo === 'lista' && (
        <>
          <div className="p-3 border-b border-slate-100">
            <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar valor…" aria-label="Buscar valor" autoFocus
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/15" />
          </div>
          <div className="max-h-56 overflow-y-auto p-1.5">
            <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm font-black text-slate-700 cursor-pointer hover:bg-slate-50 border-b border-slate-100">
              <input type="checkbox" checked={todas} ref={el => { if (el) el.indeterminate = !todas && algunas; }} onChange={todo} className="size-4 accent-brand" />
              (Seleccionar todo)
            </label>
            {visibles.map(o => (
              <label key={o.valor} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={marcadas.has(o.valor)} onChange={() => alternar(o.valor)} className="size-4 accent-brand" />
                <span className="flex-1 min-w-0 truncate">{o.label}</span>
                <span className="text-xs text-slate-400 tnum">{o.n}</span>
              </label>
            ))}
            {visibles.length === 0 && <p className="px-2 py-3 text-xs font-bold text-slate-400">Ningún valor coincide.</p>}
          </div>
        </>
      )}

      {tipo === 'fecha' && (
        <div className="p-3 border-b border-slate-100 space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rango</p>
          <div className="grid grid-cols-2 gap-1.5">
            <input type="date" value={desde} max={hasta || undefined} onChange={e => setDesde(e.target.value)} aria-label="Desde"
              className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-slate-600" />
            <input type="date" value={hasta} min={desde || undefined} onChange={e => setHasta(e.target.value)} aria-label="Hasta"
              className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-slate-600" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {([[7, 'Últimos 7 días'], ['mes', 'Este mes'], ['anterior', 'Mes anterior']] as const).map(([k, l]) => (
              <button key={l} type="button" onClick={() => atajo(k)} className="px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 hover:text-slate-800">{l}</button>
            ))}
          </div>
        </div>
      )}

      {tipo !== 'orden' && (
        <div className="flex justify-end gap-1.5 p-3 bg-slate-50">
          <button type="button" disabled={!aplicado} onClick={() => { if (tipo === 'fecha') onRango(null); else onLista(null); onCerrar(); }}
            className={`${BOTON} border-slate-200 bg-white text-slate-500 disabled:opacity-40`}>Quitar filtro</button>
          <button type="button" onClick={onCerrar} className={`${BOTON} border-slate-200 bg-white text-slate-500`}>Cancelar</button>
          <button type="button" onClick={aceptar} disabled={tipo === 'lista' && marcadas.size === 0}
            className={`${BOTON} border-brand bg-brand text-white disabled:opacity-40`}>Aceptar</button>
        </div>
      )}
    </div>
  );
}
