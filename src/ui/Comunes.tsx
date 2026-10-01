/**
 * Componentes compartidos con el MISMO aspecto que FQSD (`FQSD/src/components/Common.tsx`, D-35).
 * Se portaron casi literales; el único cambio es que el azul `qsd-blue` pasa a ser `brand`
 * (el color del aliado que viene de la config). Si FQSD los mejora, se traen acá y se bajan a las
 * copias con `npm run actualizar`.
 *
 * Gráficos hechos a mano (SVG), sin librería: Recharts pesa ~500 KB por un gráfico.
 */
import { useState, type ReactNode } from 'react';

export interface ChartDatum { label: string; value: number; color: string }
export interface SeriePunto { fecha: string; n: number }

/** Paleta categórica de FQSD; la 1ª entrada se reemplaza por el color de marca. */
export const CHART_COLORS = ['var(--color-brand)', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b', '#10b981', '#6366f1', '#f43f5e'];
const ALPHA_POR_VUELTA = [1, 0.6, 0.33];

/** Distribución → datos de la dona. Si hay más categorías que colores, repite el tono con menos opacidad. */
export function toChart(items: { categoria: string; n: number }[]): ChartDatum[] {
  return items.map((d, i) => {
    const vuelta = Math.min(Math.floor(i / CHART_COLORS.length), ALPHA_POR_VUELTA.length - 1);
    const base = CHART_COLORS[i % CHART_COLORS.length];
    const color = vuelta === 0 ? base : `color-mix(in srgb, ${base} ${ALPHA_POR_VUELTA[vuelta] * 100}%, transparent)`;
    return { label: d.categoria, value: d.n, color };
  });
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** 'YYYY-MM-DD' → '23 abr' (sin `new Date`, que en Bogotá corre un día). */
export function fechaCorta(iso: string) {
  const [, m, d] = iso.split('-');
  return `${Number(d)} ${MESES_CORTOS[Number(m) - 1]}`;
}

/** Porcentaje para pantalla: nunca escribe "0%" para una categoría con gente. */
export function fmtPct(value: number, total: number, decimales?: number): string {
  if (total <= 0) return '0%';
  const p = (value / total) * 100;
  const txt = decimales != null ? p.toFixed(decimales) : (p > 0 && p < 0.5 ? p.toFixed(1) : String(Math.round(p)));
  return txt.replace('.', ',') + '%';
}

/** Tarjeta con encabezado (título en versalitas + descripción) y cuerpo — el bloque base de FQSD. */
export function Tarjeta({ titulo, descripcion, extra, children, id, cuerpo = 'p-8' }: {
  titulo: ReactNode; descripcion?: ReactNode; extra?: ReactNode; children: ReactNode; id?: string; cuerpo?: string;
}) {
  return (
    <section id={id} className="glass-card overflow-hidden scroll-mt-24">
      <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-gray-100 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{titulo}</h3>
          {descripcion && <p className="text-[11px] text-slate-400 font-bold mt-1">{descripcion}</p>}
        </div>
        {extra}
      </div>
      <div className={cuerpo}>{children}</div>
    </section>
  );
}

/** Tarjeta pequeña de una distribución (FQSD `DistCard`). */
export function DistCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="glass-card p-6 flex flex-col gap-4 min-w-0">
      <div>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{title}</h3>
        {subtitle && <p className="text-[10px] text-slate-400 font-bold mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/** KPI de FQSD. `value` null = sin fuente aún (se pinta "—", nunca un cero inventado). */
export function KPICard({ label, value, subtext, color = 'text-slate-900', title, destacado }: {
  label: string; value: string | null; subtext?: string; color?: string; title?: string; destacado?: boolean;
}) {
  return (
    <div className={`bg-white p-6 rounded-[2rem] border shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] flex items-center transition-all hover:shadow-md ${destacado ? 'border-brand/30' : 'border-slate-100'}`} title={title}>
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</span>
        <span className={`text-[2rem] leading-tight font-black tracking-tighter tnum ${value == null ? 'text-slate-300' : color}`}>{value ?? '—'}</span>
        {(subtext || value == null) && (
          <p className="mt-1 text-[11px] font-bold text-slate-400 leading-snug">{value == null ? 'Sin fuente aún' : subtext}</p>
        )}
      </div>
    </div>
  );
}

export function HorizontalBar({ label, value, maxValue, color = 'bg-brand', subtitle, suffix = '', display }: {
  label: string; value: number; maxValue: number; color?: string; subtitle?: string; suffix?: string; display?: string;
}) {
  const percentage = Math.min((value / (maxValue || 1)) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-end gap-3">
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-bold text-slate-600 leading-snug">{label}</span>
          {subtitle && <span className="text-[9px] text-slate-400 italic font-medium">{subtitle}</span>}
        </div>
        <span className="text-xs font-black text-slate-800 whitespace-nowrap tnum">{display ?? `${value}${suffix}`}</span>
      </div>
      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

/** Lista de barras de una distribución, con "Ver N más" cuando es larga. Muestra cantidad y %. */
export function ListaBarras({ datos, max = 8 }: { datos: { categoria: string; n: number }[] | null; max?: number }) {
  const [todo, setTodo] = useState(false);
  if (!datos || datos.length === 0) return <SinDatos />;
  const total = datos.reduce((s, d) => s + d.n, 0);
  const tope = Math.max(...datos.map(d => d.n));
  const vis = todo ? datos : datos.slice(0, max);
  return (
    <div className="space-y-3">
      {vis.map(d => <HorizontalBar key={d.categoria} label={d.categoria} value={d.n} maxValue={tope} display={`${d.n} · ${fmtPct(d.n, total)}`} />)}
      {datos.length > max && (
        <button type="button" onClick={() => setTodo(t => !t)} className="text-[10px] font-black uppercase tracking-widest text-brand hover:opacity-80">
          {todo ? 'Ver menos' : `Ver ${datos.length - max} más`}
        </button>
      )}
    </div>
  );
}

export function SinDatos({ texto = 'Sin datos' }: { texto?: string }) {
  return <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center py-8">{texto}</p>;
}

/** Dona + leyenda (FQSD): todas las categorías, sin "Otros"; la leyenda muestra el %. */
export function DonutChart({ data, size = 150 }: { data: ChartDatum[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const display = [...data].sort((a, b) => b.value - a.value).filter(d => d.value > 0);
  const R = size * 0.35, CX = size / 2, CY = size / 2, SW = size * 0.30, C = 2 * Math.PI * R;
  let cum = 0;
  const segs = display.map(d => {
    const pct = total > 0 ? d.value / total : 0;
    const startAngle = -90 + cum * 360;
    cum += pct;
    return { ...d, startAngle, dLen: pct * C, dGap: (1 - pct) * C };
  });
  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-3">
        <svg width={size} height={size}><circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth={SW} /></svg>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sin datos</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} role="img" aria-label={display.map(d => `${d.label} ${fmtPct(d.value, total)}`).join(', ')}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth={SW} />
        {segs.map((s, i) => (
          <circle key={i} cx={CX} cy={CY} r={R} fill="none" style={{ stroke: s.color }} strokeWidth={SW}
            strokeDasharray={`${s.dLen} ${s.dGap}`} transform={`rotate(${s.startAngle}, ${CX}, ${CY})`}>
            <title>{`${s.label}: ${s.value} (${fmtPct(s.value, total)})`}</title>
          </circle>
        ))}
      </svg>
      <div className="w-full space-y-1.5 max-h-44 overflow-y-auto pr-1">
        {display.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-[10px] text-slate-600 flex-1 truncate leading-none" title={d.label}>{d.label}</span>
            <span className="text-[10px] font-black text-slate-800 w-10 text-right shrink-0">{fmtPct(d.value, total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Área de una sola serie por día (FQSD `AreaChart`): punto y número en cada día con dato,
 * anti-colisión por valor, 3 rótulos en X, días en cero dibujados como cero.
 */
export function AreaChart({ data, height = 200, color = 'var(--color-brand)', etiquetaValor = 'registros' }: {
  data: SeriePunto[]; height?: number; color?: string; etiquetaValor?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-slate-50/60" style={{ height }}>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sin datos en este rango</p>
      </div>
    );
  }
  const W = 760, H = height;
  const PAD = { top: 22, right: 12, bottom: 24, left: 34 };
  const plotW = W - PAD.left - PAD.right, plotH = H - PAD.top - PAD.bottom;
  const max = Math.max(...data.map(d => d.n), 1);
  const x = (i: number) => (data.length === 1 ? PAD.left + plotW / 2 : PAD.left + (i / (data.length - 1)) * plotW);
  const y = (n: number) => PAD.top + plotH - (n / max) * plotH;
  const linea = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d.n).toFixed(1)}`).join(' ');
  const area = `${linea} L ${x(data.length - 1).toFixed(1)} ${y(0)} L ${x(0).toFixed(1)} ${y(0)} Z`;
  const idxPico = data.reduce((best, d, i) => (d.n > data[best].n ? i : best), 0);
  const gradId = `area-grad-${etiquetaValor.replace(/\W/g, '')}`;
  const marcasX = [...new Set([0, idxPico, data.length - 1])].sort((a, b) => a - b)
    .filter((i, k, arr) => k === 0 || x(i) - x(arr[k - 1]) > 60);
  const activo = hover ?? idxPico;
  const conDato = data.map((d, i) => ({ i, n: d.n, cx: x(i), cy: y(d.n) })).filter(p => p.n > 0);
  const puestas: number[] = [];
  const etiquetas = [...conDato].sort((a, b) => b.n - a.n || a.i - b.i).filter(p => {
    if (puestas.some(px => Math.abs(px - p.cx) < 22)) return false;
    puestas.push(p.cx);
    return true;
  });
  const ticks = [...new Set([0, Math.round(max / 2), max])];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} role="img"
        aria-label={`Serie de ${etiquetaValor} por día, de ${fechaCorta(data[0].fecha)} a ${fechaCorta(data[data.length - 1].fecha)}. Máximo ${max} el ${fechaCorta(data[idxPico].fecha)}.`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={e => {
          const r = e.currentTarget.getBoundingClientRect();
          const vbX = ((e.clientX - r.left) / r.width) * W;
          const i = data.length === 1 ? 0 : Math.round(((vbX - PAD.left) / plotW) * (data.length - 1));
          setHover(Math.max(0, Math.min(data.length - 1, i)));
        }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.22 }} />
            <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.02 }} />
          </linearGradient>
        </defs>
        {ticks.map(v => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="#f1f5f9" strokeWidth="1" />
            <text x={PAD.left - 8} y={y(v) + 3.5} textAnchor="end" className="fill-slate-300" style={{ fontSize: 9, fontWeight: 700 }}>{v}</text>
          </g>
        ))}
        <path d={area} fill={`url(#${gradId})`} />
        <path d={linea} fill="none" style={{ stroke: color }} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {marcasX.map(i => (
          <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
            className="fill-slate-400" style={{ fontSize: 9, fontWeight: 700 }}>{fechaCorta(data[i].fecha)}</text>
        ))}
        {conDato.map(p => <circle key={`pt-${p.i}`} cx={p.cx} cy={p.cy} r="3" style={{ fill: color }} stroke="#ffffff" strokeWidth="1.5" />)}
        {etiquetas.map(p => (
          <text key={`lb-${p.i}`} x={p.cx} y={p.cy - 9}
            textAnchor={p.cx < PAD.left + 10 ? 'start' : p.cx > W - PAD.right - 10 ? 'end' : 'middle'}
            className="fill-slate-600" style={{ fontSize: 10, fontWeight: 900 }}>{p.n}</text>
        ))}
        {hover != null && (
          <>
            <line x1={x(activo)} x2={x(activo)} y1={PAD.top - 6} y2={PAD.top + plotH} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={x(activo)} cy={y(data[activo].n)} r="4.5" style={{ fill: color }} stroke="#ffffff" strokeWidth="2" />
          </>
        )}
      </svg>
      {hover != null && (
        <div className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 rounded-xl bg-slate-900 px-2.5 py-1.5 shadow-lg" style={{ left: `${(x(activo) / W) * 100}%` }}>
          <p className="whitespace-nowrap text-[10px] font-black leading-tight text-white">{data[activo].n} {etiquetaValor}</p>
          <p className="whitespace-nowrap text-[9px] font-bold leading-tight text-slate-400">{fechaCorta(data[activo].fecha)}</p>
        </div>
      )}
    </div>
  );
}

/** Serie por día → rellena con 0 los días sin registros (FQSD dibuja los ceros, no los salta). */
export function rellenarDias(serie: SeriePunto[]): SeriePunto[] {
  if (serie.length < 2) return serie;
  const mapa = new Map(serie.map(p => [p.fecha, p.n]));
  const out: SeriePunto[] = [];
  const [y0, m0, d0] = serie[0].fecha.split('-').map(Number);
  const fin = serie[serie.length - 1].fecha;
  const cur = new Date(Date.UTC(y0, m0 - 1, d0));
  for (let k = 0; k < 1000; k++) {
    const f = cur.toISOString().slice(0, 10);
    out.push({ fecha: f, n: mapa.get(f) ?? 0 });
    if (f >= fin) break;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}
