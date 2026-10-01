# Dashboard Proyecto PNUD

Creado desde la plantilla `disruptia-dashboard-base` (ver `.plantilla.json`).
Lo único específico de este proyecto es `config/dashboard.config.md`; las mejoras de código se traen de la plantilla.

---


Plantilla de dashboards de impacto de Disruptia. **Agnóstica al proyecto**: todo lo específico vive en
`config/dashboard.config.md`; el código no conoce ninguna cohorte.

- **Datos en vivo** de la base principal de Supabase (`iccyjiaseyfupappdtvo`) mediante la función
  `dashboard_public_stats(cohort_id, grupos)`: solo agregados, sin datos personales, ejecutable sin login.
- **Vista pública sin login** (v1). Vistas privadas con login y roles → v2 (ver `docs/02_PLAN.md`).
- Modelo **un repo por proyecto** (D-06): se clona esta plantilla y se edita solo el `.md`.

## Arrancar

```bash
npm install
cp .env.example .env.local      # completar VITE_SUPABASE_ANON_KEY (anon key, nunca la service role)
npm run dev                     # http://localhost:3000
npm run build                   # valida config/dashboard.config.md y compila
npm run lint                    # type-check
```

## Crear el dashboard de un proyecto

La plantilla no se edita para un proyecto: se **copia**. Cada copia es un repo independiente (D-06) y lleva
el nombre del proyecto (D-31: carpeta y paquete `dashboard-proyecto-<slug>`, título "Dashboard <Nombre>").

```bash
npm run nuevo -- pnud --nombre "Proyecto PNUD" --cohorte 24cc7928-4a91-4a07-b999-286f9522ee3d
# → ../dashboard-proyecto-pnud   ·   package "dashboard-proyecto-pnud"   ·   <title>Dashboard Proyecto PNUD</title>
```

| Opción | Qué hace |
|---|---|
| `<slug>` | identificador corto (`pnud`, `fqsd`, `seguros-360`) → nombre de la carpeta y del paquete |
| `--nombre` | nombre visible del proyecto (título de la página y de la config) |
| `--cohorte` | `cohorts.id` de la base principal; si falta, el dashboard muestra "aún no está configurado" |
| `--config` | usar un `.md` ya escrito (p. ej. el de la entrevista) en vez del ejemplo |
| `--destino` | otra carpeta de salida |

La copia trae: código, `config/dashboard.config.md`, `.env.local` (si existe aquí), `docs/CONFIG_MD.md`,
`docs/DECISIONES.md` propio y **`.plantilla.json`** (versión y commit de origen, para retro-portar mejoras).
No trae `node_modules`, `.git`, `databases/` ni la documentación interna de la plantilla.

Después, en la copia: completar la config con la entrevista (`docs/02_PLAN.md` §2 de la plantilla), cargar las metas
en `cohort_goals`, `npm install`, `npm run dev`.

**Mejoras de código:** se hacen aquí, en la plantilla, y se llevan a cada copia (comparar con su `.plantilla.json`).
Lo único que nunca se toca al retro-portar es `config/` y `docs/DECISIONES.md` de la copia.

## Cómo se arma una cifra

Cada `valor`/`actual`/`datos` de la config es una **ruta** dentro de la respuesta de la función:

| Ruta | Significa |
|---|---|
| `empresas.aliadas` | número directo |
| `formularios[linea-base].personas` | elemento de una lista por `slug`/`tipo`/`categoria`/`clave`/`estado`/`nombre` |
| `empleabilidad.colocados_por_genero[Mujer]` | sin campo final → usa `n`, `personas` o `total` |
| `grupos.mitigadas` | personas con **todos** los documentos del grupo `mitigadas` definido en la config |
| `pendiente` | etapa sin fuente todavía (se pinta "Sin fuente aún", nunca 0) |

## Estructura

| Carpeta | Qué hay |
|---|---|
| `config/dashboard.config.md` | la configuración del proyecto (único archivo específico) |
| `src/lib/` | lectura de la config (en el build), rutas, cliente Supabase (anon), consulta en vivo, formato |
| `src/ui/` | componentes visuales (cifra, medidor, barras, columnas, embudo) — gráficos SVG propios |
| `src/views/` | vistas (hoy: `VistaPublica`) |
| `docs/` | diagnóstico, decisiones, plan, ajustes a la BD con su SQL y rollback, fichas por proyecto |

## Seguridad

Al navegador solo llega la **anon key**. La vista pública lee una función `SECURITY DEFINER` que devuelve conteos.
Este `.md` termina dentro del JavaScript público: **nunca** poner correos, documentos ni nombres en él.
