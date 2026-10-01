/**
 * Armazón de FQSD (D-35): menú lateral fijo + barra superior translúcida + título de la vista
 * ("Dashboard" en grande y "Módulo de gestión · <proyecto>" en versalitas) + transición entre vistas.
 */
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { config } from '../lib/config';
import { MODULO_INFO, MODULOS } from '../lib/modulos';
import { useAuth } from '../lib/auth';
import AccesoEquipo from './AccesoEquipo';

const id = config.identidad;

export default function Shell() {
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();
  const modulo = MODULOS.find(m => MODULO_INFO[m].ruta === pathname) ?? 'dashboard';
  // Sesión del equipo (E2, D-32): abre los módulos privados.
  const { esAdmin: conSesion } = useAuth();

  useEffect(() => {
    document.title = `${MODULO_INFO[modulo].label} · ${id.nombre}`;
  }, [modulo]);

  useEffect(() => {
    // El color del aliado reemplaza al azul de FQSD en toda la interfaz (botones, barras, ítem activo).
    if (id.colorPrimario) document.documentElement.style.setProperty('--color-brand', id.colorPrimario);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      <Sidebar abierto={menu} onCerrar={() => setMenu(false)} conSesion={conSesion} />

      {/* min-w-0: sin esto una tabla ancha empuja el contenedor y la página entera gana scroll horizontal (bug de FQSD). */}
      <div className="flex-1 min-w-0 lg:ml-72 flex flex-col">
        <header className="border-b border-slate-100 px-4 sm:px-8 py-4 flex items-center justify-between gap-4 sticky top-0 z-30 bg-white/80 backdrop-blur-md no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" onClick={() => setMenu(true)} className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800" aria-label="Abrir menú">
              <Menu size={20} />
            </button>
            <span className="lg:hidden text-sm font-black text-slate-700 truncate">{id.nombre}</span>
          </div>
          <div className="flex items-center gap-6"><AccesoEquipo /></div>
        </header>

        <main className="p-4 sm:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">{MODULO_INFO[modulo].label}</h2>
              <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">
                Módulo de gestión · {id.nombre}
              </p>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        <footer className="max-w-7xl w-full mx-auto px-4 sm:px-8 pb-8 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
          Datos agregados en vivo desde la plataforma de Disruptia · {id.nombre}
        </footer>
      </div>
    </div>
  );
}
