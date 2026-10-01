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
/** Tipo de evento que se puede crear en el Calendario (D-33). `etapa` = a qué etapa de la ruta suma asistir. */
export interface TipoEvento {
  tipo: string; label: string; descripcion?: string; modalidad?: 'Presencial' | 'Virtual' | 'Híbrida'; color?: string;
  /** El evento registra EMPRESAS asistentes (p. ej. sensibilización, D-40) además de personas. */
  empresas?: boolean;
}
export interface Distribucion { titulo: string; datos: string; nota?: string; grafico?: 'barras' | 'dona' }

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
  cifras: Cifra[];
  metas: Meta[];
  fases: Record<string, string>;
  embudo: Etapa[];
  catalogo: TipoEvento[];
  distribuciones: Record<string, Distribucion[]>;
  secciones: string[];
  modulos: Modulo[];
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
    cifras: c.cifras ?? [],
    metas: c.metas ?? [],
    fases: Object.fromEntries(Object.entries(c.fases ?? {}).map(([k, v]) => [String(k), String(v)])),
    embudo: c.embudo ?? [],
    catalogo: validarCatalogo(c.catalogo),
    distribuciones: c.distribuciones ?? {},
    secciones: c.secciones ?? ['metas', 'cifras', 'embudo', 'personas'],
    modulos: validarModulos(c.modulos),
  };
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
