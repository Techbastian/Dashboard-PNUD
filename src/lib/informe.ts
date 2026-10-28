/**
 * Informe de conteos (D-43, módulo Informes): arma las hojas del Excel desde la respuesta de dashboard_public_stats
 * con las preguntas de las hojas elegidas. Qué hojas lleva y en qué orden lo dice `informe.hojas` de la config.
 * D-72: opcionalmente, junto a cada hoja con `preguntas`, una hoja «· personas» con la respuesta de cada persona a
 * esos formularios (todas las preguntas, también texto libre) y el enlace a su hoja de vida. Esa sí lleva datos personales.
 */
import { config } from './config';
import type { HojaInforme, Pregunta } from './config';
import { resolver } from './ruta';
import { enFoco, fueraDeFoco, personasFueraDeFoco, respuesta } from './respuestas';
import { estadoMeta } from '../ui/Graficos';
import { respuestaDe, type DatosCohorte } from './datos';
import { diaBogota } from './formato';
import type { HojaLibre } from './excel';
import type { PublicStats } from './usePublicStats';

export type Alcance = 'todos' | 'foco' | 'fuera';
export interface OpcionesInforme {
  genero: boolean; corte: string | null; alcance: string;
  /** Nombres de las hojas elegidas (la Portada va siempre). */
  hojas: string[];
  /** D-72: datos privados de la cohorte para las hojas «· personas»; null = solo conteos. */
  personas: DatosCohorte | null;
  /** Mismo filtro territorial que se pidió a la función, para las hojas «· personas». */
  foco: Alcance;
}
type Fila = (string | number | null)[];

const pctTxt = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);
const valor = (s: PublicStats, ruta: string) => { const v = resolver(s, ruta); return v.estado === 'ok' ? v.n : null; };
const ESTADO: Record<string, string> = { 'sin-fuente': 'Sin fuente', 'sin-iniciar': 'Sin iniciar', 'en-curso': 'En curso', cumplida: 'Cumplida' };
const nombreBloque = (slug: string) => slug.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());

function lista(s: PublicStats, ruta: string): { categoria: string; n: number }[] {
  let x: unknown = s;
  for (const p of ruta.split('.')) x = (x as Record<string, unknown> | null)?.[p];
  return Array.isArray(x) ? x.map(e => ({ categoria: String(e.categoria ?? e.estado ?? e.tipo ?? '—'), n: Number(e.n ?? e.personas ?? e.total ?? 0) })) : [];
}

function universoTexto(p: Pregunta, universo: number, respondieron: number) {
  let t = `Universo: ${universo} personas con el formulario «${nombreBloque(p.bloque)}»`;
  if (p.si) {
    const cond = config.preguntas.find(q => q.bloque === p.bloque && q.clave === p.si!.clave)?.titulo ?? p.si.clave;
    t += p.si.texto ? ` ${p.si.texto}` : ` que respondieron «${p.si.en.join('» o «')}» en «${cond}»`;
  }
  return `${t} · respondieron ${respondieron}`;
}

function tablaPregunta(s: PublicStats, p: Pregunta, op: OpcionesInforme): Fila[] {
  const r = respuesta(s, p.id);
  const titulo: Fila = [p.titulo];
  if (!r) return [titulo, ['La pregunta no existe en el formulario o no se puede contar (texto libre).'], []];
  const cab: Fila = op.genero ? ['Categoría', 'Total', '%', 'Mujeres', '% M', 'Hombres', '% H'] : ['Categoría', 'Total', '%'];
  const filas: Fila[] = r.categorias.map(c => op.genero
    ? [c.categoria, c.n, pctTxt(c.n, r.respondieron), c.mujeres, pctTxt(c.mujeres, r.respondieron_mujeres), c.hombres, pctTxt(c.hombres, r.respondieron_hombres)]
    : [c.categoria, c.n, pctTxt(c.n, r.respondieron)]);
  const sin = r.universo - r.respondieron;
  if (sin > 0) filas.push(op.genero
    ? ['Sin respuesta', sin, null, r.universo_mujeres - r.respondieron_mujeres, null, r.universo_hombres - r.respondieron_hombres, null]
    : ['Sin respuesta', sin, null]);
  const notas: Fila[] = [[universoTexto(p, r.universo, r.respondieron)]];
  if (p.tipo === 'multiple') notas.push(['Selección múltiple: cada persona puede marcar varias opciones; los % suman más de 100 %.']);
  if (p.nota) notas.push([p.nota]);
  return [titulo, ...notas, cab, ...filas, []];
}

function tablaLista(s: PublicStats, titulo: string, ruta: string, nota?: string): Fila[] {
  const xs = lista(s, ruta);
  const total = xs.reduce((a, x) => a + x.n, 0);
  return [[titulo], ...(nota ? [[nota]] : []), ['Categoría', 'Total', '%'], ...xs.map(x => [x.categoria, x.n, pctTxt(x.n, total)]), []];
}

function tablaMetas(s: PublicStats): Fila[] {
  const metas = (s.metas as { nombre: string; meta: number }[] | undefined) ?? [];
  const obj = (n: string) => metas.find(m => m.nombre.trim().toLowerCase() === n.trim().toLowerCase())?.meta ?? null;
  return [['Producto', 'Meta', 'Actual', 'Objetivo', '% de avance', 'Estado', 'Cómo se mide'],
    ...config.metas.map(m => {
      const a = valor(s, m.actual), o = obj(m.meta);
      return [config.fases[String(m.fase ?? 1)] ?? `Fase ${m.fase ?? 1}`, m.meta, a, o, a != null && o ? pctTxt(a, o) : null,
        ESTADO[estadoMeta(a, o)], m.actual === 'pendiente' ? 'Aún no se registra en la plataforma' : (m.ayuda ?? '')];
    }), []];
}

function tablaAlertas(s: PublicStats): Fila[] {
  const foco = config.foco;
  if (!foco) return [['Sin foco territorial en la config.'], []];
  const p = personasFueraDeFoco(s);
  const e = foco.empresas ? fueraDeFoco(lista(s, foco.empresas)) : [];
  return [
    [`Personas fuera de ${foco.nombre}`], ['No se bloquean, pero quedan fuera del foco del proyecto.'], ['Lugar (como lo escribió la persona)', 'Personas'],
    ...(p?.lista.length ? p.lista.map(x => [x.categoria, x.n]) : [['Ninguna', 0]]), ['Total', p?.total ?? 0], [],
    [`Empresas fuera de ${foco.nombre}`], ['Ubicación', 'Empresas'],
    ...(e.length ? e.map(x => [x.categoria, x.n]) : [['Ninguna', 0]]), ['Total', e.reduce((a, x) => a + x.n, 0)], [],
  ];
}

function hoja(s: PublicStats, h: HojaInforme, op: OpcionesInforme): HojaLibre {
  const filas: Fila[] = [[h.nombre], ...(h.descripcion ? [[h.descripcion]] : []), []];
  if (h.contenido === 'metas') filas.push(...tablaMetas(s));
  if (h.contenido === 'alertas') filas.push(...tablaAlertas(s));
  for (const c of h.cifras ?? []) filas.push([c.label, valor(s, c.valor)]);
  if (h.cifras?.length) filas.push([]);
  for (const l of h.listas ?? []) filas.push(...tablaLista(s, l.titulo, l.datos, l.nota));
  if (h.preguntas) for (const p of config.preguntas.filter(q => q.grupo === h.preguntas)) filas.push(...tablaPregunta(s, p, op));
  return { nombre: h.nombre, filas, anchos: [58, 10, 8, 10, 8, 10, 8] };
}

/** Título de columna: sin markdown (negritas, enlaces) y corto; el texto completo está en el formulario. */
const tituloColumna = (t: string) => {
  const x = t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_#`>]+/g, '').replace(/\s+/g, ' ').trim();
  return x.length > 120 ? `${x.slice(0, 117).trim()}…` : x;
};

const textoRespuesta = (v: unknown): string | number | null => {
  if (v == null || v === '') return null;
  if (Array.isArray(v)) return v.map(x => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join('; ');
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'number') return v;
  return typeof v === 'object' ? JSON.stringify(v) : String(v);
};

/** ¿La persona entra con el filtro territorial? Mismo criterio que la función: «fuera» = no coincide (incluye sin dato). */
function pasaFoco(d: DatosCohorte, r: DatosCohorte['personas'][number], alcance: Alcance): boolean {
  const foco = config.foco;
  const pf = foco?.personas ? config.preguntas.find(p => p.id === foco.personas) : undefined;
  if (alcance === 'todos' || !foco || !pf?.clave) return true;
  const fm = d.formularios.find(f => f.slug === pf.bloque || f.bloque === pf.bloque);
  const resp = fm ? r.respuestas[fm.bloque] : undefined;
  const q = fm?.preguntas.find(x => x.clave === pf.clave);
  const v = resp ? (q ? respuestaDe(resp, q) : resp[pf.clave]) : undefined;
  const dentro = v != null && enFoco((Array.isArray(v) ? v : [v]).join(' '), foco);
  return alcance === 'foco' ? dentro : !dentro;
}

/** D-72: una fila por persona que respondió alguno de los formularios de la hoja, con todas sus respuestas y la hoja de vida. */
function hojaPersonas(d: DatosCohorte, h: HojaInforme, op: OpcionesInforme): HojaLibre | null {
  if (!h.preguntas) return null;
  const bloques = new Set(config.preguntas.filter(q => q.grupo === h.preguntas).map(q => q.bloque));
  const forms = d.formularios.filter(f => bloques.has(f.slug) || bloques.has(f.bloque));
  if (!forms.length) return null;
  const personas = d.personas
    .filter(p => forms.some(f => p.respuestas[f.bloque]))
    .filter(p => !op.corte || (p.registradaEl != null && diaBogota(p.registradaEl) <= op.corte))
    .filter(p => pasaFoco(d, p, op.foco))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const fijas = ['Nombre', 'Tipo doc.', 'Documento', 'Correo', 'Celular', 'Ciudad', 'Género', 'Registro', 'Hoja de vida (enlace)'];
  const preguntas = forms.flatMap(f => f.preguntas.map(q => ({ f, q })));
  const cab = [...fijas, ...preguntas.map(({ f, q }) => (forms.length > 1 ? `${f.nombre} · ` : '') + tituloColumna(q.etiqueta))];
  const filas: Fila[] = personas.map(p => [
    p.nombre, p.tipoDoc, p.documento, p.correo, p.celular, p.ciudad, p.genero, p.registradaEl ? diaBogota(p.registradaEl) : null, p.hv,
    ...preguntas.map(({ f, q }) => { const r = p.respuestas[f.bloque]; return r ? textoRespuesta(respuestaDe(r, q)) : null; }),
  ]);
  const base = h.nombre.length > 21 ? h.nombre.slice(0, 21).trim() : h.nombre;
  return {
    nombre: `${base} · personas`, filas: [cab, ...filas], enlaces: [fijas.indexOf('Hoja de vida (enlace)')],
    anchos: [32, 9, 14, 30, 14, 16, 12, 12, 40, ...preguntas.map(() => 28)],
  };
}

export function armarInforme(s: PublicStats, op: OpcionesInforme): HojaLibre[] {
  const elegidas = config.informe.hojas.filter(h => op.hojas.includes(h.nombre));
  const hojas = elegidas.flatMap(h => {
    const hp = op.personas ? hojaPersonas(op.personas, h, op) : null;
    return hp ? [hoja(s, h, op), hp] : [hoja(s, h, op)];
  });
  const generado = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
  const portada: HojaLibre = {
    nombre: 'Portada', anchos: [34, 90],
    filas: [
      [config.identidad.nombre], [config.identidad.subtitulo ?? ''], [],
      ['Generado', generado],
      ['Fecha de corte', op.corte ? `Personas registradas hasta el ${op.corte}` : 'Sin corte (todo lo registrado)'],
      ['Personas incluidas', op.alcance],
      ['Desagregación', op.genero ? 'Total, mujeres y hombres' : 'Solo total'],
      ['Personas en el informe', valor(s, 'postulaciones.personas')],
      [],
      ['Hojas'], ...hojas.map(h => [h.nombre, elegidas.find(x => x.nombre === h.nombre)?.descripcion
        ?? 'Una fila por persona: sus respuestas a todas las preguntas del formulario y el enlace a su hoja de vida']),
      [],
      ['Cómo leerlo'],
      ['', 'Cada pregunta es una tabla: categoría, total y % (y mujeres / hombres si se eligió).'],
      ['', 'El % se calcula sobre quienes respondieron la pregunta. «Universo» dice quién debía responderla (p. ej. solo quien tiene la línea base, o solo quien respondió «Ninguno» en la pregunta anterior).'],
      ['', 'Las opciones en 0 se muestran para que se vea todo el formulario. El texto libre no va aquí: se consulta en Listados.'],
      ['', 'El corte por fecha aplica a las personas (fecha de registro) y a sus respuestas; las metas de empresas y eventos van a la fecha de hoy.'],
      ['', op.personas
        ? 'ESTE ARCHIVO TIENE DATOS PERSONALES (hojas «· personas»): compártelo solo con quien lo necesite.'
        : 'Solo conteos: este archivo no tiene datos personales.'],
    ],
  };
  return [portada, ...hojas];
}
