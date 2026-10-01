/**
 * Resuelve una ruta de la config contra la respuesta de dashboard_public_stats.
 *   "empresas.aliadas"                                     → número
 *   "formularios[recorrer-pnud].personas"                  → busca en la lista por slug/tipo/categoria/clave/estado/nombre
 *   "empleabilidad.colocados_por_genero[Mujer]"            → sin campo final: usa n / personas / total
 *   "pendiente"                                            → etapa sin fuente todavía
 * Un elemento que no está en una lista que SÍ existe vale 0 (p. ej. aún no hay eventos de ese tipo).
 */
export type Valor = { estado: 'ok'; n: number } | { estado: 'pendiente' } | { estado: 'sin-dato' };

const CLAVES = ['slug', 'tipo', 'categoria', 'clave', 'estado', 'nombre'];
const CAMPOS_NUM = ['n', 'personas', 'total'];

export function resolver(stats: unknown, ruta: string): Valor {
  if (ruta.trim() === 'pendiente') return { estado: 'pendiente' };
  let actual: unknown = stats;
  const partes = ruta.match(/[^.[\]]+|\[[^\]]*\]/g) ?? [];
  for (const p of partes) {
    if (actual == null) return { estado: 'sin-dato' };
    if (p.startsWith('[')) {
      const k = p.slice(1, -1);
      if (!Array.isArray(actual)) return { estado: 'sin-dato' };
      const item = actual.find(x => x && typeof x === 'object' && CLAVES.some(c => String((x as Record<string, unknown>)[c]) === k));
      if (!item) return { estado: 'ok', n: 0 };
      actual = item;
    } else {
      actual = (actual as Record<string, unknown>)[p];
    }
  }
  if (typeof actual === 'number') return { estado: 'ok', n: actual };
  if (actual && typeof actual === 'object' && !Array.isArray(actual)) {
    for (const c of CAMPOS_NUM) {
      const v = (actual as Record<string, unknown>)[c];
      if (typeof v === 'number') return { estado: 'ok', n: v };
    }
  }
  return { estado: 'sin-dato' };
}

export interface Categoria { categoria: string; n: number }
export function lista(stats: unknown, ruta: string): Categoria[] | null {
  let actual: unknown = stats;
  for (const p of ruta.split('.')) {
    if (actual == null) return null;
    actual = (actual as Record<string, unknown>)[p];
  }
  if (!Array.isArray(actual)) return null;
  return actual
    .map(x => ({ categoria: String(x.categoria ?? x.estado ?? x.tipo ?? x.slug ?? '—'), n: Number(x.n ?? x.personas ?? x.total ?? 0) }))
    .filter(x => x.n > 0);
}
