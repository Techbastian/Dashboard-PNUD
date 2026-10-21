/**
 * Seguimiento por persona (plantilla 2.7, D-51..D-53): estado activo/inactivo (deserción interna),
 * llamadas y contactos directos (aquí van las observaciones del equipo) e historial de todo lo que le pasó.
 * El historial une lo que ya está en la carga (registro, eventos, postulaciones, colocación, llamadas, estados)
 * con los cambios de `audit_log` (ediciones y borrados, hechos desde el dashboard o desde la plataforma).
 * Nada se borra: inactivar agrega una fila; la persona sigue contando en los acumulados.
 */
import { useEffect, useState } from 'react';
import { Check, Loader2, Phone, UserX, UserCheck } from 'lucide-react';
import { config } from '../lib/config';
import {
  useCohorte, type Cambio, type CambioEstado, type CanalContacto, type DatosCohorte, type Llamada, type Persona,
  type PropositoContacto, type ResultadoLlamada,
} from '../lib/datos';
import { fecha, diaLargo, hora, humano } from '../lib/formato';
import { campo, etiquetaCampo } from './Gestion';
import { BloqueFicha, Etiqueta } from './Privado';

const boton = 'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50';
const enlace = 'text-[11px] font-black uppercase tracking-widest text-brand';
const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

export const RESULTADOS: { id: ResultadoLlamada; label: string }[] = [
  { id: 'contesto', label: 'Contestó' }, { id: 'no_contesto', label: 'No contestó' }, { id: 'buzon_ocupado', label: 'Buzón / ocupado' },
  { id: 'numero_errado', label: 'Número errado' }, { id: 'llamar_despues', label: 'Pidió llamar después' }, { id: 'no_continua', label: 'No continúa en el programa' },
];
const CANALES: { id: CanalContacto; label: string }[] = [
  { id: 'llamada', label: 'Llamada' }, { id: 'whatsapp', label: 'WhatsApp' }, { id: 'presencial', label: 'Presencial' }, { id: 'correo', label: 'Correo' }, { id: 'otro', label: 'Otro' },
];
const PROPOSITOS: { id: PropositoContacto; label: string }[] = [
  { id: 'seguimiento', label: 'Seguimiento' }, { id: 'orientacion', label: 'Orientación' }, { id: 'reconvocatoria', label: 'Reconvocatoria' },
  { id: 'verificacion_retencion', label: 'Verificar retención' }, { id: 'otro', label: 'Otro' },
];
const label = <T extends string>(xs: { id: T; label: string }[], id: string | null) => xs.find(x => x.id === id)?.label ?? humano(id);
export const motivoLabel = (id: string | null) => config.participantes.motivos.find(m => m.id === id)?.label ?? humano(id);

function ErrorLinea({ texto }: { texto: string | null }) {
  return texto ? <p className="text-xs font-bold text-red-600" role="alert">{texto}</p> : null;
}

// ─── Estado activo / inactivo ───────────────────────────────────────────────────────────────────────────────────
export function BloqueEstado({ persona, datos, etapa, inactivarCon, onInactivarUsado }: {
  persona: Persona; datos: DatosCohorte; etapa: string | null;
  /** Abre el formulario de inactivar ya relleno (p. ej. tras una llamada con «no continúa»). */
  inactivarCon?: string | null; onInactivarUsado?: () => void;
}) {
  const { cambiarEstado } = useCohorte();
  const lista = datos.estados.filter(e => e.personaId === persona.id);
  const actual: CambioEstado | undefined = lista[0];
  const inactiva = actual?.estado === 'inactivo';
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [obs, setObs] = useState('');
  const [dia, setDia] = useState(hoy());
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (inactivarCon == null || inactiva) return;
    setAbierto(true); setMotivo(''); setObs(inactivarCon); onInactivarUsado?.();
  }, [inactivarCon, inactiva, onInactivarUsado]);

  async function guardar(estado: 'activo' | 'inactivo') {
    setOcupado(true); setError(null);
    const e = await cambiarEstado({ personaId: persona.id, estado, motivo: estado === 'inactivo' ? motivo : null, observacion: obs, fechaEfectiva: dia, etapa });
    setOcupado(false);
    if (e) setError(e); else { setAbierto(false); setMotivo(''); setObs(''); }
  }

  return (
    <BloqueFicha titulo="Estado en el programa">
      <div className="flex flex-wrap items-center gap-2">
        {inactiva ? <Etiqueta tono="red">Inactiva</Etiqueta> : <Etiqueta tono="emerald">Activa</Etiqueta>}
        {inactiva && actual && <span className="text-[11px] text-slate-500">{motivoLabel(actual.motivo)} · desde {fecha(actual.fechaEfectiva)}{actual.etapa ? ` · en ${actual.etapa}` : ''}</span>}
      </div>
      {inactiva && actual?.observacion && <p className="text-xs text-slate-600 mt-1.5">«{actual.observacion}»</p>}
      <p className="text-[10px] text-slate-400 mt-1.5">Inactivar no borra nada: la persona sigue contando en los acumulados y su historial se conserva.</p>

      {!abierto ? (
        <button type="button" onClick={() => { setAbierto(true); setError(null); setDia(hoy()); }} className={`${enlace} mt-2 inline-flex items-center gap-1.5`}>
          {inactiva ? <><UserCheck size={13} /> Reactivar</> : <><UserX size={13} /> Marcar inactiva</>}
        </button>
      ) : (
        <form className="space-y-3 rounded-xl bg-slate-50/60 p-3 mt-2" onSubmit={e => { e.preventDefault(); void guardar(inactiva ? 'activo' : 'inactivo'); }}>
          {!inactiva && (
            <div><label className={etiquetaCampo} htmlFor="es-mot">Motivo</label>
              <select id="es-mot" required value={motivo} onChange={e => setMotivo(e.target.value)} className={campo}>
                <option value="">Elige…</option>
                {config.participantes.motivos.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select></div>
          )}
          <div><label className={etiquetaCampo} htmlFor="es-obs">Observación{inactiva ? ' (opcional)' : ''}</label>
            <textarea id="es-obs" rows={2} required={!inactiva} value={obs} onChange={e => setObs(e.target.value)} className={campo}
              placeholder={inactiva ? '¿Por qué vuelve?' : 'Qué pasó, quién lo dijo, cómo se supo'} /></div>
          <div><label className={etiquetaCampo} htmlFor="es-dia">Desde</label>
            <input id="es-dia" type="date" required value={dia} max={hoy()} onChange={e => setDia(e.target.value)} className={campo} /></div>
          <ErrorLinea texto={error} />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={ocupado} className={boton}>{ocupado ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} {inactiva ? 'Reactivar' : 'Inactivar'}</button>
            <button type="button" onClick={() => setAbierto(false)} className="text-[10px] font-black uppercase text-slate-400">Cancelar</button>
          </div>
        </form>
      )}

      {lista.length > 1 && (
        <ul className="mt-3 pt-3 border-t border-slate-100 space-y-1">
          {lista.slice(1).map(e => (
            <li key={e.id} className="text-[11px] text-slate-500">
              {fecha(e.fechaEfectiva)} · <b className="text-slate-600">{e.estado === 'inactivo' ? 'Inactiva' : 'Activa'}</b>
              {e.motivo ? ` · ${motivoLabel(e.motivo)}` : ''}{e.registradoPor ? ` · ${e.registradoPor}` : ''}
            </li>
          ))}
        </ul>
      )}
    </BloqueFicha>
  );
}

// ─── Llamadas y contactos ───────────────────────────────────────────────────────────────────────────────────────
export function BloqueLlamadas({ persona, datos, onNoContinua }: { persona: Persona; datos: DatosCohorte; onNoContinua: (nota: string) => void }) {
  const { registrarLlamada } = useCohorte();
  const lista = datos.llamadas.filter(l => l.personaId === persona.id);
  const [abierto, setAbierto] = useState(false);
  return (
    <BloqueFicha titulo={`Llamadas y contactos (${lista.length})`}>
      {lista.length === 0 ? <p className="text-xs text-slate-400 font-bold">Sin contactos registrados.</p> : (
        <ul className="space-y-2.5">
          {lista.map(l => <ItemLlamada key={l.id} l={l} />)}
        </ul>
      )}
      <div className="mt-2">
        {abierto
          ? <FormLlamada persona={persona} registrar={registrarLlamada}
              onListo={(r, nota) => { setAbierto(false); if (r === 'no_continua') onNoContinua(nota); }} onCancelar={() => setAbierto(false)} />
          : <button type="button" onClick={() => setAbierto(true)} className={`${enlace} inline-flex items-center gap-1.5`}><Phone size={13} /> Registrar llamada</button>}
      </div>
    </BloqueFicha>
  );
}

function ItemLlamada({ l }: { l: Llamada }) {
  const tono = l.resultado === 'contesto' ? 'emerald' : l.resultado === 'no_continua' || l.resultado === 'numero_errado' ? 'red' : 'amber';
  return (
    <li className="text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-slate-700">{diaLargo(l.fecha)} · {hora(l.fecha)}</span>
        <Etiqueta tono={tono}>{label(RESULTADOS, l.resultado)}</Etiqueta>
        <span className="text-[11px] text-slate-400">{label(CANALES, l.canal)} · {label(PROPOSITOS, l.proposito)}{l.registradaPor ? ` · ${l.registradaPor}` : ''}</span>
      </div>
      {l.notas && <p className="text-xs text-slate-600 mt-0.5">{l.notas}</p>}
      {l.opinion && <p className="text-xs text-slate-600 mt-0.5"><b>Opinión:</b> {l.opinion}</p>}
      {l.proximaAccion && <p className="text-[11px] text-brand font-bold mt-0.5">Siguiente: {l.proximaAccion}{l.proximaFecha ? ` · ${fecha(l.proximaFecha)}` : ''}</p>}
    </li>
  );
}

function FormLlamada({ persona, registrar, onListo, onCancelar }: {
  persona: Persona; registrar: ReturnType<typeof useCohorte>['registrarLlamada'];
  onListo: (r: ResultadoLlamada, nota: string) => void; onCancelar: () => void;
}) {
  const [canal, setCanal] = useState<CanalContacto>('llamada');
  const [proposito, setProposito] = useState<PropositoContacto>('seguimiento');
  const [resultado, setResultado] = useState<ResultadoLlamada | ''>('');
  const [notas, setNotas] = useState('');
  const [opinion, setOpinion] = useState('');
  const [prox, setProx] = useState('');
  const [proxFecha, setProxFecha] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hablo = resultado === 'contesto' || resultado === 'no_continua' || resultado === 'llamar_despues';

  async function guardar() {
    if (!resultado) return;
    setOcupado(true); setError(null);
    const e = await registrar({ personaId: persona.id, canal, proposito, resultado, notas, opinion, proximaAccion: prox, proximaFecha: proxFecha || null });
    setOcupado(false);
    if (e) setError(e); else onListo(resultado, notas.trim());
  }

  return (
    <form className="space-y-3 rounded-xl bg-slate-50/60 p-3" onSubmit={e => { e.preventDefault(); void guardar(); }}>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={etiquetaCampo} htmlFor="ll-can">Canal</label>
          <select id="ll-can" value={canal} onChange={e => setCanal(e.target.value as CanalContacto)} className={campo}>
            {CANALES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select></div>
        <div><label className={etiquetaCampo} htmlFor="ll-pro">Propósito</label>
          <select id="ll-pro" value={proposito} onChange={e => setProposito(e.target.value as PropositoContacto)} className={campo}>
            {PROPOSITOS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select></div>
      </div>
      <div><label className={etiquetaCampo} htmlFor="ll-res">Resultado</label>
        <select id="ll-res" required value={resultado} onChange={e => setResultado(e.target.value as ResultadoLlamada)} className={campo}>
          <option value="">Elige…</option>
          {RESULTADOS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select></div>
      <div><label className={etiquetaCampo} htmlFor="ll-not">Qué se habló</label>
        <textarea id="ll-not" rows={2} value={notas} onChange={e => setNotas(e.target.value)} className={campo} /></div>
      <div><label className={etiquetaCampo} htmlFor="ll-op">Opinión de la persona</label>
        <textarea id="ll-op" rows={2} value={opinion} onChange={e => setOpinion(e.target.value)} className={campo} placeholder="Cómo le va, qué le gusta, qué no" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={etiquetaCampo} htmlFor="ll-px">Próxima acción</label>
          <input id="ll-px" value={prox} onChange={e => setProx(e.target.value)} className={campo} /></div>
        <div><label className={etiquetaCampo} htmlFor="ll-pf">Para el</label>
          <input id="ll-pf" type="date" value={proxFecha} min={hoy()} onChange={e => setProxFecha(e.target.value)} className={campo} /></div>
      </div>
      {hablo && !notas.trim() && !opinion.trim() && <p className="text-[11px] font-bold text-amber-600">Hablaste con la persona: deja al menos qué se habló o su opinión.</p>}
      {resultado === 'no_continua' && <p className="text-[11px] font-bold text-red-600">Al guardar se abre «Marcar inactiva» con esta nota para que elijas el motivo.</p>}
      <ErrorLinea texto={error} />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={ocupado || !resultado} className={boton}>{ocupado ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Guardar</button>
        <button type="button" onClick={onCancelar} className="text-[10px] font-black uppercase text-slate-400">Cancelar</button>
      </div>
    </form>
  );
}

// ─── Historial ──────────────────────────────────────────────────────────────────────────────────────────────────
type Hito = { el: string; titulo: string; detalle?: string | null; por?: string | null; tono: 'slate' | 'brand' | 'emerald' | 'amber' | 'red' };

const TABLAS: Record<string, string> = {
  candidates: 'Datos de la persona', project_applications: 'Postulación al proyecto', program_enrollments: 'Matrícula',
  events: 'Evento', session_attendance: 'Asistencia', event_company_attendance: 'Empresa en evento', event_evidences: 'Evidencia',
  applications: 'Postulación a vacante', participant_vacancy_applications: 'Postulación externa', placements: 'Colocación',
  participant_contacts: 'Llamada', participant_status_log: 'Estado', dashboard_exclusiones: 'Exclusión de métricas',
};
const corto = (v: unknown) => {
  if (v == null || v === '') return '—';
  const t = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return t.length > 40 ? `${t.slice(0, 40)}…` : t;
};

/** Ediciones y borrados del audit_log (las altas ya salen de la carga con más contexto). */
function hitosDeCambios(cambios: Cambio[], datos: DatosCohorte): Hito[] {
  const evento = (id: unknown) => datos.eventos.find(e => e.id === id)?.nombre;
  return cambios.filter(c => c.accion !== 'insert').map(c => {
    const que = TABLAS[c.tabla] ?? humano(c.tabla);
    const fila = c.antes ?? c.despues ?? {};
    const nombreEv = evento(fila.event_id) ?? (fila.nombre as string | undefined);
    if (c.accion === 'delete') {
      return { el: c.el, titulo: `Se borró: ${que}${nombreEv ? ` · ${nombreEv}` : ''}`, detalle: c.motivo ? `Motivo: ${c.motivo}` : null, por: c.por, tono: 'red' as const };
    }
    const campos = (c.campos ?? []).filter(k => k !== 'custom_answers');
    const detalle = campos.slice(0, 4).map(k => `${humano(k)}: ${corto(c.antes?.[k])} → ${corto(c.despues?.[k])}`).join(' · ');
    const bloques = (c.despues?.custom_answers_bloques as string[] | undefined) ?? [];
    return {
      el: c.el, titulo: `Cambió: ${que}${nombreEv ? ` · ${nombreEv}` : ''}`,
      detalle: [detalle, bloques.length ? `Formularios: ${bloques.join(', ')}` : '', c.motivo ? `Motivo: ${c.motivo}` : ''].filter(Boolean).join(' · ') || null,
      por: c.por, tono: 'slate' as const,
    };
  });
}

function hitosDeCarga(p: Persona, d: DatosCohorte): Hito[] {
  const h: Hito[] = [];
  if (p.registradaEl) h.push({ el: p.registradaEl, titulo: 'Se registró en el proyecto', tono: 'brand' });
  if (p.matricula?.fecha) h.push({ el: p.matricula.fecha, titulo: `Matrícula: ${humano(p.matricula.estado)}`, tono: 'brand' });
  for (const a of d.asistencias.filter(x => x.personaId === p.id)) {
    const e = d.eventos.find(x => x.id === a.eventoId);
    if (e) h.push({ el: e.inicio, titulo: `${e.nombre}: ${humano(a.estado)}`, tono: a.estado === 'asistio' ? 'emerald' : a.estado === 'no_asistio' ? 'red' : 'amber' });
  }
  for (const x of d.postulaciones.filter(y => y.personaId === p.id)) if (x.fecha) {
    h.push({ el: x.fecha, titulo: `Se postuló a ${x.vacante}${x.empresa ? ` (${x.empresa})` : ''}`, detalle: x.origen === 'externa' ? 'Externa' : humano(x.estado), tono: 'brand' });
  }
  for (const c of d.colocaciones.filter(y => y.personaId === p.id)) if (c.inicio) {
    h.push({ el: c.inicio, titulo: `Colocada: ${c.cargo}${c.empresa ? ` en ${c.empresa}` : ''}`, detalle: c.activa ? null : 'Terminada', tono: 'emerald' });
  }
  for (const l of d.llamadas.filter(y => y.personaId === p.id)) {
    h.push({ el: l.fecha, titulo: `${label(CANALES, l.canal)}: ${label(RESULTADOS, l.resultado)}`, detalle: [l.notas, l.opinion && `Opinión: ${l.opinion}`].filter(Boolean).join(' · ') || null, por: l.registradaPor, tono: 'amber' });
  }
  for (const e of d.estados.filter(y => y.personaId === p.id)) {
    h.push({ el: e.fechaEfectiva, titulo: e.estado === 'inactivo' ? `Inactiva: ${motivoLabel(e.motivo)}` : 'Reactivada', detalle: e.observacion, por: e.registradoPor, tono: e.estado === 'inactivo' ? 'red' : 'emerald' });
  }
  return h;
}

export function BloqueHistorial({ persona, datos }: { persona: Persona; datos: DatosCohorte }) {
  const { historialDe } = useCohorte();
  const [cambios, setCambios] = useState<Cambio[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [todos, setTodos] = useState(false);

  useEffect(() => {
    let vivo = true;
    void historialDe(persona.id).then(r => { if (vivo) { setCambios(r.cambios); setError(r.error); } });
    return () => { vivo = false; };
  }, [historialDe, persona.id, datos.cargadoEl]);

  const hitos = [...hitosDeCarga(persona, datos), ...hitosDeCambios(cambios ?? [], datos)].sort((a, b) => b.el.localeCompare(a.el));
  const vista = todos ? hitos : hitos.slice(0, 12);
  const color = { slate: 'bg-slate-300', brand: 'bg-brand', emerald: 'bg-emerald-500', amber: 'bg-amber-400', red: 'bg-red-500' };

  return (
    <BloqueFicha titulo={`Historial (${hitos.length})`}>
      {cambios === null && <p className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Cargando cambios…</p>}
      <ErrorLinea texto={error} />
      {hitos.length === 0 ? <p className="text-xs text-slate-400 font-bold">Sin movimientos.</p> : (
        <ol className="relative border-l border-slate-100 ml-1.5 space-y-3">
          {vista.map((h, i) => (
            <li key={i} className="pl-4 relative">
              <span className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ${color[h.tono]}`} />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{fecha(h.el)}{h.por ? ` · ${h.por}` : ''}</p>
              <p className="text-sm font-bold text-slate-700">{h.titulo}</p>
              {h.detalle && <p className="text-[11px] text-slate-500 break-words">{h.detalle}</p>}
            </li>
          ))}
        </ol>
      )}
      {hitos.length > 12 && <button type="button" onClick={() => setTodos(t => !t)} className={`${enlace} mt-2`}>{todos ? 'Ver menos' : `Ver todo (${hitos.length})`}</button>}
      <p className="text-[10px] text-slate-400 mt-2">Las ediciones y borrados se registran desde el 20 de octubre de 2026, hechos aquí o en la plataforma.</p>
    </BloqueFicha>
  );
}
