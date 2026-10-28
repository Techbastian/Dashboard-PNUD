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
export interface Etapa { etapa: string; valor: string; regla?: string; /** D-65: aclaración que va entre paréntesis en Participantes y Excel, p. ej. «línea base». */ detalle?: string }
/** Marca de Participantes (D-44): columna ✓ que no es etapa de la ruta, p. ej. `hv` = hoja de vida cargada.
 *  `despues` (D-60) = nombre de la etapa tras la cual va la columna; sin él, va antes de las etapas. */
export interface Marca { titulo: string; regla: string; ayuda?: string; despues?: string }
/** Vista rápida de Participantes (D-65): columnas (etapas o marcas, por su nombre) que deben tener ✓ (`con`) o — (`sin`). */
export interface Vista { titulo: string; con: string[]; sin: string[] }
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
  /** linea (D-62): serie por día (`datos` = lista de {fecha, n}, p. ej. registros_por_dia), a todo el ancho. */
  titulo: string; nota?: string; tipo: 'barras' | 'dona' | 'apilada' | 'pareadas' | 'linea';
  datos?: string; pregunta?: string; preguntas?: string[];
  /** dona: lista de barras debajo (ruta). */ debajo?: string;
  /** barras: orden fijo de categorías (se muestran también las que están en 0). */ orden?: string[];
  /** apilada/pareadas: categorías que suman la cifra (exactas o prefijo numérico: "4" = «4 - Alto»). */ destacar?: string[];
  porGenero?: boolean; top?: number; paleta?: 'escala' | 'sino';
}
/**
 * Hito del contrato (D-55): meta, % que activa el pago (`umbral`) y fecha estimada. Sin montos (decisión de Sebastián).
 * `documental` = entregable sin cifra (pólizas, informes): lo marca el equipo con `cumplido: true` en la config.
 */
export interface Hito {
  numero: number; titulo: string; fecha?: string; grupo?: string; ayuda?: string;
  meta?: number; valor?: string; umbral?: number; documental?: boolean; cumplido?: boolean;
  /** D-57: qué mide el hito y cómo se cuenta; se muestra en un globo al pasar el mouse (o enfocar/tocar la tarjeta). */
  explicacion?: string;
}
export interface Pestana {
  id: string; titulo: string;
  /** Bloques fijos de Hitos. */ alertaFoco?: boolean; metas?: boolean; embudo?: boolean;
  /** D-55: tarjetas de los hitos del contrato (bloque `hitos`). */ hitos?: boolean;
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
  /** D-44 marcas; D-52 motivos de inactivación (deserción interna). */
  participantes: { marcas: Marca[]; motivos: Motivo[]; vistas: Vista[] };
  catalogo: TipoEvento[];
  distribuciones: Record<string, Distribucion[]>;
  secciones: string[];
  modulos: Modulo[];
  /** D-43: si hay pestañas, el Dashboard se arma con ellas y `secciones` se ignora. */
  pestanas: Pestana[];
  /** D-55: hitos de pago del contrato. */
  hitos: Hito[];
  preguntas: Pregunta[];
  foco: Foco | null;
  informe: Informe;
  /** D-61: `diagnostico: true` = el módulo Empresas registra el enlace al diagnóstico de cada empresa (A-31).
   *  D-64: `sensibilizada` = qué hace sensibilizada a una empresa: asistir a un evento para empresas (`evento`, por
   *  defecto) o tener diagnóstico (`diagnostico`; exige `diagnostico: true`). */
  empresas: { diagnostico: boolean; sensibilizada: 'evento' | 'diagnostico' };
  /** D-69: correo de resumen diario (n8n). Se publica como `resumen-diario.json` en el build. */
  resumenDiario: ResumenDiario;
}

/** D-69: cifras que trae `dashboard_resumen_diario` (A-42) y que el correo sabe mostrar. */
export const METRICAS_RESUMEN = ['registros', 'matriculas', 'asistencias', 'eventos_realizados', 'eventos_creados',
  'empresas_vinculadas', 'diagnosticos', 'empresas_con_asistencia', 'vacantes', 'postulaciones', 'colocaciones',
  'llamadas', 'inactivos'] as const;
export interface ResumenDiario {
  /** slug del formulario → nombre en el correo. Un formulario que no esté aquí no sale. */
  formularios: Record<string, string>;
  /** métrica → nombre propio del proyecto (p. ej. registros: Jóvenes registrados). */
  etiquetas: Record<string, string>;
  /** métricas que no aplican al proyecto. */
  ocultar: string[];
  /** métrica → nota: la cifra se calcula distinto que en el dashboard y el correo la marca con ⚠. */
  alertas: Record<string, string>;
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
    participantes: validarParticipantes(c.participantes, c.embudo, c.uniones),
    catalogo: validarCatalogo(c.catalogo),
    distribuciones: c.distribuciones ?? {},
    secciones: c.secciones ?? ['metas', 'cifras', 'embudo', 'personas'],
    modulos: validarModulos(c.modulos),
    ...validarPestanas(c.pestanas, c.preguntas, c.foco, c.informe),
    hitos: validarHitos(c.hitos),
    empresas: validarEmpresas(c.empresas),
    resumenDiario: validarResumenDiario(c.resumenDiario),
  };
}

function validarResumenDiario(r: unknown): ResumenDiario {
  const err = (m: string): never => { throw new Error(`dashboard.config.md: resumenDiario.${m}`); };
  const x = (r ?? {}) as { formularios?: unknown; etiquetas?: unknown; ocultar?: unknown; alertas?: unknown };
  const mapa = (v: unknown, nombre: string): Record<string, string> => {
    if (v == null) return {};
    if (typeof v !== 'object' || Array.isArray(v)) return err(`${nombre} debe ser un mapa clave: nombre`);
    return Object.fromEntries(Object.entries(v).map(([k, t]) => [k, String(t)]));
  };
  const etiquetas = mapa(x.etiquetas, 'etiquetas');
  const ocultar = x.ocultar == null ? [] : Array.isArray(x.ocultar) ? x.ocultar.map(String) : err('ocultar debe ser una lista');
  const alertas = mapa(x.alertas, 'alertas');
  // un formulario se nombra `formulario:<slug>`
  const malas = [...Object.keys(etiquetas), ...ocultar, ...Object.keys(alertas)]
    .filter(k => !k.startsWith('formulario:') && !(METRICAS_RESUMEN as readonly string[]).includes(k));
  if (malas.length) err(`métricas desconocidas: ${malas.join(', ')} (válidas: ${METRICAS_RESUMEN.join(', ')} o formulario:<slug>)`);
  return { formularios: mapa(x.formularios, 'formularios'), etiquetas, ocultar, alertas };
}

function validarEmpresas(e: unknown): DashboardConfig['empresas'] {
  const x = (e ?? {}) as { diagnostico?: unknown; sensibilizada?: unknown };
  const diagnostico = x.diagnostico === true;
  const sensibilizada = x.sensibilizada ?? 'evento';
  if (sensibilizada !== 'evento' && sensibilizada !== 'diagnostico')
    throw new Error(`dashboard.config.md: empresas.sensibilizada «${String(sensibilizada)}» no es válido (evento | diagnostico)`);
  if (sensibilizada === 'diagnostico' && !diagnostico)
    throw new Error('dashboard.config.md: empresas.sensibilizada: diagnostico exige empresas.diagnostico: true');
  return { diagnostico, sensibilizada };
}

/** Condiciones que entiende la función pública en `uniones` (A-20; v13 A-41: + documentos y asistencia_matriculado) — mismas que las reglas por persona. */
const CONDICION = /^(formulario:[^|:\s]+|asistencia(_matriculado)?(:[A-Za-z0-9_-]+)?|matriculado|documentos:[A-Za-z0-9_-]+)$/;
/** Reglas que sirven como marca de Participantes (por persona; src/lib/etapas.ts). */
const REGLA_MARCA = /^(hv|registro|matriculado|postulado|postulado_proyecto|colocado|formulario:[^|:\s]+|asistencia(_matriculado)?(:[A-Za-z0-9_-]+)?|documentos:[A-Za-z0-9_-]+|union:[A-Za-z0-9_-]+)(\|.+)?$/;

function validarUniones(u: unknown, embudo: Etapa[] | undefined): Record<string, string[]> {
  const err = (m: string): never => { throw new Error(`dashboard.config.md: ${m}`); };
  if (u != null && (typeof u !== 'object' || Array.isArray(u))) err('uniones debe ser un mapa { id: [condiciones] }');
  const out: Record<string, string[]> = {};
  for (const [id, v] of Object.entries((u ?? {}) as Record<string, unknown>)) {
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) err(`uniones.${id}: el id solo admite letras, números, _ y -`);
    if (!Array.isArray(v) || v.length === 0 || v.length > 10) err(`uniones.${id} debe ser una lista de 1 a 10 condiciones`);
    out[id] = (v as unknown[]).map(x => String(x).trim());
    out[id].forEach(x => { if (!CONDICION.test(x)) err(`uniones.${id}: «${x}» no es una condición válida (formulario:<slug>, asistencia[:<tipo>], asistencia_matriculado[:<tipo>], matriculado, documentos:<grupo>)`); });
  }
  if (Object.keys(out).length > 20) err('uniones: máximo 20 (límite de la función pública)');
  (embudo ?? []).forEach((e, i) => {
    const m = e?.valor?.match(/^uniones\.([^.]+)/);
    if (m && !out[m[1]]) err(`embudo[${i}] usa uniones.${m[1]}, pero no está en el bloque uniones`);
  });
  return out;
}

/** Motivo de inactivación (D-52). `id` va a participant_status_log.motivo. */
export interface Motivo { id: string; label: string }
export const MOTIVOS_POR_DEFECTO: Motivo[] = [
  { id: 'no_contactable', label: 'No contactable' }, { id: 'consiguio_empleo', label: 'Consiguió empleo' },
  { id: 'tiempo_horario', label: 'Tiempo u horario' }, { id: 'razones_personales', label: 'Razones personales o de salud' },
  { id: 'cambio_ciudad', label: 'Cambio de ciudad' }, { id: 'perdio_interes', label: 'Perdió interés' },
  { id: 'no_cumple_requisitos', label: 'No cumple requisitos' }, { id: 'otro', label: 'Otro' },
];

function validarParticipantes(p: unknown, embudo: Etapa[] | undefined, uniones: unknown): DashboardConfig['participantes'] {
  const err = (m: string): never => { throw new Error(`dashboard.config.md: ${m}`); };
  const marcas = ((p as { marcas?: unknown } | undefined)?.marcas ?? []) as Partial<Marca>[];
  if (!Array.isArray(marcas)) err('participantes.marcas debe ser una lista');
  const out = marcas.map((m, i) => {
    if (!m?.titulo || !m.regla) err(`participantes.marcas[${i}] necesita titulo y regla`);
    if (!REGLA_MARCA.test(m.regla!.trim())) err(`participantes.marcas[${i}]: regla «${m.regla}» no existe`);
    // D-66: `union:<id>` = la misma unión que cuenta la función pública (uniones.<id>)
    for (const [, id] of m.regla!.matchAll(/(?:^|\|)\s*union:([A-Za-z0-9_-]+)/g))
      if (!(uniones && typeof uniones === 'object' && id in uniones)) err(`participantes.marcas[${i}]: union:${id} no está en el bloque uniones`);
    if (m.despues != null && !(embudo ?? []).some(e => e.etapa === m.despues)) err(`participantes.marcas[${i}].despues: «${m.despues}» no es una etapa del embudo`);
    return { titulo: m.titulo!, regla: m.regla!.trim(), ayuda: m.ayuda, despues: m.despues };
  });
  return {
    marcas: out,
    motivos: validarMotivos((p as { motivos?: unknown } | undefined)?.motivos),
    vistas: validarVistas((p as { vistas?: unknown } | undefined)?.vistas, [...(embudo ?? []).map(e => e.etapa), ...out.map(m => m.titulo)]),
  };
}

function validarVistas(v: unknown, columnas: string[]): Vista[] {
  const err = (x: string): never => { throw new Error(`dashboard.config.md: ${x}`); };
  if (v == null) return [];
  if (!Array.isArray(v)) err('participantes.vistas debe ser una lista');
  return (v as Partial<Vista>[]).map((x, i) => {
    if (!x?.titulo) err(`participantes.vistas[${i}] necesita titulo`);
    const lista = (k: 'con' | 'sin') => {
      const l = x[k] ?? [];
      if (!Array.isArray(l)) err(`participantes.vistas[${i}].${k} debe ser una lista`);
      return l.map(n => {
        if (!columnas.includes(String(n))) err(`participantes.vistas[${i}].${k}: «${n}» no es una etapa del embudo ni una marca`);
        return String(n);
      });
    };
    const con = lista('con'), sin = lista('sin');
    if (!con.length && !sin.length) err(`participantes.vistas[${i}] necesita al menos una columna en con o sin`);
    return { titulo: String(x.titulo), con, sin };
  });
}

function validarMotivos(m: unknown): Motivo[] {
  const err = (x: string): never => { throw new Error(`dashboard.config.md: ${x}`); };
  if (m == null) return MOTIVOS_POR_DEFECTO;
  if (!Array.isArray(m) || m.length === 0) err('participantes.motivos debe ser una lista con al menos un motivo');
  return (m as Partial<Motivo>[]).map((x, i) => {
    if (!x?.id || !/^[a-z0-9_]{1,40}$/.test(String(x.id))) err(`participantes.motivos[${i}].id: minúsculas, números y _ (máx. 40)`);
    if (!x.label) err(`participantes.motivos[${i}] necesita label`);
    return { id: String(x.id), label: String(x.label) };
  });
}

const TIPOS_PREGUNTA = ['opcion', 'escala', 'multiple', 'monto', 'numero', 'rango', 'razon', 'alguna'];
const TIPOS_GRAFICO = ['barras', 'dona', 'apilada', 'pareadas', 'linea'];

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
      if (g.tipo === 'linea' && !g.datos) err(`${donde}: linea necesita datos (lista de {fecha, n})`);
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

function validarHitos(h: unknown): Hito[] {
  if (h == null) return [];
  if (!Array.isArray(h)) throw new Error('dashboard.config.md: hitos debe ser una lista');
  const vistos = new Set<number>();
  return (h as Partial<Hito>[]).map((x, i) => {
    const e = (m: string) => { throw new Error(`dashboard.config.md: hitos[${i}] ${m}`); };
    if (typeof x?.numero !== 'number' || !x.titulo) e('necesita numero y titulo');
    if (vistos.has(x.numero!)) e(`repite el numero ${x.numero}`);
    vistos.add(x.numero!);
    const fecha = x.fecha == null ? undefined : String((x.fecha as unknown) instanceof Date ? (x.fecha as unknown as Date).toISOString().slice(0, 10) : x.fecha);
    if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) e('fecha debe ser AAAA-MM-DD');
    if (!x.documental) {
      if (typeof x.meta !== 'number' || x.meta <= 0) e('necesita meta (número > 0) o documental: true');
      if (!x.valor) e('necesita valor (ruta de la función pública)');
    }
    if (x.umbral != null && (typeof x.umbral !== 'number' || x.umbral <= 0 || x.umbral > 100)) e('umbral es un % entre 1 y 100');
    if (x.explicacion != null && typeof x.explicacion !== 'string') e('explicacion debe ser texto');
    const explicacion = x.explicacion?.trim() || undefined;
    return { ...x, fecha, explicacion } as Hito;
  }).sort((a, b) => a.numero - b.numero);
}
