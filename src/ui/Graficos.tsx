/**
 * Componentes del Dashboard por pestañas (D-43, blueprint PNUD v3), con el aspecto de FQSD (Comunes.tsx).
 * Guía dataviz: una serie = un color (marca); escalas ordinales = rampa de un solo tono; mujeres vs hombres =
 * marca vs gris; valores siempre visibles; estados vacíos explícitos.
 */
import type { ReactNode } from 'react';
import { AlertTriangle, Filter } from 'lucide-react';
import { num } from '../lib/formato';
import { cuantas, nombreGenero, partes, type Desglose } from '../lib/genero';
import { SinDatos } from './Comunes';

const HOMBRES = '#94a3b8';
const NO = '#f87171';
const NEUTRO = '#e2e8f0';
/** D-80: tercera categoría de género (No binario, Prefiere no decir, Otro, Sin dato): gris más claro que Hombres. */
const OTRAS = '#cbd5e1';
const colorGenero = (c: string) => (c === 'Mujer' ? 'var(--color-brand)' : c === 'Hombre' ? HOMBRES : OTRAS);

/**
 * D-80: «● Mujeres 37 · ● Hombres 4 · ● No binario 1» (las otras categorías solo si son > 0).
 * `claro` = sobre fondo oscuro (bloques del embudo).
 */
export function LineaGenero({ d, claro, compacta }: { d: Desglose; claro?: boolean; compacta?: boolean }) {
  const ps = partes(d);
  return (
    <p className={`flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] font-bold leading-snug tnum ${claro ? 'text-white/90' : 'text-slate-500'}`}
      aria-label={ps.map(p => `${nombreGenero(p.categoria)} ${p.n}`).join(', ')}>
      {ps.map(p => (
        <span key={p.categoria} className="inline-flex items-center gap-1 whitespace-nowrap">
          <span className={`size-2 rounded-full ${claro ? 'ring-1 ring-white/70' : ''}`} style={{ background: colorGenero(p.categoria) }} aria-hidden />
          {compacta && (p.categoria === 'Mujer' || p.categoria === 'Hombre') ? p.categoria[0] : nombreGenero(p.categoria)} <b className={claro ? 'text-white' : 'text-slate-700'}>{num(p.n)}</b>
        </span>
      ))}
    </p>
  );
}

export interface PasoGenero { label: string; d: Desglose | null; base?: Desglose | null; ayuda?: string }
/**
 * D-80: un renglón por conteo con dos barras finas (mujeres = marca, hombres = gris) en la misma escala y el número
 * visible; con `base`, el % de las mujeres y de los hombres de la base que llega a ese conteo. Las demás
 * categorías (No binario…) se nombran debajo, con su número.
 */
export function BarrasGenero({ pasos }: { pasos: PasoGenero[] }) {
  const con = pasos.filter(p => p.d);
  if (con.length === 0) return <SinDatos texto="La base aún no trae la desagregación por género (función v16)" />;
  const max = Math.max(1, ...con.flatMap(p => [cuantas(p.d, 'Mujer'), cuantas(p.d, 'Hombre')]));
  const pct = (n: number, de: number) => (de > 0 ? `${Math.round((n / de) * 100)} %` : '—');
  const hayOtras = con.some(p => partes(p.d!).length > 2);
  return (
    <div className="space-y-4">
      {con.map(p => {
        const m = cuantas(p.d, 'Mujer'), h = cuantas(p.d, 'Hombre');
        const otras = partes(p.d!).slice(2);
        return (
          <div key={p.label} className="space-y-1.5" title={p.ayuda}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[12px] font-bold text-slate-700 leading-tight">{p.label}</span>
              <span className="text-[11px] font-black text-slate-800 tnum whitespace-nowrap">
                {num(m)} <span className="text-slate-400 font-bold">·</span> <span className="text-slate-500">{num(h)}</span>
              </span>
            </div>
            <div className="space-y-1">
              <div className="h-2 rounded-sm bg-slate-100 overflow-hidden"><div className="h-full rounded-sm bg-brand" style={{ width: `${(m / max) * 100}%` }} /></div>
              <div className="h-2 rounded-sm bg-slate-100 overflow-hidden"><div className="h-full rounded-sm" style={{ width: `${(h / max) * 100}%`, background: HOMBRES }} /></div>
            </div>
            {(p.base || otras.length > 0) && (
              <p className="text-[10px] font-bold text-slate-400 tnum">
                {p.base && <>{pct(m, cuantas(p.base, 'Mujer'))} de las mujeres · {pct(h, cuantas(p.base, 'Hombre'))} de los hombres</>}
                {p.base && otras.length > 0 && ' · '}
                {otras.map(o => `${o.categoria}: ${num(o.n)}`).join(' · ')}
              </p>
            )}
          </div>
        );
      })}
      <div className="flex flex-wrap gap-3 pt-1">
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><span className="size-2 rounded-sm bg-brand" />Mujeres</span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><span className="size-2 rounded-sm" style={{ background: HOMBRES }} />Hombres</span>
        {hayOtras && <span className="text-[10px] font-bold text-slate-400">Las demás identidades se nombran debajo de cada barra</span>}
      </div>
    </div>
  );
}

/** Rampa ordinal de un tono (de claro a oscuro) sobre el color de marca. */
export function rampa(i: number, total: number): string {
  if (total <= 1) return 'var(--color-brand)';
  const p = Math.round(18 + (82 * i) / (total - 1));
  return `color-mix(in srgb, var(--color-brand) ${p}%, white)`;
}
/** Sí / No / otras (prefiere no responder, no sabe): marca, rojo suave, gris. */
export function colorSiNo(categoria: string): string {
  const c = categoria.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  if (c === 'si') return 'var(--color-brand)';
  if (c === 'no') return NO;
  return NEUTRO;
}

function Barra({ v, max, color = 'bg-brand', label }: { v: number; max: number; color?: string; label?: string }) {
  const w = max > 0 ? Math.min(100, (v / max) * 100) : 0;
  return (
    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden" role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={max}>
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${w}%` }} />
    </div>
  );
}

/**
 * Cifra de pestaña: número grande, «de N» con barra si hay meta, nota debajo. `alerta` = tarjeta ámbar.
 * D-76: con `onFiltrar` la tarjeta es un botón que filtra los gráficos de la pestaña a esa población (`activo` = filtro puesto).
 */
export function CifraCard({ label, valor, de, deTexto, barra, nota, alerta, onFiltrar, activo, genero }: {
  label: string; valor: number | null; de?: number | null; deTexto?: string; barra?: boolean; nota?: ReactNode; alerta?: boolean;
  onFiltrar?: () => void; activo?: boolean; /** D-80: Mujeres · Hombres · otras, debajo del número. */ genero?: Desglose | null;
}) {
  const fondo = alerta ? 'bg-amber-50/60 border-amber-200'
    : activo ? 'bg-brand/5 border-brand ring-2 ring-brand/30' : 'bg-white border-slate-100 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)]';
  const boton = onFiltrar ? 'w-full text-left cursor-pointer transition-colors hover:border-brand/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand' : '';
  const clase = `p-6 rounded-[2rem] border flex flex-col gap-2 min-w-0 ${fondo} ${boton}`;
  const contenido = (
    <>
      <span className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest ${alerta ? 'text-amber-700' : 'text-slate-400'}`}>
        {alerta && <AlertTriangle size={13} aria-hidden />}{label}
      </span>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={`text-[2rem] leading-tight font-black tracking-tighter tnum ${valor == null ? 'text-slate-300' : alerta ? 'text-amber-700' : 'text-slate-800'}`}>
          {valor == null ? '—' : num(valor)}
        </span>
        {de != null && <span className="text-sm font-bold text-slate-400">de {num(de)}{deTexto ? ` ${deTexto}` : ''}</span>}
      </div>
      {barra && de != null && valor != null && <Barra v={valor} max={de} label={label} />}
      {genero && valor != null && <LineaGenero d={genero} />}
      {(nota || valor == null) && <p className={`text-[11px] font-bold leading-snug ${alerta ? 'text-amber-700/80' : 'text-slate-400'}`}>{valor == null ? 'Sin fuente aún' : nota}</p>}
      {onFiltrar && (
        <span className={`mt-1 inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider no-print ${
          activo ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'}`}>
          <Filter size={11} aria-hidden />{activo ? 'Filtro activo · clic para quitar' : 'Ver solo esta población'}
        </span>
      )}
    </>
  );
  return onFiltrar ? (
    <button type="button" onClick={onFiltrar} aria-pressed={Boolean(activo)} className={clase}
      title={activo ? 'Volver a ver todas las personas' : 'Ver la caracterización solo de esta población'}>{contenido}</button>
  ) : <div className={clase}>{contenido}</div>;
}

type Estado = 'sin-fuente' | 'sin-iniciar' | 'en-curso' | 'cumplida';
const CHIP: Record<Estado, [string, string]> = {
  'sin-fuente': ['Sin fuente', 'bg-slate-100 text-slate-500'],
  'sin-iniciar': ['Sin iniciar', 'bg-amber-50 text-amber-700'],
  'en-curso': ['En curso', 'bg-brand/10 text-brand'],
  cumplida: ['Cumplida', 'bg-emerald-50 text-emerald-700'],
};
export function estadoMeta(actual: number | null, objetivo: number | null): Estado {
  if (actual == null) return 'sin-fuente';
  if (actual <= 0) return 'sin-iniciar';
  if (objetivo != null && actual >= objetivo) return 'cumplida';
  return 'en-curso';
}

/** Una meta dentro de la tarjeta de su producto: etiqueta + estado, barra, actual / objetivo y %. */
export function MetaFila({ label, ayuda, actual, objetivo, genero }: {
  label: string; ayuda?: string; actual: number | null; objetivo: number | null; /** D-80 */ genero?: Desglose | null;
}) {
  const est = estadoMeta(actual, objetivo);
  const [txt, cls] = CHIP[est];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] items-center gap-x-5 gap-y-2 py-3.5 border-t border-slate-100 first:border-t-0">
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-slate-700 leading-snug">
          {label} <span className={`ml-1 inline-block align-middle text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${cls}`}>{txt}</span>
        </p>
        {ayuda && <p className="text-[10px] font-bold text-slate-400 mt-0.5">{ayuda}</p>}
        {genero && actual != null && <div className="mt-1"><LineaGenero d={genero} /></div>}
      </div>
      <div className="hidden sm:block">
        <Barra v={actual ?? 0} max={objetivo ?? 0} color={est === 'cumplida' ? 'bg-emerald-500' : 'bg-brand'} label={label} />
      </div>
      <div className="text-right">
        <p className="text-sm font-black text-slate-800 tnum">{actual == null ? '—' : num(actual)} <span className="text-slate-400 font-bold">/ {objetivo == null ? '—' : num(objetivo)}</span></p>
        {actual != null && objetivo != null && objetivo > 0 && (
          <p className="text-[10px] font-bold text-slate-400 tnum">{Math.round((actual / objetivo) * 100)}%</p>
        )}
      </div>
    </div>
  );
}

export function TarjetaBloque({ titulo, subtitulo, children, className = '' }: { titulo: string; subtitulo?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`glass-card p-6 min-w-0 flex flex-col gap-4 ${className}`}>
      <div>
        <h3 className="text-sm font-black text-slate-800">{titulo}</h3>
        {subtitulo && <p className="text-[11px] font-bold text-slate-400 mt-0.5">{subtitulo}</p>}
      </div>
      {children}
    </section>
  );
}

export function AlertaFoco({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-3.5 flex items-start gap-3 text-[13px] text-amber-900" role="note">
      <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" aria-hidden />
      <p>{children}</p>
    </div>
  );
}

/** Embudo de la ruta en bloques: rampa de un tono, de la etapa más oscura (registro) a la más clara. */
export function EmbudoBloques({ etapas }: { etapas: { etapa: string; n: number | null; genero?: Desglose | null }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {etapas.map((e, i) => {
        const fondo = rampa(etapas.length - 1 - i, etapas.length);
        const claro = i >= Math.ceil(etapas.length / 2);
        return (
          <div key={e.etapa} className="rounded-xl px-4 py-3.5" style={{ background: fondo }}>
            <p className={`text-2xl font-black tnum ${claro ? 'text-slate-800' : 'text-white'}`}>{e.n == null ? '—' : num(e.n)}</p>
            <p className={`text-[11px] font-bold ${claro ? 'text-slate-600' : 'text-white/85'}`}>{e.etapa}{e.n == null ? ' · sin fuente' : ''}</p>
            {e.genero && e.n != null && <div className="mt-1.5"><LineaGenero d={e.genero} claro={!claro} compacta /></div>}
          </div>
        );
      })}
    </div>
  );
}

export interface FilaApilada { label: string; segmentos: { categoria: string; n: number }[]; cifra: number | null; /** Personas detrás de la cifra (P-76). */ cuenta?: number | null }
/**
 * Barras apiladas al 100 % (una por fila) con la cifra destacada a la derecha y la leyenda debajo.
 * `paleta`: escala = rampa ordinal; sino = Sí marca / No rojo / resto gris.
 */
export function ApiladaFilas({ filas, categorias, paleta = 'escala' }: { filas: FilaApilada[]; categorias: string[]; paleta?: 'escala' | 'sino' }) {
  if (filas.every(f => f.segmentos.every(s => s.n === 0))) return <SinDatos texto="Aún no hay respuestas" />;
  const color = (cat: string) => {
    const i = categorias.indexOf(cat);
    return paleta === 'sino' ? colorSiNo(cat) : rampa(i, categorias.length);
  };
  return (
    <div className="space-y-3">
      {filas.map(f => {
        const total = f.segmentos.reduce((s, x) => s + x.n, 0);
        return (
          <div key={f.label} className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-3">
            <span className="text-[11px] font-bold text-slate-600 leading-tight">{f.label}</span>
            <div className="flex h-3.5 rounded-sm overflow-hidden bg-slate-100" role="img"
              aria-label={`${f.label}: ${f.segmentos.filter(s => s.n > 0).map(s => `${s.categoria} ${s.n}`).join(', ')}`}>
              {total > 0 && f.segmentos.filter(s => s.n > 0).map(s => (
                <div key={s.categoria} style={{ width: `${(s.n / total) * 100}%`, background: color(s.categoria) }} className="h-full border-r border-white last:border-r-0"
                  title={`${s.categoria}: ${s.n} (${Math.round((s.n / total) * 100)}%)`} />
              ))}
            </div>
            <span className="text-xs font-black text-slate-800 text-right tnum whitespace-nowrap">{f.cifra == null || total === 0 ? '—' : `${f.cifra}%`}
              {f.cifra != null && total > 0 && f.cuenta != null && <span className="block text-[10px] font-bold text-slate-400">{num(f.cuenta)} de {num(total)}</span>}
            </span>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
        {categorias.map(c => (
          <span key={c} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
            <span className="size-2 rounded-sm shrink-0" style={{ background: color(c) }} />{c}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Barras pareadas mujeres vs hombres (% de cada grupo; con `nm`/`nh`, también cuántas personas, P-76). */
export function BarrasPareadas({ filas }: { filas: { label: string; m: number; h: number; nm?: number; nh?: number }[] }) {
  if (filas.length === 0) return <SinDatos texto="Aún no hay respuestas" />;
  return (
    <div className="space-y-3">
      {filas.map(f => (
        <div key={f.label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5.5rem] items-center gap-3">
          <span className="text-[11px] font-bold text-slate-600 leading-tight">{f.label}</span>
          <div className="space-y-1">
            <div className="h-2 rounded-sm bg-slate-100 overflow-hidden"><div className="h-full rounded-sm bg-brand" style={{ width: `${f.m}%` }} /></div>
            <div className="h-2 rounded-sm bg-slate-100 overflow-hidden"><div className="h-full rounded-sm" style={{ width: `${f.h}%`, background: HOMBRES }} /></div>
          </div>
          <span className="text-[11px] font-black text-slate-800 text-right tnum whitespace-nowrap">{f.m}% · <span className="text-slate-500">{f.h}%</span>
            {f.nm != null && f.nh != null && <span className="block text-[10px] font-bold text-slate-400">{num(f.nm)} · {num(f.nh)}</span>}
          </span>
        </div>
      ))}
      <div className="flex gap-3 pt-1">
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><span className="size-2 rounded-sm bg-brand" />Mujeres</span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><span className="size-2 rounded-sm" style={{ background: HOMBRES }} />Hombres</span>
      </div>
    </div>
  );
}
