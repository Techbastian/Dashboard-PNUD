/**
 * Dashboard público (sin sesión, sin PII) con la estructura y el aspecto de FQSD (D-35):
 * barra de frescura → metas → KPIs → registros por día → embudo → distribuciones.
 * Todo lo que se pinta sale de config/dashboard.config.md + dashboard_public_stats en vivo.
 */
import { Fragment, useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { Loader2, RefreshCw, AlertCircle, FlaskConical } from 'lucide-react';
import { config } from '../lib/config';
import { lista, resolver, type Valor } from '../lib/ruta';
import { num, humano } from '../lib/formato';
import { usePublicStats, type PublicStats } from '../lib/usePublicStats';
import {
  AreaChart, DistCard, DonutChart, KPICard, ListaBarras, Tarjeta, rellenarDias, toChart, type SeriePunto,
} from '../ui/Comunes';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import type { Distribucion } from '../lib/config';

const id = config.identidad;

/** Colores de los KPI en el orden de FQSD; el primero es la marca del aliado. `color` en la config lo fija. */
const KPI_COLORES = ['text-brand', 'text-emerald-600', 'text-qsd-purple', 'text-qsd-teal', 'text-qsd-pink', 'text-qsd-orange'];
const KPI_POR_NOMBRE: Record<string, string> = {
  brand: 'text-brand', emerald: 'text-emerald-600', purple: 'text-qsd-purple', teal: 'text-qsd-teal',
  pink: 'text-qsd-pink', orange: 'text-qsd-orange', slate: 'text-slate-800',
};
const KPI_GRID: Record<number, string> = {
  1: 'xl:grid-cols-1', 2: 'xl:grid-cols-2', 3: 'xl:grid-cols-3', 4: 'xl:grid-cols-4', 5: 'xl:grid-cols-5', 6: 'xl:grid-cols-6',
};

const n = (v: Valor) => (v.estado === 'ok' ? v.n : null);
const capital = (t: string) => { const s = t.replace(/_/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); };

function fechaRelativa(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} días`;
}
function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' });
}

/** Barra de frescura (FQSD `BarraSnapshot`): acá los datos son en vivo, así que dice cuándo se consultaron. */
function BarraEnVivo({ generatedAt, error, cargando, onActualizar }: { generatedAt?: string; error: string | null; cargando: boolean; onActualizar: () => void }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => tick(x => x + 1), 30_000); return () => window.clearInterval(t); }, []);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 no-print">
      <div className="flex items-center gap-2 min-w-0 text-[11px] font-bold text-slate-400">
        <span className={`size-2 rounded-full shrink-0 ${error ? 'bg-red-500' : 'bg-emerald-500'}`} aria-hidden />
        {error
          ? <span className="text-red-600">Sin conexión con la base · se muestra la última consulta</span>
          : generatedAt
            ? <span>En vivo · consultado {fechaRelativa(generatedAt)}<span className="text-slate-300 hidden sm:inline"> · {fechaLarga(generatedAt)}</span></span>
            : <span>Conectando…</span>}
      </div>
      <button type="button" onClick={onActualizar} disabled={cargando}
        className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-brand hover:opacity-80 disabled:text-slate-300 disabled:cursor-wait transition-colors">
        {cargando ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        {cargando ? 'Actualizando…' : 'Actualizar ahora'}
      </button>
    </div>
  );
}

/** Meta del convenio (FQSD `MetaCard`): actual / objetivo, barra, "Cumplida" o "Sin fuente aún". */
function MetaCard({ label, actual, objetivo, ayuda }: { label: string; actual: Valor; objetivo: number | null; ayuda?: string }) {
  const pendiente = actual.estado !== 'ok';
  const v = n(actual) ?? 0;
  const cumplimiento = objetivo && objetivo > 0 ? v / objetivo : 0;
  const cumplida = !pendiente && objetivo != null && v >= objetivo;
  const barColor = pendiente ? 'bg-slate-200' : cumplida ? 'bg-emerald-500' : 'bg-brand';
  return (
    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-3" title={ayuda}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-black text-slate-800">{label}</h4>
          {ayuda && <p className="text-[10px] text-slate-400 font-bold mt-0.5">{ayuda}</p>}
        </div>
        {pendiente ? (
          <span className="shrink-0 text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Pendiente</span>
        ) : cumplida ? (
          <span className="shrink-0 text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Cumplida</span>
        ) : null}
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-3xl font-black tnum ${cumplida ? 'text-emerald-600' : pendiente ? 'text-slate-400' : 'text-slate-800'}`}>{pendiente ? '—' : num(v)}</span>
        {objetivo != null && <span className="text-sm font-bold text-slate-400 mb-1">/ {num(objetivo)}</span>}
      </div>
      <div className="relative w-full bg-gray-200/70 h-2 rounded-full overflow-hidden" role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={objetivo ?? 0}>
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(100, cumplimiento * 100)}%` }} />
      </div>
      <div className="flex items-center justify-between text-[10px] font-bold">
        <span className="text-slate-400">{pendiente ? 'Sin fuente aún' : objetivo == null ? 'Sin objetivo en la base (cohort_goals)' : ''}</span>
        {!pendiente && objetivo != null && (
          <span className={cumplida ? 'text-emerald-600' : 'text-brand'}>{Math.round(cumplimiento * 100)}% de la meta</span>
        )}
      </div>
    </div>
  );
}

/** Registros por día (FQSD `RegistrosCard`): área con filtro por mes. */
function RegistrosCard({ serie }: { serie: SeriePunto[] }) {
  const [mes, setMes] = useState('todo');
  const completa = useMemo(() => rellenarDias(serie), [serie]);
  const meses = useMemo(() => {
    const M = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return [...new Set(completa.map(p => p.fecha.slice(0, 7)))].map(k => ({ key: k, label: M[Number(k.slice(5, 7)) - 1] }));
  }, [completa]);
  const vista = mes === 'todo' ? completa : completa.filter(p => p.fecha.startsWith(mes));
  const chips = meses.length > 1 ? [{ key: 'todo', label: 'Todo' }, ...meses] : [];
  return (
    <Tarjeta id="registros" titulo="Registros por día" descripcion="Personas que se registraron cada día" cuerpo="px-6 sm:px-8 pt-5 pb-6"
      extra={chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map(c => (
            <button key={c.key} type="button" onClick={() => setMes(c.key)} aria-pressed={mes === c.key}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${
                mes === c.key ? 'bg-brand text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
              {c.label}
            </button>
          ))}
        </div>
      )}>
      <AreaChart data={vista} etiquetaValor="registros" />
    </Tarjeta>
  );
}

/** Embudo (FQSD): tabla con etapa, cantidad, conversión frente a la etapa anterior y barra frente a la primera. */
function EmbudoCard({ etapas }: { etapas: { etapa: string; valor: Valor }[] }) {
  const base = etapas.map(e => n(e.valor)).find(v => v != null) ?? 0;
  return (
    <Tarjeta id="embudo" titulo="Ruta de la persona" descripcion="Cuántas personas han llegado a cada etapa del proceso · conversión frente a la etapa anterior" cuerpo="">
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[560px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 sm:px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fase</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Etapa</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cantidad</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">% Conversión</th>
              <th className="px-4 sm:px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-48">Visual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {etapas.map((e, i) => {
              const v = n(e.valor);
              const prev = etapas.slice(0, i).map(x => n(x.valor)).filter((x): x is number => x != null).pop();
              const conv = v == null ? '—' : i === 0 ? '100%' : prev && prev > 0 ? `${Math.round((v / prev) * 100)}%` : '—';
              const barW = v != null && base > 0 ? Math.min(100, Math.round((v / base) * 100)) : 0;
              return (
                <tr key={e.etapa} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 sm:px-8 py-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-brand/10 text-brand whitespace-nowrap">Etapa {i + 1}</span>
                  </td>
                  <td className="px-4 py-4 text-xs font-bold text-slate-700">{e.etapa}</td>
                  <td className="px-4 py-4 text-sm font-black text-slate-900 tnum">{v == null ? <span className="text-[11px] font-bold text-slate-400">Sin fuente aún</span> : num(v)}</td>
                  <td className="px-4 py-4 text-xs font-black text-emerald-600 tnum">{conv}</td>
                  <td className="px-4 sm:px-6 py-4">
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-brand h-full rounded-full transition-all duration-500" style={{ width: `${barW}%` }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  );
}

function Encabezado({ titulo, descripcion }: { titulo: string; descripcion?: ReactNode }) {
  return (
    <div className="px-1">
      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{titulo}</h3>
      {descripcion && <p className="text-[11px] text-slate-400 font-bold mt-1">{descripcion}</p>}
    </div>
  );
}

function Distribuciones({ data, items }: { data: PublicStats; items: Distribucion[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {items.map(d => {
        const datos = lista(data, d.datos);
        return (
          <Fragment key={d.titulo}>
            <DistCard title={d.titulo} subtitle={d.nota}>
              {d.grafico === 'dona' ? <DonutChart data={toChart(datos ?? [])} /> : <ListaBarras datos={datos} />}
            </DistCard>
          </Fragment>
        );
      })}
    </div>
  );
}

export default function DashboardView() {
  const { data, error, cargando, recargar } = usePublicStats();
  const sinConfigurar = /^0{8}-/.test(id.cohortId);

  if (sinConfigurar) {
    return (
      <div className="glass-card p-8 border-l-4 border-amber-400 space-y-2">
        <p className="text-sm font-black text-amber-600 uppercase tracking-widest">Dashboard sin configurar</p>
        <p className="text-xs text-slate-500">Completa <code>identidad.cohortId</code> en <code>config/dashboard.config.md</code> o crea el proyecto con <code>npm run nuevo</code>.</p>
      </div>
    );
  }
  if (!data && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-400">
        <Loader2 size={32} className="animate-spin text-brand" />
        <p className="text-sm font-bold uppercase tracking-widest">Cargando datos en vivo…</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="glass-card p-8 border-l-4 border-red-400">
        <p className="text-sm font-black text-red-600 uppercase tracking-widest mb-2">Error de conexión</p>
        <p className="text-xs text-slate-500">{error}</p>
      </div>
    );
  }

  const metasBase = (data.metas as { nombre: string; meta: number }[] | undefined) ?? [];
  const objetivo = (nombre: string) => metasBase.find(m => m.nombre.trim().toLowerCase() === nombre.trim().toLowerCase())?.meta ?? null;
  const fases = [...new Set(config.metas.map(m => String(m.fase ?? 1)))];
  const emp = (data.empresas ?? {}) as { aliadas?: number };
  const vac = (data.vacantes ?? {}) as { total?: number; cargos?: number; empresas_con_vacantes?: number };
  const serie = (data.registros_por_dia as SeriePunto[] | undefined) ?? [];
  const estados = lista(data, 'postulaciones.por_estado')?.map(d => ({ ...d, categoria: humano(d.categoria) })) ?? null;
  const formularios = lista(data, 'formularios')?.map(d => ({ ...d, categoria: capital(d.categoria.replace(/-/g, ' ')) })) ?? null;

  const secciones: Record<string, () => ReactElement | null> = {
    metas: () => config.metas.length === 0 ? null : (
      <Tarjeta id="metas" titulo="Metas del proyecto" descripcion="Avance en vivo frente a las metas del convenio">
        <div className="space-y-8">
          {fases.map(f => (
            <div key={f} className="space-y-4">
              {fases.length > 1 && (
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {config.fases[f] ?? `Fase ${f}`}
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {config.metas.filter(m => String(m.fase ?? 1) === f).map(m => (
                  <Fragment key={m.meta}><MetaCard label={m.meta} actual={resolver(data, m.actual)} objetivo={objetivo(m.meta)} ayuda={m.ayuda} /></Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Tarjeta>
    ),
    cifras: () => config.cifras.length === 0 ? null : (
      <div id="cifras" className={`grid grid-cols-2 md:grid-cols-3 ${KPI_GRID[Math.min(6, config.cifras.length)]} gap-5`}>
        {config.cifras.map((c, i) => {
          const v = n(resolver(data, c.valor));
          return (
            <Fragment key={c.label}>
              <KPICard label={c.label} value={v == null ? null : num(v)} subtext={c.ayuda} title={c.ayuda}
                color={(c.color && KPI_POR_NOMBRE[c.color]) || KPI_COLORES[i % KPI_COLORES.length]} destacado={i === 0} />
            </Fragment>
          );
        })}
      </div>
    ),
    registros: () => serie.length === 0 ? null : <RegistrosCard serie={serie} />,
    embudo: () => config.embudo.length === 0 ? null : (
      <EmbudoCard etapas={config.embudo.map(e => ({ etapa: e.etapa, valor: resolver(data, e.valor) }))} />
    ),
    empresas: () => (
      <div id="empresas" className="space-y-4">
        <Encabezado titulo="Empresas conectadas" descripcion={`${num(emp.aliadas ?? 0)} empresas vinculadas al proyecto`} />
        <Distribuciones data={data} items={config.distribuciones.empresas ?? []} />
      </div>
    ),
    vacantes: () => (
      <div id="vacantes" className="space-y-4">
        <Encabezado titulo="Vacantes del proyecto" descripcion={`${num(vac.total ?? 0)} vacantes en ${num(vac.cargos ?? 0)} cargos de ${num(vac.empresas_con_vacantes ?? 0)} empresas`} />
        <Distribuciones data={data} items={config.distribuciones.vacantes ?? []} />
      </div>
    ),
    estados: () => (
      <div id="estados" className="space-y-4">
        <Encabezado titulo="Personas" descripcion="Estado de las postulaciones y formularios diligenciados" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <DistCard title="Estado de la postulación"><ListaBarras datos={estados} /></DistCard>
          <DistCard title="Formularios diligenciados" subtitle="Personas que respondieron cada formulario"><ListaBarras datos={formularios} /></DistCard>
          {(config.distribuciones.personas ?? []).map(d => (
            <Fragment key={d.titulo}>
              <DistCard title={d.titulo} subtitle={d.nota}>
                {d.grafico === 'dona' ? <DonutChart data={toChart(lista(data, d.datos) ?? [])} /> : <ListaBarras datos={lista(data, d.datos)} />}
              </DistCard>
            </Fragment>
          ))}
        </div>
      </div>
    ),
  };
  // Compatibilidad con configs v2: "personas" = registros por día + estados.
  const orden = config.secciones.flatMap(s => (s === 'personas' ? ['registros', 'estados'] : [s]));

  return (
    <div className={`space-y-8 transition-opacity ${cargando ? 'opacity-80' : ''}`}>
      <BarraEnVivo generatedAt={data.generated_at} error={error} cargando={cargando} onActualizar={recargar} />

      {id.datosDePrueba && (
        <div className="glass-card px-6 py-4 border-l-4 border-amber-400 flex items-start gap-3" role="note">
          <FlaskConical size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-slate-600">
            Esta versión incluye <span className="font-black text-amber-600">datos de prueba</span> para visualizar el dashboard.
            <span className="text-slate-400"> No usar las cifras de personas para reportes.</span>
          </p>
        </div>
      )}

      {orden.map(s => {
        const render = secciones[s];
        if (!render) return null;
        return <ErrorBoundary key={s} nombre={s}>{render()}</ErrorBoundary>;
      })}

      {error && (
        <p className="flex items-center gap-2 text-[11px] font-bold text-red-600"><AlertCircle size={13} /> {error}</p>
      )}
    </div>
  );
}
