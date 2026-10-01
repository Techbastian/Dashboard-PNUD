const nf = new Intl.NumberFormat('es-CO');
export const num = (n: number) => nf.format(n);
export const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

/** Fecha y hora de Bogotá (UTC-5, sin horario de verano). */
export function fechaHora(iso?: string) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}
/** 'YYYY-MM-DD' → '25 sep' sin pasar por Date (evita el corrimiento UTC). */
export function diaCorto(ymd: string) {
  const [, m, d] = ymd.split('-').map(Number);
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d} ${meses[m - 1]}`;
}

const TZ = 'America/Bogota';
/** '2026-10-02T14:00:00Z' → 'jue 2 oct' (Bogotá). */
export function diaLargo(iso?: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-CO', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso));
}
/** Hora de Bogotá: '9:00 a. m.' */
export function hora(iso?: string | null) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('es-CO', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}
/** Fecha corta con año: '2 oct 2026'. Acepta 'YYYY-MM-DD' sin correrse de día. */
export function fecha(v?: string | null) {
  if (!v) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { const [y, m, d] = v.split('-').map(Number); return `${d} ${['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][m - 1]} ${y}`; }
  return new Intl.DateTimeFormat('es-CO', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(v));
}
/** 'YYYY-MM-DD' del instante en Bogotá. */
export function diaBogota(iso: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}
/** Fecha + hora locales de Bogotá ('YYYY-MM-DD', 'HH:MM') → ISO con -05:00 (Colombia no tiene horario de verano). */
export function isoBogota(dia: string, hhmm: string) {
  return new Date(`${dia}T${hhmm || '00:00'}:00-05:00`).toISOString();
}
/** ISO → 'HH:MM' en Bogotá (para inputs). */
export function hhmmBogota(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
}
/** Texto sin tildes y en minúsculas, para buscar. */
export const norm = (v: unknown) => String(v ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
/** Valores de la base que se leen distinto en español. */
const TRADUCCION: Record<string, string> = {
  active: 'Activa', inactive: 'Inactiva', draft: 'Borrador', published: 'Publicada', closed: 'Cerrada', applied: 'Postulada',
  asistio: 'Asistió', no_asistio: 'No asistió', postulacion_finalizada: 'Postulación finalizada', aceptacion_final: 'Aceptación final',
  sin_estado: 'Sin estado', inscrito: 'Inscrito',
};
/** 'postulacion_finalizada' → 'Postulación finalizada'. */
export const humano = (t?: string | null) => {
  if (!t) return '—';
  if (TRADUCCION[t.toLowerCase()]) return TRADUCCION[t.toLowerCase()];
  const s = t.replace(/[_-]/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1);
};
