import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { parseConfigMd } from './src/lib/parseConfig';

/**
 * D-14: la configuración del proyecto vive en config/dashboard.config.md.
 * Este plugin la lee y valida en el build y la entrega al navegador como JSON (sin parser YAML en el bundle).
 * Si el .md tiene un error, el build falla con el nombre del bloque.
 * DASHBOARD_CONFIG=<ruta.md> usa otro archivo (sirve para probar la plantilla con la config de un proyecto).
 */
function dashboardConfig(): Plugin {
  const file = resolve(__dirname, process.env.DASHBOARD_CONFIG ?? 'config/dashboard.config.md');
  const VID = 'virtual:dashboard-config', RID = '\0' + VID;
  return {
    name: 'dashboard-config',
    resolveId: id => (id === VID ? RID : null),
    load(id) {
      if (id !== RID) return null;
      this.addWatchFile(file);
      return `export default ${JSON.stringify(parseConfigMd(readFileSync(file, 'utf8')))};`;
    },
  };
}

export default defineConfig({
  plugins: [dashboardConfig(), react(), tailwindcss()],
  build: {
    rollupOptions: { output: { manualChunks: { supabase: ['@supabase/supabase-js'], react: ['react', 'react-dom', 'react-router-dom'], ui: ['motion', 'lucide-react'] } } },
  },
});
