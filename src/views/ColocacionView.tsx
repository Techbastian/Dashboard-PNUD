/**
 * Colocación (E5, D-36): el proceso de las PERSONAS hacia el empleo — intermediación (postulaciones a vacantes,
 * de la plataforma o externas) y colocación (placements). Va aparte de Empresas.
 * Desde 2.6 (portado de FQSD) registra postulaciones externas y colocaciones, y marca colocaciones terminadas.
 * Escribe en las tablas de la plataforma: una colocación con recordatorios automáticos hace que la plataforma
 * envíe correos de seguimiento a la persona. Lo excluido de las métricas (A-22) se ve marcado «No cuenta».
 * 2.22.1 (D-77): la intermediación solo muestra y cuenta postulaciones atribuibles al proyecto (A-16).
 * 2.23.0 (D-79): las colocaciones incluyen las contrataciones de participant_hirings sin placement (solo lectura, «Plataforma»).
 */
import { useState } from 'react';
import { useCohorte, type Persona } from '../lib/datos';
import { BorrarPostulacion, ElegirPersona, FormColocacion, FormPostulacionExterna, NoCuenta, TerminarColocacion } from '../ui/Gestion';
import { etapasConRegla, nombreEtapa } from '../lib/etapas';
import { fecha, humano, norm, num } from '../lib/formato';
import { BarraDatos, Buscador, Cargando, ErrorDatos, Etiqueta, PanelLateral, Pestanas, Vacio } from '../ui/Privado';
import { KPICard } from '../ui/Comunes';
import { filasPersonas } from './ParticipantesView';

export default function ColocacionView() {
  const { datos, error, cargando } = useCohorte();
  const [tab, setTab] = useState<'intermediados' | 'colocados'>('intermediados');
  const [q, setQ] = useState('');
  const [registro, setRegistro] = useState<{ tipo: 'postulacion' | 'colocacion'; persona: Persona | null } | null>(null);
  if (error && !datos) return <ErrorDatos error={error} />;
  if (!datos) return <Cargando />;

  const etapas = etapasConRegla();
  const filas = new Map(filasPersonas(datos).map(f => [f.p.id, f]));
  const persona = new Map(datos.personas.map(p => [p.id, p]));
  // D-77: solo la intermediación atribuible al proyecto (A-16): vacantes de empresas vinculadas a la cohorte o creadas
  // para ella, y externas del equipo. Las postulaciones a vacantes de otros proyectos no se ven ni se cuentan aquí
  // (igual que la cifra pública `personas_postuladas_aliadas` y la etapa Intermediación). La ficha las sigue mostrando.
  const posts = datos.postulaciones.filter(p => p.atribuible);
  const porPersona = new Map<string, typeof posts>();
  for (const x of posts) porPersona.set(x.personaId, [...(porPersona.get(x.personaId) ?? []), x]);
  const soloOtras = new Set(datos.postulaciones.filter(p => !p.atribuible && !porPersona.has(p.personaId)).map(p => p.personaId)).size;
  const coincide = (id: string) => { const p = persona.get(id); return !q.trim() || [p?.nombre, p?.documento, p?.correo].some(v => norm(v).includes(norm(q))); };
  const intermediados = [...porPersona.entries()].filter(([id]) => coincide(id));
  const colocadas = datos.colocaciones.filter(c => coincide(c.personaId));

  return (
    <div className={`space-y-6 ${cargando ? 'opacity-80' : ''}`}>
      <BarraDatos />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Personas postuladas" value={num(new Set(posts.filter(p => !p.excluida).map(p => p.personaId)).size)} color="text-brand"
          subtext={soloOtras ? `Sin contar ${num(soloOtras)} con postulaciones solo a vacantes de otros proyectos` : 'A vacantes del proyecto o externas'} />
        <KPICard label="Total de postulaciones" value={num(posts.length)} color="text-qsd-purple" subtext={`${posts.filter(p => p.origen === 'externa').length} externas`} />
        <KPICard label="Personas colocadas" value={num(new Set(datos.colocaciones.filter(c => c.activa && !c.excluida).map(c => c.personaId)).size)} color="text-qsd-orange" />
        <KPICard label="Colocaciones activas" value={num(datos.colocaciones.filter(c => c.activa && !c.excluida).length)} color="text-emerald-600" />
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => setRegistro({ tipo: 'postulacion', persona: null })} className="px-4 py-2.5 rounded-xl bg-white border border-slate-100 text-[10px] font-black uppercase tracking-widest text-brand">+ Postulación externa</button>
        <button type="button" onClick={() => setRegistro({ tipo: 'colocacion', persona: null })} className="px-4 py-2.5 rounded-xl bg-brand text-white text-[10px] font-black uppercase tracking-widest">+ Colocación</button>
      </div>
      {registro && (
        <PanelLateral abierto onCerrar={() => setRegistro(null)} titulo={registro.tipo === 'colocacion' ? 'Registrar colocación' : 'Registrar postulación externa'}
          subtitulo={registro.persona ? registro.persona.nombre : 'Elige la persona'}>
          {registro.persona ? (registro.tipo === 'colocacion'
            ? <FormColocacion persona={registro.persona} onListo={() => setRegistro(null)} onCancelar={() => setRegistro({ ...registro, persona: null })} />
            : <FormPostulacionExterna persona={registro.persona} onListo={() => setRegistro(null)} onCancelar={() => setRegistro({ ...registro, persona: null })} />)
            : <ElegirPersona onElegir={p => setRegistro({ ...registro, persona: p })} />}
        </PanelLateral>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Pestanas activa={tab} onCambio={setTab} opciones={[{ key: 'intermediados', label: 'Intermediación', n: porPersona.size }, { key: 'colocados', label: 'Colocados', n: datos.colocaciones.length }]} />
        <Buscador valor={q} onCambio={setQ} placeholder="Buscar persona…" />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          {tab === 'intermediados' ? (
            intermediados.length === 0 ? <Vacio texto="Aún no hay personas postuladas a vacantes" /> : (
              <table className="w-full text-left min-w-[720px]">
                <thead className="bg-gray-50 border-b border-gray-100"><tr>
                  {['Persona', 'Etapa actual', 'Vacantes', 'Última postulación'].map(h => <th key={h} className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {intermediados.map(([id, ps]) => {
                    const p = persona.get(id); const f = filas.get(id);
                    return (
                      <tr key={id} className="align-top">
                        <td className="px-6 py-3"><p className="text-sm font-bold text-slate-800">{p?.nombre ?? '—'}</p><p className="text-[11px] text-slate-400">{p?.documento ?? ''}</p></td>
                        <td className="px-6 py-3">{f?.actual != null ? <Etiqueta tono="brand">{nombreEtapa(etapas[f.actual])}</Etiqueta> : '—'}</td>
                        <td className="px-6 py-3"><ul className="space-y-1">{ps.map(x => (
                          <li key={x.id} className="text-xs flex items-center gap-2"><span><span className="font-bold text-slate-700">{x.vacante}</span><span className="text-slate-400"> · {x.empresa ?? '—'} · {x.origen === 'externa' ? 'externa' : humano(x.estado)}</span> <NoCuenta motivo={x.excluida} /></span><BorrarPostulacion p={x} /></li>
                        ))}</ul></td>
                        <td className="px-6 py-3 text-xs font-bold text-slate-500 whitespace-nowrap">{fecha(ps[0]?.fecha)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : (
            colocadas.length === 0 ? <Vacio texto="Aún no hay colocaciones registradas" /> : (
              <table className="w-full text-left min-w-[720px]">
                <thead className="bg-gray-50 border-b border-gray-100"><tr>
                  {['Persona', 'Empresa', 'Cargo / sector', 'Inicio', 'Modalidad', 'Estado'].map(h => <th key={h} className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {colocadas.map(c => { const p = persona.get(c.personaId); return (
                    <tr key={c.id}>
                      <td className="px-6 py-3"><p className="text-sm font-bold text-slate-800">{p?.nombre ?? '—'}</p><p className="text-[11px] text-slate-400">{p?.documento ?? ''}</p></td>
                      <td className="px-6 py-3 text-sm text-slate-600">{c.empresa ?? '—'}</td>
                      <td className="px-6 py-3 text-sm text-slate-600">{c.cargo}</td>
                      <td className="px-6 py-3 text-xs font-bold text-slate-500 whitespace-nowrap">{fecha(c.inicio)}</td>
                      <td className="px-6 py-3 text-xs text-slate-500">{c.modalidad ?? '—'}</td>
                      <td className="px-6 py-3">{c.activa ? <Etiqueta tono="emerald">Activa</Etiqueta> : <Etiqueta>Terminada</Etiqueta>}{c.origen === 'contratacion' && <> <span title="Registrada en el módulo de intermediación de la plataforma (participant_hirings); se edita allá"><Etiqueta>Plataforma</Etiqueta></span></>} <NoCuenta motivo={c.excluida} /><div><TerminarColocacion c={c} /></div></td>
                    </tr>
                  ); })}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </div>
  );
}
