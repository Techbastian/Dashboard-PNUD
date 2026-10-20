/** Configuración del proyecto ya validada en el build (plugin dashboard-config en vite.config.ts, D-14). */
import cfg from 'virtual:dashboard-config';
import type { DashboardConfig } from './parseConfig';
export type {
  Cifra, Meta, Etapa, Marca, Distribucion, DashboardConfig, TipoEvento, Pregunta, Foco, Pestana, Grafico, CifraPestana, HojaInforme,
} from './parseConfig';
export const config = cfg as DashboardConfig;
