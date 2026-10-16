/**
 * Informe de conteos (D-43, módulo Informes): arma las hojas del Excel desde la respuesta de dashboard_public_stats
 * con TODAS las preguntas de la config. Solo conteos: sin datos personales (los nombres están en Listados).
 * Qué hojas lleva y en qué orden lo dice `informe.hojas` de la config.
 */
import { config } from './config';
import type { HojaInforme, Pregunta } from './config';
import { resolver } from './ruta';
import { fueraDeFoco, personasFueraDeFoco, respuesta } from './respuestas';
import { estadoMeta } from '../ui/Graficos';
import type { HojaLibre } from './excel';
import type { PublicStats } from './usePublicStats';

export interface OpcionesInforme { genero: boolean; corte: string | null; alcance: string }
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

export function armarInforme(s: PublicStats, op: OpcionesInforme): HojaLibre[] {
  const hojas = config.informe.hojas.map(h => hoja(s, h, op));
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
      ['Hojas'], ...config.informe.hojas.map(h => [h.nombre, h.descripcion ?? '']),
      [],
      ['Cómo leerlo'],
      ['', 'Cada pregunta es una tabla: categoría, total y % (y mujeres / hombres si se eligió).'],
      ['', 'El % se calcula sobre quienes respondieron la pregunta. «Universo» dice quién debía responderla (p. ej. solo quien tiene la línea base, o solo quien respondió «Ninguno» en la pregunta anterior).'],
      ['', 'Las opciones en 0 se muestran para que se vea todo el formulario. El texto libre no va aquí: se consulta en Listados.'],
      ['', 'El corte por fecha aplica a las personas (fecha de registro) y a sus respuestas; las metas de empresas y eventos van a la fecha de hoy.'],
      ['', 'Solo conteos: este archivo no tiene datos personales.'],
    ],
  };
  return [portada, ...hojas];
}
