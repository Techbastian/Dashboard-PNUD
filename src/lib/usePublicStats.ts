import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, supabaseConfigurado } from './supabase';
import { config } from './config';
import { paraFuncion, preguntasDelDashboard } from './respuestas';
import type { Pregunta } from './config';

export type PublicStats = Record<string, unknown> & { generated_at?: string; version?: number };

/** Opciones de la función v7 (A-17); `uniones` (v9, A-20) sale siempre de la config. `hasta` y `filtro` solo tienen efecto con sesión del equipo (is_admin). */
export interface OpcionesStats {
  preguntas?: Pregunta[];
  hasta?: string;
  filtro?: { bloque: string; clave: string; contiene: string[]; excluir?: boolean };
}

/** Una consulta a dashboard_public_stats. La usa el Dashboard (cada N s) y el módulo Informes (con sesión). */
export async function consultarStats(op: OpcionesStats = {}): Promise<PublicStats> {
  if (!supabase) throw new Error(supabaseConfigurado ? 'Cliente no disponible' : 'Falta VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env.local');
  const { data, error } = await supabase.rpc('dashboard_public_stats', {
    p_cohort_id: config.identidad.cohortId,
    p_grupos: config.grupos,
    p_opciones: { preguntas: (op.preguntas ?? []).map(paraFuncion), uniones: config.uniones, hasta: op.hasta, filtro: op.filtro },
  });
  if (error) throw new Error(error.message);
  if (data == null) throw new Error('La cohorte no existe o está en borrador.');
  return data as PublicStats;
}

/**
 * Datos en vivo (D-02, D-13): llama a dashboard_public_stats(cohortId, grupos, opciones) y re-consulta cada N segundos
 * (solo con la pestaña visible). Pide solo las preguntas que usan las pestañas del Dashboard.
 * En un re-fetch se conserva el dato anterior en pantalla (sin parpadeo de esqueleto).
 */
export function usePublicStats() {
  const [data, setData] = useState<PublicStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const vivo = useRef(true);

  const cargar = useCallback(async () => {
    if (/^0{8}-/.test(config.identidad.cohortId)) { setCargando(false); return; }   // plantilla sin configurar
    setCargando(true);
    try {
      const res = await consultarStats({ preguntas: preguntasDelDashboard() });
      if (!vivo.current) return;
      setData(res); setError(null);
    } catch (e) {
      if (vivo.current) setError((e as Error).message);
    }
    if (vivo.current) setCargando(false);
  }, []);

  useEffect(() => {
    vivo.current = true;
    cargar();
    const s = Math.max(15, config.identidad.refrescoSegundos ?? 60);
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') cargar(); }, s * 1000);
    return () => { vivo.current = false; window.clearInterval(id); };
  }, [cargar]);

  return { data, error, cargando, recargar: cargar };
}
