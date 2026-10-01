import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Shell from './layout/Shell';
import DashboardView from './views/DashboardView';
import ModuloPrivado from './views/ModuloPrivado';
import { config } from './lib/config';
import { MODULO_INFO } from './lib/modulos';

/**
 * Rutas (D-11). Mismos módulos y mismo orden que FQSD (D-35); los privados muestran su lugar
 * hasta que llega su etapa del plan (§8): login E2, Calendario E3, Participantes E4, …
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<DashboardView />} />
          {config.modulos.filter(m => m !== 'dashboard').map(m => (
            <Route key={m} path={MODULO_INFO[m].ruta.slice(1)} element={<ModuloPrivado modulo={m} />} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
