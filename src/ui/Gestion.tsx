/**
 * Gestión por persona (portado de FQSD, plantilla 2.6): tareas y conclusión de la ficha, y registrar intermediación
 * (postulación externa) y colocación. Escriben en las MISMAS tablas que la plataforma (follow_up_tasks,
 * participant_conclusions, participant_vacancy_applications, placements, hiring_employers), así que la plataforma y
 * la función pública los ven sin sincronizar nada. Todo solo para el equipo (RLS is_admin).
 * Sin diálogos del navegador: confirmaciones y errores en línea.
 */
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Check, Loader2, Plus, Trash2 } from 'lucide-react';
import {
  useCohorte, DURACIONES, EXPERIENCIA, MODALIDADES,
  type Colocacion, type Empleador, type EstadoTarea, type Persona, type Postulacion, type PrioridadTarea,
} from '../lib/datos';
import { fecha, fechaHora, norm } from '../lib/formato';
import { Etiqueta } from './Privado';

export const campo = 'w-full bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20';
export const etiquetaCampo = 'block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5';
const boton = 'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50';
const enlace = 'inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-brand';

function ErrorLinea({ texto }: { texto: string | null }) {
  return texto ? <p className="text-xs font-bold text-red-600" role="alert">{texto}</p> : null;
}

/** Ejecuta una escritura y guarda su error; `ok` corre solo si salió bien. */
function useEscritura() {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function correr(f: () => Promise<string | null>, ok?: () => void) {
    setOcupado(true); setError(null);
    const e = await f();
    setOcupado(false);
    if (e) setError(e); else ok?.();
  }
  return { ocupado, error, correr };
}

// ─── Tareas ─────────────────────────────────────────────────────────────────────────────────────────────────────
const ESTADOS: { k: EstadoTarea; label: string; tono: 'amber' | 'brand' | 'emerald' | 'slate' }[] = [
  { k: 'abierta', label: 'Abierta', tono: 'amber' }, { k: 'en_progreso', label: 'En curso', tono: 'brand' },
  { k: 'hecha', label: 'Hecha', tono: 'emerald' }, { k: 'cancelada', label: 'Cancelada', tono: 'slate' },
];
const PRIORIDADES: PrioridadTarea[] = ['baja', 'media', 'alta'];

export function TareasPersona({ persona }: { persona: Persona }) {
  const { datos, crearTarea, cambiarEstadoTarea } = useCohorte();
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState<PrioridadTarea>('media');
  const [vence, setVence] = useState('');
  const { ocupado, error, correr } = useEscritura();
  const tareas = (datos?.tareas ?? []).filter(t => t.personaId === persona.id)
    .sort((a, b) => Number(a.estado === 'hecha' || a.estado === 'cancelada') - Number(b.estado === 'hecha' || b.estado === 'cancelada')
      || String(a.venceEl ?? '9999').localeCompare(String(b.venceEl ?? '9999')));

  function enviar(e: FormEvent) {
    e.preventDefault();
    void correr(() => crearTarea({ personaId: persona.id, titulo, descripcion, prioridad, venceEl: vence || null }), () => {
      setTitulo(''); setDescripcion(''); setVence(''); setPrioridad('media'); setAbierto(false);
    });
  }

  return (
    <div className="space-y-3">
      {tareas.length === 0 && !abierto && <p className="text-xs text-slate-400 font-bold">Sin tareas.</p>}
      <ul className="space-y-2">
        {tareas.map(t => {
          const cerrada = t.estado === 'hecha' || t.estado === 'cancelada';
          const vencida = !cerrada && t.venceEl && t.venceEl < new Date().toISOString().slice(0, 10);
          return (
            <li key={t.id} className={`rounded-xl border border-slate-100 p-3 ${cerrada ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`text-sm font-bold text-slate-800 ${t.estado === 'hecha' ? 'line-through' : ''}`}>{t.titulo}</p>
                  {t.descripcion && <p className="text-xs text-slate-500 mt-0.5 whitespace-pre-line">{t.descripcion}</p>}
                  <p className="text-[11px] text-slate-400 mt-1">
                    Prioridad {t.prioridad}{t.venceEl && <> · vence {fecha(t.venceEl)}</>}{vencida && <span className="text-red-600 font-bold"> · vencida</span>}
                    {t.creadaPor && <> · {t.creadaPor}</>}
                  </p>
                </div>
                <select aria-label={`Estado de ${t.titulo}`} value={t.estado} disabled={ocupado}
                  onChange={e => void correr(() => cambiarEstadoTarea(t.id, e.target.value as EstadoTarea))}
                  className="shrink-0 bg-slate-50 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-600 outline-none">
                  {ESTADOS.map(s => <option key={s.k} value={s.k}>{s.label}</option>)}
                </select>
              </div>
            </li>
          );
        })}
      </ul>
      {abierto ? (
        <form onSubmit={enviar} className="space-y-3 rounded-xl bg-slate-50/60 p-3">
          <div><label className={etiquetaCampo} htmlFor="t-titulo">Tarea</label>
            <input id="t-titulo" required value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej. Volver a llamar, pedir documento…" className={campo} /></div>
          <div><label className={etiquetaCampo} htmlFor="t-desc">Detalle</label>
            <textarea id="t-desc" rows={2} value={descripcion} onChange={e => setDescripcion(e.target.value)} className={campo} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={etiquetaCampo} htmlFor="t-prio">Prioridad</label>
              <select id="t-prio" value={prioridad} onChange={e => setPrioridad(e.target.value as PrioridadTarea)} className={campo}>
                {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
              </select></div>
            <div><label className={etiquetaCampo} htmlFor="t-vence">Vence</label>
              <input id="t-vence" type="date" value={vence} onChange={e => setVence(e.target.value)} className={campo} /></div>
          </div>
          <ErrorLinea texto={error} />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={ocupado} className={boton}>{ocupado ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Guardar tarea</button>
            <button type="button" onClick={() => setAbierto(false)} className="text-[10px] font-black uppercase text-slate-400">Cancelar</button>
          </div>
        </form>
      ) : (
        <>
          <ErrorLinea texto={error} />
          <button type="button" onClick={() => setAbierto(true)} className={enlace}><Plus size={13} /> Nueva tarea</button>
        </>
      )}
    </div>
  );
}

// ─── Conclusión ─────────────────────────────────────────────────────────────────────────────────────────────────
export function ConclusionPersona({ persona }: { persona: Persona }) {
  const { datos, guardarConclusion } = useCohorte();
  const actual = datos?.conclusiones.find(c => c.personaId === persona.id) ?? null;
  const [texto, setTexto] = useState(actual?.texto ?? '');
  const [guardado, setGuardado] = useState(false);
  const { ocupado, error, correr } = useEscritura();
  useEffect(() => { setTexto(actual?.texto ?? ''); }, [actual?.texto, persona.id]);
  const cambio = texto.trim() !== (actual?.texto ?? '').trim();
  return (
    <div className="space-y-2">
      <label className="sr-only" htmlFor="conclusion">Conclusión</label>
      <textarea id="conclusion" rows={3} value={texto} onChange={e => { setTexto(e.target.value); setGuardado(false); }}
        placeholder="Cómo va la persona, qué opina del programa, qué sigue…" className={campo} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] text-slate-400">{actual ? <>Última edición {fechaHora(actual.actualizadaEl)}{actual.actualizadaPor && <> · {actual.actualizadaPor}</>}</> : 'Sin conclusión'}</span>
        <button type="button" disabled={!cambio || ocupado} onClick={() => void correr(() => guardarConclusion(persona.id, texto), () => setGuardado(true))} className={boton}>
          {ocupado ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} {guardado && !cambio ? 'Guardada' : 'Guardar'}
        </button>
      </div>
      <ErrorLinea texto={error} />
    </div>
  );
}

// ─── Postulación externa ────────────────────────────────────────────────────────────────────────────────────────
export function FormPostulacionExterna({ persona, onListo, onCancelar }: { persona: Persona; onListo: () => void; onCancelar: () => void }) {
  const { crearPostulacionExterna } = useCohorte();
  const [vacante, setVacante] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [url, setUrl] = useState('');
  const [obs, setObs] = useState('');
  const { ocupado, error, correr } = useEscritura();
  return (
    <form className="space-y-3 rounded-xl bg-slate-50/60 p-3" onSubmit={e => { e.preventDefault(); void correr(() => crearPostulacionExterna({ personaId: persona.id, vacante, empresa, url, observaciones: obs }), onListo); }}>
      <p className="text-[11px] text-slate-500">Postulación hecha por fuera de la plataforma. Cuenta como intermediación atribuible al proyecto.</p>
      <div><label className={etiquetaCampo} htmlFor="pe-vac">Vacante</label><input id="pe-vac" required value={vacante} onChange={e => setVacante(e.target.value)} className={campo} /></div>
      <div><label className={etiquetaCampo} htmlFor="pe-emp">Empresa</label><input id="pe-emp" value={empresa} onChange={e => setEmpresa(e.target.value)} className={campo} /></div>
      <div><label className={etiquetaCampo} htmlFor="pe-url">Enlace de la vacante</label><input id="pe-url" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" className={campo} /></div>
      <div><label className={etiquetaCampo} htmlFor="pe-obs">Observaciones</label><textarea id="pe-obs" rows={2} value={obs} onChange={e => setObs(e.target.value)} className={campo} /></div>
      <ErrorLinea texto={error} />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={ocupado} className={boton}>{ocupado ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Registrar postulación</button>
        <button type="button" onClick={onCancelar} className="text-[10px] font-black uppercase text-slate-400">Cancelar</button>
      </div>
    </form>
  );
}

/** Borrar una postulación externa registrada por error (las de la plataforma no se tocan desde aquí). */
export function BorrarPostulacion({ p }: { p: Postulacion }) {
  const { borrarPostulacionExterna } = useCohorte();
  const [confirma, setConfirma] = useState(false);
  const { ocupado, error, correr } = useEscritura();
  if (p.origen !== 'externa') return null;
  return confirma ? (
    <span className="inline-flex items-center gap-2 text-[10px] font-bold text-red-600">
      ¿Borrar?
      <button type="button" disabled={ocupado} onClick={() => void correr(() => borrarPostulacionExterna(p.id))} className="px-2 py-0.5 rounded bg-red-600 text-white font-black uppercase">Sí</button>
      <button type="button" onClick={() => setConfirma(false)} className="text-slate-400 font-black uppercase">No</button>
      {error && <span>{error}</span>}
    </span>
  ) : <button type="button" onClick={() => setConfirma(true)} className="text-slate-300 hover:text-red-600" aria-label={`Borrar postulación a ${p.vacante}`}><Trash2 size={13} /></button>;
}

// ─── Colocación ─────────────────────────────────────────────────────────────────────────────────────────────────
export function FormColocacion({ persona, onListo, onCancelar }: { persona: Persona; onListo: () => void; onCancelar: () => void }) {
  const { listarEmpleadores, crearColocacion } = useCohorte();
  const [empleadores, setEmpleadores] = useState<Empleador[] | null>(null);
  const [buscaEmp, setBuscaEmp] = useState('');
  const [empleador, setEmpleador] = useState('');
  const [inicio, setInicio] = useState(new Date().toISOString().slice(0, 10));
  const [cargo, setCargo] = useState('');
  const [modalidad, setModalidad] = useState<typeof MODALIDADES[number]>('Presencial');
  const [duracion, setDuracion] = useState<typeof DURACIONES[number]>(3);
  const [experiencia, setExperiencia] = useState<typeof EXPERIENCIA[number] | ''>('');
  const [modo, setModo] = useState<'manual' | 'auto'>('manual');
  const { ocupado, error, correr } = useEscritura();
  useEffect(() => { let vivo = true; void listarEmpleadores().then(l => { if (vivo) setEmpleadores(l); }); return () => { vivo = false; }; }, [listarEmpleadores]);

  const opciones = (empleadores ?? []).filter(e => !buscaEmp.trim() || norm(e.nombre).includes(norm(buscaEmp))).slice(0, 8);
  const elegido = empleadores?.find(e => e.key === empleador);
  const nuevo = buscaEmp.trim() && !(empleadores ?? []).some(e => norm(e.nombre) === norm(buscaEmp)) ? `nuevo:${buscaEmp.trim()}` : null;

  return (
    <form className="space-y-3 rounded-xl bg-slate-50/60 p-3" onSubmit={e => {
      e.preventDefault();
      void correr(() => crearColocacion({ personaId: persona.id, empleador, inicio, cargo, modalidad, duracionMeses: duracion, experiencia: experiencia || null, modoRetencion: modo }), onListo);
    }}>
      <div>
        <span className={etiquetaCampo}>Empleador</span>
        {elegido || empleador.startsWith('nuevo:') ? (
          <p className="flex items-center justify-between gap-3 text-sm font-bold text-slate-700 bg-white rounded-xl px-4 py-2.5">
            <span>{elegido ? elegido.nombre : empleador.slice(6)} <span className="text-[10px] font-bold text-slate-400 uppercase">{elegido ? (elegido.origen === 'empresa' ? 'empresa de la plataforma' : 'empleador externo') : 'se crea como empleador externo'}</span></span>
            <button type="button" onClick={() => setEmpleador('')} className="text-[10px] font-black uppercase text-brand">Cambiar</button>
          </p>
        ) : (
          <>
            <input aria-label="Buscar empleador" value={buscaEmp} onChange={e => setBuscaEmp(e.target.value)} placeholder={empleadores ? 'Escribe el nombre de la empresa…' : 'Cargando empleadores…'} className={campo} />
            {buscaEmp.trim() && (
              <ul className="mt-1 rounded-xl border border-slate-100 bg-white divide-y divide-slate-50">
                {opciones.map(o => (
                  <li key={o.key}><button type="button" onClick={() => setEmpleador(o.key)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50">
                    {o.nombre} <span className="text-[10px] text-slate-400 uppercase">{o.origen === 'empresa' ? 'plataforma' : 'externo'}</span></button></li>
                ))}
                {nuevo && <li><button type="button" onClick={() => setEmpleador(nuevo)} className="w-full text-left px-4 py-2 text-sm text-brand font-bold hover:bg-slate-50">+ Crear «{buscaEmp.trim()}» como empleador externo</button></li>}
              </ul>
            )}
          </>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={etiquetaCampo} htmlFor="co-ini">Fecha de inicio</label><input id="co-ini" type="date" required value={inicio} onChange={e => setInicio(e.target.value)} className={campo} /></div>
        <div><label className={etiquetaCampo} htmlFor="co-mod">Modalidad</label>
          <select id="co-mod" value={modalidad} onChange={e => setModalidad(e.target.value as typeof MODALIDADES[number])} className={campo}>{MODALIDADES.map(m => <option key={m}>{m}</option>)}</select></div>
      </div>
      <div><label className={etiquetaCampo} htmlFor="co-cargo">Cargo o sector</label><input id="co-cargo" required value={cargo} onChange={e => setCargo(e.target.value)} className={campo} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={etiquetaCampo} htmlFor="co-dur">Seguimiento</label>
          <select id="co-dur" value={duracion} onChange={e => setDuracion(Number(e.target.value) as typeof DURACIONES[number])} className={campo}>{DURACIONES.map(d => <option key={d} value={d}>{d} meses</option>)}</select></div>
        <div><label className={etiquetaCampo} htmlFor="co-exp">Experiencia</label>
          <select id="co-exp" value={experiencia} onChange={e => setExperiencia(e.target.value as typeof EXPERIENCIA[number] | '')} className={campo}>
            <option value="">Sin dato</option>{EXPERIENCIA.map(x => <option key={x}>{x}</option>)}</select></div>
      </div>
      <fieldset>
        <legend className={etiquetaCampo}>Recordatorios de retención</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="radio" name="co-modo" checked={modo === 'manual'} onChange={() => setModo('manual')} /> Los hace el equipo</label>
          <label className="flex items-center gap-2"><input type="radio" name="co-modo" checked={modo === 'auto'} onChange={() => setModo('auto')} /> Automáticos de la plataforma</label>
        </div>
        {modo === 'auto' && <p className="text-[11px] text-amber-600 font-bold mt-1">La plataforma enviará correos de seguimiento a la persona.</p>}
      </fieldset>
      <ErrorLinea texto={error} />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={ocupado || !empleador} className={boton}>{ocupado ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Registrar colocación</button>
        <button type="button" onClick={onCancelar} className="text-[10px] font-black uppercase text-slate-400">Cancelar</button>
      </div>
    </form>
  );
}

/** Marcar una colocación como terminada (no se borra: «colocado» es un hecho ocurrido). */
export function TerminarColocacion({ c }: { c: Colocacion }) {
  const { desactivarColocacion } = useCohorte();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const { ocupado, error, correr } = useEscritura();
  if (!c.activa) return null;
  return abierto ? (
    <span className="flex flex-wrap items-center gap-2 mt-1">
      <input aria-label="Motivo de terminación" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Motivo (renuncia, fin de contrato…)" className="bg-slate-50 rounded-lg px-2 py-1 text-xs flex-1 min-w-[10rem] outline-none" />
      <button type="button" disabled={ocupado} onClick={() => void correr(() => desactivarColocacion(c.id, motivo), () => setAbierto(false))} className="px-2 py-1 rounded bg-slate-700 text-white text-[10px] font-black uppercase">Terminar</button>
      <button type="button" onClick={() => setAbierto(false)} className="text-[10px] font-black uppercase text-slate-400">No</button>
      {error && <span className="text-[10px] font-bold text-red-600">{error}</span>}
    </span>
  ) : <button type="button" onClick={() => setAbierto(true)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700">Terminar</button>;
}

/** Elegir una persona de la cohorte (para registrar desde Colocación sin abrir su ficha). */
export function ElegirPersona({ onElegir, children }: { onElegir: (p: Persona) => void; children?: ReactNode }) {
  const { datos } = useCohorte();
  const [q, setQ] = useState('');
  const lista = q.trim().length < 2 ? [] : (datos?.personas ?? []).filter(p => [p.nombre, p.documento, p.correo].some(v => norm(v).includes(norm(q)))).slice(0, 8);
  return (
    <div className="space-y-2">
      {children}
      <input aria-label="Buscar persona" autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Nombre, documento o correo…" className={campo} />
      <ul className="rounded-xl border border-slate-100 divide-y divide-slate-50">
        {lista.map(p => (
          <li key={p.id}><button type="button" onClick={() => onElegir(p)} className="w-full text-left px-4 py-2 hover:bg-slate-50">
            <span className="block text-sm font-bold text-slate-700">{p.nombre}</span>
            <span className="block text-[11px] text-slate-400">{p.documento ?? '—'} · {p.correo ?? '—'}</span>
          </button></li>
        ))}
        {q.trim().length >= 2 && lista.length === 0 && <li className="px-4 py-2 text-xs text-slate-400 font-bold">Nadie de la cohorte coincide.</li>}
      </ul>
    </div>
  );
}

/** Nota de exclusión (A-22) para mostrar junto a una postulación o colocación que no cuenta. */
export function NoCuenta({ motivo }: { motivo: string | null }) {
  return motivo ? <span title={motivo}><Etiqueta tono="red">No cuenta</Etiqueta></span> : null;
}
