/**
 * Calendario (E3, patrón de FQSD `CalendarioView`): eventos de la cohorte en rejilla mensual o agenda.
 * ESCRIBE (solo equipo, por RLS is_admin): crear/editar/eliminar eventos, agendar personas, marcar asistencia.
 * Los tipos de evento salen de `catalogo` en la config (D-33); "Otro evento" no suma a ninguna etapa.
 * Lo que cuenta para las etapas es `asistio` (ver lib/etapas.ts y la función pública v4).
 */
import { Fragment, useMemo, useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, Plus, MapPin, Video, Users, Trash2, Loader2, Check, X as XIcon, CalendarDays, List, Building2, Paperclip, Upload, Link2, ExternalLink, FileText, Image as ImageIcon, Phone } from 'lucide-react';
import { config } from '../lib/config';
import { useCohorte, type Evento, type EstadoAsistencia, type Persona, type TipoEvidencia, type Evidencia, type Llamada } from '../lib/datos';
import { ElegirPersona } from '../ui/Gestion';
import { BloqueEstado, FormLlamada, ItemLlamada, propositoLabel, resultadoLabel } from '../ui/Seguimiento';
import { diaBogota, diaLargo, hora, hhmmBogota, isoBogota, norm, humano } from '../lib/formato';
import { useAuth } from '../lib/auth';
import { BarraDatos, Cargando, ErrorDatos, PanelLateral, BloqueFicha, Etiqueta, Pestanas, Vacio, Aviso } from '../ui/Privado';

const OTRO = '__otro';
const DIAS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const PALETA = ['var(--color-brand)', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b', '#10b981', '#6366f1', '#f43f5e'];

const labelTipo = (t: string | null) => config.catalogo.find(c => c.tipo === t)?.label ?? (t ? humano(t) : 'Otro evento');
const colorTipo = (t: string | null) => {
  const i = config.catalogo.findIndex(c => c.tipo === t);
  return i >= 0 ? (config.catalogo[i].color ?? PALETA[i % PALETA.length]) : '#94a3b8';
};
const ESTADO_TXT: Record<string, { t: string; tono: 'emerald' | 'red' | 'amber' | 'slate' }> = {
  asistio: { t: 'Asistió', tono: 'emerald' }, no_asistio: { t: 'No asistió', tono: 'red' }, agendado: { t: 'Agendado', tono: 'amber' },
  cancelado: { t: 'Canceló', tono: 'slate' }, justificado: { t: 'Justificado', tono: 'slate' }, pendiente: { t: 'Pendiente', tono: 'slate' }, no_aplica: { t: 'No aplica', tono: 'slate' },
};

function hoyBogota() { return diaBogota(new Date().toISOString()); }

/** Celdas del mes (lunes a domingo), como 'YYYY-MM-DD'. */
function celdasMes(anio: number, mes: number) {
  const primero = new Date(Date.UTC(anio, mes, 1));
  const offset = (primero.getUTCDay() + 6) % 7;
  const out: { dia: string; delMes: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(Date.UTC(anio, mes, 1 - offset + i));
    out.push({ dia: d.toISOString().slice(0, 10), delMes: d.getUTCMonth() === mes });
  }
  return out.slice(0, out[35].delMes ? 42 : 35);
}

type Edicion = { evento: Partial<Evento>; dia: string } | null;
/** D-54: panel de llamada (nueva desde el botón o el día, o una existente). */
type PanelLl = { modo: 'nueva'; dia: string } | { modo: 'ver'; id: string } | null;
const LLAMADAS = '__llamadas';
const COLOR_LLAMADA = '#7c3aed';

export default function CalendarioView() {
  const { datos, error, cargando } = useCohorte();
  const [vista, setVista] = useState<'mes' | 'agenda'>(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'agenda' : 'mes'));
  const hoy = hoyBogota();
  const [ym, setYm] = useState(() => ({ y: Number(hoy.slice(0, 4)), m: Number(hoy.slice(5, 7)) - 1 }));
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const [edicion, setEdicion] = useState<Edicion>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [panelLl, setPanelLl] = useState<PanelLl>(null);

  const conteo = useMemo(() => {
    const m = new Map<string, { asistio: number; total: number }>();
    for (const a of datos?.asistencias ?? []) {
      const c = m.get(a.eventoId) ?? { asistio: 0, total: 0 };
      c.total++; if (a.estado === 'asistio') c.asistio++;
      m.set(a.eventoId, c);
    }
    return m;
  }, [datos]);

  if (error && !datos) return <ErrorDatos error={error} />;
  if (!datos) return <Cargando />;

  const eventos = filtroTipo === LLAMADAS ? [] : datos.eventos.filter(e => filtroTipo === 'todos' || (e.tipo ?? OTRO) === filtroTipo || (filtroTipo === OTRO && !config.catalogo.some(c => c.tipo === e.tipo)));
  const porDia = new Map<string, Evento[]>();
  for (const e of eventos) { const d = diaBogota(e.inicio); porDia.set(d, [...(porDia.get(d) ?? []), e]); }
  const llamadas = filtroTipo === 'todos' || filtroTipo === LLAMADAS ? datos.llamadas : [];
  const llPorDia = new Map<string, Llamada[]>();
  for (const l of [...llamadas].sort((a, b) => a.fecha.localeCompare(b.fecha))) { const d = diaBogota(l.fecha); llPorDia.set(d, [...(llPorDia.get(d) ?? []), l]); }
  const nombreDe = new Map(datos.personas.map(p => [p.id, p.nombre]));
  const abierto = datos.eventos.find(e => e.id === abiertoId) ?? null;
  const tipos = [{ key: 'todos', label: 'Todos', n: datos.eventos.length },
    ...config.catalogo.map(c => ({ key: c.tipo, label: c.label, n: datos.eventos.filter(e => e.tipo === c.tipo).length })),
    { key: OTRO, label: 'Otros', n: datos.eventos.filter(e => !config.catalogo.some(c => c.tipo === e.tipo)).length },
    { key: LLAMADAS, label: 'Llamadas', n: datos.llamadas.length }];

  const nuevo = (dia = hoy) => setEdicion({ evento: { tipo: config.catalogo[0]?.tipo ?? null, modalidad: config.catalogo[0]?.modalidad ?? 'Presencial', tomaAsistencia: true }, dia });

  return (
    <div className={`space-y-6 ${cargando ? 'opacity-80' : ''}`}>
      <BarraDatos />

      {config.catalogo.length === 0 && (
        <Aviso>Este proyecto no tiene <code>catalogo</code> de tipos de evento en su config. Se pueden crear eventos, pero ninguno sumará a una etapa de la ruta.</Aviso>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Pestanas opciones={tipos.filter(t => t.key === 'todos' || t.key === LLAMADAS || t.n > 0 || config.catalogo.some(c => c.tipo === t.key))} activa={filtroTipo} onCambio={setFiltroTipo} />
        <div className="flex items-center gap-2">
          <div className="flex bg-white border border-slate-100 rounded-xl p-1">
            {([['mes', CalendarDays, 'Mes'], ['agenda', List, 'Agenda']] as const).map(([k, I, l]) => (
              <button key={k} type="button" onClick={() => setVista(k)} aria-pressed={vista === k}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${vista === k ? 'bg-brand/10 text-brand' : 'text-slate-400 hover:text-slate-600'}`}>
                <I size={13} /> {l}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => nuevo()} className="flex items-center gap-2 bg-brand text-white rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest hover:opacity-90">
            <Plus size={14} /> Nuevo evento
          </button>
          <button type="button" onClick={() => { setAbiertoId(null); setEdicion(null); setPanelLl({ modo: 'nueva', dia: hoy }); }}
            className="flex items-center gap-2 bg-white border border-brand/30 text-brand rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-brand/5">
            <Phone size={14} /> Llamada
          </button>
        </div>
      </div>

      {vista === 'mes' ? (
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{MESES[ym.m]} {ym.y}</h3>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setYm(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }))} className="p-2 text-slate-400 hover:text-slate-700" aria-label="Mes anterior"><ChevronLeft size={16} /></button>
              <button type="button" onClick={() => setYm({ y: Number(hoy.slice(0, 4)), m: Number(hoy.slice(5, 7)) - 1 })} className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand">Hoy</button>
              <button type="button" onClick={() => setYm(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }))} className="p-2 text-slate-400 hover:text-slate-700" aria-label="Mes siguiente"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 min-w-[720px]">
              {DIAS.map(d => <div key={d} className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 bg-gray-50">{d}</div>)}
              {celdasMes(ym.y, ym.m).map(({ dia, delMes }) => {
                const evs = porDia.get(dia) ?? [];
                const lls = llPorDia.get(dia) ?? [];
                return (
                  <div key={dia} className={`group min-h-28 border-b border-r border-gray-50 p-2 flex flex-col gap-1 ${delMes ? '' : 'bg-slate-50/50'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-black ${dia === hoy ? 'bg-brand text-white rounded-full size-6 flex items-center justify-center' : delMes ? 'text-slate-600' : 'text-slate-300'}`}>{Number(dia.slice(8))}</span>
                      <button type="button" onClick={() => nuevo(dia)} className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5 text-slate-300 hover:text-brand" aria-label={`Nuevo evento el ${dia}`}><Plus size={13} /></button>
                    </div>
                    {evs.map(e => (
                      <button key={e.id} type="button" onClick={() => setAbiertoId(e.id)} title={e.nombre}
                        className="text-left rounded-lg px-1.5 py-1 text-[10px] font-bold leading-tight text-slate-700 hover:brightness-95"
                        style={{ background: `color-mix(in srgb, ${colorTipo(e.tipo)} 12%, white)`, borderLeft: `3px solid ${colorTipo(e.tipo)}` }}>
                        <span className="text-slate-400">{hora(e.inicio)}</span> <span className="line-clamp-2">{e.nombre}</span>
                      </button>
                    ))}
                    {lls.map(l => (
                      <button key={l.id} type="button" onClick={() => setPanelLl({ modo: 'ver', id: l.id })} title={`Llamada · ${nombreDe.get(l.personaId) ?? ''} · ${resultadoLabel(l.resultado)}`}
                        className={`text-left rounded-lg px-1.5 py-1 text-[10px] font-bold leading-tight text-slate-700 hover:brightness-95 ${l.resultado == null ? 'border border-dashed' : ''}`}
                        style={{ background: `color-mix(in srgb, ${COLOR_LLAMADA} 10%, white)`, borderLeft: `3px solid ${COLOR_LLAMADA}`, borderColor: l.resultado == null ? COLOR_LLAMADA : undefined }}>
                        <span className="text-slate-400"><Phone size={9} className="inline -mt-0.5" /> {hora(l.fecha)}</span> <span className="line-clamp-2">{nombreDe.get(l.personaId) ?? 'Persona'}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <Agenda eventos={eventos} llamadas={llamadas} nombreDe={nombreDe} conteo={conteo} hoy={hoy} onAbrir={setAbiertoId} onAbrirLlamada={id => setPanelLl({ modo: 'ver', id })} />
      )}

      {abierto && !edicion && (
        <PanelEvento evento={abierto} onCerrar={() => setAbiertoId(null)} onEditar={() => setEdicion({ evento: abierto, dia: diaBogota(abierto.inicio) })} />
      )}
      {panelLl && <PanelLlamada panel={panelLl} onCerrar={() => setPanelLl(null)} />}
      {edicion && (
        <FormEvento inicial={edicion} onCerrar={() => setEdicion(null)} onGuardado={id => { setEdicion(null); if (id) setAbiertoId(id); }} />
      )}
    </div>
  );
}

function Agenda({ eventos, llamadas, nombreDe, conteo, hoy, onAbrir, onAbrirLlamada }: { eventos: Evento[]; llamadas: Llamada[]; nombreDe: Map<string, string>; conteo: Map<string, { asistio: number; total: number }>; hoy: string; onAbrir: (id: string) => void; onAbrirLlamada: (id: string) => void }) {
  const { datos } = useCohorte();
  const nEvid = (id: string) => datos?.evidencias.filter(x => x.eventoId === id).length ?? 0;
  const nEmp = (id: string) => datos?.asistenciaEmpresas.filter(x => x.eventoId === id && x.estado === 'asistio').length ?? 0;
  const [verPasados, setVerPasados] = useState(false);
  const lista = eventos.filter(e => verPasados || diaBogota(e.inicio) >= hoy);
  type Item = { k: 'e'; e: Evento; t: string } | { k: 'l'; l: Llamada; t: string };
  const items: Item[] = [...lista.map(e => ({ k: 'e' as const, e, t: e.inicio })),
    ...llamadas.filter(l => verPasados || diaBogota(l.fecha) >= hoy).map(l => ({ k: 'l' as const, l, t: l.fecha }))].sort((a, b) => a.t.localeCompare(b.t));
  const grupos = new Map<string, Item[]>();
  for (const it of items) { const d = diaBogota(it.t); grupos.set(d, [...(grupos.get(d) ?? []), it]); }
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{verPasados ? 'Todos los eventos y llamadas' : 'Próximos eventos y llamadas'}</h3>
        <button type="button" onClick={() => setVerPasados(v => !v)} className="text-[10px] font-black uppercase tracking-widest text-brand">{verPasados ? 'Solo próximos' : 'Ver también pasados'}</button>
      </div>
      {grupos.size === 0 ? <Vacio texto="No hay eventos ni llamadas" /> : (
        <ul className="divide-y divide-gray-50">
          {[...grupos.entries()].map(([dia, its]) => (
            <Fragment key={dia}>
              <li className="px-6 py-2 bg-gray-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">{diaLargo(its[0].t)}{dia === hoy ? ' · hoy' : ''}</li>
              {its.map(it => {
                if (it.k === 'l') {
                  const l = it.l;
                  return (
                    <li key={l.id}>
                      <button type="button" onClick={() => onAbrirLlamada(l.id)} className="w-full text-left px-6 py-3 flex items-center gap-4 hover:bg-gray-50/60">
                        <span className="w-20 shrink-0 text-xs font-black text-slate-500 tnum">{hora(l.fecha)}</span>
                        <Phone size={12} className="shrink-0" style={{ color: COLOR_LLAMADA }} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-bold text-slate-800 truncate">Llamada · {nombreDe.get(l.personaId) ?? 'Persona'}</span>
                          <span className="block text-[11px] font-bold text-slate-400">{propositoLabel(l.proposito)}{l.registradaPor ? ` · ${l.registradaPor}` : ''}</span>
                        </span>
                        <Etiqueta tono={l.resultado == null ? 'brand' : l.resultado === 'contesto' ? 'emerald' : 'amber'}>{resultadoLabel(l.resultado)}</Etiqueta>
                      </button>
                    </li>
                  );
                }
                const e = it.e;
                const c = conteo.get(e.id);
                return (
                  <li key={e.id}>
                    <button type="button" onClick={() => onAbrir(e.id)} className="w-full text-left px-6 py-3 flex items-center gap-4 hover:bg-gray-50/60">
                      <span className="w-20 shrink-0 text-xs font-black text-slate-500 tnum">{hora(e.inicio)}</span>
                      <span className="size-2.5 rounded-full shrink-0" style={{ background: colorTipo(e.tipo) }} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-bold text-slate-800 truncate">{e.nombre}</span>
                        <span className="block text-[11px] font-bold text-slate-400">{labelTipo(e.tipo)}{e.modalidad ? ` · ${e.modalidad}` : ''}{e.ubicacion ? ` · ${e.ubicacion}` : ''}</span>
                      </span>
                      <span className="flex items-center gap-3 text-[11px] font-black text-slate-500 tnum whitespace-nowrap">
                        {nEmp(e.id) > 0 && <span title="Empresas que asistieron"><Building2 size={12} className="inline -mt-0.5" /> {nEmp(e.id)}</span>}
                        <span title="Personas: asistieron / en el evento"><Users size={12} className="inline -mt-0.5" /> {c?.asistio ?? 0}/{c?.total ?? 0}</span>
                        <span title="Evidencias" className={nEvid(e.id) ? 'text-emerald-600' : 'text-slate-300'}><Paperclip size={12} className="inline -mt-0.5" /> {nEvid(e.id)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}

function PanelEvento({ evento, onCerrar, onEditar }: { evento: Evento; onCerrar: () => void; onEditar: () => void }) {
  const { datos, marcarAsistencia, quitarDeEvento, borrarEvento } = useCohorte();
  const [busca, setBusca] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmaBorrar, setConfirmaBorrar] = useState(false);
  const [motivoBorrar, setMotivoBorrar] = useState('');
  const { esSuperAdmin } = useAuth();
  if (!datos) return null;

  const filas = datos.asistencias.filter(a => a.eventoId === evento.id);
  const personaDe = new Map(datos.personas.map(p => [p.id, p]));
  const enEvento = new Set(filas.map(f => f.personaId));
  const candidatos: Persona[] = busca.trim().length < 2 ? [] : datos.personas
    .filter(p => !enEvento.has(p.id) && [p.nombre, p.documento, p.correo].some(v => norm(v).includes(norm(busca)))).slice(0, 8);
  const n = (e: string) => filas.filter(f => f.estado === e).length;
  const impacto = { empresas: datos.asistenciaEmpresas.filter(a => a.eventoId === evento.id).length, evidencias: datos.evidencias.filter(x => x.eventoId === evento.id).length };

  async function hacer(clave: string, f: () => Promise<string | null>) {
    setOcupado(clave); setError(null);
    const err = await f();
    setOcupado(null);
    if (err) setError(err);
    return err;
  }
  const marcar = (pid: string, e: EstadoAsistencia) => hacer(pid + e, () => marcarAsistencia(evento.id, pid, e));

  return (
    <PanelLateral abierto onCerrar={onCerrar} titulo={evento.nombre}
      subtitulo={<>{diaLargo(evento.inicio)} · {hora(evento.inicio)}{evento.fin ? `–${hora(evento.fin)}` : ''}</>}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded" style={{ background: `color-mix(in srgb, ${colorTipo(evento.tipo)} 14%, white)`, color: '#334155' }}>
          <span className="size-2 rounded-full" style={{ background: colorTipo(evento.tipo) }} />{labelTipo(evento.tipo)}
        </span>
        {evento.modalidad && <Etiqueta>{evento.modalidad}</Etiqueta>}
        {!evento.tomaAsistencia && <Etiqueta tono="amber">Sin toma de asistencia</Etiqueta>}
        {evento.origen && evento.origen !== 'dashboard' && <Etiqueta>Origen: {evento.origen}</Etiqueta>}
      </div>
      {(evento.ubicacion || evento.enlace || evento.descripcion) && (
        <div className="space-y-1.5 text-sm text-slate-600">
          {evento.ubicacion && <p className="flex gap-2"><MapPin size={15} className="text-slate-400 shrink-0 mt-0.5" />{evento.ubicacion}</p>}
          {evento.enlace && <p className="flex gap-2"><Video size={15} className="text-slate-400 shrink-0 mt-0.5" /><a href={evento.enlace} target="_blank" rel="noreferrer" className="text-brand underline break-all">{evento.enlace}</a></p>}
          {evento.descripcion && <p className="text-xs text-slate-500 whitespace-pre-line">{evento.descripcion}</p>}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[['Asistieron', n('asistio'), 'text-emerald-600'], ['Agendados', n('agendado'), 'text-amber-600'], ['No asistieron', n('no_asistio'), 'text-red-500']].map(([l, v, c]) => (
          <div key={l as string} className="bg-slate-50 rounded-2xl p-3 text-center">
            <p className={`text-2xl font-black tnum ${c}`}>{v as number}</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{l as string}</p>
          </div>
        ))}
      </div>

      {error && <Aviso tono="red">{error}</Aviso>}

      {config.catalogo.find(c => c.tipo === evento.tipo)?.empresas && <EmpresasDelEvento evento={evento} />}
      <EvidenciasDelEvento evento={evento} />

      <BloqueFicha titulo="Agregar persona de la cohorte">
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nombre, documento o correo…"
          className="w-full bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20" />
        {candidatos.length > 0 && (
          <ul className="mt-2 border border-slate-100 rounded-xl divide-y divide-slate-50">
            {candidatos.map(p => (
              <li key={p.id} className="px-3 py-2 flex items-center justify-between gap-3">
                <span className="min-w-0"><span className="block text-sm font-bold text-slate-700 truncate">{p.nombre}</span><span className="block text-[11px] text-slate-400">{p.documento ?? '—'}</span></span>
                <span className="flex gap-1.5 shrink-0">
                  <button type="button" disabled={!!ocupado} onClick={() => marcar(p.id, 'agendado').then(() => setBusca(''))} className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50">Agendar</button>
                  {evento.tomaAsistencia && <button type="button" disabled={!!ocupado} onClick={() => marcar(p.id, 'asistio').then(() => setBusca(''))} className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">Asistió</button>}
                </span>
              </li>
            ))}
          </ul>
        )}
        {busca.trim().length >= 2 && candidatos.length === 0 && <p className="text-[11px] font-bold text-slate-400 mt-2">Nadie más de la cohorte coincide.</p>}
      </BloqueFicha>

      <BloqueFicha titulo={`Personas en el evento (${filas.length})`}>
        {filas.length === 0 ? <Vacio texto="Aún no hay personas" /> : (
          <ul className="divide-y divide-slate-50 border border-slate-100 rounded-xl">
            {filas.map(f => {
              const p = personaDe.get(f.personaId);
              const st = ESTADO_TXT[f.estado] ?? ESTADO_TXT.pendiente;
              return (
                <li key={f.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-700 truncate">{p?.nombre ?? 'Persona fuera de la cohorte'}</span>
                    <span className="block text-[11px] text-slate-400">{p?.documento ?? ''}</span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <Etiqueta tono={st.tono}>{st.t}</Etiqueta>
                    {evento.tomaAsistencia && f.estado !== 'asistio' && (
                      <button type="button" disabled={!!ocupado} onClick={() => marcar(f.personaId, 'asistio')} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-40" title="Marcar asistió" aria-label="Marcar asistió">
                        {ocupado === f.personaId + 'asistio' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      </button>
                    )}
                    {evento.tomaAsistencia && f.estado !== 'no_asistio' && (
                      <button type="button" disabled={!!ocupado} onClick={() => marcar(f.personaId, 'no_asistio')} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40" title="Marcar no asistió" aria-label="Marcar no asistió">
                        {ocupado === f.personaId + 'no_asistio' ? <Loader2 size={14} className="animate-spin" /> : <XIcon size={14} />}
                      </button>
                    )}
                    {['agendado', 'cancelado', 'pendiente'].includes(f.estado) && (
                      <button type="button" disabled={!!ocupado} onClick={() => hacer(f.personaId + 'q', () => quitarDeEvento(evento.id, f.personaId))} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-40" title="Quitar convocatoria" aria-label="Quitar convocatoria">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </BloqueFicha>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
        <button type="button" onClick={onEditar} className="text-[11px] font-black uppercase tracking-widest text-brand">Editar evento</button>
        {/cal\.com/i.test(evento.origen ?? '') ? (
          <span className="text-[11px] font-bold text-slate-400">Reserva de Cal.com: se cancela allá</span>
        ) : !esSuperAdmin ? (
          // D-50: borrar eventos es solo de super_admin (la base también lo exige: política restrictiva + borrar_evento).
          <span className="text-[11px] font-bold text-slate-400">Solo un super admin puede eliminar eventos</span>
        ) : confirmaBorrar ? (
          <span className="flex flex-col gap-2 w-full text-[11px] font-bold text-red-600">
            <span>¿Eliminar el evento? Se borran {filas.length} registros de asistencia ({n('asistio')} asistió)
            {impacto.empresas > 0 && <>, {impacto.empresas} empresas</>}{impacto.evidencias > 0 && <> y {impacto.evidencias} evidencias</>}. Queda en el historial con el motivo.</span>
            <input value={motivoBorrar} onChange={e => setMotivoBorrar(e.target.value)} placeholder="Motivo (p. ej. «la sesión nunca se dio»)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700" aria-label="Motivo del borrado" />
            <span className="flex items-center gap-2">
              <button type="button" disabled={!!ocupado || motivoBorrar.trim().length < 3}
                onClick={async () => { const err = await hacer('borrar', () => borrarEvento(evento.id, motivoBorrar)); if (!err) onCerrar(); }}
                className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[10px] font-black uppercase disabled:opacity-40">Eliminar</button>
              <button type="button" onClick={() => { setConfirmaBorrar(false); setMotivoBorrar(''); }} className="text-slate-400 text-[10px] font-black uppercase">No</button>
            </span>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmaBorrar(true)} className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-red-600"><Trash2 size={13} /> Eliminar</button>
        )}
      </div>
    </PanelLateral>
  );
}

function FormEvento({ inicial, onCerrar, onGuardado }: { inicial: NonNullable<Edicion>; onCerrar: () => void; onGuardado: (id: string | null) => void }) {
  const { guardarEvento } = useCohorte();
  const e = inicial.evento;
  const [nombre, setNombre] = useState(e.nombre ?? '');
  const [tipo, setTipo] = useState<string>(e.tipo && config.catalogo.some(c => c.tipo === e.tipo) ? e.tipo : e.id ? (e.tipo ?? OTRO) : (config.catalogo[0]?.tipo ?? OTRO));
  const [dia, setDia] = useState(inicial.dia);
  const [ini, setIni] = useState(e.inicio ? hhmmBogota(e.inicio) : '09:00');
  const [fin, setFin] = useState(e.fin ? hhmmBogota(e.fin) : '11:00');
  const [modalidad, setModalidad] = useState(e.modalidad ?? 'Presencial');
  const [ubicacion, setUbicacion] = useState(e.ubicacion ?? '');
  const [enlace, setEnlace] = useState(e.enlace ?? '');
  const [descripcion, setDescripcion] = useState(e.descripcion ?? '');
  const [toma, setToma] = useState(e.tomaAsistencia ?? true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    if (fin && fin < ini) { setError('La hora de fin es anterior a la de inicio.'); return; }
    setGuardando(true); setError(null);
    const err = await guardarEvento({
      id: e.id, nombre, tipo: tipo === OTRO ? 'evento' : tipo, fase: tipo === OTRO ? null : tipo, modalidad,
      ubicacion: ubicacion.trim() || null, enlace: enlace.trim() || null, descripcion: descripcion.trim() || null,
      inicio: isoBogota(dia, ini), fin: fin ? isoBogota(dia, fin) : null, tomaAsistencia: toma,
    });
    setGuardando(false);
    if (err) { setError(err); return; }
    onGuardado(e.id ?? null);
  }

  const sel = config.catalogo.find(c => c.tipo === tipo);
  const campo = 'w-full bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20';
  const lab = 'block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5';
  return (
    <PanelLateral abierto onCerrar={onCerrar} titulo={e.id ? 'Editar evento' : 'Nuevo evento'} subtitulo="Se guarda en la base de la plataforma (tabla events)">
      <form onSubmit={enviar} className="space-y-4">
        <div>
          <label className={lab} htmlFor="ev-tipo">Tipo</label>
          <select id="ev-tipo" value={tipo} onChange={x => { setTipo(x.target.value); const c = config.catalogo.find(k => k.tipo === x.target.value); if (c?.modalidad) setModalidad(c.modalidad); }} className={campo}>
            {config.catalogo.map(c => <option key={c.tipo} value={c.tipo}>{c.label}</option>)}
            <option value={OTRO}>Otro evento (no suma a la ruta)</option>
          </select>
          {sel?.descripcion && <p className="text-[11px] font-bold text-slate-400 mt-1">{sel.descripcion}</p>}
        </div>
        <div>
          <label className={lab} htmlFor="ev-nombre">Nombre</label>
          <input id="ev-nombre" required value={nombre} onChange={x => setNombre(x.target.value)} placeholder={sel ? `${sel.label} · …` : 'Nombre del evento'} className={campo} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className={lab} htmlFor="ev-dia">Fecha</label><input id="ev-dia" type="date" required value={dia} onChange={x => setDia(x.target.value)} className={campo} /></div>
          <div><label className={lab} htmlFor="ev-ini">Inicio</label><input id="ev-ini" type="time" required value={ini} onChange={x => setIni(x.target.value)} className={campo} /></div>
          <div><label className={lab} htmlFor="ev-fin">Fin</label><input id="ev-fin" type="time" value={fin} onChange={x => setFin(x.target.value)} className={campo} /></div>
        </div>
        <div>
          <span className={lab}>Modalidad</span>
          <div className="flex gap-2">
            {['Presencial', 'Virtual', 'Híbrida'].map(m => (
              <button key={m} type="button" onClick={() => setModalidad(m)} aria-pressed={modalidad === m}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${modalidad === m ? 'bg-brand text-white' : 'bg-slate-50 text-slate-400'}`}>{m}</button>
            ))}
          </div>
        </div>
        {modalidad !== 'Virtual' && <div><label className={lab} htmlFor="ev-ubi">Lugar</label><input id="ev-ubi" value={ubicacion} onChange={x => setUbicacion(x.target.value)} placeholder="Dirección o sede" className={campo} /></div>}
        {modalidad !== 'Presencial' && <div><label className={lab} htmlFor="ev-link">Enlace de la reunión</label><input id="ev-link" type="url" value={enlace} onChange={x => setEnlace(x.target.value)} placeholder="https://…" className={campo} /></div>}
        <div><label className={lab} htmlFor="ev-desc">Descripción</label><textarea id="ev-desc" rows={3} value={descripcion} onChange={x => setDescripcion(x.target.value)} className={campo} /></div>
        <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
          <input type="checkbox" checked={toma} onChange={x => setToma(x.target.checked)} className="accent-[var(--color-brand)] size-4" /> Se toma asistencia
        </label>
        {error && <Aviso tono="red">{error}</Aviso>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onCerrar} className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Cancelar</button>
          <button type="submit" disabled={guardando} className="flex items-center gap-2 bg-brand text-white rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest disabled:opacity-60">
            {guardando && <Loader2 size={13} className="animate-spin" />} Guardar
          </button>
        </div>
      </form>
    </PanelLateral>
  );
}

/** Empresas que asistieron a un evento (A-10, D-40). P1: una empresa queda sensibilizada al asistir a una sensibilización. */
function EmpresasDelEvento({ evento }: { evento: Evento }) {
  const { datos, marcarEmpresa, quitarEmpresa } = useCohorte();
  const [busca, setBusca] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!datos) return null;
  const filas = datos.asistenciaEmpresas.filter(a => a.eventoId === evento.id);
  const nombre = new Map(datos.empresas.map(e => [e.id, e]));
  const ya = new Set(filas.map(f => f.empresaId));
  const candidatas = busca.trim().length < 2 ? [] : datos.empresas
    .filter(e => !ya.has(e.id) && [e.nombre, e.razonSocial, e.nit, ...e.municipios].some(v => norm(v).includes(norm(busca)))).slice(0, 8);
  async function hacer(k: string, f: () => Promise<string | null>) { setOcupado(k); setError(null); const e = await f(); setOcupado(null); if (e) setError(e); }

  return (
    <BloqueFicha titulo={`Empresas que asistieron (${filas.filter(f => f.estado === 'asistio').length})`}>
      <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar empresa del proyecto por nombre, NIT o municipio…"
        className="w-full bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20" />
      {candidatas.length > 0 && (
        <ul className="mt-2 border border-slate-100 rounded-xl divide-y divide-slate-50">
          {candidatas.map(e => (
            <li key={e.id} className="px-3 py-2 flex items-center justify-between gap-3">
              <span className="min-w-0"><span className="block text-sm font-bold text-slate-700 truncate">{e.nombre}</span><span className="block text-[11px] text-slate-400">NIT {e.nit} · {e.municipios.join(', ') || '—'}</span></span>
              <button type="button" disabled={!!ocupado} onClick={() => hacer(e.id, () => marcarEmpresa(evento.id, e.id, 'asistio')).then(() => setBusca(''))}
                className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 shrink-0">Asistió</button>
            </li>
          ))}
        </ul>
      )}
      {busca.trim().length >= 2 && candidatas.length === 0 && <p className="text-[11px] font-bold text-slate-400 mt-2">Ninguna otra empresa del proyecto coincide.</p>}
      {error && <div className="mt-2"><Aviso tono="red">{error}</Aviso></div>}
      {filas.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-50 border border-slate-100 rounded-xl">
          {filas.map(f => {
            const e = nombre.get(f.empresaId);
            return (
              <li key={f.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                <span className="min-w-0"><span className="block text-sm font-bold text-slate-700 truncate">{e?.nombre ?? 'Empresa fuera del proyecto'}</span><span className="block text-[11px] text-slate-400">{e ? `NIT ${e.nit}` : ''}</span></span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <Etiqueta tono={f.estado === 'asistio' ? 'emerald' : f.estado === 'no_asistio' ? 'red' : 'amber'}>{humano(f.estado)}</Etiqueta>
                  <button type="button" disabled={!!ocupado} onClick={() => hacer(f.empresaId + 'q', () => quitarEmpresa(evento.id, f.empresaId))}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-40" title="Quitar" aria-label="Quitar empresa"><Trash2 size={13} /></button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </BloqueFicha>
  );
}

const TIPOS_EVIDENCIA: { tipo: TipoEvidencia; label: string }[] = [
  { tipo: 'agenda', label: 'Agenda metodológica' }, { tipo: 'asistencia', label: 'Lista de asistencia firmada' },
  { tipo: 'fotografia', label: 'Registro fotográfico' }, { tipo: 'otro', label: 'Otro soporte' },
];

/** Evidencias del evento (A-10): agenda, lista de asistencia firmada, fotos u otro; archivo (bucket privado) o enlace. */
function EvidenciasDelEvento({ evento }: { evento: Evento }) {
  const { datos, subirEvidencia, borrarEvidencia, abrirEvidencia } = useCohorte();
  const [tipo, setTipo] = useState<TipoEvidencia>('agenda');
  const [modo, setModo] = useState<'archivo' | 'enlace'>('archivo');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [url, setUrl] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [borrar, setBorrar] = useState<string | null>(null);
  if (!datos) return null;
  const lista = datos.evidencias.filter(e => e.eventoId === evento.id);
  const faltan = TIPOS_EVIDENCIA.slice(0, 3).filter(t => !lista.some(e => e.tipo === t.tipo));

  async function subir() {
    setOcupado(true); setError(null);
    let err: string | null = null;
    if (modo === 'archivo') { for (const f of archivos) { err = await subirEvidencia(evento.id, tipo, { archivo: f }); if (err) break; } }
    else err = await subirEvidencia(evento.id, tipo, { url });
    setOcupado(false);
    if (err) setError(err); else { setArchivos([]); setUrl(''); }
  }
  async function abrir(e: Evidencia) {
    const u = await abrirEvidencia(e);
    if (u) window.open(u, '_blank', 'noopener'); else setError('No se pudo abrir la evidencia.');
  }
  const label = (t: TipoEvidencia) => TIPOS_EVIDENCIA.find(x => x.tipo === t)?.label ?? t;

  return (
    <BloqueFicha titulo={`Evidencias (${lista.length})`}>
      {faltan.length > 0 && <p className="text-[11px] font-bold text-amber-600 mb-2">Falta: {faltan.map(f => f.label.toLowerCase()).join(', ')}.</p>}
      {lista.length > 0 && (
        <ul className="mb-3 divide-y divide-slate-50 border border-slate-100 rounded-xl">
          {lista.map(e => (
            <li key={e.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
              <button type="button" onClick={() => abrir(e)} className="min-w-0 flex items-center gap-2 text-left">
                {e.tipo === 'fotografia' ? <ImageIcon size={15} className="text-slate-400 shrink-0" /> : e.url ? <Link2 size={15} className="text-slate-400 shrink-0" /> : <FileText size={15} className="text-slate-400 shrink-0" />}
                <span className="min-w-0"><span className="block text-sm font-bold text-slate-700 truncate">{e.nombre ?? e.url ?? 'Archivo'}</span><span className="block text-[11px] text-slate-400">{label(e.tipo)} · {e.subidoPor ?? ''}</span></span>
                <ExternalLink size={13} className="text-brand shrink-0" />
              </button>
              {borrar === e.id ? (
                <span className="flex items-center gap-1.5 shrink-0">
                  <button type="button" onClick={async () => { const err = await borrarEvidencia(e); setBorrar(null); if (err) setError(err); }} className="px-2 py-1 rounded-lg bg-red-600 text-white text-[10px] font-black uppercase">Borrar</button>
                  <button type="button" onClick={() => setBorrar(null)} className="text-[10px] font-black uppercase text-slate-400">No</button>
                </span>
              ) : (
                <button type="button" onClick={() => setBorrar(e.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 shrink-0" aria-label="Borrar evidencia"><Trash2 size={13} /></button>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="bg-slate-50 rounded-xl p-3 space-y-2">
        <div className="flex flex-wrap gap-2">
          <select value={tipo} onChange={e => setTipo(e.target.value as TipoEvidencia)} aria-label="Tipo de evidencia" className="bg-white rounded-lg px-3 py-2 text-xs font-bold text-slate-600 flex-1 min-w-[12rem]">
            {TIPOS_EVIDENCIA.map(t => <option key={t.tipo} value={t.tipo}>{t.label}</option>)}
          </select>
          <div className="flex bg-white rounded-lg p-0.5">
            {(['archivo', 'enlace'] as const).map(m => (
              <button key={m} type="button" onClick={() => setModo(m)} aria-pressed={modo === m}
                className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest ${modo === m ? 'bg-brand/10 text-brand' : 'text-slate-400'}`}>{m === 'archivo' ? 'Archivo' : 'Enlace'}</button>
            ))}
          </div>
        </div>
        {modo === 'archivo'
          ? <input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" onChange={e => setArchivos([...(e.target.files ?? [])])}
              className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-[10px] file:font-black file:uppercase file:text-brand" />
          : <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://drive.google.com/…" className="w-full bg-white rounded-lg px-3 py-2 text-sm outline-none" />}
        <button type="button" onClick={subir} disabled={ocupado || (modo === 'archivo' ? archivos.length === 0 : !url.trim())}
          className="flex items-center gap-2 bg-brand text-white rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-50">
          {ocupado ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} {modo === 'archivo' && archivos.length > 1 ? `Subir ${archivos.length} archivos` : 'Agregar evidencia'}
        </button>
        <p className="text-[10px] font-bold text-slate-400">Los archivos quedan en un almacenamiento privado; solo el equipo los puede abrir. Máximo 20 MB por archivo.</p>
      </div>
      {error && <div className="mt-2"><Aviso tono="red">{error}</Aviso></div>}
    </BloqueFicha>
  );
}

/** D-54: llamada desde el Calendario. Nueva: elegir persona → registrar o agendar. Existente: ver, completar o cancelar. */
function PanelLlamada({ panel, onCerrar }: { panel: NonNullable<PanelLl>; onCerrar: () => void }) {
  const { datos } = useCohorte();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [inactivar, setInactivar] = useState<{ personaId: string; nota: string } | null>(null);
  if (!datos) return null;
  const l = panel.modo === 'ver' ? datos.llamadas.find(x => x.id === panel.id) ?? null : null;
  if (panel.modo === 'ver' && !l && !inactivar) return null; // se canceló
  const quien = inactivar ? datos.personas.find(p => p.id === inactivar.personaId) : l ? datos.personas.find(p => p.id === l.personaId) : persona;
  const titulo = panel.modo === 'nueva' ? 'Llamada' : `Llamada · ${quien?.nombre ?? ''}`;
  const alInactivar = (p: Persona) => (nota: string) => setInactivar({ personaId: p.id, nota });

  return (
    <PanelLateral abierto onCerrar={onCerrar} titulo={titulo}
      subtitulo={quien ? <>{quien.tipoDoc ?? 'Doc.'} {quien.documento ?? '—'}{quien.celular ? ` · ${quien.celular}` : ''}</> : 'Elige la persona'}>
      {inactivar && quien ? (
        <BloqueEstado persona={quien} datos={datos} etapa={null} inactivarCon={inactivar.nota} />
      ) : l && quien ? (
        <ul><ItemLlamada l={l} onNoContinua={alInactivar(quien)} /></ul>
      ) : persona ? (
        <div className="space-y-3">
          <button type="button" onClick={() => setPersona(null)} className="text-[10px] font-black uppercase tracking-widest text-slate-400">← Otra persona</button>
          <FormLlamada persona={persona} dia={panel.modo === 'nueva' ? panel.dia : undefined}
            onListo={(r, nota) => { if (r === 'no_continua') setInactivar({ personaId: persona.id, nota }); else onCerrar(); }} onCancelar={onCerrar} />
        </div>
      ) : (
        <ElegirPersona onElegir={setPersona} />
      )}
    </PanelLateral>
  );
}
