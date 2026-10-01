/**
 * Módulos del menú lateral (D-07, D-35): todos los dashboards traen los mismos, en el mismo orden que FQSD.
 * Sin imports a propósito: lo carga también vite.config.ts (Node) al validar la config.
 */
export const MODULOS = ['dashboard', 'participantes', 'colocacion', 'empresas', 'calendario', 'listados', 'informes'] as const;
export type Modulo = typeof MODULOS[number];

export const MODULO_INFO: Record<Modulo, { label: string; ruta: string; privado: boolean; etapa?: string; resumen: string }> = {
  dashboard:     { label: 'Dashboard',     ruta: '/',              privado: false, resumen: 'Metas, cifras, ruta de la persona, empresas y vacantes en vivo.' },
  participantes: { label: 'Participantes', ruta: '/participantes', privado: true, etapa: 'E4', resumen: 'Tabla por persona con su avance en cada etapa, ficha lateral, documentos, asistencia y tareas.' },
  colocacion:    { label: 'Colocación',    ruta: '/colocacion',    privado: true, etapa: 'E5', resumen: 'Intermediados, colocados y quienes se postularon sin pasar por el proceso; registro de colocaciones.' },
  empresas:      { label: 'Empresas',      ruta: '/empresas',      privado: true, etapa: 'E5', resumen: 'Empresas del proyecto con sus vacantes, postulados y colocados.' },
  calendario:    { label: 'Calendario',    ruta: '/calendario',    privado: true, etapa: 'E3', resumen: 'Sesiones y eventos en vista de mes o agenda: crear, agendar personas y marcar asistencia.' },
  listados:      { label: 'Listados',      ruta: '/listados',      privado: true, etapa: 'E6', resumen: 'Listados en Excel con filtros combinables.' },
  informes:      { label: 'Informes',      ruta: '/informes',      privado: true, etapa: 'E7', resumen: 'Informe ejecutivo en PDF para el aliado o el financiador.' },
};
