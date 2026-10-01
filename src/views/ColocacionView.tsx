/**
 * Colocación (E5, D-36): el proceso de las PERSONAS hacia el empleo — intermediación (postulaciones a vacantes,
 * de la plataforma o externas) y colocación (placements). Va aparte de Empresas. Solo lectura en la v1:
 * registrar colocaciones desde aquí escribe en `placements`, que dispara correos de retención (siguiente iteración).
 */
import { useState } from 'react';
import { useCohorte } from '../lib/datos';
import { etapasConRegla } from '../lib/etapas';
import { fecha, humano, norm, num } from '../lib/formato';
import { BarraDatos, Buscador, Cargando, ErrorDatos, Etiqueta, Pestanas, Vacio } from '../ui/Privado';
import { KPICard } from '../ui/Comunes';
import { filasPersonas } from './ParticipantesView';

export default function ColocacionView() {
  const { datos, error, cargando } = useCohorte();
  const [tab, setTab] = useState<'intermediados' | 'colocados'>('intermediados');
  const [q, setQ] = useState('');
  if (error && !datos) return <ErrorDatos error={error} />;
  if (!datos) return <Cargando />;

  const etapas = etapasConRegla();
  const filas = new Map(filasPersonas(datos).map(f => [f.p.id, f]));
  const persona = new Map(datos.personas.map(p => [p.id, p]));
  const porPersona = new Map<string, typeof datos.postulaciones>();
  for (const x of datos.postulaciones) porPersona.set(x.personaId, [...(porPersona.get(x.personaId) ?? []), x]);
  const coincide = (id: string) => { const p = persona.get(id); return !q.trim() || [p?.nombre, p?.documento, p?.correo].some(v => norm(v).includes(norm(q))); };
  const intermediados = [...porPersona.entries()].filter(([id]) => coincide(id));
  const colocadas = datos.colocaciones.filter(c => coincide(c.personaId));

  return (
    <div className={`space-y-6 ${cargando ? 'opacity-80' : ''}`}>
      <BarraDatos />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Personas postuladas" value={num(porPersona.size)} color="text-brand" />
        <KPICard label="Postulaciones" value={num(datos.postulaciones.length)} color="text-qsd-purple" subtext={`${datos.postulaciones.filter(p => p.origen === 'externa').length} externas`} />
        <KPICard label="Personas colocadas" value={num(new Set(datos.colocaciones.filter(c => c.activa).map(c => c.personaId)).size)} color="text-qsd-orange" />
        <KPICard label="Colocaciones activas" value={num(datos.colocaciones.filter(c => c.activa).length)} color="text-emerald-600" />
      </div>
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
                        <td className="px-6 py-3">{f?.actual != null ? <Etiqueta tono="brand">{etapas[f.actual].etapa}</Etiqueta> : '—'}</td>
                        <td className="px-6 py-3"><ul className="space-y-1">{ps.map(x => (
                          <li key={x.id} className="text-xs"><span className="font-bold text-slate-700">{x.vacante}</span><span className="text-slate-400"> · {x.empresa ?? '—'} · {x.origen === 'externa' ? 'externa' : humano(x.estado)}</span></li>
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
                      <td className="px-6 py-3">{c.activa ? <Etiqueta tono="emerald">Activa</Etiqueta> : <Etiqueta>Desactivada</Etiqueta>}</td>
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
