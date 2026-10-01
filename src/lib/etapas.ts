/**
 * Etapas de la ruta POR PERSONA (D-37). Las etapas son de cada proyecto: salen de `embudo` en la config.
 * Cada etapa se evalúa con una `regla`; si la config no la trae, se deduce de `valor` (la ruta del agregado
 * público), así el embudo del Dashboard y las columnas de Participantes cuentan lo mismo sin escribirlo dos veces.
 *
 *   registro                       tiene postulación en la cohorte
 *   formulario:<slug>              respondió el formulario (bloque) con ese slug
 *   matriculado                    tiene matrícula en la cohorte
 *   asistencia[:<tipo>]            asistió a un evento (de ese tipo)
 *   asistencia_matriculado[:<tipo>] matriculada y asistió a un evento (de ese tipo)
 *   documentos:<grupo>             tiene TODOS los documentos del grupo (config.grupos)
 *   postulado                      se postuló a alguna vacante (plataforma o externa)
 *   colocado                       tiene una colocación activa
 *   pendiente                      sin fuente aún (no es "no")
 */
import { config, type Etapa } from './config';
import type { DatosCohorte, Persona } from './datos';

export type Resultado = boolean | null; // null = sin fuente

export function reglaDe(e: Etapa): string {
  if (e.regla) return e.regla.trim();
  const v = e.valor.trim();
  let m: RegExpMatchArray | null;
  if (v === 'pendiente') return 'pendiente';
  if ((m = v.match(/^formularios\[([^\]]+)\]/))) return `formulario:${m[1]}`;
  if ((m = v.match(/^formacion\.asistencia_por_tipo\[([^\]]+)\]\.matriculados$/))) return `asistencia_matriculado:${m[1]}`;
  if ((m = v.match(/^formacion\.asistencia_por_tipo\[([^\]]+)\]/))) return `asistencia:${m[1]}`;
  if (v === 'formacion.matriculados_con_asistencia') return 'asistencia_matriculado';
  if (v === 'formacion.personas_con_asistencia') return 'asistencia';
  if ((m = v.match(/^grupos\.(.+)$/))) return `documentos:${m[1]}`;
  if (v === 'empleabilidad.personas_postuladas_vacantes') return 'postulado';
  if (v === 'empleabilidad.colocados') return 'colocado';
  if (v === 'matriculados') return 'matriculado';
  if (v.startsWith('postulaciones.')) return 'registro';
  return 'pendiente';
}

/** Índices por persona para evaluar rápido sobre toda la cohorte. */
export interface Indice {
  asistio: Map<string, Set<string>>; // persona → tipos de evento a los que asistió ('*' = cualquiera)
  postulado: Set<string>;
  colocado: Set<string>;
}

export function indexar(d: DatosCohorte): Indice {
  const tipoDe = new Map(d.eventos.map(e => [e.id, e.tipo ?? 'sin_tipo']));
  const asistio = new Map<string, Set<string>>();
  for (const a of d.asistencias) {
    if (a.estado !== 'asistio') continue;
    const set = asistio.get(a.personaId) ?? new Set<string>();
    set.add('*'); set.add(tipoDe.get(a.eventoId) ?? 'sin_tipo');
    asistio.set(a.personaId, set);
  }
  return {
    asistio,
    postulado: new Set(d.postulaciones.map(p => p.personaId)),
    colocado: new Set(d.colocaciones.filter(c => c.activa).map(c => c.personaId)),
  };
}

function tieneValor(v: unknown) { return v != null && String(v).trim() !== ''; }

export function evaluar(regla: string, p: Persona, d: DatosCohorte, ix: Indice): Resultado {
  const [tipo, arg] = regla.split(':');
  switch (tipo) {
    case 'pendiente': return null;
    case 'registro': return true;
    case 'matriculado': return p.matricula != null;
    case 'formulario': {
      const f = d.formularios.find(x => x.slug === arg || x.bloque === arg);
      return f ? p.respuestas[f.bloque] != null : false;
    }
    case 'asistencia': return ix.asistio.get(p.id)?.has(arg || '*') ?? false;
    case 'asistencia_matriculado': return p.matricula != null && (ix.asistio.get(p.id)?.has(arg || '*') ?? false);
    case 'documentos': {
      const claves = config.grupos[arg] ?? [];
      if (!claves.length) return null;
      return claves.every(k => Object.values(p.respuestas).some(bl => bl && typeof bl === 'object' && tieneValor((bl as Record<string, unknown>)[k])));
    }
    case 'postulado': return ix.postulado.has(p.id);
    case 'colocado': return ix.colocado.has(p.id);
    default: return null;
  }
}

/** Etapas de la config con su regla ya resuelta. */
export function etapasConRegla() {
  return config.embudo.map(e => ({ ...e, regla: reglaDe(e) }));
}

/** Última etapa alcanzada (la más avanzada en orden de la config), o null. */
export function etapaActual(resultados: Resultado[]): number | null {
  for (let i = resultados.length - 1; i >= 0; i--) if (resultados[i] === true) return i;
  return null;
}
