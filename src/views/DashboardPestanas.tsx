/**
 * Dashboard ejecutivo por pestañas (D-43, blueprint PNUD v3): cada pestaña de la config trae hasta 4 cifras y
 * hasta 6 gráficos; el detalle se descarga en Informes. `?imprimir=1` pinta todas las pestañas, una por página,
 * y abre el diálogo de impresión (PDF ejecutivo del módulo Informes).
 */
import { useEffect, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { config } from '../lib/config';
import type { CifraPestana, Grafico, Pestana } from '../lib/config';
import { resolver } from '../lib/ruta';
import { num } from '../lib/formato';
import {
  destaca, fueraDeFoco, pct, personasFueraDeFoco, pregunta, respuesta, type Respuesta,
} from '../lib/respuestas';
import type { PublicStats } from '../lib/usePublicStats';
import { DonutChart, ListaBarras, SinDatos, toChart } from '../ui/Comunes';
import {
  AlertaFoco, ApiladaFilas, BarrasPareadas, CifraCard, EmbudoBloques, MetaFila, TarjetaBloque, type FilaApilada,
} from '../ui/Graficos';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { BloqueHitos } from '../ui/Hitos';

type Item = { categoria: string; n: number };
const valorN = (data: PublicStats, ruta?: string) => {
  if (!ruta) return null;
  const v = resolver(data, ruta);
  return v.estado === 'ok' ? v.n : null;
};

/** Lista [{categoria, n}] SIN quitar los ceros (ruta.lista los quita). */
function listaTodo(data: unknown, ruta: string): Item[] | null {
  let x: unknown = data;
  for (const p of ruta.split('.')) { if (x == null) return null; x = (x as Record<string, unknown>)[p]; }
  if (!Array.isArray(x)) return null;
  return x.map(e => ({ categoria: String(e.categoria ?? e.estado ?? e.tipo ?? '—'), n: Number(e.n ?? e.personas ?? e.total ?? 0) }));
}
/** Con `orden`: esas categorías primero y en ese orden (aunque estén en 0); el resto después. */
function ordenar(items: Item[], orden?: string[]): Item[] {
  if (!orden?.length) return items.filter(i => i.n > 0);
  const k = (t: string) => t.toLowerCase().trim();
  const mapa = new Map(items.map(i => [k(i.categoria), i]));
  const primero = orden.map(o => ({ categoria: o, n: mapa.get(k(o))?.n ?? 0 }));
  const resto = items.filter(i => i.n > 0 && !orden.some(o => k(o) === k(i.categoria)));
  return [...primero, ...resto];
}

export function objetivoDe(data: PublicStats, nombre?: string): number | null {
  if (!nombre) return null;
  const metas = (data.metas as { nombre: string; meta: number }[] | undefined) ?? [];
  return metas.find(m => m.nombre.trim().toLowerCase() === nombre.trim().toLowerCase())?.meta ?? null;
}

/** "En {vacantes.empresas_con_vacantes} empresas" → "En 11 empresas". */
function interpolar(data: PublicStats, t?: string) {
  return t?.replace(/\{([^}]+)\}/g, (_, r: string) => { const v = valorN(data, r.trim()); return v == null ? '—' : num(v); });
}
const listaTexto = (xs: Item[]) => xs.map(x => `${x.categoria} ${num(x.n)}`).join(' · ');

function Cifra({ c, data }: { c: CifraPestana; data: PublicStats }) {
  const foco = config.foco!;
  if (c.foco === 'personas') {
    const f = personasFueraDeFoco(data);
    return <CifraCard label={c.label} valor={f?.total ?? null} alerta nota={f && (f.total ? listaTexto(f.lista) : `Todas en ${foco.nombre}`)} />;
  }
  const v = valorN(data, c.valor);
  const meta = objetivoDe(data, c.meta);
  const de = c.de ? valorN(data, c.de) : meta;
  let nota: ReactNode = interpolar(data, c.nota) ?? c.ayuda;
  if (c.de && v != null && de) nota = `${pct(v, de)}% · ${num(Math.max(0, de - v))} ${c.faltan ?? 'faltan'}`;
  if (c.foco === 'empresas' && foco.empresas) {
    const fuera = fueraDeFoco(listaTodo(data, foco.empresas));
    const n = fuera.reduce((s, x) => s + x.n, 0);
    nota = n ? `${num(n)} fuera de ${foco.nombre} (${fuera.map(x => x.categoria).join(', ')})` : `Todas en ${foco.nombre}`;
  }
  return <CifraCard label={c.label} valor={v} de={de} deTexto={c.de ? c.deLabel : undefined} barra={Boolean(c.meta)} nota={nota} />;
}

const etiqueta = (id: string) => pregunta(id)?.titulo ?? id;

function filasApilada(g: Grafico, data: PublicStats): { filas: FilaApilada[]; categorias: string[] } | null {
  const cifra = (cats: Respuesta['categorias'], campo: 'n' | 'mujeres' | 'hombres', base: number) =>
    g.destacar?.length ? pct(cats.filter(c => destaca(c.categoria, g.destacar)).reduce((s, c) => s + c[campo], 0), base) : null;
  if (g.pregunta) {
    const r = respuesta(data, g.pregunta);
    if (!r) return null;
    const categorias = r.categorias.map(c => c.categoria);
    const fila = (label: string, campo: 'n' | 'mujeres' | 'hombres', base: number): FilaApilada =>
      ({ label, segmentos: r.categorias.map(c => ({ categoria: c.categoria, n: c[campo] })), cifra: cifra(r.categorias, campo, base) });
    const filas = [fila('Total', 'n', r.respondieron)];
    if (g.porGenero) filas.push(fila('Mujeres', 'mujeres', r.respondieron_mujeres), fila('Hombres', 'hombres', r.respondieron_hombres));
    return { filas, categorias };
  }
  const rs = (g.preguntas ?? []).map(id => ({ id, r: respuesta(data, id) })).filter((x): x is { id: string; r: Respuesta } => x.r != null);
  if (rs.length === 0) return null;
  const categorias = [...new Set(rs.flatMap(x => x.r.categorias.map(c => c.categoria)))];
  return {
    categorias,
    filas: rs.map(({ id, r }) => ({ label: etiqueta(id), segmentos: r.categorias.map(c => ({ categoria: c.categoria, n: c.n })), cifra: cifra(r.categorias, 'n', r.respondieron) })),
  };
}

function GraficoCard({ g, data }: { g: Grafico; data: PublicStats }) {
  let cuerpo: ReactNode;
  if (g.tipo === 'apilada') {
    const a = filasApilada(g, data);
    cuerpo = a ? <ApiladaFilas filas={a.filas} categorias={a.categorias} paleta={g.paleta} /> : <SinDatos texto="Aún no hay respuestas" />;
  } else if (g.tipo === 'pareadas') {
    const filas = (g.preguntas ?? []).flatMap(id => {
      const r = respuesta(data, id);
      if (!r || r.respondieron === 0) return [];
      const suma = (campo: 'n' | 'mujeres' | 'hombres') => r.categorias.filter(c => destaca(c.categoria, g.destacar)).reduce((s, c) => s + c[campo], 0);
      return [{ label: etiqueta(id), t: pct(suma('n'), r.respondieron), m: pct(suma('mujeres'), r.respondieron_mujeres), h: pct(suma('hombres'), r.respondieron_hombres) }];
    }).sort((a, b) => b.t - a.t).slice(0, g.top ?? 5);
    cuerpo = <BarrasPareadas filas={filas} />;
  } else {
    let items: Item[] | null;
    let total: number | undefined;
    if (g.pregunta) {
      const r = respuesta(data, g.pregunta);
      items = r ? ordenar(r.categorias, g.orden ?? r.categorias.map(c => c.categoria)) : null;
      total = r?.respondieron;
      if (r && r.respondieron === 0) items = null;
    } else {
      items = listaTodo(data, g.datos!);
      items = items && ordenar(items, g.orden);
    }
    cuerpo = g.tipo === 'dona' ? (
      <div className="space-y-5">
        <DonutChart data={toChart(items ?? [])} />
        {g.debajo && <ListaBarras datos={ordenar(listaTodo(data, g.debajo) ?? [], (listaTodo(data, g.debajo) ?? []).map(x => x.categoria))} max={12} />}
      </div>
    ) : <ListaBarras datos={items} total={total} max={g.orden?.length ?? 12} />;
  }
  return <TarjetaBloque titulo={g.titulo} subtitulo={g.nota}>{cuerpo}</TarjetaBloque>;
}

function AvisoFoco({ data }: { data: PublicStats }) {
  const foco = config.foco;
  if (!foco) return null;
  const p = personasFueraDeFoco(data)?.total ?? 0;
  const e = foco.empresas ? fueraDeFoco(listaTodo(data, foco.empresas)).reduce((s, x) => s + x.n, 0) : 0;
  if (!p && !e) return null;
  const partes = [p ? `${num(p)} ${p === 1 ? 'persona' : 'personas'}` : null, e ? `${num(e)} ${e === 1 ? 'empresa' : 'empresas'}` : null].filter(Boolean);
  return (
    <AlertaFoco>
      <strong>{partes.join(' y ')} fuera de {foco.nombre}.</strong> No se bloquean, pero quedan fuera del foco del proyecto. Detalle en Informes.
    </AlertaFoco>
  );
}

function Metas({ data }: { data: PublicStats }) {
  const fases = [...new Set(config.metas.map(m => String(m.fase ?? 1)))];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {fases.map(f => {
        const [titulo, ...resto] = (config.fases[f] ?? `Fase ${f}`).split(' · ');
        return (
          <TarjetaBloque key={f} titulo={resto.length ? `${titulo.replace(/^Producto\s*/i, 'P')} · ${resto.join(' · ')}` : titulo}>
            <div>
              {config.metas.filter(m => String(m.fase ?? 1) === f).map(m => (
                <MetaFila key={m.meta} label={m.meta} ayuda={m.ayuda} actual={valorN(data, m.actual)} objetivo={objetivoDe(data, m.meta)} />
              ))}
            </div>
          </TarjetaBloque>
        );
      })}
    </div>
  );
}

function ContenidoPestana({ p, data }: { p: Pestana; data: PublicStats }) {
  return (
    <div className="space-y-6">
      {p.alertaFoco && <ErrorBoundary nombre="alerta"><AvisoFoco data={data} /></ErrorBoundary>}
      {p.cifras.length > 0 && (
        <ErrorBoundary nombre="cifras">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {p.cifras.map(c => <Cifra key={c.label} c={c} data={data} />)}
          </div>
        </ErrorBoundary>
      )}
      {p.hitos && config.hitos.length > 0 && <ErrorBoundary nombre="hitos"><BloqueHitos data={data} /></ErrorBoundary>}
      {p.metas && config.metas.length > 0 && <ErrorBoundary nombre="metas"><Metas data={data} /></ErrorBoundary>}
      {p.embudo && config.embudo.length > 0 && (
        <ErrorBoundary nombre="embudo">
          <TarjetaBloque titulo="Ruta de la persona" subtitulo="Cuántas personas llegan a cada etapa">
            <EmbudoBloques etapas={config.embudo.map(e => ({ etapa: e.etapa, n: valorN(data, e.valor) }))} />
          </TarjetaBloque>
        </ErrorBoundary>
      )}
      {p.graficos.length > 0 && (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${p.graficos.length % 3 === 0 ? 'xl:grid-cols-3' : ''}`}>
          {p.graficos.map(g => <ErrorBoundary key={g.titulo} nombre={g.titulo}><GraficoCard g={g} data={data} /></ErrorBoundary>)}
        </div>
      )}
      {p.pie && <p className="text-[11px] font-bold text-slate-400 px-1">{p.pie}</p>}
    </div>
  );
}

export default function DashboardPestanas({ data }: { data: PublicStats }) {
  const [params, setParams] = useSearchParams();
  const imprimir = params.get('imprimir') === '1';
  const activa = config.pestanas.find(p => p.id === params.get('p')) ?? config.pestanas[0];

  useEffect(() => {
    if (!imprimir) return;
    const t = window.setTimeout(() => window.print(), 600);
    return () => window.clearTimeout(t);
  }, [imprimir]);

  if (imprimir) {
    return (
      <div className="space-y-10">
        {config.pestanas.map((p, i) => (
          <section key={p.id} style={i > 0 ? { breakBefore: 'page' } : undefined} className="space-y-4">
            <h3 className="text-lg font-black text-slate-800">{p.titulo}</h3>
            <ContenidoPestana p={p} data={data} />
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Pestañas del Dashboard" className="inline-flex flex-wrap gap-1 p-1 rounded-2xl bg-slate-100 no-print">
        {config.pestanas.map(p => (
          <button key={p.id} type="button" role="tab" aria-selected={p.id === activa.id}
            onClick={() => setParams(p.id === config.pestanas[0].id ? {} : { p: p.id }, { replace: true })}
            className={`px-5 py-2 rounded-xl text-[13px] font-bold transition-colors ${
              p.id === activa.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            {p.titulo}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={activa.titulo}><ContenidoPestana p={activa} data={data} /></div>
    </div>
  );
}
