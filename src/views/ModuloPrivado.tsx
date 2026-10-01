/**
 * Puerta de cada módulo privado (D-32): sin sesión del equipo muestra el candado; con sesión pero sin permiso
 * lo dice; con permiso muestra el módulo. Los módulos que aún no existen muestran su etapa del plan.
 */
import type { ReactNode } from 'react';
import { Lock, Construction, ShieldAlert, Loader2 } from 'lucide-react';
import { MODULO_INFO, type Modulo } from '../lib/modulos';
import { useAuth } from '../lib/auth';

function Tarjeta({ icono, titulo, texto, nota }: { icono: ReactNode; titulo: string; texto: string; nota: string }) {
  return (
    <div className="glass-card p-8 sm:p-12 flex flex-col items-center text-center gap-4">
      <div className="size-14 rounded-2xl bg-brand/5 text-brand flex items-center justify-center">{icono}</div>
      <div className="space-y-2 max-w-lg">
        <p className="text-sm font-black text-slate-800 uppercase tracking-widest">{titulo}</p>
        <p className="text-sm text-slate-500 font-medium">{texto}</p>
        <p className="text-[11px] text-slate-400 font-bold">{nota}</p>
      </div>
    </div>
  );
}

export default function ModuloPrivado({ modulo, children }: { modulo: Modulo; children?: ReactNode }) {
  const { session, esAdmin, cargando } = useAuth();
  const info = MODULO_INFO[modulo];
  if (cargando) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-brand" /></div>;
  if (!session) return <Tarjeta icono={<Lock size={26} />} titulo="Solo para el equipo de Disruptia" texto={info.resumen}
    nota="Muestra información personal. Entra con «Acceso equipo», arriba a la derecha, usando tu correo autorizado." />;
  if (!esAdmin) return <Tarjeta icono={<ShieldAlert size={26} />} titulo="Tu cuenta no tiene permiso" texto={info.resumen}
    nota="Iniciaste sesión, pero tu correo no está en la lista del equipo (admin_whitelist). Pide que lo agreguen." />;
  if (!children) return <Tarjeta icono={<Construction size={26} />} titulo="En construcción" texto={info.resumen}
    nota={`Este módulo llega en la etapa ${info.etapa} del plan.`} />;
  return <>{children}</>;
}
