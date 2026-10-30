/**
 * Reporte ejecutivo de población (D-74): se cuenta persona por persona desde la capa privada (useCohorte), con el
 * mismo criterio que la función pública (A-17) para cada tipo de pregunta, pero con rango de fechas de registro,
 * cruces y sin respuestas vacías:
 *   · universo = personas registradas en el rango que respondieron TODOS los formularios de `reporte.completos`
 *     (p. ej. registro y línea base). No se usa estadoFormulario (D-71): los formularios ganan preguntas obligatorias
 *     después de que la gente se registró y, con esa regla, en PNUD no quedaba nadie (0 de 195, 30-oct);
 *   · en cada gráfico solo entra quien respondió (sin «Sin dato», sin respuestas no numéricas ni fuera de rango);
 *     el % es sobre esas personas y el gráfico dice cuántas son.
 * Nada del proyecto aquí: las páginas, preguntas y cruces vienen de `config.reporte`.
 */
import { config, type DatoReporte, type GraficoReporte, type Pregunta } from './config';
import { DATOS_REPORTE } from './parseConfig';
import { respuestaDe, type DatosCohorte, type Formulario, type Persona } from './datos';
import { destaca } from './respuestas';
import { diaBogota } from './formato';

export interface Cat { categoria: string; n: number; m: number; h: number }
/** Distribución de una variable: categorías en orden y cuántas personas respondieron (total, mujeres, hombres). */
export interface Dist { cats: Cat[]; n: number; m: number; h: number }

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const lleno = (v: unknown) => v != null && String(v).trim() !== '';

export const esMujer = (p: Persona) => p.genero === 'Femenino';
export const esHombre = (p: Persona) => p.genero === 'Masculino';

const EDADES = ['Menor de 18', '18 a 24', '25 a 29', '30 a 39', '40 a 49', '50 a 59', '60 o más'];
function rangoEdad(nacimiento: string | null): string | null {
  if (!nacimiento || !/^\d{4}-\d{2}-\d{2}/.test(nacimiento)) return null;
  const [y, m, d] = nacimiento.slice(0, 10).split('-').map(Number);
  const [hy, hm, hd] = diaBogota(new Date().toISOString()).split('-').map(Number);
  const e = hy - y - (hm < m || (hm === m && hd < d) ? 1 : 0);
  if (e < 14 || e > 90) return null; // igual que la función pública: fuera de rango = sin dato
  return e < 18 ? EDADES[0] : e <= 24 ? EDADES[1] : e <= 29 ? EDADES[2] : e <= 39 ? EDADES[3] : e <= 49 ? EDADES[4] : e <= 59 ? EDADES[5] : EDADES[6];
}

function formularioDe(d: DatosCohorte, slug: string): Formulario | undefined {
  return d.formularios.find(f => f.slug === slug || f.bloque === slug);
}

/** Respuesta cruda a una clave del formulario (con o sin «_» final, o por la clave del texto viejo). */
function crudo(fm: Formulario, r: Record<string, unknown>, clave: string): unknown {
  const k = clave.replace(/_+$/, '');
  const q = fm.preguntas.find(x => x.clave.replace(/_+$/, '') === k);
  if (q) { const v = respuestaDe(r, q); if (v !== undefined) return v; }
  return r[k] ?? r[`${k}_`];
}
const lista = (v: unknown): string[] => (Array.isArray(v) ? v : v == null ? [] : [v]).map(x => String(x).trim()).filter(Boolean);
const numero = (v: unknown): number | null => {
  const t = String(v ?? '').replace(/[^0-9]/g, '');
  return t.length >= 1 && t.length <= 15 ? Number(t) : null;
};

export interface Contexto { d: DatosCohorte; preguntas: Map<string, Pregunta> }

/**
 * Categorías de una persona en una variable (dato del registro o pregunta). null = no está en el universo de la
 * pregunta (no tiene el formulario o no cumple `si`); [] = no respondió (no se cuenta).
 */
export function valoresDe(ctx: Contexto, p: Persona, variable: string): string[] | null {
  if ((DATOS_REPORTE as readonly string[]).includes(variable)) {
    const dato = variable as DatoReporte;
    const v = dato === 'genero' ? p.genero : dato === 'edad' ? rangoEdad(p.nacimiento) : dato === 'municipio' ? p.ciudad : p.nivel;
    return lleno(v) ? [String(v).trim()] : [];
  }
  const q = ctx.preguntas.get(variable);
  const fm = q ? formularioDe(ctx.d, q.bloque) : undefined;
  const r = fm ? p.respuestas[fm.bloque] : undefined;
  if (!q || !fm || !r) return null;
  if (q.si) {
    const en = q.si.en.map(norm);
    if (!lista(crudo(fm, r, q.si.clave)).some(v => en.includes(norm(v)))) return null;
  }
  if (q.tipo === 'alguna') {
    const vs = (q.claves ?? []).map(k => crudo(fm, r, k)).filter(lleno).map(String);
    if (!vs.length) return [];
    return [vs.some(v => (q.en ?? []).some(e => v.trim().startsWith(e.trim()))) ? 'Sí' : 'No'];
  }
  if (q.tipo === 'monto' || q.tipo === 'numero' || q.tipo === 'rango' || q.tipo === 'razon') {
    let v = numero(crudo(fm, r, q.clave!));
    if (v != null && q.tipo === 'razon') { const b = numero(crudo(fm, r, q.entre!)); v = b ? v / b : null; }
    if (v == null) return [];
    const rg = (q.rangos ?? []).find(x => x.hasta == null || v! <= x.hasta);
    return rg ? [rg.label] : [];
  }
  // opcion / escala / multiple: con la etiqueta del formulario (sin importar mayúsculas ni espacios).
  const opciones = fm.preguntas.find(x => x.clave.replace(/_+$/, '') === q.clave!.replace(/_+$/, ''))?.opciones ?? [];
  const vs = lista(crudo(fm, r, q.clave!)).map(v => opciones.find(o => norm(o) === norm(v)) ?? v);
  return q.tipo === 'multiple' ? [...new Set(vs)] : vs.slice(0, 1);
}

/** Orden natural de las categorías de una variable (formulario, rangos o fijo); null = por frecuencia. */
export function ordenDe(ctx: Contexto, variable: string, fijo?: string[]): string[] | null {
  if (fijo?.length) return fijo;
  if (variable === 'edad') return EDADES;
  const q = ctx.preguntas.get(variable);
  if (!q) return null;
  if (q.tipo === 'alguna') return ['Sí', 'No'];
  if (q.rangos?.length) return q.rangos.map(r => r.label);
  const fm = formularioDe(ctx.d, q.bloque);
  const op = fm?.preguntas.find(x => x.clave.replace(/_+$/, '') === q.clave?.replace(/_+$/, ''))?.opciones;
  return op?.length && q.tipo !== 'multiple' ? op : null;
}

export function distribucion(ctx: Contexto, personas: Persona[], variable: string, fijo?: string[]): Dist {
  const mapa = new Map<string, Cat>();
  let n = 0, m = 0, h = 0;
  for (const p of personas) {
    const vs = valoresDe(ctx, p, variable);
    if (!vs?.length) continue;
    n++; if (esMujer(p)) m++; if (esHombre(p)) h++;
    for (const v of vs) {
      const k = norm(v);
      const c = mapa.get(k) ?? { categoria: v, n: 0, m: 0, h: 0 };
      c.n++; if (esMujer(p)) c.m++; if (esHombre(p)) c.h++;
      mapa.set(k, c);
    }
  }
  const orden = ordenDe(ctx, variable, fijo);
  const cats = [...mapa.values()].filter(c => c.n > 0);
  if (orden) {
    const pos = (c: Cat) => { const i = orden.findIndex(o => norm(o) === norm(c.categoria)); return i < 0 ? orden.length : i; };
    cats.sort((a, b) => pos(a) - pos(b) || b.n - a.n);
  } else cats.sort((a, b) => b.n - a.n || a.categoria.localeCompare(b.categoria, 'es'));
  return { cats, n, m, h };
}

/** % de quienes respondieron que marcan alguna categoría de `destacar` (total, mujeres, hombres). */
export function porcentajeDestacado(dist: Dist, destacar: string[]) {
  const sel = dist.cats.filter(c => destaca(c.categoria, destacar));
  const suma = (k: 'n' | 'm' | 'h') => sel.reduce((s, c) => s + c[k], 0);
  return { t: pct(suma('n'), dist.n), m: pct(suma('m'), dist.m), h: pct(suma('h'), dist.h), n: dist.n };
}

export const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export interface Universo { personas: Persona[]; enRango: number; incompletas: number }

/** Personas registradas entre `desde` y `hasta` (días de Bogotá, inclusivos) que respondieron todos los formularios de `completos`. */
export function universo(d: DatosCohorte, desde: string | null, hasta: string | null): Universo {
  const enRango = d.personas.filter(p => {
    if (!p.registradaEl) return !desde && !hasta;
    const dia = diaBogota(p.registradaEl);
    return (!desde || dia >= desde) && (!hasta || dia <= hasta);
  });
  const forms = (config.reporte?.completos ?? []).map(s => formularioDe(d, s));
  const tiene = (r: Record<string, unknown> | undefined) => r != null && Object.values(r).some(lleno);
  const personas = enRango.filter(p => forms.every(f => f != null && tiene(p.respuestas[f.bloque])));
  return { personas, enRango: enRango.length, incompletas: enRango.length - personas.length };
}

/** Lectura de una línea de un gráfico, para los hallazgos clave. null = sin datos. */
export function lectura(ctx: Contexto, personas: Persona[], g: GraficoReporte): string | null {
  if (g.tipo === 'barras' || g.tipo === 'dona') {
    const dist = distribucion(ctx, personas, (g.dato ?? g.pregunta)!, g.orden);
    const top = [...dist.cats].sort((a, b) => b.n - a.n)[0];
    return top ? `${g.titulo}: lo más frecuente es «${top.categoria}» (${pct(top.n, dist.n)} % de ${dist.n})` : null;
  }
  const filas = (g.preguntas ?? []).map(id => ({ id, d: distribucion(ctx, personas, id) }))
    .filter(f => f.d.n > 0).map(f => ({ ...f, p: porcentajeDestacado(f.d, g.destacar ?? []) }))
    .sort((a, b) => b.p.t - a.p.t);
  const top = filas[0];
  if (!top) return null;
  const nombre = ctx.preguntas.get(top.id)?.titulo ?? top.id;
  return `${g.titulo}: «${nombre}» encabeza con ${top.p.t} % (mujeres ${top.p.m} % · hombres ${top.p.h} %)`;
}
