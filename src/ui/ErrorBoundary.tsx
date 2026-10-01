import { Component, type ReactNode } from 'react';

/** Si una sección falla, las demás siguen visibles (patrón heredado de Horizontes). */
export class ErrorBoundary extends Component<{ nombre: string; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) return (
      <div className="glass-card p-6 border-l-4 border-red-400 text-xs text-slate-500">
        <span className="font-black text-red-600 uppercase tracking-widest">No se pudo mostrar «{this.props.nombre}»</span>
        <code className="block mt-1 text-[11px]">{this.state.error.message}</code>
      </div>
    );
    return this.props.children;
  }
}
