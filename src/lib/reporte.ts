/**
 * Reporte ejecutivo de población (D-74, v2 D-75): se cuenta persona por persona desde la capa privada (useCohorte), con
 * el mismo criterio que la función pública (A-17) para cada tipo de pregunta, pero con rango de fechas de registro,
 * cruces y sin respuestas vacías:
 *   · universo = personas registradas en el rango que respondieron TODOS los formularios de `reporte.completos`
 *     (p. ej. registro y línea base). No se usa estadoFormulario (D-71): los formularios ganan preguntas obligatorias
 *     después de que la gente se registró y, con esa regla, en PNUD no quedaba nadie (0 de 195, 30-oct);
 *   · en cada gráfico solo entra quien respondió (sin «Sin dato», sin respuestas no numéricas ni fuera de rango);
 *     el % es sobre esas personas y el gráfico dice cuántas son y a cuántas les aplicaba la pregunta.
 * D-75 suma: preguntas del bloque `perfil` (datos sociodemográficos del registro de la plataforma), la matriz del plan de
 * acción (`nec:<id>`), los grupos perfilados (`grupo:<id>`), la prioridad, cruces de una pregunta por columnas y la
 * calidad del dato (baja respuesta y «Otros» sin especificar).
 * Nada del proyecto aquí: las páginas, preguntas, necesidades y grupos vienen de `config.reporte`.
 */
import { config, type DatoReporte, type GraficoReporte, type Necesidad, type Pregunta, type SenalNecesidad } from './config';
import { BLOQUE_PERFIL, DATOS_REPORTE } from './parseConfig';
import { respuestaDe, type DatosCohorte, type Formulario, type Persona } from './datos';
import { destaca } from './respuestas';
import { diaBogota } from './formato';

export interface Cat { categoria: string; n: number; m: number; h: number }
/** Distribución de una variable: categorías en orden, cuántas personas respondieron (total, mujeres, hombres) y a
 *  cuántas les aplicaba (`u`: estaban en el universo de la pregunta, respondieran o no). */
export interface Dist { cats: Cat[]; n: number; m: number; h: number; u: number }

export const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const lleno = (v: unknown) => v != null && String(v).trim() !== '';
/** «Otro», «Otros», «Otra actividad»… (respuesta sin especificar en listas cerradas). */
export const esOtros = (c: string) => /^otr[oa]s?\b/.test(norm(c));

export const esMujer = (p: Persona) => p.genero === 'Femenino';
export const esHombre = (p: Persona) => p.genero === 'Masculino';

const EDADES = ['Menor de 18', '18 a 24', '25 a 29', '30 a 39', '40 a 49', '50 a 59', '60 o más'];
export function edadDe(nacimiento: string | null): number | null {
  if (!nacimiento || !/^\d{4}-\d{2}-\d{2}/.test(nacimiento)) return null;
  const [y, m, d] = nacimiento.slice(0, 10).split('-').map(Number);
  const [hy, hm, hd] = diaBogota(new Date().toISOString()).split('-').map(Number);
  const e = hy - y - (hm < m || (hm === m && hd < d) ? 1 : 0);
  return e < 14 || e > 90 ? null : e; // igual que la función pública: fuera de rango = sin dato
}
function rangoEdad(nacimiento: string | null): string | null {
  const e = edadDe(nacimiento);
  if (e == null) return null;
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

/** De dónde sale una pregunta para una persona: el formulario (con sus opciones) o el perfil del registro. null = no aplica. */
function fuenteDe(ctx: Contexto, p: Persona, q: Pregunta): { leer: (clave: string) => unknown; opciones: string[] } | null {
  if (q.bloque === BLOQUE_PERFIL) return { leer: k => p.perfil?.[k], opciones: Object.values(q.etiquetas ?? {}) };
  const fm = formularioDe(ctx.d, q.bloque);
  const r = fm ? p.respuestas[fm.bloque] : undefined;
  if (!fm || !r) return null;
  const opciones = fm.preguntas.find(x => x.clave.replace(/_+$/, '') === q.clave?.replace(/_+$/, ''))?.opciones ?? [];
  return { leer: k => crudo(fm, r, k), opciones };
}

/**
 * Categorías de una persona en una variable (dato del registro, pregunta, `nec:<id>`, `grupo:<id>` o `prioridad`).
 * null = no está en el universo de la pregunta (no tiene el formulario o no cumple `si`); [] = no respondió (no se cuenta).
 */
export function valoresDe(ctx: Contexto, p: Persona, variable: string): string[] | null {
  if ((DATOS_REPORTE as readonly string[]).includes(variable)) {
    const dato = variable as DatoReporte;
    const v = dato === 'genero' ? p.genero : dato === 'edad' ? rangoEdad(p.nacimiento) : dato === 'municipio' ? p.ciudad : p.nivel;
    return lleno(v) ? [String(v).trim()] : [];
  }
  if (variable.startsWith('nec:')) {
    const n = config.reporte?.necesidades.find(x => x.id === variable.slice(4));
    const v = n ? necesidadDe(ctx, p, n) : null;
    return v == null ? [] : [v ? 'Sí' : 'No'];
  }
  if (variable.startsWith('grupo:')) { const v = grupoDe(ctx, p, variable.slice(6)); return v == null ? [] : [v ? 'Sí' : 'No']; }
  if (variable === 'prioridad') { const v = prioridadDe(ctx, p); return v == null ? [] : [v ? 'Sí' : 'No']; }

  const q = ctx.preguntas.get(variable);
  const f = q ? fuenteDe(ctx, p, q) : null;
  if (!q || !f) return null;
  if (q.si) {
    const en = q.si.en.map(norm);
    if (!lista(f.leer(q.si.clave)).some(v => en.includes(norm(v)))) return null;
  }
  if (q.tipo === 'alguna') {
    const vs = (q.claves ?? []).map(k => f.leer(k)).filter(lleno).map(String);
    if (!vs.length) return [];
    return [vs.some(v => (q.en ?? []).some(e => v.trim().startsWith(e.trim()))) ? 'Sí' : 'No'];
  }
  if (q.tipo === 'monto' || q.tipo === 'numero' || q.tipo === 'rango' || q.tipo === 'razon') {
    let v = numero(f.leer(q.clave!));
    if (v != null && q.tipo === 'razon') { const b = numero(f.leer(q.entre!)); v = b ? v / b : null; }
    if (v == null) return [];
    const rg = (q.rangos ?? []).find(x => x.hasta == null || v! <= x.hasta);
    return rg ? [rg.label] : [];
  }
  // opcion / escala / multiple: con la etiqueta de la config o del formulario (sin importar mayúsculas ni espacios).
  const vs = lista(f.leer(q.clave!)).map(v => q.etiquetas?.[v] ?? f.opciones.find(o => norm(o) === norm(v)) ?? v);
  return q.tipo === 'multiple' ? [...new Set(vs)] : vs.slice(0, 1);
}

// ── Matriz del plan de acción (D-75) ──

/** true = la persona da la señal; false = respondió y no la da; null = no respondió o no le aplica. */
function cumple(ctx: Contexto, p: Persona, s: SenalNecesidad): boolean | null {
  const vs = valoresDe(ctx, p, s.pregunta);
  if (!vs?.length) return null;
  return vs.some(v => destaca(v, s.en));
}
function senalCumple(ctx: Contexto, p: Persona, s: Necesidad['senales'][number]): boolean | null {
  if (!('todas' in s)) return cumple(ctx, p, s);
  const r = s.todas.map(t => cumple(ctx, p, t));
  if (r.some(x => x === false)) return false;
  return r.every(x => x === true) ? true : null;
}
/** Sí / No / sin dato (ver Necesidad en parseConfig). */
export function necesidadDe(ctx: Contexto, p: Persona, n: Necesidad): boolean | null {
  const r = n.senales.map(s => senalCumple(ctx, p, s));
  if (r.some(x => x === true)) return true;
  return r.some(x => x === false) ? false : null;
}
const textoSenal = (ctx: Contexto, s: SenalNecesidad) => `${ctx.preguntas.get(s.pregunta)?.titulo ?? s.pregunta} → ${s.en.join(' o ')}`;
/** Señales que la persona cumple en una necesidad (para el Excel por persona). */
export function senalesDe(ctx: Contexto, p: Persona, n: Necesidad): string[] {
  return n.senales.filter(s => senalCumple(ctx, p, s) === true)
    .map(s => ('todas' in s ? s.todas.map(t => textoSenal(ctx, t)).join(' y ') : textoSenal(ctx, s)));
}
export function grupoDe(ctx: Contexto, p: Persona, id: string): boolean | null {
  const rep = config.reporte;
  const g = rep?.grupos.find(x => x.id === id);
  if (!rep || !g) return null;
  const nec = (ids: string[]) => ids.map(i => rep.necesidades.find(n => n.id === i)).filter(Boolean).map(n => necesidadDe(ctx, p, n!));
  if (g.ninguna) {
    const r = nec(rep.necesidades.map(n => n.id));
    if (r.some(x => x === true)) return false;
    return r.some(x => x === false) ? true : null;
  }
  const r = nec(g.necesidades ?? []);
  if (r.some(x => x === true)) return true;
  return r.some(x => x === false) ? false : null;
}
export function prioridadDe(ctx: Contexto, p: Persona): boolean | null {
  const pr = config.reporte?.prioridad;
  if (!pr) return null;
  if (pr.mujeres && !esMujer(p)) return false;
  const r = pr.senales.map(s => cumple(ctx, p, s));
  if (r.some(x => x === false)) return false;
  return r.every(x => x === true) ? true : null;
}

// ── Distribuciones ──

/** Orden natural de las categorías de una variable (formulario, rangos, etiquetas o fijo); null = por frecuencia. */
export function ordenDe(ctx: Contexto, variable: string, fijo?: string[]): string[] | null {
  if (fijo?.length) return fijo;
  if (variable === 'edad') return EDADES;
  if (variable.startsWith('nec:') || variable.startsWith('grupo:') || variable === 'prioridad') return ['Sí', 'No'];
  const q = ctx.preguntas.get(variable);
  if (!q) return null;
  if (q.tipo === 'alguna') return ['Sí', 'No'];
  if (q.rangos?.length) return q.rangos.map(r => r.label);
  if (q.etiquetas && q.tipo !== 'multiple') return [...new Set(Object.values(q.etiquetas))];
  const fm = formularioDe(ctx.d, q.bloque);
  const op = fm?.preguntas.find(x => x.clave.replace(/_+$/, '') === q.clave?.replace(/_+$/, ''))?.opciones;
  return op?.length && q.tipo !== 'multiple' ? op : null;
}

export function distribucion(ctx: Contexto, personas: Persona[], variable: string, fijo?: string[]): Dist {
  const mapa = new Map<string, Cat>();
  let n = 0, m = 0, h = 0, u = 0;
  for (const p of personas) {
    const vs = valoresDe(ctx, p, variable);
    if (vs == null) continue;
    u++;
    if (!vs.length) continue;
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
  return { cats, n, m, h, u };
}

/** % de quienes respondieron que marcan alguna categoría de `destacar` (total, mujeres, hombres). */
export function porcentajeDestacado(dist: Dist, destacar: string[]) {
  const sel = dist.cats.filter(c => destaca(c.categoria, destacar));
  const suma = (k: 'n' | 'm' | 'h') => sel.reduce((s, c) => s + c[k], 0);
  return { t: pct(suma('n'), dist.n), m: pct(suma('m'), dist.m), h: pct(suma('h'), dist.h), n: dist.n, k: suma('n') };
}

export const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export interface Universo { personas: Persona[]; periodo: Persona[]; enRango: number; incompletas: number }

/** Personas registradas entre `desde` y `hasta` (días de Bogotá, inclusivos) que respondieron todos los formularios de `completos`. */
export function universo(d: DatosCohorte, desde: string | null, hasta: string | null): Universo {
  const periodo = d.personas.filter(p => {
    if (!p.registradaEl) return !desde && !hasta;
    const dia = diaBogota(p.registradaEl);
    return (!desde || dia >= desde) && (!hasta || dia <= hasta);
  });
  const forms = (config.reporte?.completos ?? []).map(s => formularioDe(d, s));
  const tiene = (r: Record<string, unknown> | undefined) => r != null && Object.values(r).some(lleno);
  const personas = periodo.filter(p => forms.every(f => f != null && tiene(p.respuestas[f.bloque])));
  return { personas, periodo, enRango: periodo.length, incompletas: periodo.length - personas.length };
}

// ── Cruces ──

export const MIN_COLUMNA = 5;
export interface Cruce { cols: Cat[]; filas: { id: string; label: string; celdas: (number | null)[] }[] }

/**
 * Columnas = categorías de `por` con MIN_COLUMNA personas o más. Con `preguntas`: una fila por pregunta y celda = % de
 * la columna que marca `destacar`. Con `pregunta`: una fila por categoría y celda = % de la columna que la marca.
 */
export function calcularCruce(ctx: Contexto, personas: Persona[], g: GraficoReporte): Cruce {
  const cols = distribucion(ctx, personas, g.por!, g.orden).cats.filter(c => c.n >= MIN_COLUMNA); // orden = el de las columnas
  const grupo = (cat: string) => personas.filter(p => valoresDe(ctx, p, g.por!)?.some(v => norm(v) === norm(cat)));
  const porCol = cols.map(c => ({ c, ps: grupo(c.categoria) }));
  const titulo = (id: string) => ctx.preguntas.get(id)?.titulo ?? config.reporte?.necesidades.find(n => `nec:${n.id}` === id)?.titulo
    ?? config.reporte?.grupos.find(x => `grupo:${x.id}` === id)?.titulo ?? id;
  let filas: Cruce['filas'];
  if (g.pregunta) {
    const total = distribucion(ctx, personas, g.pregunta);
    const dists = porCol.map(({ ps }) => distribucion(ctx, ps, g.pregunta!));
    filas = total.cats.filter(c => !(g.apartarOtros && esOtros(c.categoria))).slice(0, g.top ?? 99).map(c => ({
      id: c.categoria, label: c.categoria,
      celdas: dists.map(d => (d.n ? pct(d.cats.find(x => norm(x.categoria) === norm(c.categoria))?.n ?? 0, d.n) : null)),
    }));
  } else {
    filas = (g.preguntas ?? []).map(id => ({
      id, label: titulo(id),
      celdas: porCol.map(({ ps }) => { const d = distribucion(ctx, ps, id); return d.n ? porcentajeDestacado(d, g.destacar!).t : null; }),
    })).filter(f => f.celdas.some(x => x != null))
      .sort((a, b) => Math.max(...b.celdas.map(x => x ?? 0)) - Math.max(...a.celdas.map(x => x ?? 0)));
  }
  return { cols, filas };
}

// ── Necesidades y grupos (tablas) ──

export interface FilaNecesidad { id: string; titulo: string; apoyo?: string; t: number; m: number; h: number; k: number; n: number }
export function tablaNecesidades(ctx: Contexto, personas: Persona[]): FilaNecesidad[] {
  return (config.reporte?.necesidades ?? []).map(nd => {
    const d = distribucion(ctx, personas, `nec:${nd.id}`);
    return { id: nd.id, titulo: nd.titulo, apoyo: nd.apoyo, ...porcentajeDestacado(d, ['Sí']) };
  }).sort((a, b) => b.t - a.t);
}
export interface FilaGrupo { id: string; titulo: string; quienes?: string; servicio?: string; k: number; t: number; mujeres: number; prioridad: number | null; n: number }
export function tablaGrupos(ctx: Contexto, personas: Persona[]): FilaGrupo[] {
  const rep = config.reporte;
  return (rep?.grupos ?? []).map(g => {
    const dentro = personas.filter(p => grupoDe(ctx, p, g.id) === true);
    const n = personas.filter(p => grupoDe(ctx, p, g.id) != null).length;
    return {
      id: g.id, titulo: g.titulo, quienes: g.quienes, servicio: g.servicio, k: dentro.length, t: pct(dentro.length, n), n,
      mujeres: pct(dentro.filter(esMujer).length, dentro.length),
      prioridad: rep?.prioridad ? dentro.filter(p => prioridadDe(ctx, p) === true).length : null,
    };
  });
}

// ── Hallazgos ──

const tituloDe = (ctx: Contexto, id: string) => ctx.preguntas.get(id)?.titulo ?? id;
/** Lectura de una línea de un gráfico, para los hallazgos clave. null = sin datos. */
export function lectura(ctx: Contexto, personas: Persona[], g: GraficoReporte): string | null {
  if (g.tipo === 'barras' || g.tipo === 'dona') {
    const dist = distribucion(ctx, personas, (g.dato ?? g.pregunta)!, g.orden);
    const top = [...dist.cats].filter(c => !(g.apartarOtros && esOtros(c.categoria))).sort((a, b) => b.n - a.n)[0];
    if (!top) return null;
    const genero = g.porGenero !== false && g.dato !== 'genero' && dist.m && dist.h ? ` · mujeres ${pct(top.m, dist.m)} % · hombres ${pct(top.h, dist.h)} %` : '';
    return `${g.titulo}: lo más frecuente es «${top.categoria}» (${pct(top.n, dist.n)} % de ${dist.n}${genero})`;
  }
  if (g.tipo === 'necesidades') {
    const top = tablaNecesidades(ctx, personas)[0];
    return top && top.n ? `Necesidad más frecuente del plan de acción: «${top.titulo}» (${top.t} % · mujeres ${top.m} % · hombres ${top.h} %)` : null;
  }
  if (g.tipo === 'grupos') {
    const filas = tablaGrupos(ctx, personas).filter(f => f.n);
    const top = [...filas].filter(f => !config.reporte?.grupos.find(x => x.id === f.id)?.ninguna).sort((a, b) => b.k - a.k)[0];
    const listo = filas.find(f => config.reporte?.grupos.find(x => x.id === f.id)?.ninguna);
    const partes = [top && `el grupo más grande es «${top.titulo}» (${top.k} personas, ${top.t} %)`, listo && `«${listo.titulo}»: ${listo.k} (${listo.t} %)`].filter(Boolean);
    return partes.length ? `Grupos perfilados: ${partes.join('; ')}` : null;
  }
  if (g.tipo === 'embudo') return null;
  if (g.tipo === 'cruce') {
    const c = calcularCruce(ctx, personas, g);
    let best: { f: string; col: string; v: number } | null = null;
    c.filas.forEach(f => f.celdas.forEach((v, i) => { if (v != null && (!best || v > best.v)) best = { f: f.label, col: c.cols[i].categoria, v }; }));
    const b = best as { f: string; col: string; v: number } | null;
    return b ? `${g.titulo}: el valor más alto es «${b.f}» en «${b.col}» (${b.v} %)` : null;
  }
  if (!g.destacar?.length) return null; // apilada sin destacar: no hay un % que leer
  const filas = (g.preguntas ?? []).map(id => ({ id, d: distribucion(ctx, personas, id) }))
    .filter(f => f.d.n > 0).map(f => ({ ...f, p: porcentajeDestacado(f.d, g.destacar ?? []) }))
    .sort((a, b) => b.p.t - a.p.t);
  const top = filas[0];
  if (!top) return null;
  return `${g.titulo}: «${tituloDe(ctx, top.id)}» encabeza con ${top.p.t} % (mujeres ${top.p.m} % · hombres ${top.p.h} %)`;
}

// ── Calidad del dato ──

export interface FilaCalidad { id: string; titulo: string; aplica: number; respondieron: number; tasa: number; otros: number | null }
/**
 * Preguntas del reporte con respuesta baja (menos del 90 % de a quienes aplica) u «Otros» sin especificar (15 % o más):
 * insumo para ajustar los formularios. Solo preguntas (no datos del registro ni variables calculadas).
 */
export function tablaCalidad(ctx: Contexto, personas: Persona[]): FilaCalidad[] {
  const ids = new Set<string>();
  for (const p of config.reporte?.paginas ?? []) for (const g of p.graficos) {
    if (g.pregunta) ids.add(g.pregunta);
    g.preguntas?.forEach(x => ids.add(x));
  }
  return [...ids].filter(id => ctx.preguntas.has(id)).map(id => {
    const d = distribucion(ctx, personas, id);
    const q = ctx.preguntas.get(id)!;
    const conOtros = q.tipo === 'opcion' || q.tipo === 'multiple'
      ? personas.filter(p => valoresDe(ctx, p, id)?.some(esOtros)).length : 0;
    return { id, titulo: q.titulo, aplica: d.u, respondieron: d.n, tasa: pct(d.n, d.u), otros: conOtros ? pct(conOtros, d.n) : null };
  }).filter(f => f.aplica > 0 && (f.tasa < 90 || (f.otros ?? 0) >= 15))
    .sort((a, b) => a.tasa - b.tasa || (b.otros ?? 0) - (a.otros ?? 0));
}
