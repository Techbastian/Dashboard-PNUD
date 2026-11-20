/**
 * D-80: desagregación por género de cada conteo de personas.
 * Público: la función v16 (A-73) trae una lista `por_genero` = [{categoria, n}] junto a cada conteo (Mujer y Hombre
 * siempre; No binario, Prefiere no decir, Otro y Sin dato solo si son > 0). Una cifra encuentra su lista sola a partir
 * de su ruta (`REGLAS`); en la config, `genero: <ruta>` la fija y `genero: false` la apaga.
 * Privado: se cuenta persona por persona con `sexoDe` (mismo criterio que la función).
 */
import { resolver, valorEn } from './ruta';

export interface ParteGenero { categoria: string; n: number }
export type Desglose = ParteGenero[];

/** Ruta del conteo → ruta de su lista por género (función v16). */
const REGLAS: [RegExp, string][] = [
  [/^(.*)\.personas$/, '$1.por_genero'],
  [/^(.*)\.matriculados$/, '$1.matriculados_por_genero'],
  [/^grupos\.(.+)$/, 'grupos_por_genero.$1'],
  [/^empleabilidad\.colocados$/, 'empleabilidad.colocados_genero'],
  [/^empleabilidad\.colocados_historico$/, 'empleabilidad.colocados_historico_por_genero'],
  [/^empleabilidad\.personas_postuladas_aliadas$/, 'empleabilidad.personas_postuladas_aliadas_por_genero'],
];

export function rutaGenero(valor?: string, genero?: string | false): string | null {
  if (genero === false) return null;
  if (typeof genero === 'string' && genero.trim()) return genero.trim();
  const v = valor?.trim();
  if (!v) return null;
  for (const [re, a] of REGLAS) if (re.test(v)) return v.replace(re, a);
  return null;
}

/** Lista por género en la ruta, o null si la función todavía no la trae (v14 o anterior). */
export function desgloseEn(data: unknown, ruta: string | null): Desglose | null {
  if (!ruta) return null;
  const x = valorEn(data, ruta);
  // Como en ruta.ts: un elemento que no está en una lista que SÍ existe (p. ej. aún no hay asistencia a ese tipo) vale 0.
  if (x === undefined && resolver(data, ruta).estado === 'ok') return [];
  if (!Array.isArray(x)) return null;
  return x.map(e => ({ categoria: String(e?.categoria ?? '—'), n: Number(e?.n ?? 0) }));
}

/** Atajo: desglose de una cifra a partir de su ruta de valor. */
export const desgloseDe = (data: unknown, valor?: string, genero?: string | false) => desgloseEn(data, rutaGenero(valor, genero));

const ORDEN = ['Mujer', 'Hombre', 'No binario', 'Prefiere no decir', 'Otro', 'Sin dato'];
const PLURAL: Record<string, string> = { Mujer: 'Mujeres', Hombre: 'Hombres' };
export const nombreGenero = (c: string) => PLURAL[c] ?? c;
export const cuantas = (d: Desglose | null | undefined, c: string) => d?.find(x => x.categoria === c)?.n ?? 0;

/** Mujer y Hombre siempre; las demás solo si son > 0, en orden fijo. */
export function partes(d: Desglose): ParteGenero[] {
  const n = new Map<string, number>();
  for (const x of d) n.set(x.categoria, (n.get(x.categoria) ?? 0) + x.n);
  const cats = [...ORDEN, ...[...n.keys()].filter(k => !ORDEN.includes(k))];
  return cats.filter(c => c === 'Mujer' || c === 'Hombre' || (n.get(c) ?? 0) > 0).map(c => ({ categoria: c, n: n.get(c) ?? 0 }));
}

/** Género legible de la capa privada (Femenino, Masculino, No binario…) → categoría de la función. */
export function sexoDe(genero: string | null | undefined): string {
  const g = (genero ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!g) return 'Sin dato';
  if (g === 'femenino' || g === 'mujer') return 'Mujer';
  if (g === 'masculino' || g === 'hombre') return 'Hombre';
  if (g.startsWith('no binari') || g.startsWith('no_binari')) return 'No binario';
  if (g.startsWith('prefiero')) return 'Prefiere no decir';
  return 'Otro';
}

/** Cuenta una lista de personas por género. */
export function contarGenero<T>(xs: T[], genero: (x: T) => string | null | undefined): Desglose {
  const n = new Map<string, number>();
  for (const x of xs) { const s = sexoDe(genero(x)); n.set(s, (n.get(s) ?? 0) + 1); }
  return partes([...n].map(([categoria, k]) => ({ categoria, n: k })));
}
