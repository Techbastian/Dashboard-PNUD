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
export interface Postulacion { id: string; personaId: string; origen: 'plataforma' | 'externa'; vacante: string; empresa: string | null; estado: string | null; fecha: string | null; url: string | null; observaciones: string | null }
export interface Colocacion { id: string; personaId: string; empresa: string | null; cargo: string; inicio: string; modalidad: string | null; estado: string | null; activa: boolean; duracionMeses: number | null }
export interface Vacante {
  id: string; empresaId: string | null; titulo: string; puestos: number; salario: string | null; modalidad: string | null; contrato: string | null;
  nivel: string | null; experiencia: string | null; estado: string | null; publicada: boolean; visibilidad: string | null; ciudades: string[];
}
export interface Empresa {
  id: string; nombre: string; razonSocial: string; nit: string; tamano: string | null; sector: string | null; municipios: string[];
  direccion: string | null; contacto: { nombre: string | null; telefono: string | null; correo: string | null }; registradaEl: string | null; vacantes: Vacante[];
}
/** Asistencia de una EMPRESA a un evento (A-10, D-40): P1 empresa sensibilizada = asistió a un evento de sensibilización. */
export interface AsistenciaEmpresa { id: string; eventoId: string; empresaId: string; estado: 'agendado' | 'asistio' | 'no_asistio' | 'cancelado'; asistentes: number | null; marcadoEn: string | null; marcadoPor: string | null }
export type TipoEvidencia = 'agenda' | 'asistencia' | 'fotografia' | 'otro';
/** Evidencia de un evento (A-10): archivo en el bucket privado `evidencias-eventos` o enlace. */
export interface Evidencia { id: string; eventoId: string; tipo: TipoEvidencia; nombre: string | null; ruta: string | null; url: string | null; subidoPor: string | null; fecha: string }
export interface Pregunta { clave: string; etiqueta: string; tipo: string }
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
  borrarEvento: (id: string) => Promise<string | null>;
  marcarAsistencia: (eventoId: string, personaId: string, estado: EstadoAsistencia) => Promise<string | null>;
  quitarDeEvento: (eventoId: string, personaId: string) => Promise<string | null>;
  marcarEmpresa: (eventoId: string, empresaId: string, estado: AsistenciaEmpresa['estado'], asistentes?: number | null) => Promise<string | null>;
  quitarEmpresa: (eventoId: string, empresaId: string) => Promise<string | null>;
  subirEvidencia: (eventoId: string, tipo: TipoEvidencia, fuente: { archivo: File } | { url: string; nombre?: string }) => Promise<string | null>;
  borrarEvidencia: (e: Evidencia) => Promise<string | null>;
  /** URL para abrir una evidencia (firmada por 10 minutos si es archivo). */
  abrirEvidencia: (e: Evidencia) => Promise<string | null>;
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

type Fila = Record<string, unknown>;
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
    preguntas: ((b.dimensions ?? []) as Fila[]).flatMap(d => ((d.questions ?? []) as Fila[]).map(q => ({
      clave: claveDePregunta(q as { slug?: string; label?: string }), etiqueta: String(q.label ?? ''), tipo: String(q.type ?? ''),
    }))),
  }));

  const apps = await todas('project_applications', 'id, candidate_id, status, created_at, custom_answers', q => q.eq('cohort_id', COHORTE));
  const idsPersonas = apps.map(a => String(a.candidate_id ?? '')).filter(Boolean);
  const [cands, matriculas, eventos, colocRaw, postPlat, postExt, enlaces, vacRaw] = await Promise.all([
    porIds('candidates', 'id, first_name, last_name, document_type, document_number, email, phone, city, gender, birth_date', 'id', idsPersonas),
    todas('program_enrollments', 'id, candidate_id, status, enrolled_at', q => q.eq('cohort_id', COHORTE)),
    todas('events', 'id, nombre, tipo, fase, modalidad, ubicacion, fecha_hora_inicio, fecha_hora_fin, descripcion, toma_asistencia, external_source, meeting_link', q => q.eq('cohort_id', COHORTE).order('fecha_hora_inicio')),
    porIds('placements', 'id, talent_id, company_id, job_id, start_date, role_sector, modality, status, deactivated_at, duration_months', 'talent_id', idsPersonas),
    porIds('applications', 'id, candidate_id, job_id, status, created_at', 'candidate_id', idsPersonas),
    porIds('participant_vacancy_applications', 'id, candidate_id, vacancy_name, company_name, application_url, observations, created_at', 'candidate_id', idsPersonas),
    todas('company_cohorts', 'company_id', q => q.eq('cohort_id', COHORTE)),
    todas('jobs', 'id, company_id, title, total_positions, salary_range, modality, employment_type, required_education_level, required_experience_months, status, is_published, visibility, cities', q => q.eq('cohort_id', COHORTE)),
  ]);
  const idsEventos = eventos.map(e => String(e.id));
  const [asistRaw, asistEmpRaw, evidRaw] = await Promise.all([
    porIds('session_attendance', 'id, event_id, candidate_id, estado, marcado_en, marcado_por, observaciones', 'event_id', idsEventos),
    porIds('event_company_attendance', 'id, event_id, company_id, estado, asistentes, marcado_en, marcado_por', 'event_id', idsEventos),
    porIds('event_evidences', 'id, event_id, tipo, nombre, storage_path, url, subido_por, created_at', 'event_id', idsEventos),
  ]);

  // Vacantes y empresas que hacen falta para nombrar postulaciones y colocaciones de la plataforma.
  const jobsExtra = await porIds('jobs', 'id, company_id, title', 'id', [...postPlat.map(p => String(p.job_id ?? '')), ...colocRaw.map(c => String(c.job_id ?? ''))]);
  const idsEmpresas = [...enlaces.map(e => String(e.company_id)), ...jobsExtra.map(j => String(j.company_id ?? '')), ...colocRaw.map(c => String(c.company_id ?? ''))];
  const emps = await porIds('companies', 'id, company_name, trade_name, nit, size_range, industry, operation_cities, address, contact_name, contact_phone, contact_email, created_at', 'id', idsEmpresas);
  const empPorId = new Map(emps.map(e => [String(e.id), e]));
  const jobPorId = new Map(jobsExtra.map(j => [String(j.id), j]));
  const nombreEmpresa = (id: unknown) => { const e = empPorId.get(String(id ?? '')); return e ? String(e.trade_name || e.company_name) : null; };

  const candPorId = new Map(cands.map(c => [String(c.id), c]));
  const matPorPersona = new Map(matriculas.map(m => [String(m.candidate_id), m]));
  const personas: Persona[] = apps.filter(a => a.candidate_id).map(a => {
    const c = candPorId.get(String(a.candidate_id)) ?? {};
    const m = matPorPersona.get(String(a.candidate_id));
    return {
      id: String(a.candidate_id),
      nombre: [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || 'Sin nombre',
      tipoDoc: s(c.document_type), documento: s(c.document_number), correo: s(c.email), celular: s(c.phone),
      ciudad: s(c.city), genero: s(c.gender), nacimiento: s(c.birth_date),
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
  const empresas: Empresa[] = emps.filter(e => idsVinculadas.has(String(e.id))).map(e => ({
    id: String(e.id), nombre: String(e.trade_name || e.company_name), razonSocial: String(e.company_name), nit: String(e.nit ?? ''),
    tamano: s(e.size_range), sector: s(e.industry), municipios: (e.operation_cities as string[] | null) ?? [], direccion: s(e.address),
    contacto: { nombre: s(e.contact_name), telefono: s(e.contact_phone), correo: s(e.contact_email) }, registradaEl: s(e.created_at),
    vacantes: vacantes.filter(v => v.empresaId === String(e.id)),
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
          empresa: nombreEmpresa(j?.company_id), estado: s(p.status), fecha: s(p.created_at), url: null, observaciones: null };
      }),
      ...postExt.map(p => ({ id: String(p.id), personaId: String(p.candidate_id), origen: 'externa' as const, vacante: String(p.vacancy_name),
        empresa: s(p.company_name), estado: null, fecha: s(p.created_at), url: s(p.application_url), observaciones: s(p.observations) })),
    ].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))),
    colocaciones: colocRaw.map(c => ({
      id: String(c.id), personaId: String(c.talent_id), empresa: nombreEmpresa(c.company_id) ?? (jobPorId.get(String(c.job_id ?? '')) ? nombreEmpresa(jobPorId.get(String(c.job_id))!.company_id) : null),
      cargo: String(c.role_sector ?? ''), inicio: String(c.start_date), modalidad: s(c.modality), estado: s(c.status),
      activa: !c.deactivated_at, duracionMeses: c.duration_months == null ? null : Number(c.duration_months),
    })),
    cargadoEl: new Date().toISOString(),
  };
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

  const borrarEvento: Valor['borrarEvento'] = useCallback(async (id) => {
    const { error } = await supabase!.from('events').delete().eq('id', id);
    if (!error) await recargar();
    return mensaje(error);
  }, [recargar]);

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

  const valor = useMemo(() => ({ datos, cargando, error, cargar, recargar, guardarEvento, borrarEvento, marcarAsistencia, quitarDeEvento,
    marcarEmpresa, quitarEmpresa, subirEvidencia, borrarEvidencia, abrirEvidencia }),
    [datos, cargando, error, cargar, recargar, guardarEvento, borrarEvento, marcarAsistencia, quitarDeEvento, marcarEmpresa, quitarEmpresa, subirEvidencia, borrarEvidencia, abrirEvidencia]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

/** Datos de la cohorte; dispara la carga la primera vez que una vista lo usa. */
export function useCohorte(): Valor {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCohorte fuera de <CohorteProvider>');
  useEffect(() => { v.cargar(); }, [v]);
  return v;
}
