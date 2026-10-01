/**
 * Participantes (E4, patrón de FQSD): "¿en qué va cada persona?". Una columna por etapa de la ruta de la
 * config (D-37) — mismas reglas que el embudo del Dashboard — y una ficha lateral con el porqué:
 * datos, formularios, documentos, asistencia, postulaciones y colocación. Privada (PII).
 */
import { useMemo, useState } from 'react';
import { ExternalLink, FileCheck2, FileX2 } from 'lucide-react';
import { useCohorte, type Persona, type DatosCohorte } from '../lib/datos';
import { etapasConRegla, evaluar, indexar, etapaActual, type Resultado } from '../lib/etapas';
import { fecha, diaLargo, hora, humano, norm, num } from '../lib/formato';
import { config } from '../lib/config';
import { BarraDatos, Buscador, Cargando, ErrorDatos, PanelLateral, BloqueFicha, MarcaEtapa, Etiqueta, Pestanas, Vacio } from '../ui/Privado';
import { KPICard } from '../ui/Comunes';

type Fila = { p: Persona; r: Resultado[]; actual: number | null };

export function filasPersonas(d: DatosCohorte): Fila[] {
  const etapas = etapasConRegla();
  const ix = indexar(d);
  return d.personas.map(p => {
    const r = etapas.map(e => evaluar(e.regla, p, d, ix));
    return { p, r, actual: etapaActual(r) };
  });
}

export default function ParticipantesView() {
  const { datos, error, cargando } = useCohorte();
  const [q, setQ] = useState('');
  const [etapa, setEtapa] = useState<string>('todas');
  const [estado, setEstado] = useState('todos');
  const [abierta, setAbierta] = useState<string | null>(null);
  const etapas = etapasConRegla();
  const filas = useMemo(() => (datos ? filasPersonas(datos) : []), [datos]);

  if (error && !datos) return <ErrorDatos error={error} />;
  if (!datos) return <Cargando />;

  const estados = [...new Set(datos.personas.map(p => p.estado ?? 'sin_estado'))];
  const visibles = filas.filter(f =>
    (etapa === 'todas' || f.r[Number(etapa)] === true) &&
    (estado === 'todos' || (f.p.estado ?? 'sin_estado') === estado) &&
    (!q.trim() || [f.p.nombre, f.p.documento, f.p.correo, f.p.celular].some(v => norm(v).includes(norm(q)))));
  const fila = filas.find(f => f.p.id === abierta) ?? null;

  return (
    <div className={`space-y-6 ${cargando ? 'opacity-80' : ''}`}>
      <BarraDatos />

      <div className={`grid grid-cols-2 md:grid-cols-3 ${etapas.length >= 5 ? 'xl:grid-cols-6' : 'xl:grid-cols-5'} gap-4`}>
        <KPICard label="Personas" value={num(filas.length)} color="text-slate-800" />
        {etapas.map((e, i) => {
          const sinFuente = filas.length > 0 && filas.every(f => f.r[i] === null);
          return <KPICard key={e.etapa} label={e.etapa} value={sinFuente ? null : num(filas.filter(f => f.r[i] === true).length)} color="text-brand" />;
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Buscador valor={q} onCambio={setQ} placeholder="Buscar por nombre, documento, correo o celular…" />
        <select value={estado} onChange={e => setEstado(e.target.value)} aria-label="Estado de la postulación"
          className="bg-white border border-slate-100 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-600">
          <option value="todos">Todos los estados</option>
          {estados.map(s => <option key={s} value={s}>{humano(s)}</option>)}
        </select>
      </div>
      <Pestanas activa={etapa} onCambio={setEtapa}
        opciones={[{ key: 'todas', label: 'Todas', n: filas.length }, ...etapas.map((e, i) => ({ key: String(i), label: e.etapa, n: filas.filter(f => f.r[i] === true).length }))]} />

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[760px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-gray-50">Persona</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                {etapas.map(e => <th key={e.etapa} className="px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{e.etapa}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visibles.map(f => (
                <tr key={f.p.id} onClick={() => setAbierta(f.p.id)} className="hover:bg-gray-50/60 cursor-pointer">
                  <td className="px-6 py-3 sticky left-0 bg-white">
                    <p className="text-sm font-bold text-slate-800">{f.p.nombre}</p>
                    <p className="text-[11px] text-slate-400">{f.p.documento ?? '—'} · {f.p.correo ?? 'sin correo'}</p>
                  </td>
                  <td className="px-4 py-3"><Etiqueta>{humano(f.p.estado)}</Etiqueta></td>
                  {f.r.map((v, i) => <td key={i} className="px-3 py-3 text-center"><MarcaEtapa v={v} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visibles.length === 0 && <Vacio texto="Nadie coincide con el filtro" />}
      </div>

      {fila && <Ficha f={fila} datos={datos} onCerrar={() => setAbierta(null)} />}
    </div>
  );
}

function Ficha({ f, datos, onCerrar }: { f: Fila; datos: DatosCohorte; onCerrar: () => void }) {
  const { p } = f;
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
      </BloqueFicha>

      <BloqueFicha titulo="Datos de contacto">
        <dl className="grid grid-cols-2 gap-3">
          {dato('Correo', p.correo)}{dato('Celular', p.celular)}{dato('Ciudad', p.ciudad)}{dato('Género', p.genero)}
          {dato('Nacimiento', fecha(p.nacimiento))}{dato('Estado', humano(p.estado))}
          {dato('Matrícula', p.matricula ? `${humano(p.matricula.estado)} · ${fecha(p.matricula.fecha)}` : 'No matriculada')}
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
              <li key={x.id} className="text-sm">
                <span className="font-bold text-slate-700">{x.vacante}</span>
                <span className="text-[11px] text-slate-400"> · {x.empresa ?? 'empresa sin dato'} · {fecha(x.fecha)} · {x.origen === 'externa' ? 'externa' : humano(x.estado)}</span>
              </li>
            ))}
          </ul>
        )}
      </BloqueFicha>

      <BloqueFicha titulo="Colocación">
        {cols.length === 0 ? <p className="text-xs text-slate-400 font-bold">Sin colocación registrada.</p> : cols.map(c => (
          <p key={c.id} className="text-sm"><span className="font-bold text-slate-700">{c.cargo}</span><span className="text-[11px] text-slate-400"> · {c.empresa ?? '—'} · desde {fecha(c.inicio)}{c.activa ? '' : ' · desactivada'}</span></p>
        ))}
      </BloqueFicha>
    </PanelLateral>
  );
}
