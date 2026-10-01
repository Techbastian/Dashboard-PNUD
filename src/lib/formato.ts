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
