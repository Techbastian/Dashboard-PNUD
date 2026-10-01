import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Shell from './layout/Shell';
import DashboardView from './views/DashboardView';
import ModuloPrivado from './views/ModuloPrivado';
import CalendarioView from './views/CalendarioView';
import ParticipantesView from './views/ParticipantesView';
import ColocacionView from './views/ColocacionView';
import EmpresasView from './views/EmpresasView';
import ListadosView from './views/ListadosView';
import { AuthProvider } from './lib/auth';
import { CohorteProvider } from './lib/datos';
import { config } from './lib/config';
import { MODULO_INFO, type Modulo } from './lib/modulos';
import type { ReactElement } from 'react';

/**
 * Rutas (D-11). Mismos módulos y orden que FQSD (D-35). Los privados pasan por <ModuloPrivado> (sesión del
 * equipo, D-32). Informes aún no existe (plan E8) y muestra su lugar.
 */
const VISTAS: Partial<Record<Modulo, () => ReactElement>> = {
  participantes: () => <ParticipantesView />,
  colocacion: () => <ColocacionView />,
  empresas: () => <EmpresasView />,
  calendario: () => <CalendarioView />,
  listados: () => <ListadosView />,
};

export default function App() {
  return (
    <AuthProvider>
      <CohorteProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<DashboardView />} />
              {config.modulos.filter(m => m !== 'dashboard').map(m => (
                <Route key={m} path={MODULO_INFO[m].ruta.slice(1)} element={<ModuloPrivado modulo={m}>{VISTAS[m]?.()}</ModuloPrivado>} />
              ))}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CohorteProvider>
    </AuthProvider>
  );
}
