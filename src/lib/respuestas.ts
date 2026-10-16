/**
 * Respuestas de formularios contadas por la función pública v7 (A-17, D-43) y foco territorial.
 * Nada del proyecto: las preguntas, el foco y las categorías que se destacan vienen de la config.
 */
import { config } from './config';
import type { Pregunta, Foco } from './config';

export interface CategoriaResp { categoria: string; orden: number | null; n: number; mujeres: number; hombres: number }
export interface Respuesta {
  etiqueta: string | null; tipo: string; valida: boolean;
  universo: number; universo_mujeres: number; universo_hombres: number;
  respondieron: number; respondieron_mujeres: number; respondieron_hombres: number;
  categorias: CategoriaResp[];
}

/** La pregunta tal como la recibe la función (sin título ni grupo, que solo usa la app). */
export function paraFuncion(p: Pregunta) {
  const { id, bloque, clave, tipo, si, rangos, entre, claves, en } = p;
  return { id, bloque, clave, tipo, si: si ? { clave: si.clave, en: si.en } : undefined, rangos, entre, claves, en };
}

/** Preguntas que usa el Dashboard público (gráficos + foco). El informe pide todas. */
export function preguntasDelDashboard(): Pregunta[] {
  const usadas = new Set<string>();
  for (const p of config.pestanas) for (const g of p.graficos) {
    if (g.pregunta) usadas.add(g.pregunta);
    g.preguntas?.forEach(x => usadas.add(x));
  }
  if (config.foco?.personas) usadas.add(config.foco.personas);
  return config.preguntas.filter(p => usadas.has(p.id));
}

export function respuesta(stats: unknown, id: string): Respuesta | null {
  const r = (stats as { respuestas?: Record<string, Respuesta> } | null)?.respuestas?.[id];
  return r && r.valida ? r : null;
}

export const pregunta = (id: string) => config.preguntas.find(p => p.id === id);

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

/** "4" destaca «4 - Alto» y «4 -Barrera alta»; un texto destaca solo la categoría igual («No» ≠ «No sabe»). */
export function destaca(categoria: string, destacar: string[] = []): boolean {
  const c = norm(categoria);
  return destacar.some(d => {
    const x = norm(d);
    return /^\d+$/.test(x) ? new RegExp(`^${x}(\\D|$)`).test(c) : c === x;
  });
}

export function enFoco(texto: string, foco: Foco | null = config.foco): boolean {
  if (!foco) return true;
  const t = norm(texto);
  return foco.coincide.some(k => t.includes(norm(k)));
}

/** Categorías fuera del foco de una lista [{categoria, n}] (sin «Sin dato»). */
export function fueraDeFoco(items: { categoria: string; n: number }[] | null): { categoria: string; n: number }[] {
  if (!items || !config.foco) return [];
  return items.filter(x => x.n > 0 && !/^sin dato$/i.test(x.categoria) && !enFoco(x.categoria));
}

/** Personas fuera del foco según la pregunta del foco (agrupa variantes de escritura por texto normalizado). */
export function personasFueraDeFoco(stats: unknown) {
  const id = config.foco?.personas;
  const r = id ? respuesta(stats, id) : null;
  if (!r) return null;
  const mapa = new Map<string, { categoria: string; n: number }>();
  for (const c of fueraDeFoco(r.categorias)) {
    const k = norm(c.categoria);
    const prev = mapa.get(k);
    mapa.set(k, { categoria: prev?.categoria ?? c.categoria, n: (prev?.n ?? 0) + c.n });
  }
  const lista = [...mapa.values()].sort((a, b) => b.n - a.n);
  return { total: lista.reduce((s, x) => s + x.n, 0), lista };
}

/** Porcentaje entero sobre quienes respondieron (decisión 4 del blueprint PNUD). */
export const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
