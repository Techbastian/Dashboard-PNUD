/**
 * Sesión del equipo de Disruptia (E2, D-32). Patrón de FQSD (`AuthContext.tsx`):
 * magic-link sobre el mismo cliente anon; `esAdmin` sale de la función compartida `is_admin()`
 * (correo del JWT activo en `admin_whitelist`). Lo privado se abre solo con `esAdmin`.
 *
 * ⚠️ Proyecto Supabase compartido: el enlace del correo solo vuelve a este dashboard si su dirección
 * está en Authentication → URL Configuration → Redirect URLs. Si no, Supabase lo ignora en silencio
 * y deja la sesión en el Site URL (app.disruptia.co). Nunca cambiar el Site URL.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthValor {
  session: Session | null;
  correo: string | null;
  esAdmin: boolean;
  cargando: boolean;
  enviarEnlace: (correo: string) => Promise<{ error: string | null }>;
  salir: () => Promise<void>;
}

const Ctx = createContext<AuthValor | null>(null);

function urlRetorno(): string {
  return new URL(import.meta.env.BASE_URL || '/', window.location.origin).toString();
}

function traducir(msg: string): string {
  if (/signups? not allowed|user not found/i.test(msg)) return 'Ese correo no tiene cuenta en la plataforma. Pide que lo den de alta en el equipo.';
  if (/rate limit|too many|security purposes/i.test(msg)) return 'Demasiados intentos seguidos. Espera un minuto y vuelve a intentar.';
  if (/invalid.*email/i.test(msg)) return 'Ese correo no es válido.';
  return msg;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [esAdmin, setEsAdmin] = useState(false);
  const [cargando, setCargando] = useState(Boolean(supabase));

  const verificar = useCallback(async (s: Session | null) => {
    if (!s || !supabase) { setEsAdmin(false); return; }
    const { data, error } = await supabase.rpc('is_admin');
    setEsAdmin(!error && data === true);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let vivo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!vivo) return;
      setSession(data.session);
      verificar(data.session).finally(() => { if (vivo) setCargando(false); });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!vivo) return;
      setSession(s);
      verificar(s);
      // Limpia el #access_token=… que deja el enlace del correo.
      if (window.location.hash.includes('access_token')) history.replaceState(null, '', window.location.pathname + window.location.search);
    });
    return () => { vivo = false; sub.subscription.unsubscribe(); };
  }, [verificar]);

  const enviarEnlace = useCallback(async (correo: string) => {
    if (!supabase) return { error: 'Falta la configuración de Supabase.' };
    const { error } = await supabase.auth.signInWithOtp({
      email: correo.trim().toLowerCase(),
      // shouldCreateUser: false → este dashboard nunca crea usuarios en el proyecto compartido.
      options: { emailRedirectTo: urlRetorno(), shouldCreateUser: false },
    });
    return { error: error ? traducir(error.message) : null };
  }, []);

  const salir = useCallback(async () => {
    await supabase?.auth.signOut();
    setSession(null);
    setEsAdmin(false);
  }, []);

  return (
    <Ctx.Provider value={{ session, correo: session?.user.email ?? null, esAdmin, cargando, enviarEnlace, salir }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthValor {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fuera de <AuthProvider>');
  return v;
}
