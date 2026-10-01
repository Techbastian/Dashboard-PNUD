/**
 * Lugar de cada módulo privado mientras se construye (plan §8, etapas E3–E7).
 * Sin sesión dice que es solo para el equipo de Disruptia (D-32); el login llega en la etapa E2.
 */
import { Lock, Construction } from 'lucide-react';
import { MODULO_INFO, type Modulo } from '../lib/modulos';

export default function ModuloPrivado({ modulo, conSesion = false }: { modulo: Modulo; conSesion?: boolean }) {
  const info = MODULO_INFO[modulo];
  return (
    <div className="glass-card p-8 sm:p-12 flex flex-col items-center text-center gap-4">
      <div className="size-14 rounded-2xl bg-brand/5 text-brand flex items-center justify-center">
        {conSesion ? <Construction size={26} /> : <Lock size={26} />}
      </div>
      <div className="space-y-2 max-w-lg">
        <p className="text-sm font-black text-slate-800 uppercase tracking-widest">
          {conSesion ? 'En construcción' : 'Solo para el equipo de Disruptia'}
        </p>
        <p className="text-sm text-slate-500 font-medium">{info.resumen}</p>
        <p className="text-[11px] text-slate-400 font-bold">
          {conSesion
            ? `Este módulo llega en la etapa ${info.etapa} del plan.`
            : 'Muestra información personal, por eso pide iniciar sesión con una cuenta autorizada de Disruptia.'}
        </p>
      </div>
    </div>
  );
}
