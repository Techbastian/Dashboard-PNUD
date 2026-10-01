/**
 * Empresas (E6, D-36): las organizaciones vinculadas al proyecto (company_cohorts), con sus datos de contacto
 * y sus vacantes de la cohorte. Va aparte del proceso de las personas (Colocación). Privada: trae contactos.
 */
import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight, Mail, Phone, User } from 'lucide-react';
import { useCohorte, type Empresa, type Evento } from '../lib/datos';
import { config } from '../lib/config';
import { fecha, humano, norm, num } from '../lib/formato';
import { BarraDatos, Buscador, Cargando, ErrorDatos, Etiqueta, Vacio } from '../ui/Privado';
import { KPICard } from '../ui/Comunes';

export default function EmpresasView() {
  const { datos, error, cargando } = useCohorte();
  const [q, setQ] = useState('');
  const [tamano, setTamano] = useState('todos');
  const [soloConVacantes, setSoloConVacantes] = useState(false);
  const [abierta, setAbierta] = useState<string | null>(null);
  if (error && !datos) return <ErrorDatos error={error} />;
  if (!datos) return <Cargando />;

  const tamanos = [...new Set(datos.empresas.map(e => e.tamano ?? 'Sin dato'))];
  const visibles = datos.empresas.filter(e =>
    (tamano === 'todos' || (e.tamano ?? 'Sin dato') === tamano) && (!soloConVacantes || e.vacantes.length > 0) &&
    (!q.trim() || [e.nombre, e.razonSocial, e.nit, e.sector, e.contacto.nombre, ...e.municipios].some(v => norm(v).includes(norm(q)))));
  const vacantes = datos.empresas.flatMap(e => e.vacantes);
  // Eventos a los que asistió cada empresa (A-10). "Sensibilizada" = asistió a un evento cuyo tipo registra empresas (D-40).
  const tiposEmpresa = new Set(config.catalogo.filter(c => c.empresas).map(c => c.tipo));
  const eventoPorId = new Map(datos.eventos.map(e => [e.id, e]));
  const eventosDe = new Map<string, Evento[]>();
  for (const a of datos.asistenciaEmpresas) {
    const ev = eventoPorId.get(a.eventoId);
    if (a.estado !== 'asistio' || !ev) continue;
    eventosDe.set(a.empresaId, [...(eventosDe.get(a.empresaId) ?? []), ev]);
  }
  const sensibilizada = (id: string) => (eventosDe.get(id) ?? []).some(e => tiposEmpresa.has(e.tipo ?? ''));

  return (
    <div className={`space-y-6 ${cargando ? 'opacity-80' : ''}`}>
      <BarraDatos />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard label="Empresas vinculadas" value={num(datos.empresas.length)} color="text-brand" />
        {tiposEmpresa.size > 0 && <KPICard label="Sensibilizadas" value={num(datos.empresas.filter(e => sensibilizada(e.id)).length)} color="text-emerald-600" subtext="Asistieron a un evento de sensibilización" />}
        <KPICard label="Con vacantes" value={num(datos.empresas.filter(e => e.vacantes.length).length)} color="text-emerald-600" />
        <KPICard label="Cargos" value={num(vacantes.length)} color="text-qsd-purple" />
        <KPICard label="Puestos" value={num(vacantes.reduce((s, v) => s + v.puestos, 0))} color="text-qsd-teal" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Buscador valor={q} onCambio={setQ} placeholder="Buscar empresa, NIT, sector, municipio o contacto…" />
        <select value={tamano} onChange={e => setTamano(e.target.value)} aria-label="Tamaño" className="bg-white border border-slate-100 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-600">
          <option value="todos">Todos los tamaños</option>{tamanos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-500"><input type="checkbox" checked={soloConVacantes} onChange={e => setSoloConVacantes(e.target.checked)} className="accent-[var(--color-brand)]" /> Solo con vacantes</label>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[860px]">
            <thead className="bg-gray-50 border-b border-gray-100"><tr>
              {['', 'Empresa', 'Tamaño', 'Sector', 'Municipios', 'Sensibilizada', 'Vacantes'].map(h => <th key={h} className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {visibles.map(e => (
                <Fragment key={e.id}>
                  <tr className="hover:bg-gray-50/60 cursor-pointer align-top" onClick={() => setAbierta(a => (a === e.id ? null : e.id))}>
                    <td className="pl-4 py-3 text-slate-300">{abierta === e.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                    <td className="px-4 py-3"><p className="text-sm font-bold text-slate-800">{e.nombre}</p><p className="text-[11px] text-slate-400">NIT {e.nit}{/^P/i.test(e.nit) ? ' · provisional' : ''}</p></td>
                    <td className="px-4 py-3 text-xs text-slate-600">{e.tamano ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[14rem]">{e.sector ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[12rem]">{e.municipios.join(', ') || '—'}</td>
                    <td className="px-4 py-3">{sensibilizada(e.id) ? <Etiqueta tono="emerald">Sí</Etiqueta> : <span className="text-xs text-slate-300">—</span>}</td>
                    <td className="px-4 py-3">{e.vacantes.length ? <Etiqueta tono="brand">{e.vacantes.length} · {e.vacantes.reduce((s, v) => s + v.puestos, 0)} puestos</Etiqueta> : <span className="text-xs text-slate-300">—</span>}</td>
                  </tr>
                  {abierta === e.id && <tr><td colSpan={7} className="bg-slate-50/60 px-6 py-5"><Detalle e={e} eventos={eventosDe.get(e.id) ?? []} /></td></tr>}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {visibles.length === 0 && <Vacio texto="Ninguna empresa coincide" />}
      </div>
    </div>
  );
}

function Detalle({ e, eventos }: { e: Empresa; eventos: Evento[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-2 text-sm">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contacto</p>
        <p className="flex items-center gap-2 text-slate-700"><User size={14} className="text-slate-400" />{e.contacto.nombre ?? '—'}</p>
        <p className="flex items-center gap-2 text-slate-700"><Phone size={14} className="text-slate-400" />{e.contacto.telefono ?? '—'}</p>
        <p className="flex items-center gap-2 text-slate-700 break-all"><Mail size={14} className="text-slate-400" />{e.contacto.correo ?? '—'}</p>
        <p className="text-[11px] text-slate-400 pt-1">Razón social: {e.razonSocial}<br />Dirección: {e.direccion ?? '—'}<br />Registrada: {fecha(e.registradaEl)}</p>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-3">Eventos a los que asistió ({eventos.length})</p>
        {eventos.length === 0 ? <p className="text-xs font-bold text-slate-400">Ninguno registrado en el Calendario.</p>
          : <ul className="space-y-1">{eventos.map(ev => <li key={ev.id} className="text-xs text-slate-600"><b>{ev.nombre}</b> · {fecha(ev.inicio)}</li>)}</ul>}
      </div>
      <div className="lg:col-span-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vacantes del proyecto ({e.vacantes.length})</p>
        {e.vacantes.length === 0 ? <p className="text-xs font-bold text-slate-400">Sin vacantes en la cohorte.</p> : (
          <ul className="space-y-2">
            {e.vacantes.map(v => (
              <li key={v.id} className="bg-white rounded-xl border border-slate-100 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-800">{v.titulo}</span>
                  <span className="flex gap-1.5"><Etiqueta>{v.puestos} {v.puestos === 1 ? 'puesto' : 'puestos'}</Etiqueta>{v.estado && <Etiqueta tono={v.publicada ? 'emerald' : 'amber'}>{humano(v.estado)}</Etiqueta>}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{[v.salario, v.contrato, v.modalidad, v.nivel, v.experiencia && `exp. ${v.experiencia}`, v.ciudades.join(', ')].filter(Boolean).join(' · ')}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
