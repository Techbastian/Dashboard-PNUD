/**
 * Control de acceso del equipo en la barra superior (E2, D-32). Sin sesión: botón "Acceso equipo" que pide el
 * correo y envía el enlace. Con sesión: correo, estado y "Salir". Nunca usa diálogos del navegador.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2, LogIn, LogOut, MailCheck, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function AccesoEquipo() {
  const { session, correo, esAdmin, cargando, enviarEnlace, salir } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'enviado'>('idle');
  const [error, setError] = useState<string | null>(null);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  if (cargando) return <Loader2 size={16} className="animate-spin text-slate-300" aria-label="Verificando sesión" />;

  if (session) {
    return (
      <div className="flex items-center gap-3 min-w-0">
        <span className={`hidden sm:inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${esAdmin ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
          {esAdmin ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}{esAdmin ? 'Equipo' : 'Sin permiso'}
        </span>
        <span className="hidden md:inline text-xs font-bold text-slate-500 truncate max-w-[14rem]" title={correo ?? ''}>{correo}</span>
        <button type="button" onClick={salir} className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-700">
          <LogOut size={14} /> Salir
        </button>
      </div>
    );
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEstado('enviando');
    const r = await enviarEnlace(email);
    if (r.error) { setError(r.error); setEstado('idle'); } else setEstado('enviado');
  }

  return (
    <div ref={caja} className="relative">
      <button type="button" onClick={() => setAbierto(a => !a)}
        className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-brand hover:opacity-80">
        <LogIn size={14} /> Acceso equipo
      </button>
      {abierto && (
        <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-5 z-50">
          {estado === 'enviado' ? (
            <div className="flex gap-3">
              <MailCheck size={20} className="text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-black text-slate-800">Revisa tu correo</p>
                <p className="text-xs text-slate-500 mt-1">Te enviamos un enlace a <b>{email}</b>. Ábrelo en este mismo navegador para entrar.</p>
                <button type="button" onClick={() => setEstado('idle')} className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">Usar otro correo</button>
              </div>
            </div>
          ) : (
            <form onSubmit={enviar} className="space-y-3">
              <div>
                <p className="text-sm font-black text-slate-800">Acceso del equipo de Disruptia</p>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">Las secciones privadas muestran datos personales.</p>
              </div>
              <input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="tu.correo@disruptia.co"
                className="w-full bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand/20" />
              {error && <p className="text-[11px] font-bold text-red-600">{error}</p>}
              <button type="submit" disabled={estado === 'enviando'}
                className="w-full flex items-center justify-center gap-2 bg-brand text-white rounded-xl py-2.5 text-xs font-black uppercase tracking-widest disabled:opacity-60">
                {estado === 'enviando' && <Loader2 size={14} className="animate-spin" />} Enviar enlace
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
