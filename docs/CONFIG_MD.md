# Configuración del dashboard en Markdown (D-14)

Cada proyecto guarda su configuración en **`config/dashboard.config.md`** dentro de su propio repo.
No se escribe nada de configuración en la base principal.

## Por qué un `.md` y no una tabla

- No toca la BD principal (pedido explícito, 27-sep-2026).
- Queda versionado en git junto al código: cada cambio de KPI tiene autor y fecha.
- Es legible y editable a mano por Sebastián sin abrir el dashboard.

## Formato

Markdown para humanos + un bloque ```` ```yaml ```` por sección, que es lo único que lee la app.
El texto fuera de los bloques es documentación libre (por qué se eligió cada KPI, fuente de cada meta).

````md
# Dashboard — Ruta recorrer 2026

## Identidad
```yaml
cohortId: 24cc7928-4a91-4a07-b999-286f9522ee3d
nombre: Ruta Recorrer · Inclusión laboral
logoUrl: https://…/allies-logos/banner_recorrer.jpg
colorPrimario: "#0b3b6b"
```

## Universo
```yaml
postulantes: todas
seleccionados: { status: [inscrito] }
matriculados: program_enrollments
excluidos: []            # SOLO candidate_id (uuid). Nunca correos: este archivo llega al navegador.
```

## KPIs
```yaml
- { id: registrados, label: Personas registradas, fuente: postulaciones, agregacion: conteo, publico: true }
- { id: etnia, label: Pertenencia étnica, fuente: form, campo: ethnicity, agregacion: distribucion, grafico: donut, publico: true }
```
````

## Cómo lo usa la app

| Momento | Qué pasa |
|---|---|
| Build / arranque | Un plugin de Vite importa el `.md`, extrae los bloques `yaml` y los valida contra un esquema; si algo no valida, el build falla con el nombre de la sección. |
| `npm run dev` | El asistente `/configurar` **escribe** el `.md` por un endpoint del servidor de desarrollo (solo existe en local). |
| Producción (Vercel) | El asistente es de **solo lectura** + botón "Descargar .md". Para cambiar la config: editar el archivo, commit y push. |

## Límites de seguridad que impone esta decisión

La función pública (`dashboard_public_stats`) no puede leer el `.md`, así que no confía en la configuración para proteger datos:

1. **Distribuciones públicas:** la v2 acepta una lista de campos, pero solo responde por preguntas **categóricas**
   (`select`, `radio`, `checkbox_group`, `switch` según `form_conf`) y columnas fijas no identificables
   (`gender`, `education_level`, `city`). Texto libre y campos de identidad → rechazados.
2. **Mínimo 5 por categoría** en toda distribución pública; lo menor se agrupa como "Otras (<5)".
3. **Exclusiones** públicas por `candidate_id`: solo pueden *restar* personas de un conteo, nunca revelar datos.
