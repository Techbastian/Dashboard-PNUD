> **Proyecto:** Dashboard Proyecto PNUD — derivado de `disruptia-dashboard-base` (ver `.plantilla.json`).
> Cambios de código genéricos → hacerlos en la plantilla y retro-portar; aquí solo `config/` y `docs/DECISIONES.md`.

# CLAUDE.md — Disruptia Dashboard Base (v2)

Leer primero `docs/` en orden: `00_DIAGNOSTICO` → `01_DECISIONES` → `02_PLAN` → `03_AJUSTES_BD` → `04_CONFIG_MD` → `proyectos/`.

## Reglas
- **Nada específico de un proyecto en el código.** Todo va en `config/dashboard.config.md` (D-14). Si una vista
  necesita un dato nuevo, primero se agrega a la función pública de forma **genérica** y se referencia por ruta.
- **Base principal única** (`iccyjiaseyfupappdtvo`, D-01). El modelo de datos de la base manda (D-03).
- **Todo cambio a la BD se registra ANTES en `docs/03_AJUSTES_BD.md`** con su SQL y su rollback en `docs/sql/`.
  Probar primero dentro de `begin; … rollback;` y verificar con `set local role anon`.
- **Cada decisión nueva → `docs/01_DECISIONES.md`.** Sebastián pidió guardar todo desde el principio.
- **Seguridad:** navegador = anon key. Nunca service role con prefijo `VITE_`. La config es pública: sin PII.
- **Datos de prueba** (A-03) marcados con `origin_source='dashboard_test'`; se borran con `docs/sql/A-03_rollback.sql`.
- No insertar en `applications` (dispara webhooks de IA y del ATS) ni en `placements` para pruebas (correos de retención).
- `databases/` está fuera de git: datos con PII y SQL de cargas con contactos.

## Arquitectura (v1)
- `vite.config.ts` → plugin `dashboard-config`: lee y valida el `.md` en el build y lo entrega como JSON
  (`virtual:dashboard-config`). El navegador no carga un parser YAML.
- `src/lib/usePublicStats.ts` → `rpc('dashboard_public_stats', { p_cohort_id, p_grupos })`, refresco cada
  `refrescoSegundos` (solo con la pestaña visible); en re-fetch conserva el dato anterior.
- `src/lib/ruta.ts` → resuelve rutas de la config; un elemento ausente de una lista existente vale 0;
  `pendiente` ≠ 0.
- UI según la guía dataviz: una serie → un color (`--accent`), barras delgadas con valor visible, embudo con rampa
  ordinal de un tono, medidores con pista del mismo tono, estados vacíos explícitos, `ErrorBoundary` por sección.
- React Router (D-11). Hoy solo `/`. Vistas privadas (login magic-link + `admin_whitelist.role`) en v2.

## Comandos
`npm run dev` · `npm run build` (valida la config) · `npm run lint` (tsc)
