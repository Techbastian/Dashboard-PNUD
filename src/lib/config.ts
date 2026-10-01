/** Configuración del proyecto ya validada en el build (plugin dashboard-config en vite.config.ts, D-14). */
import cfg from 'virtual:dashboard-config';
import type { DashboardConfig } from './parseConfig';
export type { Cifra, Meta, Etapa, Distribucion, DashboardConfig, TipoEvento } from './parseConfig';
export const config = cfg as DashboardConfig;
