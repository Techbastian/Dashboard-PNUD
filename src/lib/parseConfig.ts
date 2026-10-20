/**
 * (Se ejecuta en el BUILD, desde vite.config.ts — el navegador recibe JSON ya validado.)
 * Lee config/dashboard.config.md (D-14): extrae los bloques ```yaml y los une en un solo objeto.
 * El texto fuera de los bloques es documentación para humanos y se ignora.
 */
import { parse } from 'yaml';
import { MODULOS, type Modulo } from './modulos';

export interface Cifra { label: string; valor: string; ayuda?: string; color?: string }
export interface Meta { fase?: number; meta: string; actual: string; ayuda?: string }
/** Etapa de la ruta de la persona (D-37). `valor` = ruta del agregado público; `regla` = cómo se evalúa por persona
 *  en las vistas privadas (si falta, se deduce de `valor`; ver src/lib/etapas.ts). */
export interface Etapa { etapa: string; valor: string; regla?: string }
/** Marca de Participantes (D-44): columna ✓ que no es etapa de la ruta, p. ej. `hv` = hoja de vida cargada. */
export interface Marca { titulo: string; regla: string; ayuda?: string }
/** Tipo de evento que se puede crear en el Calendario (D-33). `etapa` = a qué etapa de la ruta suma asistir. */
export interface TipoEvento {
  tipo: string; label: string; descripcion?: string; modalidad?: 'Presencial' | 'Virtual' | 'Híbrida'; color?: string;
  /** El evento registra EMPRESAS asistentes (p. ej. sensibilización, D-40) además de personas. */
  empresas?: boolean;
}
export interface Distribucion { titulo: string; datos: string; nota?: string; grafico?: 'barras' | 'dona' }

/**
 * Pregunta de un formulario que cuenta la función pública (A-17). `bloque` = slug del formulario; `clave` = clave de la
 * respuesta (slug de la pregunta o los primeros 60 caracteres del texto). `grupo` agrupa preguntas en el informe.
 */
export interface Pregunta {
  id: string; bloque: string; clave?: string; titulo: string; grupo?: string; nota?: string;
  tipo: 'opcion' | 'escala' | 'multiple' | 'monto' | 'numero' | 'rango' | 'razon' | 'alguna';
  /** Universo condicional: solo quien respondió `en` en la pregunta `clave` del mismo bloque. */
  si?: { clave: string; en: string[]; texto?: string };
  rangos?: { hasta?: number; label: string }[];
  /** razon: clave del divisor. */ entre?: string;
  /** alguna: claves que se revisan y prefijos que cuentan (p. ej. ["4", "5"]). */ claves?: string[]; en?: string[];
}
/** Foco territorial (D-43): lo que no coincide se muestra como alerta, no se bloquea. */
export interface Foco { nombre: string; coincide: string[]; personas?: string; empresas?: string }
export interface CifraPestana {
  label: string; valor?: string; ayuda?: string;
  /** Nombre de la meta en cohort_goals → «de N» con barra. */ meta?: string;
  /** Denominador (ruta) → «de N <deLabel>», % y cuántas faltan. */ de?: string; deLabel?: string; faltan?: string;
  /** Texto con rutas entre llaves: "En {vacantes.empresas_con_vacantes} empresas". */ nota?: string;
  /** personas → tarjeta de alerta «fuera del foco»; empresas → agrega «N fuera del foco» a la nota. */ foco?: 'personas' | 'empresas';
}
export interface Grafico {
  titulo: string; nota?: string; tipo: 'barras' | 'dona' | 'apilada' | 'pareadas';
  datos?: string; pregunta?: string; preguntas?: string[];
  /** dona: lista de barras debajo (ruta). */ debajo?: string;
  /** barras: orden fijo de categorías (se muestran también las que están en 0). */ orden?: string[];
  /** apilada/pareadas: categorías que suman la cifra (exactas o prefijo numérico: "4" = «4 - Alto»). */ destacar?: string[];
  porGenero?: boolean; top?: number; paleta?: 'escala' | 'sino';
}
export interface Pestana {
  id: string; titulo: string;
  /** Bloques fijos de Hitos. */ alertaFoco?: boolean; metas?: boolean; embudo?: boolean;
  cifras: CifraPestana[]; graficos: Grafico[]; pie?: string;
}
export interface HojaInforme {
  nombre: string; descripcion?: string; contenido?: 'metas' | 'alertas';
  /** grupo de preguntas (Pregunta.grupo). */ preguntas?: string;
  listas?: { titulo: string; datos: string; nota?: string }[];
  cifras?: { label: string; valor: string }[];
}
export interface Informe { hojas: HojaInforme[] }

export interface DashboardConfig {
  identidad: {
    cohortId: string;
    nombre: string;
    subtitulo?: string;
    logoUrl?: string;
    colorPrimario?: string;
    colorAcento?: string;
    refrescoSegundos?: number;
    datosDePrueba?: boolean;
  };
  /** Documentos: [claves] = debe tener TODAS; { alguno: [claves] } = AL MENOS UNA (A-11). */
  grupos: Record<string, string[] | { alguno: string[] }>;
  /** D-44: etapa que se cumple por AL MENOS UNA condición → `uniones.<id>` en la función pública (A-20). */
  uniones: Record<string, string[]>;
  cifras: Cifra[];
  metas: Meta[];
  fases: Record<string, string>;
  embudo: Etapa[];
  participantes: { marcas: Marca[] };
  catalogo: TipoEvento[];
  distribuciones: Record<string, Distribucion[]>;
  secciones: string[];
  modulos: Modulo[];
  /** D-43: si hay pestañas, el Dashboard se arma con ellas y `secciones` se ignora. */
  pestanas: Pestana[];
  preguntas: Pregunta[];
  foco: Foco | null;
  informe: Informe;
}

export function parseConfigMd(md: string): DashboardConfig {
  const bloques = [...md.matchAll(/```ya?ml\s*\n([\s\S]*?)```/g)].map(m => m[1]);
  const obj: Record<string, unknown> = {};
  bloques.forEach((b, i) => {
    let data: unknown;
    try { data = parse(b); } catch (e) {
      throw new Error(`dashboard.config.md: el bloque yaml #${i + 1} no es válido — ${(e as Error).message}`);
    }
    if (data && typeof data === 'object' && !Array.isArray(data)) Object.assign(obj, data);
  });
  const c = obj as Partial<DashboardConfig>;
  if (!c.identidad?.cohortId) throw new Error('dashboard.config.md: falta identidad.cohortId');
  return {
    identidad: c.identidad,
    grupos: c.grupos ?? {},
    uniones: validarUniones(c.uniones, c.embudo),
    cifras: c.cifras ?? [],
    metas: c.metas ?? [],
    fases: Object.fromEntries(Object.entries(c.fases ?? {}).map(([k, v]) => [String(k), String(v)])),
    embudo: c.embudo ?? [],
    participantes: validarParticipantes(c.participantes),
    catalogo: validarCatalogo(c.catalogo),
    distribuciones: c.distribuciones ?? {},
    secciones: c.secciones ?? ['metas', 'cifras', 'embudo', 'personas'],
    modulos: validarModulos(c.modulos),
    ...validarPestanas(c.pestanas, c.preguntas, c.foco, c.informe),
  };
}

/** Condiciones que entiende la función pública en `uniones` (A-20) — mismas que las reglas por persona. */
const CONDICION = /^(formulario:[^|:\s]+|asistencia(:[A-Za-z0-9_-]+)?|matriculado)$/;
/** Reglas que sirven como marca de Participantes (por persona; src/lib/etapas.ts). */
const REGLA_MARCA = /^(hv|registro|matriculado|postulado|postulado_proyecto|colocado|formulario:[^|:\s]+|asistencia(_matriculado)?(:[A-Za-z0-9_-]+)?|documentos:[A-Za-z0-9_-]+)(\|.+)?$/;

function validarUniones(u: unknown, embudo: Etapa[] | undefined): Record<string, string[]> {
  const err = (m: string): never => { throw new Error(`dashboard.config.md: ${m}`); };
  if (u != null && (typeof u !== 'object' || Array.isArray(u))) err('uniones debe ser un mapa { id: [condiciones] }');
  const out: Record<string, string[]> = {};
  for (const [id, v] of Object.entries((u ?? {}) as Record<string, unknown>)) {
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) err(`uniones.${id}: el id solo admite letras, números, _ y -`);
    if (!Array.isArray(v) || v.length === 0 || v.length > 10) err(`uniones.${id} debe ser una lista de 1 a 10 condiciones`);
    out[id] = (v as unknown[]).map(x => String(x).trim());
    out[id].forEach(x => { if (!CONDICION.test(x)) err(`uniones.${id}: «${x}» no es una condición válida (formulario:<slug>, asistencia[:<tipo>], matriculado)`); });
  }
  if (Object.keys(out).length > 20) err('uniones: máximo 20 (límite de la función pública)');
  (embudo ?? []).forEach((e, i) => {
    const m = e?.valor?.match(/^uniones\.([^.]+)/);
    if (m && !out[m[1]]) err(`embudo[${i}] usa uniones.${m[1]}, pero no está en el bloque uniones`);
  });
  return out;
}

function validarParticipantes(p: unknown): { marcas: Marca[] } {
  const err = (m: string): never => { throw new Error(`dashboard.config.md: ${m}`); };
  const marcas = ((p as { marcas?: unknown } | undefined)?.marcas ?? []) as Partial<Marca>[];
  if (!Array.isArray(marcas)) err('participantes.marcas debe ser una lista');
  return {
    marcas: marcas.map((m, i) => {
      if (!m?.titulo || !m.regla) err(`participantes.marcas[${i}] necesita titulo y regla`);
      if (!REGLA_MARCA.test(m.regla!.trim())) err(`participantes.marcas[${i}]: regla «${m.regla}» no existe`);
      return { titulo: m.titulo!, regla: m.regla!.trim(), ayuda: m.ayuda };
    }),
  };
}

const TIPOS_PREGUNTA = ['opcion', 'escala', 'multiple', 'monto', 'numero', 'rango', 'razon', 'alguna'];
const TIPOS_GRAFICO = ['barras', 'dona', 'apilada', 'pareadas'];

function validarPestanas(p: unknown, q: unknown, f: unknown, inf: unknown) {
  const err = (m: string): never => { throw new Error(`dashboard.config.md: ${m}`); };
  if (q != null && !Array.isArray(q)) err('preguntas debe ser una lista');
  const preguntas = ((q ?? []) as Partial<Pregunta>[]).map((x, i) => {
    if (!x?.id || !/^[A-Za-z0-9_.-]{1,80}$/.test(x.id)) err(`preguntas[${i}].id falta o tiene caracteres no válidos`);
    if (!x.bloque) err(`preguntas[${i}] (${x.id}) necesita bloque (slug del formulario)`);
    const tipo = x.tipo ?? 'opcion';
    if (!TIPOS_PREGUNTA.includes(tipo)) err(`preguntas[${i}].tipo «${tipo}» no existe (válidos: ${TIPOS_PREGUNTA.join(', ')})`);
    if (tipo === 'alguna' ? !x.claves?.length || !x.en?.length : !x.clave) err(`preguntas[${i}] (${x.id}) necesita ${tipo === 'alguna' ? 'claves y en' : 'clave'}`);
    if (['monto', 'numero', 'rango', 'razon'].includes(tipo) && !x.rangos?.length) err(`preguntas[${i}] (${x.id}) necesita rangos`);
    if (tipo === 'razon' && !x.entre) err(`preguntas[${i}] (${x.id}) necesita entre`);
    return { ...x, tipo, titulo: x.titulo ?? x.id } as Pregunta;
  });
  const ids = new Set(preguntas.map(x => x.id));
  if (ids.size !== preguntas.length) err('preguntas: hay ids repetidos');
  if (preguntas.length > 200) err('preguntas: máximo 200 (límite de la función pública)');
  const existe = (id: string, donde: string) => { if (!ids.has(id)) err(`${donde}: la pregunta «${id}» no está en preguntas`); };

  let foco: Foco | null = null;
  if (f != null) {
    const x = f as Partial<Foco>;
    if (!x.nombre || !Array.isArray(x.coincide) || !x.coincide.length) err('foco necesita nombre y coincide (lista)');
    if (x.personas) existe(x.personas, 'foco.personas');
    foco = { nombre: x.nombre!, coincide: x.coincide!.map(String), personas: x.personas, empresas: x.empresas };
  }

  if (p != null && !Array.isArray(p)) err('pestanas debe ser una lista');
  const pestanas = ((p ?? []) as Partial<Pestana>[]).map((x, i) => {
    if (!x?.id || !x.titulo) err(`pestanas[${i}] necesita id y titulo`);
    const graficos = (x.graficos ?? []).map((g, j) => {
      const donde = `pestanas[${i}].graficos[${j}]`;
      if (!g?.titulo || !TIPOS_GRAFICO.includes(g.tipo)) err(`${donde} necesita titulo y tipo (${TIPOS_GRAFICO.join(', ')})`);
      if (!g.datos && !g.pregunta && !g.preguntas?.length) err(`${donde} necesita datos, pregunta o preguntas`);
      if (g.pregunta) existe(g.pregunta, donde);
      g.preguntas?.forEach(id => existe(id, donde));
      return g;
    });
    const cifras = (x.cifras ?? []).map((c, j) => {
      if (!c?.label || (!c.valor && c.foco !== 'personas')) err(`pestanas[${i}].cifras[${j}] necesita label y valor`);
      if (c.foco && !foco) err(`pestanas[${i}].cifras[${j}] usa foco, pero falta el bloque foco`);
      return c;
    });
    if (x.alertaFoco && !foco) err(`pestanas[${i}].alertaFoco necesita el bloque foco`);
    return { ...x, cifras, graficos } as Pestana;
  });

  const hojas = (((inf as Partial<Informe> | undefined)?.hojas) ?? []).map((h, i) => {
    if (!h?.nombre) err(`informe.hojas[${i}] necesita nombre`);
    if (h.preguntas && !preguntas.some(x => x.grupo === h.preguntas)) err(`informe.hojas[${i}]: ninguna pregunta tiene grupo «${h.preguntas}»`);
    return h;
  });
  return { pestanas, preguntas, foco, informe: { hojas } };
}

function validarModulos(m: unknown): Modulo[] {
  if (m == null) return [...MODULOS];
  if (!Array.isArray(m)) throw new Error('dashboard.config.md: modulos debe ser una lista');
  const malos = m.filter(x => !(MODULOS as readonly string[]).includes(String(x)));
  if (malos.length) throw new Error(`dashboard.config.md: módulos desconocidos: ${malos.join(', ')} (válidos: ${MODULOS.join(', ')})`);
  const lista = m.map(String) as Modulo[];
  return lista.includes('dashboard') ? lista : ['dashboard', ...lista];
}

function validarCatalogo(c: unknown): TipoEvento[] {
  if (c == null) return [];
  if (!Array.isArray(c)) throw new Error('dashboard.config.md: catalogo debe ser una lista de { tipo, label }');
  return c.map((x, i) => {
    const t = x as Partial<TipoEvento>;
    if (!t?.tipo || !t?.label) throw new Error(`dashboard.config.md: catalogo[${i}] necesita tipo y label`);
    if (!/^[a-z0-9_-]+$/.test(t.tipo)) throw new Error(`dashboard.config.md: catalogo[${i}].tipo «${t.tipo}» solo admite minúsculas, números, - y _`);
    return { tipo: t.tipo, label: t.label, descripcion: t.descripcion, modalidad: t.modalidad, color: t.color, empresas: Boolean(t.empresas) };
  });
}
