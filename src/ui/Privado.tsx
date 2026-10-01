/**
 * Piezas comunes de las vistas privadas, con el aspecto de FQSD: panel lateral (ficha), buscador, pestañas,
 * chip de etapa y estados de carga. Sin diálogos del navegador: las confirmaciones van en línea.
 */
import { useEffect, type ReactNode } from 'react';
import { Loader2, Search, X, AlertCircle, RefreshCw } from 'lucide-react';
import { useCohorte } from '../lib/datos';
import { fechaHora } from '../lib/formato';

export function Cargando({ texto = 'Cargando datos de la cohorte…' }: { texto?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
      <Loader2 size={30} className="animate-spin text-brand" />
      <p className="text-xs font-bold uppercase tracking-widest">{texto}</p>
    </div>
  );
}

export function ErrorDatos({ error }: { error: string }) {
  return (
    <div className="glass-card p-6 border-l-4 border-red-400">
      <p className="text-sm font-black text-red-600 uppercase tracking-widest mb-1">No se pudieron cargar los datos</p>
      <p className="text-xs text-slate-500">{error}</p>
    </div>
  );
}

/** Barra superior de cada vista privada: de cuándo son los datos + recargar. */
export function BarraDatos({ extra }: { extra?: ReactNode }) {
  const { datos, cargando, recargar } = useCohorte();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-[11px] font-bold text-slate-400">
        {datos ? <>Datos de la base · {fechaHora(datos.cargadoEl)}</> : 'Cargando…'}
      </span>
      <div className="flex items-center gap-4">
        {extra}
        <button type="button" onClick={() => recargar()} disabled={cargando}
          className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-brand hover:opacity-80 disabled:text-slate-300">
          {cargando ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Recargar
        </button>
      </div>
    </div>
  );
}

export function Buscador({ valor, onCambio, placeholder }: { valor: string; onCambio: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative flex-1 min-w-[14rem]">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
      <input value={valor} onChange={e => onCambio(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        className="w-full bg-white border border-slate-100 rounded-2xl py-2.5 pl-11 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-brand/15 text-slate-600" />
    </div>
  );
}

export function Pestanas<T extends string>({ opciones, activa, onCambio }: { opciones: { key: T; label: string; n?: number }[]; activa: T; onCambio: (k: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opciones.map(o => (
        <button key={o.key} type="button" onClick={() => onCambio(o.key)} aria-pressed={activa === o.key}
          className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${
            activa === o.key ? 'bg-brand text-white' : 'bg-white border border-slate-100 text-slate-400 hover:text-slate-600'}`}>
          {o.label}{o.n != null && <span className={activa === o.key ? 'text-white/70' : 'text-slate-300'}> {o.n}</span>}
        </button>
      ))}
    </div>
  );
}

/** Marca de etapa: ✓ alcanzada, — no, «Sin fuente» si la etapa no tiene de dónde salir. */
export function MarcaEtapa({ v }: { v: boolean | null }) {
  if (v === null) return <span className="text-[9px] font-bold text-slate-300 uppercase">Sin fuente</span>;
  return v
    ? <span className="inline-flex size-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-black" aria-label="Sí">✓</span>
    : <span className="inline-flex size-5 items-center justify-center rounded-full bg-slate-50 text-slate-300 text-[11px] font-black" aria-label="No">—</span>;
}

export function Etiqueta({ children, tono = 'slate' }: { children: ReactNode; tono?: 'slate' | 'brand' | 'emerald' | 'amber' | 'red' }) {
  const c = { slate: 'bg-slate-100 text-slate-500', brand: 'bg-brand/10 text-brand', emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600' }[tono];
  return <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap ${c}`}>{children}</span>;
}

/** Ficha lateral (FQSD `ParticipantePanel`). Escape o clic afuera la cierran. */
export function PanelLateral({ abierto, onCerrar, titulo, subtitulo, children }: { abierto: boolean; onCerrar: () => void; titulo: ReactNode; subtitulo?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!abierto) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [abierto, onCerrar]);
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/20" onClick={onCerrar} aria-hidden />
      <aside className="relative w-full max-w-xl h-full bg-white shadow-2xl overflow-y-auto" role="dialog" aria-modal="true">
        <div className="sticky top-0 bg-white/90 backdrop-blur border-b border-slate-100 px-6 py-5 flex items-start justify-between gap-4 z-10">
          <div className="min-w-0">
            <h3 className="text-lg font-black text-slate-800 leading-tight">{titulo}</h3>
            {subtitulo && <div className="text-[11px] font-bold text-slate-400 mt-1">{subtitulo}</div>}
          </div>
          <button type="button" onClick={onCerrar} className="p-1.5 text-slate-400 hover:text-slate-700" aria-label="Cerrar"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-6">{children}</div>
      </aside>
    </div>
  );
}

export function BloqueFicha({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{titulo}</p>
      {children}
    </section>
  );
}

export function Aviso({ children, tono = 'amber' }: { children: ReactNode; tono?: 'amber' | 'red' | 'emerald' }) {
  const c = { amber: 'border-amber-400 text-slate-600', red: 'border-red-400 text-red-700', emerald: 'border-emerald-400 text-slate-600' }[tono];
  return <div className={`glass-card px-5 py-3 border-l-4 text-xs font-bold flex items-start gap-2 ${c}`}><AlertCircle size={14} className="shrink-0 mt-0.5" />{children}</div>;
}

export function Vacio({ texto }: { texto: string }) {
  return <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center py-10">{texto}</p>;
}
