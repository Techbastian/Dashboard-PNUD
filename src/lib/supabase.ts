import { createClient } from '@supabase/supabase-js';

// Solo anon key en el navegador (D-05, D-09). La vista pública lee una RPC SECURITY DEFINER que devuelve agregados.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigurado = Boolean(url && key);
export const supabase = supabaseConfigurado ? createClient(url!, key!, { auth: { persistSession: false } }) : null;
