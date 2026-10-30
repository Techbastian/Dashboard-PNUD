/**
 * Capa de datos PRIVADA (con PII) de la cohorte del proyecto — solo con sesión del equipo (D-32).
 * Se carga una vez, perezosa (la primera vista privada que la pide), y la comparten Participantes,
 * Calendario, Colocación, Empresas y Listados. Lo público NO pasa por aquí: sale de la RPC agregada.
 *
 * Todo se acota a `identidad.cohortId`. Las tablas de la plataforma sin cohorte (applications, placements…)
 * se acotan cruzando por las personas de la cohorte. PostgREST corta en 1000 filas: todo se pagina.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import { config } from './config';
import { useAuth } from './auth';

export interface Persona {
  id: string;
  nombre: string;
  tipoDoc: string | null;
  documento: string | null;
  correo: string | null;
  celular: string | null;
  ciudad: string | null;
  genero: string | null;
  nacimiento: string | null;
  /** Nivel educativo del registro (candidates.education_level), igual que la función pública. */
  nivel: string | null;
  /** Hoja de vida cargada en la plataforma (candidates.cv_url). */
  hv: string | null;
  postulacionId: string;
  estado: string | null;
  registradaEl: string | null;
  respuestas: Record<string, Record<string, unknown>>;
  matricula: { id: number; estado: string | null; fecha: string | null } | null;
}
export interface Evento {
  id: string; nombre: string; tipo: string | null; fase: string | null; modalidad: string | null; ubicacion: string | null;
  inicio: string; fin: string | null; descripcion: string | null; tomaAsistencia: boolean; origen: string | null; enlace: string | null;
}
export type EstadoAsistencia = 'agendado' | 'cancelado' | 'asistio' | 'no_asistio' | 'justificado' | 'pendiente' | 'no_aplica';
export interface Asistencia { id: string; eventoId: string; personaId: string; estado: EstadoAsistencia; marcadoEn: string | null; marcadoPor: string | null; observaciones: string | null }
export interface Postulacion {
  id: string; personaId: string; origen: 'plataforma' | 'externa'; vacante: string; empresa: string | null; estado: string | null; fecha: string | null; url: string | null; observaciones: string | null;
  /** A-16: a una vacante de una empresa del proyecto (o creada para la cohorte), o externa registrada por el equipo. */
  atribuible: boolean;
  /** A-22: la persona no cuenta como intermediada (motivo) aunque se haya postulado. */
  excluida: string | null;
}
export interface Colocacion {
  id: string; personaId: string; empresa: string | null; cargo: string; inicio: string; modalidad: string | null; estado: string | null; activa: boolean;
  duracionMeses: number | null;
  /** A-22: esta colocación no cuenta en las métricas de la cohorte (la persona sigue en todo lo demás). */
  excluida: string | null;
}
export interface Vacante {
  id: string; empresaId: string | null; titulo: string; puestos: number; salario: string | null; modalidad: string | null; contrato: string | null;
  nivel: string | null; experiencia: string | null; estado: string | null; publicada: boolean; visibilidad: string | null; ciudades: string[];
}
export interface Empresa {
  id: string; nombre: string; razonSocial: string; nit: string; tamano: string | null; sector: string | null; municipios: string[];
  direccion: string | null; contacto: { nombre: string | null; telefono: string | null; correo: string | null }; registradaEl: string | null; vacantes: Vacante[];
  /** D-61 (A-31): enlace al diagnóstico de la empresa en este proyecto; solo si la config activa `empresas.diagnostico`. */
  diagnostico: { url: string; fecha: string | null } | null;
}
/** Asistencia de una EMPRESA a un evento (A-10, D-40): P1 empresa sensibilizada = asistió a un evento de sensibilización. */
export interface AsistenciaEmpresa { id: string; eventoId: string; empresaId: string; estado: 'agendado' | 'asistio' | 'no_asistio' | 'cancelado'; asistentes: number | null; marcadoEn: string | null; marcadoPor: string | null }
export type TipoEvidencia = 'agenda' | 'asistencia' | 'fotografia' | 'otro';
/** Evidencia de un evento (A-10): archivo en el bucket privado `evidencias-eventos` o enlace. */
export interface Evidencia { id: string; eventoId: string; tipo: TipoEvidencia; nombre: string | null; ruta: string | null; url: string | null; subidoPor: string | null; fecha: string }
/** `id` y `mostrarSi` vienen del formulario de la plataforma (`showWhen`: la pregunta solo aparece si `campo` tiene uno de `valores`). */
export interface Pregunta {
  id: string; clave: string; etiqueta: string; tipo: string; obligatoria: boolean;
  mostrarSi: { campo: string; valores: string[] } | null;
  /** Preguntas `file_upload`: carpeta del bucket `documentos-talentos` donde la plataforma guarda el archivo (`fileCategory`). */
  categoria: string | null;
  /** Opciones de las preguntas de selección, en el orden del formulario. */
  opciones: string[];
}
/** Llamada o contacto directo con la persona (participant_contacts, A-25, D-51). Aquí van las observaciones del equipo. */
export type ResultadoLlamada = 'contesto' | 'no_contesto' | 'buzon_ocupado' | 'numero_errado' | 'llamar_despues' | 'no_continua';
export type CanalContacto = 'llamada' | 'whatsapp' | 'presencial' | 'correo' | 'otro';
export type PropositoContacto = 'orientacion' | 'seguimiento' | 'reconvocatoria' | 'verificacion_retencion' | 'otro';
export interface Llamada {
  /** `resultado` null = agendada (D-54). */
  id: string; personaId: string; fecha: string; canal: CanalContacto; proposito: PropositoContacto; resultado: ResultadoLlamada | null;
  notas: string | null; opinion: string | null; proximaAccion: string | null; proximaFecha: string | null; registradaPor: string | null;
}
/** Cambio de estado activo / inactivo (participant_status_log, A-26, D-52). Solo se agregan filas; el actual es el más reciente. */
export interface CambioEstado {
  id: string; personaId: string; estado: 'activo' | 'inactivo'; motivo: string | null; observacion: string | null;
  fechaEfectiva: string; etapa: string | null; registradoPor: string | null; creadoEl: string;
}
/** Un cambio del historial (audit_log, A-27, D-53): dashboard o plataforma. */
export interface Cambio {
  id: number; tabla: string; accion: 'insert' | 'update' | 'delete'; campos: string[] | null;
  antes: Record<string, unknown> | null; despues: Record<string, unknown> | null; motivo: string | null; por: string | null; el: string;
}
/** Exclusión de las métricas de la cohorte (dashboard_exclusiones, A-22). La lee también la función pública (v10). */
export interface Exclusion { tipo: 'persona' | 'colocacion' | 'intermediacion'; refId: string; motivo: string }
/** Empleador para registrar una colocación: empresa de la plataforma o empleador externo (hiring_employers). */
export interface Empleador { key: string; nombre: string; origen: 'empresa' | 'externo' }
/** Valores que exigen los CHECK de placements (iguales a los de FQSD). */
export const MODALIDADES = ['Presencial', 'Híbrido', 'Remoto'] as const;
export const DURACIONES = [3, 6] as const;
export const EXPERIENCIA = ['Sin experiencia', 'Con experiencia', 'Reingreso al empleo'] as const;
export interface NuevaColocacion {
  personaId: string;
  /** `company:<id>` | `hiring:<id>` | `nuevo:<nombre>` (crea el empleador externo). */
  empleador: string;
  inicio: string; cargo: string; modalidad: typeof MODALIDADES[number]; duracionMeses: typeof DURACIONES[number];
  experiencia: typeof EXPERIENCIA[number] | null;
  /** `auto` = la plataforma envía los recordatorios de retención; `manual` = el equipo. */
  modoRetencion: 'auto' | 'manual';
}
export interface Formulario { bloque: string; slug: string; nombre: string; preguntas: Pregunta[] }

export interface DatosCohorte {
  personas: Persona[];
  eventos: Evento[];
  asistencias: Asistencia[];
  asistenciaEmpresas: AsistenciaEmpresa[];
  evidencias: Evidencia[];
  postulaciones: Postulacion[];
  colocaciones: Colocacion[];
  empresas: Empresa[];
  formularios: Formulario[];
  /** Exclusiones vigentes de la cohorte (A-22). Las personas excluidas ya no vienen en `personas`. */
  exclusiones: Exclusion[];
  llamadas: Llamada[];
  /** Todos los cambios de estado, del más reciente al más antiguo. */
  estados: CambioEstado[];
  cargadoEl: string;
}

interface Valor {
  datos: DatosCohorte | null;
  cargando: boolean;
  error: string | null;
  cargar: () => void;
  recargar: () => Promise<void>;
  /** Escrituras: devuelven el error en español o null; después recargan lo necesario. */
  guardarEvento: (e: Partial<Evento> & { nombre: string; inicio: string }) => Promise<string | null>;
  /** D-50: solo super_admin y con motivo (RPC borrar_evento, A-24); el motivo queda en el historial. */
  borrarEvento: (id: string, motivo: string) => Promise<string | null>;
  marcarAsistencia: (eventoId: string, personaId: string, estado: EstadoAsistencia) => Promise<string | null>;
  quitarDeEvento: (eventoId: string, personaId: string) => Promise<string | null>;
  marcarEmpresa: (eventoId: string, empresaId: string, estado: AsistenciaEmpresa['estado'], asistentes?: number | null) => Promise<string | null>;
  quitarEmpresa: (eventoId: string, empresaId: string) => Promise<string | null>;
  subirEvidencia: (eventoId: string, tipo: TipoEvidencia, fuente: { archivo: File } | { url: string; nombre?: string }) => Promise<string | null>;
  borrarEvidencia: (e: Evidencia) => Promise<string | null>;
  /** URL para abrir una evidencia (firmada por 10 minutos si es archivo). */
  abrirEvidencia: (e: Evidencia) => Promise<string | null>;
  crearPostulacionExterna: (x: { personaId: string; vacante: string; empresa?: string | null; url?: string | null; observaciones?: string | null }) => Promise<string | null>;
  borrarPostulacionExterna: (id: string) => Promise<string | null>;
  /** Empresas de la plataforma + empleadores externos, para elegir el de una colocación (se pide al abrir el formulario). */
  listarEmpleadores: () => Promise<Empleador[]>;
  crearColocacion: (c: NuevaColocacion) => Promise<string | null>;
  registrarLlamada: (x: Omit<Llamada, 'id' | 'registradaPor' | 'fecha'> & { fecha?: string }) => Promise<string | null>;
  /** Completa una llamada agendada con lo que pasó (D-54). */
  completarLlamada: (id: string, x: { resultado: ResultadoLlamada; notas?: string | null; opinion?: string | null; proximaAccion?: string | null; proximaFecha?: string | null }) => Promise<string | null>;
  /** Cancela una llamada agendada (sin resultado). Queda en el historial. */
  cancelarLlamada: (id: string) => Promise<string | null>;
  /** Borra una llamada ya hecha: solo super_admin y con motivo (D-58). Queda en el historial con el motivo. */
  borrarLlamada: (id: string, motivo: string) => Promise<string | null>;
  /** D-61: guarda o quita (url vacía) el enlace al diagnóstico de la empresa (RPC guardar_diagnostico, A-31). */
  guardarDiagnostico: (empresaId: string, url: string, fecha?: string | null) => Promise<string | null>;
  /** D-73: sube el archivo de una pregunta `file_upload` y lo deja en la respuesta de la persona (A-44). Reemplaza el anterior. */
  subirDocumento: (persona: Persona, fm: Formulario, q: Pregunta, archivo: File) => Promise<string | null>;
  /** URL para abrir un documento de un formulario: firmada por 10 minutos si es una ruta del bucket. */
  abrirDocumento: (valor: unknown) => Promise<string | null>;
  /** D-73: sube la hoja de vida (bucket `resumes`, como la plataforma) y la deja en candidates.cv_url. Reemplaza la anterior. */
  subirHojaDeVida: (persona: Persona, archivo: File) => Promise<string | null>;
  /** Activo / inactivo (deserción interna). Al inactivar, motivo y observación son obligatorios. */
  cambiarEstado: (x: { personaId: string; estado: 'activo' | 'inactivo'; motivo?: string | null; observacion?: string | null; fechaEfectiva?: string; etapa?: string | null }) => Promise<string | null>;
  /** Historial de cambios de una persona (se pide al abrir su ficha; no viene en la carga general). */
  historialDe: (personaId: string) => Promise<{ cambios: Cambio[]; error: string | null }>;
  /** No se borra: «colocado» es un hecho; se marca terminada con motivo (la retención lee deactivated_at). */
  desactivarColocacion: (id: string, motivo: string) => Promise<string | null>;
}

const Ctx = createContext<Valor | null>(null);
const COHORTE = config.identidad.cohortId;
const LOTE = 100;

/** Clave de una pregunta sin slug: igual que la plataforma (y que la función pública). */
export function claveDePregunta(q: { slug?: string | null; label?: string | null }): string {
  if (q.slug && q.slug.trim()) return q.slug;
  const sinTildes = (q.label ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return sinTildes.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60).replace(/_+$/, '');
}

/**
 * Respuesta de una pregunta. La plataforma guarda la clave cortada a 60 caracteres sin quitar el «_» final, y si la
 * pregunta cambió de texto después, la respuesta queda con la clave del texto viejo: se acepta la clave guardada
 * (≥ 20 caracteres) que sea el comienzo del texto completo de la pregunta.
 */
export function respuestaDe(r: Record<string, unknown>, q: Pregunta): unknown {
  if (r[q.clave] !== undefined) return r[q.clave];
  if (r[`${q.clave}_`] !== undefined) return r[`${q.clave}_`];
  if (q.clave !== claveDePregunta({ label: q.etiqueta })) return undefined; // con slug propio: solo su clave
  const largo = q.etiqueta.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+/, '');
  const k = Object.keys(r).find(k => k.length >= 20 && largo.startsWith(k.replace(/_+$/, '')));
  return k ? r[k] : undefined;
}

const lleno = (v: unknown) => v != null && (Array.isArray(v) ? v.length > 0 : String(v).trim() !== '');

/**
 * Estado de un formulario para una persona: `sin` = no lo abrió; `ok` = respondió todas las obligatorias que le
 * aparecen (las condicionales cuentan solo si se cumple su condición); `incompleto` = le falta alguna (`faltan`).
 */
export function estadoFormulario(fm: Formulario, r: Record<string, unknown> | undefined): { estado: 'sin' | 'ok' | 'incompleto'; faltan: string[] } {
  if (!r) return { estado: 'sin', faltan: [] };
  const porId = new Map(fm.preguntas.map(q => [q.id, q]));
  const visible = (q: Pregunta, n = 0): boolean => {
    if (!q.mostrarSi) return true;
    const c = porId.get(q.mostrarSi.campo);
    if (!c || n > 20 || !visible(c, n + 1)) return false;
    const v = respuestaDe(r, c);
    return (Array.isArray(v) ? v : [v]).some(x => q.mostrarSi!.valores.includes(String(x)));
  };
  const faltan = fm.preguntas.filter(q => q.obligatoria && visible(q) && !lleno(respuestaDe(r, q))).map(q => q.etiqueta.replace(/\s+/g, ' ').trim());
  return { estado: faltan.length ? 'incompleto' : 'ok', faltan };
}

type Fila = Record<string, unknown>;

/** Género como lo ve la persona en el formulario (la plataforma guarda `femenino`, `no_binario`, …). */
const GENEROS: Record<string, string> = {
  femenino: 'Femenino', mujer: 'Femenino', masculino: 'Masculino', hombre: 'Masculino',
  no_binario: 'No binario / No conforme', otro: 'Otro', prefiero_no_decir: 'Prefiero no decir',
};
function generoLegible(v: string | null | undefined): string | null {
  const t = (v ?? '').trim();
  return t ? GENEROS[t.toLowerCase()] ?? t : null;
}
const s = (v: unknown) => (v == null || v === '' ? null : String(v));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Consulta = any;
async function todas(tabla: string, columnas: string, filtro: (q: Consulta) => Consulta): Promise<Fila[]> {
  const out: Fila[] = [];
  for (let desde = 0; ; desde += 1000) {
    const q: Consulta = filtro(supabase!.from(tabla).select(columnas));
    const { data, error } = await q.range(desde, desde + 999);
    if (error) throw new Error(`${tabla}: ${error.message}`);
    out.push(...(data as Fila[]));
    if (!data || data.length < 1000) return out;
  }
}
async function porIds(tabla: string, columnas: string, campo: string, ids: string[]): Promise<Fila[]> {
  const out: Fila[] = [];
  const unicos = [...new Set(ids.filter(Boolean))];
  for (let i = 0; i < unicos.length; i += LOTE) {
    const lote = unicos.slice(i, i + LOTE);
    out.push(...(await todas(tabla, columnas, q => q.in(campo, lote))));
  }
  return out;
}

async function cargarTodo(): Promise<DatosCohorte> {
  const [cohorte] = await todas('cohorts', 'form_conf', q => q.eq('id', COHORTE));
  const formularios: Formulario[] = Object.entries(((cohorte?.form_conf as Fila)?.block_forms ?? {}) as Record<string, Fila>).map(([bloque, b]) => ({
    bloque,
    slug: String(b.slug_application ?? bloque),
    nombre: String(b.title ?? b.name ?? b.slug_application ?? bloque),
    preguntas: ((b.dimensions ?? []) as Fila[]).flatMap(d => ((d.questions ?? []) as Fila[]).map(q => {
      const sw = q.showWhen as { fieldId?: string; values?: unknown[] } | null | undefined;
      return {
        id: String(q.id ?? ''), clave: claveDePregunta(q as { slug?: string; label?: string }), etiqueta: String(q.label ?? ''), tipo: String(q.type ?? ''),
        obligatoria: q.required === true,
        mostrarSi: sw?.fieldId ? { campo: sw.fieldId, valores: (sw.values ?? []).map(String) } : null,
        categoria: s(q.fileCategory),
        opciones: (Array.isArray(q.options) ? q.options as unknown[] : [])
          .map(o => String((o as { label?: unknown } | null)?.label ?? o ?? '').trim()).filter(Boolean),
      };
    })),
  }));

  // A-22: exclusiones de la cohorte. Las personas excluidas no entran a ninguna vista (igual que en la función pública v10).
  const exclRaw = await todas('dashboard_exclusiones', 'tipo, ref_id, motivo', q => q.eq('cohort_id', COHORTE));
  const exclusiones: Exclusion[] = exclRaw.map(x => ({ tipo: String(x.tipo) as Exclusion['tipo'], refId: String(x.ref_id), motivo: String(x.motivo) }));
  const excl = (tipo: Exclusion['tipo']) => new Map(exclusiones.filter(x => x.tipo === tipo).map(x => [x.refId, x.motivo]));
  const personasFuera = excl('persona'), colocFuera = excl('colocacion'), intermFuera = excl('intermediacion');

  const apps = (await todas('project_applications', 'id, candidate_id, status, created_at, custom_answers', q => q.eq('cohort_id', COHORTE)))
    .filter(a => !personasFuera.has(String(a.candidate_id ?? '')));
  const idsPersonas = apps.map(a => String(a.candidate_id ?? '')).filter(Boolean);
  const [cands, matriculas, eventos, colocRaw, postPlat, postExt, enlaces, vacRaw, socio, llamRaw, estRaw] = await Promise.all([
    porIds('candidates', 'id, first_name, last_name, document_type, document_number, email, phone, city, gender, birth_date, education_level, cv_url', 'id', idsPersonas),
    todas('program_enrollments', 'id, candidate_id, status, enrolled_at', q => q.eq('cohort_id', COHORTE)),
    todas('events', 'id, nombre, tipo, fase, modalidad, ubicacion, fecha_hora_inicio, fecha_hora_fin, descripcion, toma_asistencia, external_source, meeting_link', q => q.eq('cohort_id', COHORTE).order('fecha_hora_inicio')),
    porIds('placements', 'id, talent_id, company_id, hiring_employer_id, job_id, start_date, role_sector, modality, status, deactivated_at, duration_months', 'talent_id', idsPersonas),
    porIds('applications', 'id, candidate_id, job_id, status, created_at', 'candidate_id', idsPersonas),
    porIds('participant_vacancy_applications', 'id, candidate_id, vacancy_name, company_name, application_url, observations, created_at', 'candidate_id', idsPersonas),
    todas('company_cohorts', config.empresas.diagnostico ? 'company_id, diagnostico_url, diagnostico_fecha' : 'company_id', q => q.eq('cohort_id', COHORTE)),
    todas('jobs', 'id, company_id, title, total_positions, salary_range, modality, employment_type, required_education_level, required_experience_months, status, is_published, visibility, cities', q => q.eq('cohort_id', COHORTE)),
    // Campo «Género» del registro de la plataforma (D-42); candidates.gender queda de respaldo para registros antiguos.
    porIds('socio_demographic_data', 'id, candidate_id, gender_identity', 'candidate_id', idsPersonas),
    todas('participant_contacts', 'id, candidate_id, fecha, canal, proposito, resultado, notas, opinion, proxima_accion, proxima_fecha, registrado_por', q => q.eq('cohort_id', COHORTE).order('fecha', { ascending: false })),
    todas('participant_status_log', 'id, candidate_id, estado, motivo, observacion, fecha_efectiva, etapa, registrado_por, created_at', q => q.eq('cohort_id', COHORTE).order('fecha_efectiva', { ascending: false }).order('created_at', { ascending: false })),
  ]);
  const idsEventos = eventos.map(e => String(e.id));
  const [asistRaw, asistEmpRaw, evidRaw] = await Promise.all([
    porIds('session_attendance', 'id, event_id, candidate_id, estado, marcado_en, marcado_por, observaciones', 'event_id', idsEventos),
    porIds('event_company_attendance', 'id, event_id, company_id, estado, asistentes, marcado_en, marcado_por', 'event_id', idsEventos),
    porIds('event_evidences', 'id, event_id, tipo, nombre, storage_path, url, subido_por, created_at', 'event_id', idsEventos),
  ]);

  // Vacantes y empresas que hacen falta para nombrar postulaciones y colocaciones de la plataforma.
  const jobsExtra = await porIds('jobs', 'id, company_id, title, cohort_id', 'id', [...postPlat.map(p => String(p.job_id ?? '')), ...colocRaw.map(c => String(c.job_id ?? ''))]);
  const idsEmpresas = [...enlaces.map(e => String(e.company_id)), ...jobsExtra.map(j => String(j.company_id ?? '')), ...colocRaw.map(c => String(c.company_id ?? ''))];
  const empleadoresExt = await porIds('hiring_employers', 'id, name', 'id', colocRaw.map(c => String(c.hiring_employer_id ?? '')));
  const externoPorId = new Map(empleadoresExt.map(h => [String(h.id), String(h.name)]));
  const emps = await porIds('companies', 'id, company_name, trade_name, nit, size_range, industry, operation_cities, address, contact_name, contact_phone, contact_email, created_at', 'id', idsEmpresas);
  const empPorId = new Map(emps.map(e => [String(e.id), e]));
  const jobPorId = new Map(jobsExtra.map(j => [String(j.id), j]));
  const nombreEmpresa = (id: unknown) => { const e = empPorId.get(String(id ?? '')); return e ? String(e.trade_name || e.company_name) : null; };

  const candPorId = new Map(cands.map(c => [String(c.id), c]));
  // Sin unique en socio_demographic_data: gana la fila más reciente (mismo criterio que la función pública v6).
  const generoPorId = new Map([...socio].sort((x, y) => Number(x.id) - Number(y.id))
    .filter(r => s(r.gender_identity)).map(r => [String(r.candidate_id), String(r.gender_identity)]));
  const matPorPersona = new Map(matriculas.map(m => [String(m.candidate_id), m]));
  const personas: Persona[] = apps.filter(a => a.candidate_id).map(a => {
    const c = candPorId.get(String(a.candidate_id)) ?? {};
    const m = matPorPersona.get(String(a.candidate_id));
    return {
      id: String(a.candidate_id),
      nombre: [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || 'Sin nombre',
      tipoDoc: s(c.document_type), documento: s(c.document_number), correo: s(c.email), celular: s(c.phone),
      ciudad: s(c.city), genero: generoLegible(generoPorId.get(String(a.candidate_id)) ?? s(c.gender)), nacimiento: s(c.birth_date), nivel: s(c.education_level), hv: s(c.cv_url),
      postulacionId: String(a.id), estado: s(a.status), registradaEl: s(a.created_at),
      respuestas: (a.custom_answers ?? {}) as Persona['respuestas'],
      matricula: m ? { id: Number(m.id), estado: s(m.status), fecha: s(m.enrolled_at) } : null,
    };
  }).sort((x, y) => x.nombre.localeCompare(y.nombre, 'es'));

  const vacantes: Vacante[] = vacRaw.map(j => ({
    id: String(j.id), empresaId: s(j.company_id), titulo: String(j.title ?? 'Sin título'), puestos: Number(j.total_positions ?? 1),
    salario: s(j.salary_range), modalidad: s(j.modality), contrato: s(j.employment_type), nivel: s(j.required_education_level),
    experiencia: s(j.required_experience_months), estado: s(j.status), publicada: Boolean(j.is_published), visibilidad: s(j.visibility),
    ciudades: (j.cities as string[] | null) ?? [],
  }));
  const idsVinculadas = new Set(enlaces.map(e => String(e.company_id)));
  const enlacePorEmpresa = new Map(enlaces.map(e => [String(e.company_id), e]));
  const empresas: Empresa[] = emps.filter(e => idsVinculadas.has(String(e.id))).map(e => ({
    id: String(e.id), nombre: String(e.trade_name || e.company_name), razonSocial: String(e.company_name), nit: String(e.nit ?? ''),
    tamano: s(e.size_range), sector: s(e.industry), municipios: (e.operation_cities as string[] | null) ?? [], direccion: s(e.address),
    contacto: { nombre: s(e.contact_name), telefono: s(e.contact_phone), correo: s(e.contact_email) }, registradaEl: s(e.created_at),
    vacantes: vacantes.filter(v => v.empresaId === String(e.id)),
    diagnostico: (() => { const l = enlacePorEmpresa.get(String(e.id)); return s(l?.diagnostico_url) ? { url: String(l!.diagnostico_url), fecha: s(l!.diagnostico_fecha) } : null; })(),
  })).sort((x, y) => x.nombre.localeCompare(y.nombre, 'es'));

  return {
    personas,
    formularios,
    empresas,
    eventos: eventos.map(e => ({
      id: String(e.id), nombre: String(e.nombre), tipo: s(e.tipo), fase: s(e.fase), modalidad: s(e.modalidad), ubicacion: s(e.ubicacion),
      inicio: String(e.fecha_hora_inicio), fin: s(e.fecha_hora_fin), descripcion: s(e.descripcion), tomaAsistencia: e.toma_asistencia !== false,
      origen: s(e.external_source), enlace: s(e.meeting_link),
    })),
    asistenciaEmpresas: asistEmpRaw.map(a => ({
      id: String(a.id), eventoId: String(a.event_id), empresaId: String(a.company_id), estado: String(a.estado) as AsistenciaEmpresa['estado'],
      asistentes: a.asistentes == null ? null : Number(a.asistentes), marcadoEn: s(a.marcado_en), marcadoPor: s(a.marcado_por),
    })),
    evidencias: evidRaw.map(e => ({
      id: String(e.id), eventoId: String(e.event_id), tipo: String(e.tipo) as TipoEvidencia, nombre: s(e.nombre), ruta: s(e.storage_path),
      url: s(e.url), subidoPor: s(e.subido_por), fecha: String(e.created_at),
    })).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    asistencias: asistRaw.map(a => ({
      id: String(a.id), eventoId: String(a.event_id), personaId: String(a.candidate_id), estado: String(a.estado ?? 'pendiente') as EstadoAsistencia,
      marcadoEn: s(a.marcado_en), marcadoPor: s(a.marcado_por), observaciones: s(a.observaciones),
    })),
    postulaciones: [
      ...postPlat.map(p => {
        const j = jobPorId.get(String(p.job_id ?? ''));
        return { id: String(p.id), personaId: String(p.candidate_id), origen: 'plataforma' as const, vacante: String(j?.title ?? 'Vacante de la plataforma'),
          empresa: nombreEmpresa(j?.company_id), estado: s(p.status), fecha: s(p.created_at), url: null, observaciones: null,
          atribuible: Boolean(j && (idsVinculadas.has(String(j.company_id ?? '')) || String(j.cohort_id ?? '') === COHORTE)),
          excluida: intermFuera.get(String(p.candidate_id)) ?? null };
      }),
      ...postExt.map(p => ({ id: String(p.id), personaId: String(p.candidate_id), origen: 'externa' as const, vacante: String(p.vacancy_name),
        empresa: s(p.company_name), estado: null, fecha: s(p.created_at), url: s(p.application_url), observaciones: s(p.observations), atribuible: true,
        excluida: intermFuera.get(String(p.candidate_id)) ?? null })),
    ].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))),
    colocaciones: colocRaw.map(c => ({
      id: String(c.id), personaId: String(c.talent_id),
      empresa: nombreEmpresa(c.company_id) ?? externoPorId.get(String(c.hiring_employer_id ?? '')) ?? (jobPorId.get(String(c.job_id ?? '')) ? nombreEmpresa(jobPorId.get(String(c.job_id))!.company_id) : null),
      cargo: String(c.role_sector ?? ''), inicio: String(c.start_date), modalidad: s(c.modality), estado: s(c.status),
      activa: !c.deactivated_at, duracionMeses: c.duration_months == null ? null : Number(c.duration_months),
      excluida: colocFuera.get(String(c.id)) ?? null,
    })),
    exclusiones,
    llamadas: llamRaw.filter(l => !personasFuera.has(String(l.candidate_id))).map(l => ({
      id: String(l.id), personaId: String(l.candidate_id), fecha: String(l.fecha), canal: String(l.canal) as CanalContacto,
      proposito: String(l.proposito) as PropositoContacto, resultado: (l.resultado == null ? null : String(l.resultado)) as ResultadoLlamada | null, notas: s(l.notas), opinion: s(l.opinion),
      proximaAccion: s(l.proxima_accion), proximaFecha: s(l.proxima_fecha), registradaPor: s(l.registrado_por),
    })),
    estados: estRaw.filter(e => !personasFuera.has(String(e.candidate_id))).map(e => ({
      id: String(e.id), personaId: String(e.candidate_id), estado: String(e.estado) as 'activo' | 'inactivo', motivo: s(e.motivo),
      observacion: s(e.observacion), fechaEfectiva: String(e.fecha_efectiva), etapa: s(e.etapa), registradoPor: s(e.registrado_por), creadoEl: String(e.created_at),
    })),
    cargadoEl: new Date().toISOString(),
  };
}

const BUCKET_DOCUMENTOS = 'documentos-talentos';
const BUCKET_HV = 'resumes';
/** Tipos que se aceptan para documentos y hoja de vida. */
export const ACEPTA_DOCUMENTO = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
const nombreLimpio = (n: string) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_');
function archivoInvalido(f: File): string | null {
  if (f.size > 10 * 1024 * 1024) return 'El archivo pesa más de 10 MB.';
  if (!/\.(pdf|jpe?g|png|docx?)$/i.test(f.name)) return 'Solo PDF, imagen (JPG, PNG) o Word.';
  return null;
}

function mensaje(e: { message: string; code?: string } | null): string | null {
  if (!e) return null;
  if (e.code === '42501' || /row-level security|permission denied/i.test(e.message)) return 'Tu cuenta no tiene permiso para hacer este cambio.';
  return e.message;
}

export function CohorteProvider({ children }: { children: ReactNode }) {
  const { esAdmin, correo } = useAuth();
  const [datos, setDatos] = useState<DatosCohorte | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pedido = useRef(false);

  const recargar = useCallback(async () => {
    if (!supabase || !esAdmin) return;
    setCargando(true);
    try { setDatos(await cargarTodo()); setError(null); }
    catch (e) { setError((e as Error).message); }
    finally { setCargando(false); }
  }, [esAdmin]);

  const cargar = useCallback(() => {
    if (pedido.current) return;
    pedido.current = true;
    void recargar();
  }, [recargar]);

  // Al cerrar sesión se borran los datos personales de la memoria.
  useEffect(() => { if (!esAdmin) { setDatos(null); pedido.current = false; } }, [esAdmin]);

  const guardarEvento: Valor['guardarEvento'] = useCallback(async (e) => {
    const fila = {
      cohort_id: COHORTE, nombre: e.nombre.trim(), tipo: e.tipo ?? null, fase: e.fase ?? e.tipo ?? null, modalidad: e.modalidad ?? null,
      ubicacion: e.ubicacion ?? null, fecha_hora_inicio: e.inicio, fecha_hora_fin: e.fin ?? null, descripcion: e.descripcion ?? null,
      toma_asistencia: e.tomaAsistencia ?? true, meeting_link: e.enlace ?? null,
    };
    const { error } = e.id
      ? await supabase!.from('events').update(fila).eq('id', e.id)
      : await supabase!.from('events').insert({ ...fila, obligatoria: false, external_source: 'dashboard' });
    if (!error) await recargar();
    return mensaje(error);
  }, [recargar]);

  const borrarEvento: Valor['borrarEvento'] = useCallback(async (id, motivo) => {
    const ev = datos?.eventos.find(e => e.id === id);
    // Una reserva de Cal.com se cancela allá: si se borra aquí, el webhook la vuelve a crear en la siguiente novedad.
    if (ev && /cal\.com/i.test(ev.origen ?? '')) return 'Este evento viene de Cal.com: cancélalo allá.';
    if (motivo.trim().length < 3) return 'Escribe el motivo del borrado.';
    // La base borra en cascada asistencias, empresas y filas de evidencias (el historial guarda todo con el motivo);
    // los ARCHIVOS del bucket no: se quitan aquí.
    const rutas = (datos?.evidencias ?? []).filter(x => x.eventoId === id && x.ruta).map(x => x.ruta!);
    const { error } = await supabase!.rpc('borrar_evento', { p_evento: id, p_motivo: motivo.trim() });
    if (!error && rutas.length) await supabase!.storage.from('evidencias-eventos').remove(rutas);
    if (!error) await recargar();
    if (error && /PGRST202|Could not find the function/i.test(`${error.code ?? ''} ${error.message}`)) return 'Falta aplicar en la base la función borrar_evento (A-24).';
    return mensaje(error);
  }, [datos, recargar]);

  const marcarAsistencia: Valor['marcarAsistencia'] = useCallback(async (eventoId, personaId, estado) => {
    const p = datos?.personas.find(x => x.id === personaId);
    // El candado de la tabla es (event_id, candidate_id): la asistencia se ancla en la persona, no en la matrícula.
    const { error } = await supabase!.from('session_attendance').upsert({
      event_id: eventoId, candidate_id: personaId, cohort_id: COHORTE, enrollment_id: p?.matricula?.id ?? null,
      estado, marcado_por: correo, marcado_en: new Date().toISOString(),
    }, { onConflict: 'event_id,candidate_id' });
    if (!error) await recargar();
    return mensaje(error);
  }, [datos, correo, recargar]);

  const quitarDeEvento: Valor['quitarDeEvento'] = useCallback(async (eventoId, personaId) => {
    // Solo se quita una convocatoria; un hecho (asistió / no asistió) no se borra, se corrige.
    const { error } = await supabase!.from('session_attendance').delete()
      .eq('event_id', eventoId).eq('candidate_id', personaId).in('estado', ['agendado', 'cancelado', 'pendiente']);
    if (!error) await recargar();
    return mensaje(error);
  }, [recargar]);

  const marcarEmpresa: Valor['marcarEmpresa'] = useCallback(async (eventoId, empresaId, estado, asistentes) => {
    const { error } = await supabase!.from('event_company_attendance').upsert({
      event_id: eventoId, company_id: empresaId, cohort_id: COHORTE, estado, asistentes: asistentes ?? null,
      marcado_por: correo, marcado_en: new Date().toISOString(),
    }, { onConflict: 'event_id,company_id' });
    if (!error) await recargar();
    return mensaje(error);
  }, [correo, recargar]);

  const quitarEmpresa: Valor['quitarEmpresa'] = useCallback(async (eventoId, empresaId) => {
    const { error } = await supabase!.from('event_company_attendance').delete().eq('event_id', eventoId).eq('company_id', empresaId);
    if (!error) await recargar();
    return mensaje(error);
  }, [recargar]);

  const subirEvidencia: Valor['subirEvidencia'] = useCallback(async (eventoId, tipo, fuente) => {
    let ruta: string | null = null, url: string | null = null, nombre: string | null = null;
    if ('archivo' in fuente) {
      const f = fuente.archivo;
      if (f.size > 20 * 1024 * 1024) return 'El archivo pesa más de 20 MB.';
      const limpio = f.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_');
      ruta = `${COHORTE}/${eventoId}/${Date.now()}-${limpio}`;
      nombre = f.name;
      const up = await supabase!.storage.from('evidencias-eventos').upload(ruta, f, { contentType: f.type || undefined, upsert: false });
      if (up.error) return mensaje(up.error);
    } else {
      url = fuente.url.trim(); nombre = fuente.nombre?.trim() || null;
      if (!/^https?:\/\//.test(url)) return 'El enlace debe empezar por http:// o https://';
    }
    const { error } = await supabase!.from('event_evidences').insert({ event_id: eventoId, tipo, nombre, storage_path: ruta, url, subido_por: correo });
    if (error && ruta) await supabase!.storage.from('evidencias-eventos').remove([ruta]);
    if (!error) await recargar();
    return mensaje(error);
  }, [correo, recargar]);

  const borrarEvidencia: Valor['borrarEvidencia'] = useCallback(async (e) => {
    const { error } = await supabase!.from('event_evidences').delete().eq('id', e.id);
    if (!error && e.ruta) await supabase!.storage.from('evidencias-eventos').remove([e.ruta]);
    if (!error) await recargar();
    return mensaje(error);
  }, [recargar]);

  const abrirEvidencia: Valor['abrirEvidencia'] = useCallback(async (e) => {
    if (e.url) return e.url;
    if (!e.ruta) return null;
    const { data } = await supabase!.storage.from('evidencias-eventos').createSignedUrl(e.ruta, 600);
    return data?.signedUrl ?? null;
  }, []);

  // ─── Llamadas, estado e historial (D-51..D-53) ────────────────────────────────────────────────────────────────
  const registrarLlamada: Valor['registrarLlamada'] = useCallback(async (x) => {
    const { error } = await supabase!.from('participant_contacts').insert({
      cohort_id: COHORTE, candidate_id: x.personaId, fecha: x.fecha ?? new Date().toISOString(), canal: x.canal, proposito: x.proposito,
      resultado: x.resultado, notas: x.notas?.trim() || null, opinion: x.opinion?.trim() || null,
      proxima_accion: x.proximaAccion?.trim() || null, proxima_fecha: x.proximaFecha || null, registrado_por: correo,
    });
    if (!error) await recargar();
    return mensaje(error);
  }, [correo, recargar]);

  const completarLlamada: Valor['completarLlamada'] = useCallback(async (id, x) => {
    const { error } = await supabase!.from('participant_contacts').update({
      resultado: x.resultado, notas: x.notas?.trim() || null, opinion: x.opinion?.trim() || null,
      proxima_accion: x.proximaAccion?.trim() || null, proxima_fecha: x.proximaFecha || null, registrado_por: correo,
    }).eq('id', id);
    if (!error) await recargar();
    return mensaje(error);
  }, [correo, recargar]);

  const cancelarLlamada: Valor['cancelarLlamada'] = useCallback(async (id) => {
    const l = datos?.llamadas.find(x => x.id === id);
    if (l && l.resultado != null) return 'Solo se cancelan llamadas agendadas; las hechas quedan.';
    const { error } = await supabase!.from('participant_contacts').delete().eq('id', id).is('resultado', null);
    if (!error) await recargar();
    return mensaje(error);
  }, [datos, recargar]);

  const borrarLlamada: Valor['borrarLlamada'] = useCallback(async (id, motivo) => {
    if (motivo.trim().length < 3) return 'Escribe el motivo del borrado.';
    const { error } = await supabase!.rpc('borrar_llamada', { p_llamada: id, p_motivo: motivo.trim() });
    if (!error) await recargar();
    if (error && /PGRST202|Could not find the function/i.test(`${error.code ?? ''} ${error.message}`)) return 'Falta aplicar en la base la función borrar_llamada (A-30).';
    return mensaje(error);
  }, [recargar]);

  // ─── Documentos y hoja de vida (D-73, A-43) ───────────────────────────────────────────────────────────────────
  const subirDocumento: Valor['subirDocumento'] = useCallback(async (persona, fm, q, archivo) => {
    const malo = archivoInvalido(archivo);
    if (malo) return malo;
    // Mismo formato de ruta que la plataforma: <fileCategory>/<persona>/<ms>_<nombre>.
    const ruta = `${q.categoria ?? 'otros'}/${persona.id}/${Date.now()}_${nombreLimpio(archivo.name)}`;
    const up = await supabase!.storage.from(BUCKET_DOCUMENTOS).upload(ruta, archivo, { contentType: archivo.type || undefined, upsert: false });
    if (up.error) return mensaje(up.error);
    const { error } = await supabase!.rpc('guardar_documento_persona', {
      p_postulacion: persona.postulacionId, p_bloque: fm.bloque, p_pregunta: q.id, p_clave: q.clave, p_ruta: ruta,
    });
    // Si la respuesta no se guardó, el archivo no queda huérfano. El archivo anterior no se borra: queda en el historial.
    if (error) await supabase!.storage.from(BUCKET_DOCUMENTOS).remove([ruta]);
    if (!error) await recargar();
    if (error && /PGRST202|Could not find the function/i.test(`${error.code ?? ''} ${error.message}`)) return 'Falta aplicar en la base la función guardar_documento_persona (A-44).';
    return mensaje(error);
  }, [recargar]);

  const abrirDocumento: Valor['abrirDocumento'] = useCallback(async (valor) => {
    const v = valor == null ? '' : String(valor).trim();
    if (!v) return null;
    if (/^https?:\/\//.test(v)) return v;
    const { data } = await supabase!.storage.from(BUCKET_DOCUMENTOS).createSignedUrl(v, 600);
    return data?.signedUrl ?? null;
  }, []);

  const subirHojaDeVida: Valor['subirHojaDeVida'] = useCallback(async (persona, archivo) => {
    const malo = archivoInvalido(archivo);
    if (malo) return malo;
    const ext = (archivo.name.match(/\.([A-Za-z0-9]{1,5})$/)?.[1] ?? 'pdf').toLowerCase();
    const ruta = `dashboard/${persona.id}/cv_${Date.now()}.${ext}`;
    const up = await supabase!.storage.from(BUCKET_HV).upload(ruta, archivo, { contentType: archivo.type || undefined, upsert: false });
    if (up.error) return mensaje(up.error);
    const url = supabase!.storage.from(BUCKET_HV).getPublicUrl(ruta).data.publicUrl;
    const { error } = await supabase!.from('candidates').update({ cv_url: url }).eq('id', persona.id);
    if (error) await supabase!.storage.from(BUCKET_HV).remove([ruta]);
    if (!error) await recargar();
    return mensaje(error);
  }, [recargar]);

  const guardarDiagnostico: Valor['guardarDiagnostico'] = useCallback(async (empresaId, url, fecha) => {
    const u = url.trim();
    if (u && !/^https:\/\//i.test(u)) return 'El enlace debe empezar por https://';
    const { error } = await supabase!.rpc('guardar_diagnostico', { p_empresa: empresaId, p_cohorte: COHORTE, p_url: u, p_fecha: fecha || null });
    if (!error) await recargar();
    if (error && /PGRST202|Could not find the function/i.test(`${error.code ?? ''} ${error.message}`)) return 'Falta aplicar en la base la función guardar_diagnostico (A-31).';
    return mensaje(error);
  }, [recargar]);

  const cambiarEstado: Valor['cambiarEstado'] = useCallback(async (x) => {
    if (x.estado === 'inactivo' && (!x.motivo?.trim() || !x.observacion?.trim())) return 'Para inactivar, elige el motivo y escribe la observación.';
    const { error } = await supabase!.from('participant_status_log').insert({
      cohort_id: COHORTE, candidate_id: x.personaId, estado: x.estado, motivo: x.motivo?.trim() || null,
      observacion: x.observacion?.trim() || null, fecha_efectiva: x.fechaEfectiva || new Date().toISOString().slice(0, 10),
      etapa: x.etapa ?? null, registrado_por: correo,
    });
    if (!error) await recargar();
    return mensaje(error);
  }, [correo, recargar]);

  const historialDe: Valor['historialDe'] = useCallback(async (personaId) => {
    const { data, error } = await supabase!.from('audit_log')
      .select('id, tabla, accion, campos, antes, despues, motivo, cambio_por, creado_en, cohort_id')
      .eq('candidate_id', personaId).order('creado_en', { ascending: false }).limit(300);
    if (error) return { cambios: [], error: mensaje(error) };
    const cambios = ((data ?? []) as Fila[])
      // de esta cohorte, o sin cohorte (datos de contacto, postulaciones a vacantes, colocaciones)
      .filter(r => r.cohort_id == null || String(r.cohort_id) === COHORTE)
      .map(r => ({ id: Number(r.id), tabla: String(r.tabla), accion: String(r.accion) as Cambio['accion'], campos: (r.campos as string[] | null) ?? null,
        antes: (r.antes as Record<string, unknown> | null) ?? null, despues: (r.despues as Record<string, unknown> | null) ?? null,
        motivo: s(r.motivo), por: s(r.cambio_por), el: String(r.creado_en) }));
    return { cambios, error: null };
  }, []);

  // ─── Intermediación y colocación (FQSD colocaciones.ts): mismas tablas que la plataforma ────────────────────────
  const crearPostulacionExterna: Valor['crearPostulacionExterna'] = useCallback(async (x) => {
    if (!x.vacante.trim()) return 'Escribe el nombre de la vacante.';
    const url = x.url?.trim() || null;
    if (url && !/^https?:\/\//.test(url)) return 'El enlace debe empezar por http:// o https://';
    const { error } = await supabase!.from('participant_vacancy_applications').insert({
      candidate_id: x.personaId, vacancy_name: x.vacante.trim(), company_name: x.empresa?.trim() || null,
      application_url: url, observations: x.observaciones?.trim() || null, created_by: correo,
    });
    if (!error) await recargar();
    return mensaje(error);
  }, [correo, recargar]);

  const borrarPostulacionExterna: Valor['borrarPostulacionExterna'] = useCallback(async (id) => {
    const { error } = await supabase!.from('participant_vacancy_applications').delete().eq('id', id);
    if (!error) await recargar();
    return mensaje(error);
  }, [recargar]);

  const listarEmpleadores: Valor['listarEmpleadores'] = useCallback(async () => {
    const [c, h] = await Promise.all([
      todas('companies', 'id, company_name, trade_name, is_active', q => q.order('company_name')),
      todas('hiring_employers', 'id, name', q => q.order('name')),
    ]);
    const out: Empleador[] = [];
    for (const r of c) { const n = String(r.trade_name || r.company_name || '').trim(); if (n) out.push({ key: `company:${r.id}`, nombre: r.is_active === false ? `${n} (inactiva)` : n, origen: 'empresa' }); }
    for (const r of h) { const n = String(r.name ?? '').trim(); if (n) out.push({ key: `hiring:${r.id}`, nombre: n, origen: 'externo' }); }
    return out.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, []);

  const crearColocacion: Valor['crearColocacion'] = useCallback(async (c) => {
    if (!c.cargo.trim()) return 'Escribe el cargo o sector.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.inicio)) return 'Elige la fecha de inicio.';
    let company_id: string | null = null, hiring_employer_id: string | null = null;
    if (c.empleador.startsWith('company:')) company_id = c.empleador.slice(8);
    else if (c.empleador.startsWith('hiring:')) hiring_employer_id = c.empleador.slice(7);
    else if (c.empleador.startsWith('nuevo:')) {
      const name = c.empleador.slice(6).trim();
      if (!name) return 'Escribe el nombre del empleador.';
      // Se reusa si ya existe con ese nombre (evita el mismo empleador tres veces).
      const { data: ya } = await supabase!.from('hiring_employers').select('id').ilike('name', name.replace(/[%_]/g, '\\$&')).limit(1);
      if (ya && ya.length) hiring_employer_id = String((ya[0] as Fila).id);
      else {
        const { data, error } = await supabase!.from('hiring_employers').insert({ name, created_by: correo }).select('id').single();
        if (error) return mensaje(error);
        hiring_employer_id = String((data as Fila).id);
      }
    } else return 'Elige un empleador.';
    const { error } = await supabase!.from('placements').insert({
      talent_id: c.personaId, company_id, hiring_employer_id, job_id: null, start_date: c.inicio, role_sector: c.cargo.trim(),
      modality: c.modalidad, duration_months: c.duracionMeses, experience_level: c.experiencia, status: 'active',
      retention_send_mode: c.modoRetencion, disruptia_contact_email: correo,
    });
    if (!error) await recargar();
    return mensaje(error);
  }, [correo, recargar]);

  const desactivarColocacion: Valor['desactivarColocacion'] = useCallback(async (id, motivo) => {
    if (!motivo.trim()) return 'Escribe el motivo.';
    const { error } = await supabase!.from('placements').update({
      status: 'inactive', deactivated_at: new Date().toISOString(), deactivation_reason: motivo.trim(), deactivated_by: correo,
    }).eq('id', id);
    if (!error) await recargar();
    return mensaje(error);
  }, [correo, recargar]);

  const valor = useMemo(() => ({ datos, cargando, error, cargar, recargar, guardarEvento, borrarEvento, marcarAsistencia, quitarDeEvento,
    marcarEmpresa, quitarEmpresa, subirEvidencia, borrarEvidencia, abrirEvidencia,
    crearPostulacionExterna, borrarPostulacionExterna, listarEmpleadores, crearColocacion, desactivarColocacion,
    registrarLlamada, completarLlamada, cancelarLlamada, borrarLlamada, guardarDiagnostico, subirDocumento, abrirDocumento, subirHojaDeVida, cambiarEstado, historialDe }),
    [datos, cargando, error, cargar, recargar, guardarEvento, borrarEvento, marcarAsistencia, quitarDeEvento, marcarEmpresa, quitarEmpresa,
      subirEvidencia, borrarEvidencia, abrirEvidencia, crearPostulacionExterna,
      borrarPostulacionExterna, listarEmpleadores, crearColocacion, desactivarColocacion, registrarLlamada, completarLlamada, cancelarLlamada, borrarLlamada, guardarDiagnostico, subirDocumento, abrirDocumento, subirHojaDeVida, cambiarEstado, historialDe]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

/** Datos de la cohorte; dispara la carga la primera vez que una vista lo usa. */
export function useCohorte(): Valor {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCohorte fuera de <CohorteProvider>');
  useEffect(() => { v.cargar(); }, [v]);
  return v;
}

/** Estado actual de cada persona (D-52): la fila más reciente; sin filas = activa. */
export function estadoActual(d: DatosCohorte): Map<string, CambioEstado> {
  const m = new Map<string, CambioEstado>();
  for (const e of d.estados) if (!m.has(e.personaId)) m.set(e.personaId, e); // vienen del más reciente al más antiguo
  return m;
}
