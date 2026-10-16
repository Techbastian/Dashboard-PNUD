# Blueprint · Dashboard PNUD Recorrer

Estado: **v3 aprobado el 16-oct-2026 y construido** (plantilla 2.4.0, D-43; función pública v7, A-16 y A-17; P-08). Los datos de personas son ilustrativos; los de empresas y vacantes son cifras reales del 15-oct.

| Archivo | Qué es |
|---|---|
| `dashboard_1_hitos.png` | Pestaña **Hitos** (primera) |
| `dashboard_2_personas.png` | Pestaña **Personas** |
| `dashboard_3_empresas.png` | Pestaña **Empresas** |
| `informes_ejemplo.png` | Pantalla del módulo **Informes** |
| `informe_ejemplo_PNUD_2026-10-15.xlsx` | **Ejemplo del Excel** que descarga Informes |
| `dashboard_blueprint.html` | Fuente de las imágenes (`#hit`, `#per`, `#emp`, `#inf`) |

## Principio

**El Dashboard es ejecutivo; el detalle está en Informes.** Cada pestaña tiene **4 cifras y como máximo 6 gráficos**. Todo lo demás se descarga.

## Decisiones de Sebastián (15-oct)

| # | Decisión |
|---|---|
| 1 | El Dashboard es **público** (equipo y cliente). Informes es **solo para el equipo**. |
| 2 | **Hitos primero**: reemplaza a la vista «Resumen». |
| 3 | Sin mínimo por categoría. Se muestran todas las respuestas. |
| 4 | Los porcentajes de línea base se calculan **sobre quienes la diligenciaron**. El ideal es que el 100% de las personas registradas la tenga. |
| 5 | **Mujeres frente a hombres** solo donde muestra una brecha. |
| 6 | El foco es **Meta**. Las personas y empresas de otros departamentos (incluido Cauca) **no se bloquean**, pero no se trabaja con ellas: se muestran como **alerta**. |
| 7 | Nivel educativo **sin agrupar**, tomado del **registro inicial**. |
| 8 | «Capaz de conseguir empleo» = **% que responde 4 o 5**. |
| 9 | Barrera alta = **nivel 4 o 5**. |
| 10 | Ingresos en **rangos fijos** hasta $5.000.000, más una categoría «Más de $5.000.000». |
| 11 | Por ahora **no hay medición de salida**. |
| 12 | Se **omite la sección Calidad del dato**. |

## Dashboard (3 pestañas)

### 1 · Hitos

| Elemento | Fuente | Detalle |
|---|---|---|
| Aviso fuera de Meta | personas por `department_residence`; empresas por municipio | 1 línea: «9 personas y 2 empresas fuera de Meta» |
| 4 tarjetas, una por producto (P1, P2, P4, P5) | metas de `cohort_goals` (A-09) + valor actual de la config | Cada meta muestra barra, actual / objetivo, % y estado: **Sin iniciar**, **En curso**, **Cumplida** o **Sin fuente** |
| Ruta de la persona | embudo actual (P-03) | Registro → Orientación → Aceleración → Intermediación → Colocación |

### 2 · Personas

| Elemento | Fuente | Cálculo | Gráfico |
|---|---|---|---|
| Registradas / 200 | bloque de registro | personas con el bloque | Tarjeta con barra |
| Mujeres / 100 | `gender_identity` (D-42) | `femenino` | Tarjeta con barra |
| Con línea base | bloque de línea base | n de registradas · faltantes | Tarjeta |
| ⚠ Fuera de Meta | `department_residence` | ≠ Meta, por departamento | Tarjeta de alerta |
| Género y edad | `gender_identity` · `birth_date` | todas las categorías · rangos de edad | Dona + barras |
| Nivel educativo | `candidates.education_level` | todos los valores, en orden | Barras |
| Capacidad para conseguir empleo | 2.14 | % en 4–5: total, mujeres, hombres | Barra apilada 1–5 |
| 5 barreras más altas | 3.1–3.6 y 3.9–3.17 (15) | % en 4–5; las 5 mayores; mujeres frente a hombres | Barras pareadas |
| Necesidades básicas que cubren sus ingresos | 4.9–4.13 (`lb_ingresos_cubren_*`) + 4.14 ahorro | Sí / No / Prefiere no responder; el número es % «No» | 6 barras apiladas |
| Ingresos personales | 4.6 | rangos fijos | Barras |

### 3 · Empresas

| Elemento | Fuente (función pública v6) | Gráfico |
|---|---|---|
| Empresas aliadas (+ cuántas fuera de Meta) | `empresas.aliadas`, `por_municipio` | Tarjeta |
| Sensibilizadas / 50 | `empresas.asistencia_por_tipo[sensibilizacion]` | Tarjeta con barra |
| Vacantes del proyecto | `vacantes.total`, `empresas_con_vacantes` | Tarjeta |
| Personas vinculadas / 150 | `empleabilidad.colocados` | Tarjeta con barra |
| Tamaño | `empresas.por_tamano` | Dona |
| Sector | `empresas.por_sector` | Barras |
| Nivel educativo que piden | `vacantes.por_nivel_educativo` | Barras |
| Salario | `vacantes.por_salario` | Barras |

## Informes (solo equipo)

Opciones del informe: fecha de corte, departamento y desagregación por género. Tiene dos botones:

- **Excel (detalle):** una hoja por tema y una tabla por pregunta, con las columnas Categoría · Total · % · Mujeres · % M · Hombres · % H. Cada tabla dice su **universo**: por ejemplo, la razón de no afiliación solo cuenta a quien respondió «Ninguno» en régimen de salud. Solo trae conteos, **sin datos personales**; los nombres están en Listados.
- **PDF ejecutivo:** las 3 pestañas del Dashboard, una por página.

Hojas del Excel de ejemplo:

| Hoja | Contenido |
|---|---|
| Portada | Corte, filtros, índice y cómo leerlo |
| 1 Hitos | 13 metas: actual, objetivo, % de avance, estado y fuente |
| 2 Registro | Género, edad, departamento, nivel educativo y las 13 preguntas de selección del registro (área, actividad, formación, competencias, habilidades, vinculación, sector…) |
| 3 Línea base | Las 58 preguntas de selección de la línea base (15 barreras, empleabilidad, salud, autonomía, hogar, vivienda, expectativas…), más ingresos y gastos en rangos, tamaño del hogar, hacinamiento y personas con al menos 1 barrera alta |
| 4 Empresas y vacantes | Indicadores del P1, tamaño, sector, municipio, y nivel educativo, experiencia, salario, contrato y modalidad de las vacantes, más intermediación |
| 5 Alertas | Personas y empresas fuera de Meta por departamento; personas registradas sin línea base |

El texto libre (cargos, programas, «¿qué mejoraría?», composición del hogar, «Otro ¿Cuál?») **no va en el Excel de conteos**. Se consulta en Listados.

## Cómo se construiría (después de aprobar)

1. **BD:** la función pública v7 agrega un bloque genérico `respuestas`. La config indica, por pregunta, el bloque, la clave, el tipo (`opcion`, `multiple`, `escala`, `monto`, `numero`) y la condición. La función devuelve conteos por categoría y por género, además de las alertas por departamento. Se registra como A-17 y se prueba como `anon`.
2. **Plantilla:**
   - Dashboard con pestañas definidas en la config: Hitos con tarjetas por producto, barras apiladas ordinales y barras pareadas M/H.
   - Módulo **Informes** (etapa E8) que arma el Excel desde la misma función, con todas las preguntas declaradas, y el PDF.
   - Se registra como D-xx.
3. **Config PNUD:** pestañas, gráficos y la lista de preguntas del informe. Nada específico del proyecto va en el código.

## Pendiente

- ~~Aprobación de este blueprint~~ ✅ 16-oct.
- ~~Subtítulo del dashboard~~ ✅ dice «Meta».
- ~~A-16 (postulaciones)~~ ✅ aplicado como campo **aparte** (`personas_postuladas_aliadas`): FQSD no cambia.
- Diferencias con la maqueta: hoy hay **1 empresa** fuera de Meta (Huila), no 2; el filtro de Informes es «Todas / Solo Meta / Solo fuera de Meta»; el corte por fecha aplica a la fecha de registro.

## Diferencias entre la encuesta (docx) y el formulario de la plataforma

Afectan la calidad del dato. Se corrigen en el formulario, no en el dashboard.

| Encuesta | Plataforma | Efecto |
|---|---|---|
| Lógica condicional (2.3 si 2.2 = No; 3.7 si 3.6 ≥ 2; 4.16 si 4.15 = Ninguno; 5.2 si 5.1 = Mitigar barreras; 4.35–4.42 si 4.34 = Siempre/Casi siempre…) | No existe: todas las preguntas se muestran siempre | Respuestas incoherentes (en la prueba: régimen Contributivo + razón de no afiliación). El cálculo aplica la condición. |
| 1.16 tipo de discapacidad: auditiva, física, intelectual, **visual**, sordoceguera, psicosocial, **múltiple** | «Discapacidad intelectual» **repetida**; **faltan «visual» y «múltiple»** | Quien tenga discapacidad visual no puede marcarla. |
| 4.35.1 «¿Por qué no gastó?» solo si marca «No gastó» | La de alimentación es obligatoria siempre | Obliga a responder «sí hubo gasto». |
| 4.35.1–4.42.1: texto abierto; la plataforma tiene opciones cargadas, pero el tipo es texto | Texto libre | No se puede graficar sin limpiar. |
| 4.3 productos financieros: selección **múltiple**; «Cuenta de ahorros» y «Billeteras digitales» por separado | Selección **única**; ahorros y billeteras en una sola opción | Solo se sabe un producto por persona. |
| 1.14 incluye «Madre cabeza de familia» y «Prefiere no responder» | No están («No informa» en su lugar) | No se puede contar a las madres cabeza de familia. |
| 4.28 «Ventilador» y «Aire acondicionado» por separado | Una sola opción | Menor. |
| «Nombre del encuestador(a)» | No existe | No se sabe quién aplicó la encuesta. |

**Nota (15-oct):** el formulario de línea base se editó en el editor de la plataforma: se renombraron las preguntas de vivienda y se agregaron opciones. Los 26 slugs `lb_*` (A-15) **se conservaron** y la correspondencia sigue siendo correcta.
