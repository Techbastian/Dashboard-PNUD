# Dashboard — Proyecto PNUD

Configuración del dashboard (decisión D-14: vive en este `.md`, no en la base de datos).
La app **solo lee los bloques `yaml`**; el texto alrededor es documentación libre para humanos.
Cada bloque trae una clave de primer nivel (`identidad`, `cifras`, …) y todos se unen en un solo objeto.

> ⚠️ Este archivo termina dentro del JavaScript público del dashboard. **Nunca** pongas aquí correos,
> documentos ni nombres de personas. Para excluir a alguien, usa su `candidate_id` (uuid).

## Identidad

Cohorte de la base principal y marca del proyecto (D-10, D-19).

```yaml
identidad:
  cohortId: 24cc7928-4a91-4a07-b999-286f9522ee3d
  nombre: Recorrer · Ruta de Inclusión Laboral
  subtitulo: Economía para la Paz · Meta y Cauca · PNUD
  logoUrl: https://iccyjiaseyfupappdtvo.supabase.co/storage/v1/object/public/allies-logos/banner_recorrer.jpg
  colorPrimario: "#0b3b6b"
  colorAcento: "#025ea7"
  refrescoSegundos: 60
  datosDePrueba: true        # D-25: la cohorte tiene datos de prueba (A-03) → se muestra un aviso
```

## Grupos de documentos

Personas que tienen **todos** los documentos de cada grupo (D-26). Se mandan a la función pública
como `p_grupos`; las claves son las del bloque `documentos` del formulario (no son datos personales).

```yaml
grupos:
  mitigadas:
    - entrega_de_servicio_de_mitigacion_de_barreras
  seguimiento:
    - proceso_de_seguimiento_de_colocacion_15_dias_persona
    - proceso_de_seguimiento_de_colocacion_30_dias_persona
    - proceso_de_seguimiento_de_colocacion_90_dias_persona
```

## Cifras principales (D-23)

`valor` es una ruta dentro de la respuesta de `dashboard_public_stats`.
`lista[clave]` busca en una lista el elemento cuyo `slug`, `tipo`, `categoria`, `clave`, `estado` o `nombre` es `clave`.

```yaml
cifras:
  - { label: Empresas conectadas,  valor: empresas.aliadas }
  - { label: Personas registradas, valor: "formularios[recorrer-pnud].personas" }
  - { label: Personas aceleradas,  valor: "formacion.asistencia_por_tipo[formacion].matriculados", ayuda: Matriculadas y con asistencia a al menos una sesión formativa }
  - { label: Personas mitigadas,   valor: grupos.mitigadas, ayuda: Con soporte de entrega del servicio de mitigación de barreras }
  - { label: Personas colocadas,   valor: empleabilidad.colocados }
```

## Metas del convenio (D-27)

El **objetivo** sale de `cohort_goals` (se busca por `meta` = nombre de la meta en la base).
El **valor actual** se calcula en vivo con `actual`.

```yaml
metas:
  - { fase: 1, meta: Empresas conectadas al programa,       actual: empresas.aliadas }
  - { fase: 1, meta: Eventos de sensibilización realizados, actual: "formacion.eventos_por_tipo[sensibilizacion].realizados", ayuda: Eventos con tipo 'sensibilizacion' ya realizados }
  - { fase: 2, meta: Personas atendidas (aceleradas),       actual: "formacion.asistencia_por_tipo[formacion].matriculados" }
  - { fase: 3, meta: Personas colocadas,                    actual: empleabilidad.colocados }
  - { fase: 3, meta: Mujeres colocadas,                     actual: "empleabilidad.colocados_por_genero[Mujer]" }
fases:
  1: Empresas y sensibilización
  2: Atención de personas
  3: Colocación
```

## Ruta de la persona (P-03)

Las etapas dependen de cada proyecto (D-37). En PNUD importan cinco. Orientación = asistió a una sesión de orientación;
Aceleración = matriculada y asistió a una sesión formativa (D-33). Se marcan en el Calendario.
Las etapas de barreras y seguimiento siguen existiendo en los datos (grupos `mitigadas` y `seguimiento`); se pueden volver a agregar aquí.

```yaml
embudo:
  - { etapa: Registro,       valor: "formularios[recorrer-pnud].personas" }
  - { etapa: Orientación,    valor: "formacion.asistencia_por_tipo[orientacion].personas" }
  - { etapa: Aceleración,    valor: "formacion.asistencia_por_tipo[formacion].matriculados" }
  - { etapa: Intermediación, valor: empleabilidad.personas_postuladas_vacantes }
  - { etapa: Colocación,     valor: empleabilidad.colocados }
```

## Tipos de evento del Calendario (D-33)

Lo que se puede crear en el Calendario. Asistir a `orientacion` marca Orientación; asistir a `formacion` (estando
matriculada) marca Aceleración; los `sensibilizacion` realizados suman a la meta de la fase 1. El nombre de cada
sesión se escribe al crearla.

```yaml
catalogo:
  - { tipo: orientacion,     label: Sesión de orientación,  modalidad: Presencial, descripcion: "Quien asiste pasa la etapa Orientación." }
  - { tipo: formacion,       label: Sesión formativa,       modalidad: Presencial, descripcion: "Ponle el nombre de la sesión. Quien asiste y está matriculada cuenta como acelerada." }
  - { tipo: sensibilizacion, label: Evento de sensibilización (empresas), modalidad: Presencial, descripcion: "Suma a la meta de 3 eventos de la fase 1 cuando ya se realizó." }
  - { tipo: mitigacion,      label: Mitigación de barreras, modalidad: Presencial }
```

## Distribuciones

Cada una apunta a una lista `[{categoria, n}]` de la respuesta.

```yaml
distribuciones:
  empresas:
    - { titulo: Tamaño,                 datos: empresas.por_tamano, grafico: dona }
    - { titulo: Sector económico,       datos: empresas.por_sector }
    - { titulo: Municipio de operación, datos: empresas.por_municipio, nota: Una empresa puede operar en varios municipios }
  vacantes:
    - { titulo: Nivel educativo requerido, datos: vacantes.por_nivel_educativo }
    - { titulo: Experiencia requerida,     datos: vacantes.por_experiencia }
    - { titulo: Salario,                   datos: vacantes.por_salario }
    - { titulo: Tipo de contrato,          datos: vacantes.por_contrato, grafico: dona }
    - { titulo: Modalidad,                 datos: vacantes.por_modalidad, grafico: dona }
```

## Secciones de la vista pública (D-22)

Orden en que se pintan. Quita una línea para ocultar la sección.

```yaml
secciones: [metas, cifras, registros, embudo, empresas, vacantes, estados]
```

## Módulos del menú (D-35)

Los mismos de FQSD. Los privados son solo para el equipo de Disruptia (D-32).

```yaml
modulos: [dashboard, participantes, colocacion, empresas, calendario, listados, informes]
```
