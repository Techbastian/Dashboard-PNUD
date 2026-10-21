/**
 * Hitos del contrato (D-55): una tarjeta por hito con meta, avance, % que activa el pago (umbral) y fecha estimada.
 * Sin montos. Estados: Cumplido · Activado (pasó el umbral) · En riesgo (fecha a ≤ 30 días o vencida sin llegar al umbral)
 * · En curso · Sin iniciar · Sin fuente aún · Documental (entregable sin cifra, lo marca el equipo en la config).
 * Hitos seguidos con el mismo `grupo` van juntos bajo su título; los cumplidos con fecha pasada se pliegan en «Hitos anteriores».
 */
import { config, type Hito } from '../lib/config';
import { resolver } from '../lib/ruta';
import { num } from '../lib/formato';
import type { PublicStats } from '../lib/usePublicStats';
import { TarjetaBloque } from './Graficos';

type Estado = 'cumplido' | 'activado' | 'riesgo' | 'curso' | 'sin-iniciar' | 'sin-fuente' | 'documental';
const CHIP: Record<Estado, [string, string]> = {
  cumplido: ['Cumplido', 'bg-emerald-50 text-emerald-700'],
  activado: ['Activado', 'bg-emerald-50 text-emerald-700'],
  riesgo: ['En riesgo', 'bg-red-50 text-red-700'],
  curso: ['En curso', 'bg-brand/10 text-brand'],
  'sin-iniciar': ['Sin iniciar', 'bg-amber-50 text-amber-700'],
  'sin-fuente': ['Sin fuente aún', 'bg-slate-100 text-slate-500'],
  documental: ['Documental', 'bg-slate-100 text-slate-500'],
};
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
const diasHasta = (f: string) => Math.round((Date.parse(f) - Date.parse(hoy())) / 86_400_000);
const fechaCorta = (f?: string) => (f ? `${Number(f.slice(8, 10))} ${MESES[Number(f.slice(5, 7)) - 1]} ${f.slice(0, 4)}` : null);

export interface EvalHito { h: Hito; n: number | null; activa: number | null; estado: Estado }

export function evaluarHito(h: Hito, data: PublicStats): EvalHito {
  if (h.documental) return { h, n: null, activa: null, estado: h.cumplido ? 'cumplido' : 'documental' };
  const v = resolver(data, h.valor!);
  const n = v.estado === 'ok' ? v.n : null;
  const activa = h.umbral ? Math.ceil((h.meta! * h.umbral) / 100) : h.meta!;
  let estado: Estado;
  if (n == null) estado = 'sin-fuente';
  else if (n >= h.meta!) estado = 'cumplido';
  else if (h.umbral && n >= activa) estado = 'activado';
  else if (h.fecha && diasHasta(h.fecha) <= 30) estado = 'riesgo';
  else estado = n > 0 ? 'curso' : 'sin-iniciar';
  return { h, n, activa, estado };
}

function TarjetaHito({ e }: { e: EvalHito }) {
  const { h, n, activa, estado } = e;
  const [txt, cls] = CHIP[estado];
  const meta = h.meta ?? 0;
  const w = n != null && meta > 0 ? Math.min(100, (n / meta) * 100) : 0;
  const marca = h.umbral ? h.umbral : null;
  const dias = h.fecha ? diasHasta(h.fecha) : null;
  return (
    <div className="p-5 rounded-[1.5rem] border border-slate-100 bg-white flex flex-col gap-3 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hito {h.numero}{h.fecha ? ` · ${fechaCorta(h.fecha)}` : ''}</p>
          <p className="text-sm font-black text-slate-800 leading-snug">{h.titulo}</p>
        </div>
        <span className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${cls}`}>{txt}</span>
      </div>
      {h.documental ? (
        <p className="text-[12px] font-bold text-slate-500">{h.cumplido ? 'Entregado.' : 'Entregable documental: se marca como cumplido en la configuración.'}</p>
      ) : (
        <>
          <p className="text-3xl font-black text-slate-800 tnum leading-none">
            {n == null ? '—' : num(n)} <span className="text-base text-slate-400 font-bold">/ {num(meta)}</span>
          </p>
          <div className="relative pt-1">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden" role="progressbar" aria-label={h.titulo} aria-valuenow={n ?? 0} aria-valuemin={0} aria-valuemax={meta}>
              <div className={`h-full rounded-full ${estado === 'cumplido' || estado === 'activado' ? 'bg-emerald-500' : estado === 'riesgo' ? 'bg-red-500' : 'bg-brand'}`} style={{ width: `${w}%` }} />
            </div>
            {marca && (
              <div className="absolute top-0 h-4 w-0.5 bg-slate-700" style={{ left: `${marca}%` }} title={`Activa el pago: ${marca}% = ${num(activa!)}`} />
            )}
          </div>
          <p className="text-[11px] font-bold text-slate-500">
            {n != null && meta > 0 && <>{Math.round((n / meta) * 100)}% · </>}
            {marca && activa != null && n != null && n < activa
              ? <>faltan <b className="text-slate-700">{num(activa - n)}</b> para activar ({marca}% = {num(activa)})</>
              : n != null && n < meta ? <>faltan <b className="text-slate-700">{num(meta - n)}</b> para la meta</> : null}
            {dias != null && estado !== 'cumplido' && <> · {dias < 0 ? `venció hace ${-dias} días` : dias === 0 ? 'vence hoy' : `faltan ${dias} días`}</>}
          </p>
        </>
      )}
      {h.ayuda && <p className="text-[10px] font-bold text-slate-400">{h.ayuda}</p>}
    </div>
  );
}

export function BloqueHitos({ data }: { data: PublicStats }) {
  const evals = config.hitos.map(h => evaluarHito(h, data));
  const anteriores = evals.filter(e => e.estado === 'cumplido' && e.h.fecha && e.h.fecha < hoy());
  const vivos = evals.filter(e => !anteriores.includes(e));
  // tramos consecutivos con el mismo grupo (o sin grupo), en el orden de los números
  const tramos: { titulo: string | null; items: EvalHito[] }[] = [];
  for (const e of vivos) {
    const ult = tramos[tramos.length - 1];
    if (ult && ult.titulo === (e.h.grupo ?? null)) ult.items.push(e); else tramos.push({ titulo: e.h.grupo ?? null, items: [e] });
  }
  return (
    <TarjetaBloque titulo="Hitos del contrato" subtitulo="Avance contra la meta de cada hito; la línea marca el % que activa el pago">
      {tramos.map((t, i) => (
        <div key={i} className="space-y-3">
          {t.titulo && <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">{t.titulo}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{t.items.map(e => <TarjetaHito key={e.h.numero} e={e} />)}</div>
        </div>
      ))}
      {anteriores.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">
            Hitos anteriores cumplidos ({anteriores.length})
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-3">{anteriores.map(e => <TarjetaHito key={e.h.numero} e={e} />)}</div>
        </details>
      )}
    </TarjetaBloque>
  );
}
