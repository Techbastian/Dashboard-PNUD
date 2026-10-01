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
  datosDePrueba: true        # D-25: todas las personas actuales son de prueba → se muestra un aviso
```

## Grupos de documentos

Claves del bloque `documentos` del formulario (no son datos personales). Una lista = la persona debe tener TODOS;
`{ alguno: [...] }` = AL MENOS UNO (A-11).

```yaml
grupos:
  mitigadas:
    - entrega_de_servicio_de_mitigacion_de_barreras
  seguimiento:                     # P5: al menos una sesión de seguimiento poscolocación
    alguno:
      - proceso_de_seguimiento_de_colocacion_15_dias_persona
      - proceso_de_seguimiento_de_colocacion_30_dias_persona
      - proceso_de_seguimiento_de_colocacion_90_dias_persona
```

## Metas del contrato (P-05, A-09)

Una fase por producto del contrato. El **objetivo** sale de `cohort_goals` (por nombre); el **actual** se calcula en vivo.
"Mujer" = sexo asignado al nacer (D-39). `pendiente` = el dato aún no existe en la base ("Sin fuente aún").

```yaml
metas:
  # P1 Gestión empresarial
  - { fase: 1, meta: Empresas sensibilizadas en empleo inclusivo,  actual: "empresas.asistencia_por_tipo[sensibilizacion].empresas", ayuda: Asistieron a al menos un evento de sensibilización (Calendario) }
  - { fase: 1, meta: Espacios de aprendizaje con empresas,         actual: "formacion.eventos_por_tipo[sensibilizacion].realizados", ayuda: Eventos de sensibilización ya realizados }
  - { fase: 1, meta: Empresas con diagnóstico de empleo inclusivo, actual: pendiente, ayuda: El diagnóstico empresarial aún no se registra en la plataforma }
  # P2 Mapeo y focalización
  - { fase: 2, meta: Personas registradas,                         actual: "formularios[recorrer-pnud].personas" }
  - { fase: 2, meta: Mujeres registradas,                          actual: "formularios[recorrer-pnud].mujeres" }
  - { fase: 2, meta: Personas con línea base,                      actual: "formularios[linea-base].personas" }
  - { fase: 2, meta: Planes de acción individuales,                actual: pendiente, ayuda: El plan de acción aún no se registra en la plataforma }
  - { fase: 2, meta: Espacios de aprendizaje con la población,     actual: "formacion.eventos_por_tipo[espacio_aprendizaje].realizados", ayuda: Eventos de tipo «Espacio de aprendizaje» ya realizados }
  # P4 Mitigación de barreras
  - { fase: 4, meta: Personas atendidas en mitigación de barreras, actual: grupos.mitigadas, ayuda: Con soporte de entrega del servicio de mitigación }
  - { fase: 4, meta: Mujeres atendidas en mitigación de barreras,  actual: grupos_mujeres.mitigadas }
  # P5 Vinculación laboral
  - { fase: 5, meta: Personas vinculadas laboralmente,             actual: empleabilidad.colocados }
  - { fase: 5, meta: Mujeres vinculadas laboralmente,              actual: empleabilidad.colocados_mujeres }
  - { fase: 5, meta: Personas vinculadas con seguimiento,          actual: grupos.seguimiento, ayuda: Con al menos un soporte de seguimiento poscolocación }
fases:
  1: Producto 1 · Gestión empresarial
  2: Producto 2 · Mapeo y focalización
  4: Producto 4 · Mitigación de barreras
  5: Producto 5 · Vinculación laboral
```

## Cifras principales

```yaml
cifras:
  - { label: Empresas sensibilizadas,  valor: "empresas.asistencia_por_tipo[sensibilizacion].empresas" }
  - { label: Personas registradas,     valor: "formularios[recorrer-pnud].personas" }
  - { label: Mujeres registradas,      valor: "formularios[recorrer-pnud].mujeres" }
  - { label: Postuladas a vacantes,    valor: empleabilidad.personas_postuladas_vacantes, ayuda: P3 · intermediación }
  - { label: Atendidas en mitigación,  valor: grupos.mitigadas }
  - { label: Vinculadas laboralmente,  valor: empleabilidad.colocados }
```

## Ruta de la persona (P-03, D-37)

Orientación = asistió a una sesión de orientación; Aceleración = matriculada y asistió a una sesión formativa (D-33).
Se marcan en el Calendario.

```yaml
embudo:
  - { etapa: Registro,       valor: "formularios[recorrer-pnud].personas" }
  - { etapa: Orientación,    valor: "formacion.asistencia_por_tipo[orientacion].personas" }
  - { etapa: Aceleración,    valor: "formacion.asistencia_por_tipo[formacion].matriculados" }
  - { etapa: Intermediación, valor: empleabilidad.personas_postuladas_vacantes }
  - { etapa: Colocación,     valor: empleabilidad.colocados }
```

## Tipos de evento del Calendario (D-33, D-40)

`empresas: true` = en ese evento se marcan las EMPRESAS que asistieron (P1). Todos los eventos llevan evidencias
(agenda, lista de asistencia firmada, fotos).

```yaml
catalogo:
  - { tipo: orientacion,         label: Sesión de orientación,  modalidad: Presencial, descripcion: "Quien asiste pasa la etapa Orientación." }
  - { tipo: formacion,           label: Sesión formativa,       modalidad: Presencial, descripcion: "Ponle el nombre de la sesión. Quien asiste y está matriculada cuenta como acelerada." }
  - { tipo: sensibilizacion,     label: Sensibilización con empresas, modalidad: Presencial, empresas: true, descripcion: "Marca las empresas que asistieron: quedan sensibilizadas (P1). Cuenta como espacio de aprendizaje con empresas." }
  - { tipo: espacio_aprendizaje, label: Espacio de aprendizaje con la población, modalidad: Presencial, descripcion: "Cuenta para los 3 espacios del P2. Sube la agenda y la lista de asistencia firmada." }
  - { tipo: mitigacion,          label: Mitigación de barreras, modalidad: Presencial }
```

## Distribuciones

Cada una apunta a una lista `[{categoria, n}]`. Edad y municipio agrupan categorías de menos de 5 personas.

```yaml
distribuciones:
  personas:
    - { titulo: Sexo,                   datos: postulaciones.por_sexo, nota: Sexo asignado al nacer, grafico: dona }
    - { titulo: Edad,                   datos: postulaciones.por_edad }
    - { titulo: Municipio,              datos: postulaciones.por_municipio }
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

## Secciones del Dashboard

```yaml
secciones: [metas, cifras, registros, embudo, estados, empresas, vacantes]
```

## Módulos del menú (D-35)

```yaml
modulos: [dashboard, participantes, colocacion, empresas, calendario, listados, informes]
```
