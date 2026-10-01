/**
 * Menú lateral de FQSD (D-35): blanco, 18rem, banner del proyecto arriba, ítem activo con fondo de marca
 * suave y barra lateral animada. En pantallas chicas se vuelve un cajón que abre el botón del header.
 */
import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  LayoutDashboard, ClipboardList, Briefcase, Building2, Calendar as CalendarIcon, FileDown, FileText, Lock, X,
  type LucideIcon,
} from 'lucide-react';
import { config } from '../lib/config';
import { MODULO_INFO, type Modulo } from '../lib/modulos';

const ICONOS: Record<Modulo, LucideIcon> = {
  dashboard: LayoutDashboard,
  participantes: ClipboardList,
  colocacion: Briefcase,
  empresas: Building2,
  calendario: CalendarIcon,
  listados: FileDown,
  informes: FileText,
};

export default function Sidebar({ abierto, onCerrar, conSesion }: { abierto: boolean; onCerrar: () => void; conSesion: boolean }) {
  const id = config.identidad;
  return (
    <>
      {/* Fondo del cajón en móvil */}
      <div
        className={`fixed inset-0 bg-slate-900/30 z-40 lg:hidden transition-opacity ${abierto ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onCerrar}
        aria-hidden
      />
      <aside
        className={`fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-slate-100 flex flex-col z-50 transition-transform duration-200
          ${abierto ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        aria-label="Menú principal"
      >
        <div className="p-8 pb-4 relative">
          {id.logoUrl
            ? <img src={id.logoUrl} alt={id.nombre} className="w-full object-contain" />
            : <p className="text-lg font-black text-brand leading-tight">{id.nombre}</p>}
          <button type="button" onClick={onCerrar} className="lg:hidden absolute top-3 right-3 p-2 text-slate-400 hover:text-slate-600" aria-label="Cerrar menú">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {config.modulos.map(m => {
            const info = MODULO_INFO[m];
            const Icono = ICONOS[m];
            const bloqueado = info.privado && !conSesion;
            return (
              <NavLink
                key={m}
                to={info.ruta}
                end={info.ruta === '/'}
                onClick={onCerrar}
                className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all relative group ${
                  isActive ? 'bg-brand/5 text-brand shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                title={bloqueado ? 'Solo para el equipo de Disruptia (requiere iniciar sesión)' : undefined}
              >
                {({ isActive }) => (
                  <>
                    <Icono size={20} className={isActive ? 'text-brand' : 'text-slate-300 group-hover:text-slate-500'} />
                    <span className={`text-sm tracking-tight flex-1 ${isActive ? 'font-black' : 'font-bold'}`}>{info.label}</span>
                    {bloqueado && <Lock size={13} className="text-slate-300" aria-label="Requiere sesión" />}
                    {isActive && <motion.div layoutId="active-nav" className="absolute left-0 w-1.5 h-6 bg-brand rounded-r-full" />}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-50">
          <p className="px-2 text-[10px] font-bold text-slate-300 leading-snug">
            Plataforma de Disruptia · datos en vivo
          </p>
        </div>
      </aside>
    </>
  );
}
