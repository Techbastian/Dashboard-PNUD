/**
 * (Se ejecuta en el BUILD, desde vite.config.ts — el navegador recibe JSON ya validado.)
 * Lee config/dashboard.config.md (D-14): extrae los bloques ```yaml y los une en un solo objeto.
 * El texto fuera de los bloques es documentación para humanos y se ignora.
 */
import { parse } from 'yaml';
import { MODULOS, type Modulo } from './modulos';

export interface Cifra { label: string; valor: string; ayuda?: string; color?: string }
export interface Meta { fase?: number; meta: string; actual: string; ayuda?: string }
export interface Etapa { etapa: string; valor: string }
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
  grupos: Record<string, string[]>;
  cifras: Cifra[];
  metas: Meta[];
  fases: Record<string, string>;
  embudo: Etapa[];
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

