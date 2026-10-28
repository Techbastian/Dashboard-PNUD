/**
 * Informes (E8, D-43): solo equipo. Descarga el detalle que no está en el Dashboard.
 *   · Excel = una hoja por tema y una tabla por pregunta (conteos), armado desde dashboard_public_stats con las
 *     preguntas de las hojas elegidas, en tandas (D-72). Corte y filtro territorial: la función solo los aplica con
 *     sesión del equipo (A-17).
 *   · Opcional (D-72): junto a cada hoja de formulario, una hoja «· personas» con las respuestas de cada persona y el
 *     enlace a su hoja de vida (datos personales, de la capa privada).
 *   · PDF ejecutivo = las pestañas del Dashboard, una por página (diálogo de impresión del navegador).
 */
import { useState } from 'react';
import { Download, FileText, Loader2, Eye } from 'lucide-react';
import { config } from '../lib/config';
import { consultarStatsEnTandas, type OpcionesStats } from '../lib/usePublicStats';
import { armarInforme, type Alcance } from '../lib/informe';
import { descargarHojas, type HojaLibre } from '../lib/excel';
import { useCohorte } from '../lib/datos';
import { Aviso } from '../ui/Privado';

const MAX_PREVIA = 200;
const slug = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function InformesView() {
  const foco = config.foco;
  const pFoco = foco?.personas ? config.preguntas.find(p => p.id === foco.personas) : undefined;
  const [corte, setCorte] = useState('');
  const [alcance, setAlcance] = useState<Alcance>('todos');
  const [genero, setGenero] = useState(true);
  const [conPersonas, setConPersonas] = useState(false);
  const cohorte = useCohorte();
  const [hojas, setHojas] = useState<string[]>(() => config.informe.hojas.map(h => h.nombre));
  const [trabajando, setTrabajando] = useState<'excel' | 'previa' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [previa, setPrevia] = useState<HojaLibre[] | null>(null);
  const [verHoja, setVerHoja] = useState(0);

  const textoAlcance = alcance === 'todos' ? 'Todas las personas registradas'
    : alcance === 'foco' ? `Solo ${foco?.nombre}` : `Solo fuera de ${foco?.nombre}`;

  async function generar(): Promise<HojaLibre[]> {
    if (conPersonas && !cohorte.datos) {
      throw new Error(cohorte.error ? `No se pudieron cargar los datos de las personas: ${cohorte.error}`
        : 'Los datos de las personas aún se están cargando. Intenta de nuevo en unos segundos.');
    }
    // Solo las preguntas de las hojas elegidas (y la del foco, que usa la hoja de alertas).
    const grupos = new Set(config.informe.hojas.filter(h => hojas.includes(h.nombre)).map(h => h.preguntas).filter(Boolean));
    const preguntas = config.preguntas.filter(p => grupos.has(p.grupo) || p.id === pFoco?.id);
    const op: OpcionesStats = { preguntas, hasta: corte || undefined };
    if (alcance !== 'todos' && foco && pFoco?.clave) {
      op.filtro = { bloque: pFoco.bloque, clave: pFoco.clave, contiene: foco.coincide, excluir: alcance === 'fuera' };
    }
    const stats = await consultarStatsEnTandas(op);
    if (stats.equipo !== true && (op.hasta || op.filtro)) {
      throw new Error('La base no reconoció tu sesión del equipo: el corte y el filtro no se aplicaron. Vuelve a entrar con «Acceso equipo».');
    }
    return armarInforme(stats, {
      genero, corte: corte || null, alcance: textoAlcance, hojas, foco: alcance,
      personas: conPersonas ? cohorte.datos : null,
    });
  }

  async function correr(tipo: 'excel' | 'previa') {
    setTrabajando(tipo); setErr(null);
    try {
      const h = await generar();
      if (tipo === 'excel') {
        const hoy = new Date().toISOString().slice(0, 10);
        await descargarHojas(`informe-${slug(config.identidad.nombre)}-${corte || hoy}.xlsx`, h);
      }
      setPrevia(h); setVerHoja(v => Math.min(v, h.length - 1));
    } catch (e) { setErr((e as Error).message); }
    setTrabajando(null);
  }

  const campo = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/30';
  const etiqueta = 'block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] gap-6 items-start">
      <div className="glass-card p-6 space-y-5">
        <div>
          <h3 className="text-sm font-black text-slate-800">Generar informe</h3>
          <p className="text-[11px] font-bold text-slate-400 mt-0.5">Conteos por pregunta. Las respuestas de cada persona son opcionales (abajo).</p>
        </div>
        <label className="block">
          <span className={etiqueta}>Fecha de corte (registro)</span>
          <input type="date" value={corte} onChange={e => setCorte(e.target.value)} className={campo} />
        </label>
        {foco && pFoco && (
          <label className="block">
            <span className={etiqueta}>Personas</span>
            <select value={alcance} onChange={e => setAlcance(e.target.value as Alcance)} className={campo}>
              <option value="todos">Todas (el foco y fuera de él)</option>
              <option value="foco">Solo {foco.nombre}</option>
              <option value="fuera">Solo fuera de {foco.nombre}</option>
            </select>
          </label>
        )}
        <label className="flex items-center gap-2.5 text-sm font-bold text-slate-700">
          <input type="checkbox" checked={genero} onChange={e => setGenero(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
          Desagregar por género (mujeres / hombres)
        </label>
        <label className="flex items-start gap-2.5 text-sm font-bold text-slate-700">
          <input type="checkbox" checked={conPersonas} onChange={e => setConPersonas(e.target.checked)} className="size-4 mt-0.5 accent-[var(--color-brand)]" />
          <span>
            Incluir las respuestas de cada persona y el enlace a su hoja de vida
            <span className="block text-[11px] font-medium text-slate-400">
              Agrega una hoja «· personas» junto a cada formulario elegido. Lleva datos personales: compártelo solo con quien lo necesite.
              {conPersonas && !cohorte.datos && !cohorte.error && ' Cargando personas…'}
            </span>
          </span>
        </label>
        <fieldset>
          <legend className={etiqueta}>Hojas del informe</legend>
          <div className="divide-y divide-slate-100">
            {config.informe.hojas.map(h => (
              <label key={h.nombre} className="flex items-start gap-2.5 py-2.5">
                <input type="checkbox" className="size-4 mt-0.5 accent-[var(--color-brand)]" checked={hojas.includes(h.nombre)}
                  onChange={e => setHojas(x => (e.target.checked ? [...x, h.nombre] : x.filter(y => y !== h.nombre)))} />
                <span>
                  <span className="block text-[13px] font-bold text-slate-700">{h.nombre}</span>
                  {h.descripcion && <span className="block text-[11px] font-medium text-slate-400">{h.descripcion}</span>}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {err && <Aviso tono="red">{err}</Aviso>}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => correr('excel')} disabled={trabajando != null || hojas.length === 0}
            className="flex items-center gap-2 bg-brand text-white rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest disabled:opacity-50">
            {trabajando === 'excel' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Descargar Excel
          </button>
          <button type="button" onClick={() => correr('previa')} disabled={trabajando != null || hojas.length === 0}
            className="flex items-center gap-2 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest disabled:opacity-50">
            {trabajando === 'previa' ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />} Vista previa
          </button>
          {config.pestanas.length > 0 && (
            <button type="button" onClick={() => window.open('/?imprimir=1', '_blank', 'noopener')}
              className="flex items-center gap-2 border border-brand/40 text-brand rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest">
              <FileText size={14} /> PDF ejecutivo
            </button>
          )}
        </div>
        <p className="text-[11px] font-bold text-slate-400">Excel = detalle, una tabla por pregunta. PDF = las pestañas del Dashboard, una por página (elige «Guardar como PDF»).</p>
      </div>

      <div className="glass-card p-6 min-w-0 space-y-4">
        {!previa ? (
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center py-16">La vista previa aparece aquí</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1">
              {previa.map((h, i) => (
                <button key={h.nombre} type="button" onClick={() => setVerHoja(i)} aria-pressed={i === verHoja}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${i === verHoja ? 'bg-brand text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{h.nombre}</button>
              ))}
            </div>
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="w-full text-[12px]">
                <tbody>
                  {previa[verHoja].filas.slice(0, MAX_PREVIA).map((f, i) => {
                    const titulo = f.length === 1 && i > 0 && previa[verHoja].filas[i + 1]?.length === 1;
                    const cab = f[0] === 'Categoría' || f[0] === 'Producto' || (i === 0 && previa[verHoja].enlaces != null);
                    return (
                      <tr key={i} className={cab ? 'border-b border-slate-200' : ''}>
                        {f.length === 0 ? <td className="py-2" /> : f.map((c, j) => (
                          <td key={j} colSpan={f.length === 1 ? 7 : 1}
                            className={`px-2 py-1 align-top ${j > 0 ? 'text-right tnum' : ''} ${cab ? 'font-black text-slate-400 uppercase text-[10px] tracking-wider' : ''} ${
                              f.length === 1 ? (titulo || i === 0 ? 'font-black text-slate-800 text-[13px] pt-3' : 'text-slate-400 font-bold') : 'text-slate-700 font-mono'}`}>
                            {c ?? ''}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {previa[verHoja].filas.length > MAX_PREVIA && (
              <p className="text-[11px] font-bold text-slate-400">Vista previa de las primeras {MAX_PREVIA} filas de {previa[verHoja].filas.length}; el Excel las lleva todas.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
