import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, supabaseConfigurado } from './supabase';
import { config } from './config';

export type PublicStats = Record<string, unknown> & { generated_at?: string; version?: number };

/**
 * Datos en vivo (D-02, D-13): llama a dashboard_public_stats(cohortId, grupos) y re-consulta cada N segundos.
 * En un re-fetch se conserva el dato anterior en pantalla (sin parpadeo de esqueleto).
 */
export function usePublicStats() {
  const [data, setData] = useState<PublicStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const vivo = useRef(true);

  const cargar = useCallback(async () => {
    if (/^0{8}-/.test(config.identidad.cohortId)) { setCargando(false); return; }   // plantilla sin configurar
    if (!supabase) {
      setError(supabaseConfigurado ? 'Cliente no disponible' : 'Falta VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env.local');
      setCargando(false);
      return;
    }
    setCargando(true);
    const { data: res, error: err } = await supabase.rpc('dashboard_public_stats', {
      p_cohort_id: config.identidad.cohortId,
      p_grupos: config.grupos,
    });
    if (!vivo.current) return;
    if (err) setError(err.message);
    else if (res == null) setError('La cohorte no existe o está en borrador.');
    else { setData(res as PublicStats); setError(null); }
    setCargando(false);
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
