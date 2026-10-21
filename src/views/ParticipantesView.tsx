/**
 * Participantes (E4, patrón de FQSD): "¿en qué va cada persona?". Una columna por etapa de la ruta de la
 * config (D-37) — mismas reglas que el embudo del Dashboard — y una ficha lateral con el porqué:
 * datos, formularios, documentos, asistencia, postulaciones y colocación. Privada (PII).
 * D-44: columnas de `participantes.marcas` (p. ej. hoja de vida) y filtros por fase («llegó a» / «está en»),
 * por fecha de registro y por marca.
 * D-51..D-53: estado activo/inactivo (deserción interna sobre todas las personas), llamadas e historial en la ficha.
 */
import { useCallback, useMemo, useState } from 'react';
import { ExternalLink, FileCheck2, FileX2 } from 'lucide-react';
import { useCohorte, estadoActual, type Persona, type DatosCohorte, type CambioEstado } from '../lib/datos';
import { etapasConRegla, evaluar, indexar, etapaActual, type Resultado } from '../lib/etapas';
import { fecha, diaBogota, diaLargo, hora, humano, norm, num } from '../lib/formato';
import { config } from '../lib/config';
import { FormPostulacionExterna, BorrarPostulacion, FormColocacion, TerminarColocacion, NoCuenta } from '../ui/Gestion';
import { BarraDatos, Buscador, Cargando, ErrorDatos, PanelLateral, BloqueFicha, MarcaEtapa, Etiqueta, Pestanas, Vacio } from '../ui/Privado';
import { KPICard } from '../ui/Comunes';
import { BloqueEstado, BloqueLlamadas, BloqueHistorial, motivoLabel } from '../ui/Seguimiento';

/** `r` = etapas de la ruta; `m` = marcas de la config (D-44); `dia` = día de registro en Bogotá (YYYY-MM-DD). */
type Fila = { p: Persona; r: Resultado[]; actual: number | null; m: Resultado[]; dia: string | null; baja: CambioEstado | null };
type Cond = 'todas' | 'si' | 'no';

export function filasPersonas(d: DatosCohorte): Fila[] {
  const etapas = etapasConRegla();
  const ix = indexar(d);
  const est = estadoActual(d);
  return d.personas.map(p => {
    const r = etapas.map(e => evaluar(e.regla, p, d, ix));
    const m = config.participantes.marcas.map(x => evaluar(x.regla, p, d, ix));
    const e = est.get(p.id);
    return { p, r, actual: etapaActual(r), m, dia: p.registradaEl ? diaBogota(p.registradaEl) : null, baja: e?.estado === 'inactivo' ? e : null };
  });
}

const COLS: Record<number, string> = { 5: 'xl:grid-cols-5', 6: 'xl:grid-cols-6', 7: 'xl:grid-cols-7', 8: 'xl:grid-cols-4' };
const CAMPO = 'bg-white border border-slate-100 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-600';

export default function ParticipantesView() {
  const { datos, error, cargando } = useCohorte();
  const marcas = config.participantes.marcas;
  const [q, setQ] = useState('');
  const [etapa, setEtapa] = useState<string>('todas');
  const [modo, setModo] = useState<'llego' | 'esta'>('llego');
  const [estado, setEstado] = useState('todos');
  const [actividad, setActividad] = useState<'todas' | 'activas' | 'inactivas'>('todas');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [conds, setConds] = useState<Cond[]>(() => marcas.map(() => 'todas'));
  const [abierta, setAbierta] = useState<string | null>(null);
  const etapas = etapasConRegla();
  // D-60: las marcas sin `despues` van antes de las etapas; las demás, justo después de su etapa.
  const columnas: { k: 'm' | 'r'; i: number }[] = [
    ...marcas.flatMap((m, i) => (m.despues ? [] : [{ k: 'm' as const, i }])),
    ...etapas.flatMap((e, i) => [{ k: 'r' as const, i }, ...marcas.flatMap((m, j) => (m.despues === e.etapa ? [{ k: 'm' as const, i: j }] : []))]),
  ];
  const filas = useMemo(() => (datos ? filasPersonas(datos) : []), [datos]);

  if (error && !datos) return <ErrorDatos error={error} />;
  if (!datos) return <Cargando />;

  const estados = [...new Set(datos.personas.map(p => p.estado ?? 'sin_estado'))];
  // Todos los filtros menos la fase: de aquí salen las cifras y los conteos de cada pestaña.
  const base = filas.filter(f =>
    (estado === 'todos' || (f.p.estado ?? 'sin_estado') === estado) &&
    (actividad === 'todas' || (actividad === 'inactivas') === (f.baja != null)) &&
    (!desde || (f.dia != null && f.dia >= desde)) && (!hasta || (f.dia != null && f.dia <= hasta)) &&
    conds.every((c, i) => c === 'todas' || (c === 'si' ? f.m[i] === true : f.m[i] === false)) &&
    (!q.trim() || [f.p.nombre, f.p.documento, f.p.correo, f.p.celular].some(v => norm(v).includes(norm(q)))));
  const enFase = (f: Fila, i: number) => (modo === 'llego' ? f.r[i] === true : f.actual === i);
  const visibles = etapa === 'todas' ? base : base.filter(f => enFase(f, Number(etapa)));
  const filtrando = Boolean(q.trim() || estado !== 'todos' || actividad !== 'todas' || desde || hasta || conds.some(c => c !== 'todas'));
  const limpiar = () => { setQ(''); setEstado('todos'); setActividad('todas'); setDesde(''); setHasta(''); setConds(marcas.map(() => 'todas')); };
  const fila = filas.find(f => f.p.id === abierta) ?? null;
  // D-52: deserción en general = inactivas / todas las personas de la cohorte (sin filtros); sigue contando en los acumulados.
  const inactivas = filas.filter(f => f.baja).length;
  const desercion = filas.length ? Math.round((inactivas / filas.length) * 1000) / 10 : 0;
  // D-63: cifra por etapa y, justo después, la de cada marca con `despues` (mismo orden que la tabla).
  const cifras = columnas.filter(c => c.k === 'r' || marcas[c.i].despues);
  const valor = (c: { k: 'm' | 'r'; i: number }) => (f: Fila) => (c.k === 'm' ? f.m[c.i] : f.r[c.i]);

  return (
    <div className={`space-y-6 ${cargando ? 'opacity-80' : ''}`}>
      <BarraDatos />

      <div className={`grid grid-cols-2 md:grid-cols-3 ${COLS[Math.min(cifras.length + 2, 8)] ?? 'xl:grid-cols-5'} gap-4`}>
        <KPICard label="Personas" value={num(base.length)} color="text-slate-800" />
        <KPICard label={`Inactivas · ${desercion.toLocaleString('es-CO')} %`} value={num(inactivas)} color="text-red-600" />
        {cifras.map(c => {
          const v = valor(c);
          const sinFuente = filas.length > 0 && filas.every(f => v(f) === null);
          const label = c.k === 'm' ? marcas[c.i].titulo : etapas[c.i].etapa;
          return <KPICard key={`${c.k}${c.i}`} label={label} title={c.k === 'm' ? marcas[c.i].ayuda : undefined}
            value={sinFuente ? null : num(base.filter(f => v(f) === true).length)} color="text-brand" />;
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Buscador valor={q} onCambio={setQ} placeholder="Buscar por nombre, documento, correo o celular…" />
        <select value={estado} onChange={e => setEstado(e.target.value)} aria-label="Estado de la postulación" className={CAMPO}>
          <option value="todos">Todos los estados</option>
          {estados.map(s => <option key={s} value={s}>{humano(s)}</option>)}
        </select>
        <select value={actividad} onChange={e => setActividad(e.target.value as typeof actividad)} aria-label="Activas o inactivas" className={CAMPO}>
          <option value="todas">Activas e inactivas</option>
          <option value="activas">Solo activas</option>
          <option value="inactivas">Solo inactivas</option>
        </select>
        {marcas.map((m, i) => (
          <select key={m.titulo} value={conds[i]} aria-label={m.titulo} className={CAMPO}
            onChange={e => setConds(cs => cs.map((c, j) => (j === i ? e.target.value as Cond : c)))}>
            <option value="todas">{m.titulo}: todas</option>
            <option value="si">Con {m.titulo.toLowerCase()}</option>
            <option value="no">Sin {m.titulo.toLowerCase()}</option>
          </select>
        ))}
        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Registro desde
          <input type="date" value={desde} max={hasta || undefined} onChange={e => setDesde(e.target.value)} className={CAMPO} />
        </label>
        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          hasta
          <input type="date" value={hasta} min={desde || undefined} onChange={e => setHasta(e.target.value)} className={CAMPO} />
        </label>
        {filtrando && (
          <button type="button" onClick={limpiar} className="text-[10px] font-black uppercase tracking-widest text-brand hover:opacity-80">Limpiar filtros</button>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Pestanas activa={etapa} onCambio={setEtapa}
          opciones={[{ key: 'todas', label: 'Todas', n: base.length }, ...etapas.map((e, i) => ({ key: String(i), label: e.etapa, n: base.filter(f => enFase(f, i)).length }))]} />
        <Pestanas<'llego' | 'esta'> activa={modo} onCambio={setModo}
          opciones={[{ key: 'llego', label: 'Llegó a la fase' }, { key: 'esta', label: 'Está en la fase' }]} />
      </div>
      <p className="text-[11px] font-bold text-slate-400 -mt-3">
        {modo === 'llego' ? 'Llegó a la fase: tiene ✓ en ella, aunque ya haya avanzado más.' : 'Está en la fase: es la etapa más avanzada que tiene.'}
        {' '}{num(visibles.length)} de {num(filas.length)} personas.
      </p>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[760px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-gray-50">Persona</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Programa</th>
                {columnas.map(c => c.k === 'm'
                  ? <th key={`m${c.i}`} title={marcas[c.i].ayuda} className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{marcas[c.i].titulo}</th>
                  : <th key={`r${c.i}`} className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{etapas[c.i].etapa}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visibles.map(f => (
                <tr key={f.p.id} onClick={() => setAbierta(f.p.id)} className={`hover:bg-gray-50/60 cursor-pointer ${f.baja ? 'opacity-55' : ''}`}>
                  <td className="px-6 py-3 sticky left-0 bg-white">
                    <p className="text-sm font-bold text-slate-800">{f.p.nombre}</p>
                    <p className="text-[11px] text-slate-400">{f.p.documento ?? '—'} · {f.p.correo ?? 'sin correo'} · registro {fecha(f.dia)}</p>
                  </td>
                  <td className="px-4 py-3"><Etiqueta>{humano(f.p.estado)}</Etiqueta></td>
                  <td className="px-4 py-3" title={f.baja ? `${motivoLabel(f.baja.motivo)} · ${fecha(f.baja.fechaEfectiva)}` : undefined}>
                    {f.baja ? <Etiqueta tono="red">Inactiva</Etiqueta> : <Etiqueta tono="emerald">Activa</Etiqueta>}
                  </td>
                  {columnas.map(c => <td key={`${c.k}${c.i}`} className="px-3 py-3 text-center"><MarcaEtapa v={c.k === 'm' ? f.m[c.i] : f.r[c.i]} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visibles.length === 0 && <Vacio texto="Nadie coincide con el filtro" />}
      </div>

      {fila && <Ficha key={fila.p.id} f={fila} datos={datos} onCerrar={() => setAbierta(null)} />}
    </div>
  );
}

function Ficha({ f, datos, onCerrar }: { f: Fila; datos: DatosCohorte; onCerrar: () => void }) {
  const { p } = f;
  const [registrando, setRegistrando] = useState<'postulacion' | 'colocacion' | null>(null);
  const [inactivarCon, setInactivarCon] = useState<string | null>(null);
  const usado = useCallback(() => setInactivarCon(null), []);
  const etapas = etapasConRegla();
  const asist = datos.asistencias.filter(a => a.personaId === p.id)
    .map(a => ({ a, e: datos.eventos.find(e => e.id === a.eventoId) })).filter(x => x.e)
    .sort((x, y) => x.e!.inicio.localeCompare(y.e!.inicio));
  const posts = datos.postulaciones.filter(x => x.personaId === p.id);
  const cols = datos.colocaciones.filter(x => x.personaId === p.id);
  const docs = datos.formularios.flatMap(fm => fm.preguntas.filter(q => q.tipo === 'file_upload').map(q => ({ fm, q, v: p.respuestas[fm.bloque]?.[q.clave] })));
  const dato = (l: string, v: string | null | undefined) => (
    <div><dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{l}</dt><dd className="text-sm font-bold text-slate-700 break-words">{v || '—'}</dd></div>
  );

  return (
    <PanelLateral abierto onCerrar={onCerrar} titulo={p.nombre}
      subtitulo={<>{p.tipoDoc ?? 'Doc.'} {p.documento ?? '—'} · registrada {fecha(p.registradaEl)}</>}>
      <BloqueFicha titulo="Ruta de la persona">
        <ol className="space-y-2">
          {etapas.map((e, i) => (
            <li key={e.etapa} className="flex items-center gap-3">
              <MarcaEtapa v={f.r[i]} />
              <span className={`text-sm font-bold ${f.r[i] ? 'text-slate-800' : 'text-slate-400'}`}>{e.etapa}</span>
              {f.actual === i && <Etiqueta tono="brand">Etapa actual</Etiqueta>}
            </li>
          ))}
        </ol>
        {config.participantes.marcas.length > 0 && (
          <ul className="mt-3 pt-3 border-t border-slate-100 space-y-2">
            {config.participantes.marcas.map((m, i) => (
              <li key={m.titulo} className="flex items-center gap-3">
                <MarcaEtapa v={f.m[i]} />
                <span className={`text-sm font-bold ${f.m[i] ? 'text-slate-800' : 'text-slate-400'}`}>{m.titulo}</span>
              </li>
            ))}
          </ul>
        )}
      </BloqueFicha>

      <BloqueEstado persona={p} datos={datos} etapa={f.actual != null ? etapas[f.actual]?.etapa ?? null : null} inactivarCon={inactivarCon} onInactivarUsado={usado} />
      <BloqueLlamadas persona={p} datos={datos} onNoContinua={nota => setInactivarCon(nota)} />

      <BloqueFicha titulo="Datos de contacto">
        <dl className="grid grid-cols-2 gap-3">
          {dato('Correo', p.correo)}{dato('Celular', p.celular)}{dato('Ciudad', p.ciudad)}{dato('Género', p.genero)}
          {dato('Nacimiento', fecha(p.nacimiento))}{dato('Estado', humano(p.estado))}
          {dato('Matrícula', p.matricula ? `${humano(p.matricula.estado)} · ${fecha(p.matricula.fecha)}` : 'No matriculada')}
          <div><dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hoja de vida</dt><dd className="text-sm font-bold text-slate-700">
            {p.hv ? (/^https?:\/\//.test(p.hv)
              ? <a href={p.hv} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand">Abrir <ExternalLink size={13} /></a>
              : 'Cargada') : 'No cargada'}
          </dd></div>
        </dl>
      </BloqueFicha>

      <BloqueFicha titulo="Formularios">
        <ul className="space-y-1.5">
          {datos.formularios.map(fm => {
            const r = p.respuestas[fm.bloque];
            const n = r ? Object.values(r).filter(v => v != null && String(v).trim() !== '').length : 0;
            return (
              <li key={fm.bloque} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-bold text-slate-700">{humano(fm.nombre)}</span>
                {r ? <Etiqueta tono="emerald">{n} respuestas</Etiqueta> : <Etiqueta>Sin responder</Etiqueta>}
              </li>
            );
          })}
        </ul>
      </BloqueFicha>

      {docs.length > 0 && (
        <BloqueFicha titulo="Documentos">
          <ul className="space-y-1.5">
            {docs.map(({ fm, q, v }) => {
              const ok = v != null && String(v).trim() !== '';
              const url = ok && /^https?:\/\//.test(String(v)) ? String(v) : null;
              return (
                <li key={fm.bloque + q.clave} className="flex items-center gap-2 text-sm">
                  {ok ? <FileCheck2 size={15} className="text-emerald-500 shrink-0" /> : <FileX2 size={15} className="text-slate-300 shrink-0" />}
                  <span className={`flex-1 ${ok ? 'text-slate-700 font-bold' : 'text-slate-400'}`}>{q.etiqueta}</span>
                  {url && <a href={url} target="_blank" rel="noreferrer" className="text-brand" aria-label="Abrir documento"><ExternalLink size={14} /></a>}
                </li>
              );
            })}
          </ul>
          {Object.keys(config.grupos).length > 0 && <p className="text-[10px] font-bold text-slate-400 mt-2">Grupos de la config: {Object.keys(config.grupos).join(', ')}</p>}
        </BloqueFicha>
      )}

      <BloqueFicha titulo={`Eventos (${asist.length})`}>
        {asist.length === 0 ? <p className="text-xs text-slate-400 font-bold">Sin eventos registrados.</p> : (
          <ul className="space-y-1.5">
            {asist.map(({ a, e }) => (
              <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0"><span className="block font-bold text-slate-700 truncate">{e!.nombre}</span><span className="block text-[11px] text-slate-400">{diaLargo(e!.inicio)} · {hora(e!.inicio)}</span></span>
                <Etiqueta tono={a.estado === 'asistio' ? 'emerald' : a.estado === 'no_asistio' ? 'red' : 'amber'}>{humano(a.estado)}</Etiqueta>
              </li>
            ))}
          </ul>
        )}
      </BloqueFicha>

      <BloqueFicha titulo={`Postulaciones a vacantes (${posts.length})`}>
        {posts.length === 0 ? <p className="text-xs text-slate-400 font-bold">Sin postulaciones.</p> : (
          <ul className="space-y-1.5">
            {posts.map(x => (
              <li key={x.id} className="text-sm flex items-start justify-between gap-2">
                <span>
                  <span className="font-bold text-slate-700">{x.vacante}</span>
                  <span className="text-[11px] text-slate-400"> · {x.empresa ?? 'empresa sin dato'} · {fecha(x.fecha)} · {x.origen === 'externa' ? 'externa' : humano(x.estado)}</span>
                  {' '}<NoCuenta motivo={x.excluida} />
                </span>
                <BorrarPostulacion p={x} />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2">
          {registrando === 'postulacion'
            ? <FormPostulacionExterna persona={p} onListo={() => setRegistrando(null)} onCancelar={() => setRegistrando(null)} />
            : <button type="button" onClick={() => setRegistrando('postulacion')} className="text-[11px] font-black uppercase tracking-widest text-brand">+ Postulación externa</button>}
        </div>
      </BloqueFicha>

      <BloqueFicha titulo="Colocación">
        {cols.length === 0 ? <p className="text-xs text-slate-400 font-bold">Sin colocación registrada.</p> : cols.map(c => (
          <div key={c.id} className="text-sm">
            <span className="font-bold text-slate-700">{c.cargo}</span>
            <span className="text-[11px] text-slate-400"> · {c.empresa ?? '—'} · desde {fecha(c.inicio)}{c.activa ? '' : ' · terminada'}</span>
            {' '}<NoCuenta motivo={c.excluida} />
            <div><TerminarColocacion c={c} /></div>
          </div>
        ))}
        <div className="mt-2">
          {registrando === 'colocacion'
            ? <FormColocacion persona={p} onListo={() => setRegistrando(null)} onCancelar={() => setRegistrando(null)} />
            : <button type="button" onClick={() => setRegistrando('colocacion')} className="text-[11px] font-black uppercase tracking-widest text-brand">+ Colocación</button>}
        </div>
      </BloqueFicha>

      <BloqueHistorial persona={p} datos={datos} />
    </PanelLateral>
  );
}
