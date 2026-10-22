/**
 * Listados (E7, patrón de FQSD `ExportarView`): arma un listado con filtros combinables y lo descarga en Excel.
 * Los filtros salen de la config (etapas de la ruta, D-37; marcas de Participantes, D-44) y de los datos
 * (estado de la postulación, fecha de registro).
 */
import { useMemo, useState } from 'react';
import { Download, Loader2, Users, Building2 } from 'lucide-react';
import { useCohorte } from '../lib/datos';
import { etapasConRegla } from '../lib/etapas';
import { humano, num } from '../lib/formato';
import { descargarXlsx, hoja } from '../lib/excel';
import { config } from '../lib/config';
import { BarraDatos, Cargando, ErrorDatos, Pestanas, Aviso } from '../ui/Privado';
import { filasPersonas, columnasPersonas } from './ParticipantesView';

type Cond = 'cualquiera' | 'si' | 'no';
const slug = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function ListadosView() {
  const { datos, error } = useCohorte();
  const [tipo, setTipo] = useState<'personas' | 'empresas'>('personas');
  const etapas = etapasConRegla();
  const marcas = config.participantes.marcas;
  const [conds, setConds] = useState<Cond[]>(() => etapas.map(() => 'cualquiera'));
  const [condsM, setCondsM] = useState<Cond[]>(() => marcas.map(() => 'cualquiera'));
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [estados, setEstados] = useState<string[]>([]);
  const [bajando, setBajando] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const filas = useMemo(() => (datos ? filasPersonas(datos) : []), [datos]);

  if (error && !datos) return <ErrorDatos error={error} />;
  if (!datos) return <Cargando />;

  const todosEstados = [...new Set(datos.personas.map(p => p.estado ?? 'sin_estado'))];
  const cumple = (c: Cond, v: boolean | null) => c === 'cualquiera' || (c === 'si' ? v === true : v === false);
  const elegidas = filas.filter(f => conds.every((c, i) => cumple(c, f.r[i])) && condsM.every((c, i) => cumple(c, f.m[i]))
    && (!desde || (f.dia != null && f.dia >= desde)) && (!hasta || (f.dia != null && f.dia <= hasta))
    && (estados.length === 0 || estados.includes(f.p.estado ?? 'sin_estado')));
  const hoy = new Date().toISOString().slice(0, 10);
  const base = slug(config.identidad.nombre);

  async function bajar() {
    setBajando(true); setErr(null);
    try {
      if (tipo === 'personas') {
        await descargarXlsx(`${base}-personas-${hoy}.xlsx`, [hoja({
          nombre: 'Personas', filas: elegidas, columnas: columnasPersonas(datos!),
        })]);
      } else {
        const vac = datos!.empresas.flatMap(e => e.vacantes.map(v => ({ e, v })));
        await descargarXlsx(`${base}-empresas-${hoy}.xlsx`, [
          hoja({ nombre: 'Empresas', filas: datos!.empresas, columnas: [
            { titulo: 'Empresa', valor: e => e.nombre }, { titulo: 'Razón social', valor: e => e.razonSocial }, { titulo: 'NIT', valor: e => e.nit },
            { titulo: 'Tamaño', valor: e => e.tamano }, { titulo: 'Sector', valor: e => e.sector }, { titulo: 'Municipios', valor: e => e.municipios.join(', ') },
            { titulo: 'Contacto', valor: e => e.contacto.nombre }, { titulo: 'Teléfono', valor: e => e.contacto.telefono }, { titulo: 'Correo', valor: e => e.contacto.correo },
            { titulo: 'Vacantes', valor: e => e.vacantes.length }, { titulo: 'Puestos', valor: e => e.vacantes.reduce((s, v) => s + v.puestos, 0) },
          ] }),
          hoja({ nombre: 'Vacantes', filas: vac, columnas: [
            { titulo: 'Empresa', valor: x => x.e.nombre }, { titulo: 'Cargo', valor: x => x.v.titulo }, { titulo: 'Puestos', valor: x => x.v.puestos },
            { titulo: 'Salario', valor: x => x.v.salario }, { titulo: 'Contrato', valor: x => x.v.contrato }, { titulo: 'Modalidad', valor: x => x.v.modalidad },
            { titulo: 'Nivel educativo', valor: x => x.v.nivel }, { titulo: 'Experiencia', valor: x => x.v.experiencia }, { titulo: 'Estado', valor: x => humano(x.v.estado) },
          ] }),
        ]);
      }
    } catch (e) { setErr((e as Error).message); }
    setBajando(false);
  }

  return (
    <div className="space-y-6">
      <BarraDatos />
      <div className="flex gap-3">
        {([['personas', Users, 'Personas', datos.personas.length], ['empresas', Building2, 'Empresas y vacantes', datos.empresas.length]] as const).map(([k, I, l, n]) => (
          <button key={k} type="button" onClick={() => setTipo(k)} aria-pressed={tipo === k}
            className={`flex-1 glass-card p-5 flex items-center gap-3 text-left transition-all ${tipo === k ? 'ring-2 ring-brand/30 border-brand/30' : 'hover:shadow-md'}`}>
            <I size={22} className={tipo === k ? 'text-brand' : 'text-slate-300'} />
            <span><span className="block text-sm font-black text-slate-800">{l}</span><span className="block text-[11px] font-bold text-slate-400">{num(n)} en total</span></span>
          </button>
        ))}
      </div>

      {tipo === 'personas' && (
        <div className="glass-card p-6 space-y-5">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Etapas de la ruta</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {etapas.map((e, i) => (
                <div key={e.etapa} className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                  <span className="text-xs font-bold text-slate-700">{e.etapa}</span>
                  <Pestanas activa={conds[i]} onCambio={v => setConds(c => c.map((x, j) => (j === i ? v : x)))}
                    opciones={[{ key: 'cualquiera', label: 'Todas' }, { key: 'si', label: 'Sí' }, { key: 'no', label: 'No' }]} />
                </div>
              ))}
              {marcas.map((m, i) => (
                <div key={m.titulo} className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                  <span className="text-xs font-bold text-slate-700">{m.titulo}</span>
                  <Pestanas activa={condsM[i]} onCambio={v => setCondsM(c => c.map((x, j) => (j === i ? v : x)))}
                    opciones={[{ key: 'cualquiera', label: 'Todas' }, { key: 'si', label: 'Sí' }, { key: 'no', label: 'No' }]} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Fecha de registro</p>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-500">
              <label className="flex items-center gap-2">Desde
                <input type="date" value={desde} max={hasta || undefined} onChange={e => setDesde(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600" />
              </label>
              <label className="flex items-center gap-2">Hasta
                <input type="date" value={hasta} min={desde || undefined} onChange={e => setHasta(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600" />
              </label>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Estado de la postulación</p>
            <div className="flex flex-wrap gap-2">
              {todosEstados.map(s => {
                const on = estados.includes(s);
                return <button key={s} type="button" aria-pressed={on} onClick={() => setEstados(x => (on ? x.filter(y => y !== s) : [...x, s]))}
                  className={`px-3.5 py-2 rounded-full border text-[11px] font-black ${on ? 'bg-brand border-brand text-white' : 'bg-white border-slate-200 text-slate-600'}`}>{humano(s)}</button>;
              })}
            </div>
          </div>
        </div>
      )}

      {err && <Aviso tono="red">{err}</Aviso>}
      <div className="glass-card p-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm font-bold text-slate-600">
          {tipo === 'personas' ? <><span className="text-2xl font-black text-brand tnum">{num(elegidas.length)}</span> personas en el listado</>
            : <><span className="text-2xl font-black text-brand tnum">{num(datos.empresas.length)}</span> empresas y {num(datos.empresas.reduce((s, e) => s + e.vacantes.length, 0))} vacantes</>}
          <span className="block text-[11px] text-slate-400">El archivo lleva datos personales: compártelo solo con quien lo necesite.</span>
        </p>
        <button type="button" onClick={bajar} disabled={bajando || (tipo === 'personas' && elegidas.length === 0)}
          className="flex items-center gap-2 bg-brand text-white rounded-xl px-5 py-3 text-[10px] font-black uppercase tracking-widest disabled:opacity-50">
          {bajando ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Descargar Excel
        </button>
      </div>
    </div>
  );
}
