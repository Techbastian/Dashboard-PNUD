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
  subtitulo: Economía para la Paz · Meta · PNUD   # P-08: foco solo Meta (decisión 6 del blueprint)
  logoUrl: https://iccyjiaseyfupappdtvo.supabase.co/storage/v1/object/public/allies-logos/banner_recorrer.jpg
  colorPrimario: "#0b3b6b"
  colorAcento: "#025ea7"
  refrescoSegundos: 60
  datosDePrueba: false       # P-06: pruebas borradas el 14-oct (A-12); solo quedan registros reales
```

## Grupos de documentos

Claves del bloque `documentos` del formulario (no son datos personales). Una lista = la persona debe tener TODOS;
`{ alguno: [...] }` = AL MENOS UNO (A-11). La clave es el **slug** de la pregunta en la Fase Documental (si no tiene
slug, su etiqueta en minúsculas con `_`). P-18: las claves anteriores eran etiquetas y no coincidían con los slugs.

```yaml
grupos:
  perfilamiento:                   # P-18: «Informe individual de perfilamiento» (Fase Documental)
    - perfilamiento_plan_accion
  mitigadas:                       # «Entrega de servicio de mitigación de barreras»
    - mitigacion_barreras_pnud
  seguimiento:                     # P5: al menos una sesión de seguimiento poscolocación (documentos de la persona)
    alguno:
      - seguimiento_15_dias
      - seguimiento_30_dias
      - seguimiento_90_dias
```

P-36 (D-73) / P-37: por ahora el equipo solo carga la hoja de vida (eso no depende de esta clave). Los documentos de la
Fase Documental se ven y se abren desde la ficha, pero no se cargan: pasar a `true` cuando A-44 esté aplicada
(antes: slug en las 4 preguntas de documento que no tienen y endurecer la función).

```yaml
documentos:
  cargar: false
```

## Metas del contrato (P-05, A-09)

Una fase por producto del contrato. El **objetivo** sale de `cohort_goals` (por nombre); el **actual** se calcula en vivo.
"Mujer" = Género Femenino, campo «Género» del registro (D-42, P-07). `pendiente` = el dato aún no existe en la base ("Sin fuente aún").

```yaml
metas:
  # P1 Gestión empresarial
  - { fase: 1, meta: Empresas sensibilizadas en empleo inclusivo,  actual: empresas.con_diagnostico, ayuda: "Sensibilizada = con el diagnóstico de empleo inclusivo registrado en Empresas (P-26)" }
  - { fase: 1, meta: Espacios de aprendizaje con empresas,         actual: "formacion.eventos_por_tipo[sensibilizacion].realizados", ayuda: Eventos de sensibilización ya realizados }
  # P2 Mapeo y focalización
  - { fase: 2, meta: Personas registradas,                         actual: "formularios[recorrer-pnud].personas" }
  - { fase: 2, meta: Mujeres registradas,                          actual: "formularios[recorrer-pnud].mujeres" }
  - { fase: 2, meta: Personas con línea base,                      actual: "formularios[linea-base].personas" }
  - { fase: 2, meta: Planes de acción individuales,                actual: grupos.perfilamiento, ayuda: "El plan de acción se deriva del perfilamiento: cuenta quien tiene el informe individual de perfilamiento cargado (P-29)" }
  - { fase: 2, meta: Espacios de aprendizaje con la población,     actual: "formacion.eventos_por_tipo[espacio_aprendizaje].realizados", ayuda: Eventos de tipo «Espacio de aprendizaje» ya realizados }
  # P4 Mitigación de barreras
  # P-32: mitigada = soporte de entrega del servicio O asistió a una sesión formativa del Calendario (sin exigir matrícula)
  - { fase: 4, meta: Personas atendidas en mitigación de barreras, actual: uniones.mitigacion.personas, ayuda: Con soporte de entrega del servicio de mitigación o que asistió a una sesión formativa }
  - { fase: 4, meta: Mujeres atendidas en mitigación de barreras,  actual: uniones.mitigacion.mujeres }
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
  - { label: Empresas sensibilizadas,  valor: empresas.con_diagnostico, ayuda: Con diagnóstico de empleo inclusivo }
  - { label: Personas registradas,     valor: "formularios[recorrer-pnud].personas" }
  - { label: Mujeres registradas,      valor: "formularios[recorrer-pnud].mujeres" }
  - { label: Postuladas a vacantes,    valor: empleabilidad.personas_postuladas_aliadas, ayuda: P3 · intermediación atribuible (A-16) }
  - { label: Atendidas en mitigación,  valor: uniones.mitigacion.personas, ayuda: Soporte de mitigación o asistencia a una sesión formativa }
  - { label: Vinculadas laboralmente,  valor: empleabilidad.colocados }
```

## Ruta de la persona (P-03, D-37)

Orientación = hizo la **línea base** o asistió a una sesión de orientación del Calendario (P-12, D-44); Aceleración =
matriculada y asistió a una sesión formativa (D-33). Intermediación = postulaciones **atribuibles** al proyecto (A-16, P-08):
a vacantes de empresas vinculadas a la cohorte o creadas para ella, más las externas que registra el equipo.
`uniones` = etapas que se cumplen por al menos una condición; las cuenta la función pública (A-20) y Participantes.
Mitigación (P-32, D-66) = tiene el soporte de entrega del servicio de mitigación **o** asistió a una sesión formativa
(`formacion`) del Calendario, sin exigir matrícula. Requiere la función pública v13 (A-41) por la condición de documentos.

```yaml
uniones:
  orientacion: [formulario:linea-base, asistencia:orientacion]
  mitigacion: [documentos:mitigadas, asistencia:formacion]
embudo:
  - { etapa: Registro,       valor: "formularios[recorrer-pnud].personas" }
  - { etapa: Orientación,    valor: uniones.orientacion.personas, detalle: línea base }   # P-27
  - { etapa: Aceleración,    valor: "formacion.asistencia_por_tipo[formacion].matriculados" }
  - { etapa: Intermediación, valor: empleabilidad.personas_postuladas_aliadas }
  - { etapa: Colocación,     valor: empleabilidad.colocados }
```

## Tipos de evento del Calendario (D-33, D-40)

`empresas: true` = en ese evento se marcan las EMPRESAS que asistieron (P1). Todos los eventos llevan evidencias
(agenda, lista de asistencia firmada, fotos).

```yaml
catalogo:
  - { tipo: orientacion,         label: Sesión de orientación,  modalidad: Presencial, descripcion: "Quien asiste pasa la etapa Orientación." }
  - { tipo: formacion,           label: Sesión formativa,       modalidad: Presencial, descripcion: "Ponle el nombre de la sesión. Quien asiste y está matriculada cuenta como acelerada." }
  - { tipo: sensibilizacion,     label: Sensibilización con empresas, modalidad: Presencial, empresas: true, descripcion: "Marca las empresas que asistieron. Cuenta como espacio de aprendizaje con empresas." }
  - { tipo: espacio_aprendizaje, label: Espacio de aprendizaje con la población, modalidad: Presencial, descripcion: "Cuenta para los 3 espacios del P2. Sube la agenda y la lista de asistencia firmada." }
  - { tipo: mitigacion,          label: Mitigación de barreras, modalidad: Presencial }
```

## Distribuciones

Cada una apunta a una lista `[{categoria, n}]`. Edad y municipio agrupan categorías de menos de 5 personas.

```yaml
distribuciones:
  personas:
    - { titulo: Género,                 datos: postulaciones.por_sexo, nota: Campo «Género» del registro, grafico: dona }
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

## Participantes (P-12, D-44)

Columnas de ✓ que no son etapas de la ruta. Se filtran con el ▾ de su columna y salen en el Excel. `vistas` = botones de vista rápida (D-65).

```yaml
participantes:
  marcas:
    - { titulo: Hoja de vida, regla: hv, ayuda: Hoja de vida cargada en la plataforma }
    - { titulo: Perfilamiento, regla: "documentos:perfilamiento", despues: Orientación, ayuda: Informe individual de perfilamiento cargado en la Fase Documental }
    - { titulo: Mitigación, regla: "union:mitigacion", despues: Aceleración, ayuda: Soporte de entrega del servicio de mitigación cargado o asistió a una sesión formativa del Calendario }   # P-32
  # P-27 (D-65): vistas rápidas de Participantes. «Orientación» = hizo la línea base o asistió a una sesión de orientación.
  vistas:
    - { titulo: Registros sin línea base,     con: [Registro],      sin: [Orientación] }
    - { titulo: Línea base sin perfilamiento, con: [Orientación],   sin: [Perfilamiento] }
    - { titulo: Perfilamiento sin línea base, con: [Perfilamiento], sin: [Orientación] }
```

## Secciones del Dashboard

```yaml
secciones: [metas, cifras, registros, embudo, estados, empresas, vacantes]
```

## Módulos del menú (D-35)

```yaml
modulos: [dashboard, participantes, colocacion, empresas, calendario, listados, informes]
```

## Empresas (P-21, D-61)

Diagnóstico de empleo inclusivo (P1): el equipo pega en la ficha de la empresa el enlace al PDF en Drive. El dashboard
público solo muestra cuántas empresas lo tienen, nunca el enlace.
**Una empresa con diagnóstico es una empresa sensibilizada** (P-26): es una sola meta («Empresas sensibilizadas en
empleo inclusivo»), contada con `empresas.con_diagnostico`. Los eventos de sensibilización cuentan como espacios de
aprendizaje con empresas, no hacen sensibilizada a la empresa.

```yaml
empresas:
  diagnostico: true
  sensibilizada: diagnostico   # P-26: sensibilizada = con diagnóstico (una sola meta)
```

---

# Dashboard ejecutivo (P-08 · blueprint v3 aprobado el 16-oct · D-43 de la plantilla)

El Dashboard es ejecutivo y el detalle está en **Informes**. Con `pestanas`, el bloque `secciones` de arriba ya no se usa
(queda como referencia). Decisiones de Sebastián del 15-oct: ver `docs/blueprint/BLUEPRINT_DASHBOARD.md`.

## Foco territorial

Decisión 6: el foco es **Meta**. Las personas y empresas de otros departamentos no se bloquean. P-09: **sin alertas** en el
Dashboard ni hoja de alertas en el informe; el foco solo se usa en el filtro «Solo Meta / Solo fuera de Meta» de Informes.
`coincide` = textos que identifican al foco (sin importar tildes ni mayúsculas). Hace falta «villavicencio» porque el
campo departamento tiene respuestas antiguas en texto libre («Villavicencio meta», «Villavicencio-Meta»…).

```yaml
foco:
  nombre: Meta
  coincide: [meta, villavicencio]
  personas: departamento              # pregunta (abajo) que dice dónde vive la persona
  empresas: empresas.por_ubicacion    # ubicación principal de la empresa (companies.location)
```

## Preguntas de los formularios (A-17)

La función pública cuenta cada pregunta por opción y por género. `grupo` = hoja del informe. Solo preguntas de
**selección** (texto libre nunca); montos y números van en rangos. `si` = universo condicional (lógica de la encuesta,
que el formulario de la plataforma no aplica). Los porcentajes se calculan sobre quienes respondieron (decisión 4).
Barrera alta = 4 o 5 (decisión 9). Ingresos en rangos fijos hasta $5.000.000 (decisión 10).

```yaml
preguntas:
  # ── Registro (bloque recorrer-pnud) ──
  - { id: departamento,        grupo: registro, bloque: recorrer-pnud, clave: department_residence, titulo: Departamento donde se ubica }
  - { id: area,                grupo: registro, bloque: recorrer-pnud, clave: area, titulo: Área }
  - { id: sabe_leer,           grupo: registro, bloque: recorrer-pnud, clave: usted_sabe_leer_o_escribir, titulo: ¿Sabe leer o escribir? }
  - { id: cursando,            grupo: registro, bloque: recorrer-pnud, clave: actualmente_estas_cursando_algun_programa_de_formacion_acade, titulo: ¿Está cursando algún programa académico o técnico? }
  - { id: formacion_trabajo,   grupo: registro, bloque: recorrer-pnud, clave: has_participado_en_programas_de_formacion_para_el_trabajo_o, titulo: ¿Ha participado en formación para el trabajo o cursos cortos? }
  - { id: certificar,          grupo: registro, bloque: recorrer-pnud, clave: actualmente_requiere_validar_y_o_certificar_una_habilidad, titulo: ¿Requiere validar o certificar una habilidad? }
  - { id: requiere_curso,      grupo: registro, bloque: recorrer-pnud, clave: actualmente_requiere_algun_proceso_de_formacion_para_el_trab, titulo: ¿Requiere formación para el trabajo o un curso corto? }
  - { id: competencias_transv, grupo: registro, bloque: recorrer-pnud, clave: competencias_transversales, tipo: multiple, titulo: Competencias transversales con mayores fortalezas }
  - { id: habilidades_oficios, grupo: registro, bloque: recorrer-pnud, clave: seleccione_dos_habilidades_oficios_o_conocimientos_practicos, tipo: multiple, titulo: "Habilidades, oficios o conocimientos prácticos" }
  - { id: actividad,           grupo: registro, bloque: recorrer-pnud, clave: en_que_actividad_ocupo_la_mayor_parte_del_tiempo_la_semana_p, titulo: Actividad principal la semana pasada }
  - { id: vinculacion,         grupo: registro, bloque: recorrer-pnud, clave: que_tipo_de_vinculacion_laboral_tenia, titulo: Tipo de vinculación laboral que tenía }
  - { id: sector_previo,       grupo: registro, bloque: recorrer-pnud, clave: a_que_sector_economico_pertenece_la_empresa_en_la_que_laboro, titulo: Sector de la empresa donde laboró }
  - { id: buscando_empleo,     grupo: registro, bloque: recorrer-pnud, clave: actualmente_esta_buscando_empleo, titulo: ¿Está buscando empleo? }
  - { id: fortalecer,          grupo: registro, bloque: recorrer-pnud, clave: esta_interesado_en_fortalecer_sus_destrezas_laborales_y_ocup, titulo: ¿Le interesa fortalecer sus destrezas laborales? }
  # P-44: preguntas del registro que alimentan la matriz del plan de acción y el perfil ocupacional (Guía operativa, sección 5)
  - { id: ha_trabajado,        grupo: registro, bloque: recorrer-pnud, clave: ha_trabajado_anteriormente, titulo: ¿Ha trabajado anteriormente? }
  - { id: sector_interes,      grupo: registro, bloque: recorrer-pnud, clave: en_que_sector_le_interesa_laborar, titulo: Sector en el que le interesa laborar }
  - { id: oficio_interes,      grupo: registro, bloque: recorrer-pnud, clave: en_que_oficio_actividad_labor_esta_interesada_o_en_laborar, titulo: Oficio o labor en la que le interesa trabajar }
  - { id: razones_trabajar,    grupo: registro, bloque: recorrer-pnud, clave: cuales_son_las_principales_razones_por_las_que_le_gustaria_t, titulo: Razón principal para trabajar }
  - { id: certificaciones,     grupo: registro, bloque: recorrer-pnud, clave: cuenta_con_certificaciones_laborales_que_respalden_su_experi, titulo: ¿Tiene certificaciones laborales de su experiencia? }
  - { id: red_apoyo,           grupo: registro, bloque: recorrer-pnud, clave: cuenta_con_una_red_de_apoyo_familiares_amigos_u_otras_person, titulo: ¿Tiene red de apoyo para el cuidado mientras trabaja? }
  - { id: preparado_entrevista, grupo: registro, bloque: recorrer-pnud, clave: se_siente_preparado_a_para_una_entrevista_laboral_nada_1_ten, tipo: escala, titulo: ¿Se siente preparado/a para una entrevista? (1 a 5) }
  - { id: documentos_dia,      grupo: registro, bloque: recorrer-pnud, clave: dispone_de_todos_sus_documentos_al_dia_cedula_permisos_certi, titulo: ¿Tiene todos sus documentos al día? }
  - { id: costos_documentos,   grupo: registro, bloque: recorrer-pnud, clave: tiene_dificultades_para_cubrir_los_costos_de_las_certificaci, titulo: ¿Tiene dificultades para cubrir el costo de documentos faltantes? }
  - { id: conoce_mercado,      grupo: registro, bloque: recorrer-pnud, clave: conoce_como_se_mueve_el_empleo_en_su_region_como_contratan_l, titulo: ¿Conoce cómo se mueve el empleo en su región y sus derechos laborales? }
  - { id: conoce_spe,          grupo: registro, bloque: recorrer-pnud, clave: conoce_la_oferta_del_servicios_publico_de_empleo_y_los_canal, titulo: ¿Conoce la oferta del Servicio Público de Empleo? }
  - { id: tiene_competencias,  grupo: registro, bloque: recorrer-pnud, clave: considera_que_tiene_las_competencias_y_la_experiencia_necesa, titulo: ¿Tiene las competencias y la experiencia para los empleos de su interés? }
  - { id: oportunidades_zona,  grupo: registro, bloque: recorrer-pnud, clave: percibe_que_existen_oportunidades_laborales_en_su_zona_1_nad, tipo: escala, titulo: ¿Percibe oportunidades laborales en su zona? (1 a 5) }
  - { id: vestuario_formal,    grupo: registro, bloque: recorrer-pnud, clave: cuenta_con_un_vestuario_formal_para_presentarse_a_una_entrev, titulo: ¿Tiene vestuario formal para una entrevista? }
  - { id: recursos_transporte, grupo: registro, bloque: recorrer-pnud, clave: cuenta_con_los_recursos_economicos_para_tomar_un_transporte, titulo: ¿Tiene recursos para el transporte a una entrevista o los primeros días? }

  # ── Perfil del registro de la plataforma (bloque perfil, D-75 · P-44) ──
  # Datos sociodemográficos (socio_demographic_data). Solo el reporte de población los usa; sin grupo: la función pública no los cuenta.
  - { id: tiene_dependientes,  bloque: perfil, clave: has_dependents, titulo: ¿Tiene personas dependientes?, etiquetas: { "true": Sí, "false": "No" } }
  - id: personas_cuidado
    bloque: perfil
    clave: caregiving_responsibilities
    titulo: Personas a su cuidado
    etiquetas: { hijos: Hijos, adultos_mayores: Adultos mayores, personas_discapacidad: Personas con discapacidad, persona_con_enfermedad: Persona con enfermedad, multiple: Varias, ninguna: Ninguna }
  - { id: internet,            bloque: perfil, clave: internet_access, titulo: Acceso a internet, etiquetas: { estable: Estable, inestable: Inestable, dificultad: Con dificultad, no_acceso: Sin acceso } }
  - id: ingresos_registro
    bloque: perfil
    clave: monthly_income
    titulo: Ingresos mensuales (registro)
    etiquetas: { menos_500k: "Menos de $500.000", 500k_1m: "$500.000 – $1.000.000", 1m_2m: "$1.000.000 – $2.000.000", 2m_4m: "$2.000.000 – $4.000.000", mas_4m: "Más de $4.000.000", prefiero_no_decir: Prefiere no decir }
  - id: personas_hogar_registro
    bloque: perfil
    clave: household_size
    tipo: numero
    titulo: Personas en el hogar (registro)
    rangos: [{ hasta: 1, label: "1" }, { hasta: 2, label: "2" }, { hasta: 3, label: "3" }, { hasta: 4, label: "4" }, { label: 5 o más }]

  # ── Línea base (bloque linea-base) · 1. Caracterización ──
  - { id: grupos_poblacionales, grupo: linea_base, bloque: linea-base, clave: usted_considera_que_pertenece_a_uno_o_varios_de_los_siguient, tipo: multiple, titulo: Grupos poblacionales }
  - { id: discapacidad,        grupo: linea_base, bloque: linea-base, clave: es_usted_una_persona_en_condicion_de_discapacidad, titulo: ¿Persona en condición de discapacidad? }
  - { id: tipo_discapacidad,   grupo: linea_base, bloque: linea-base, clave: que_tipo_de_discapacidad_tiene, tipo: multiple, titulo: Tipo de discapacidad, si: { clave: es_usted_una_persona_en_condicion_de_discapacidad, en: [Sí] }, nota: "El formulario de la plataforma repite «intelectual» y no tiene «visual» ni «múltiple»." }
  # ── 2. Educación y empleabilidad ──
  - { id: estudiando,          grupo: linea_base, bloque: linea-base, clave: actualmente_se_encuentra_estudiando_en_algun_nivel_educativo, titulo: ¿Está estudiando actualmente? }
  - { id: razon_no_estudia,    grupo: linea_base, bloque: linea-base, clave: cual_considera_que_es_la_razon_rincipal_por_la_que_actualmen, titulo: Razón principal por la que no estudia, si: { clave: actualmente_se_encuentra_estudiando_en_algun_nivel_educativo, en: [No] } }
  - { id: capacitacion,        grupo: linea_base, bloque: linea-base, clave: asiste_o_asistio_a_un_programa_de_capacitacion_o_formacion_p, titulo: ¿Asiste o asistió a capacitación para el trabajo? }
  - { id: habilidades_fortalezas, grupo: linea_base, bloque: linea-base, clave: seleccione_todas_las_habilidades_o_capacidades_que_considera, tipo: multiple, titulo: Habilidades o capacidades que son sus mayores fortalezas }
  - { id: competencias_tecnicas, grupo: linea_base, bloque: linea-base, clave: seleccione_dos_competencias_tecnicas_con_mayores_fortalezas, tipo: multiple, titulo: Competencias técnicas con mayores fortalezas }
  - { id: capacidad_empleo,    grupo: linea_base, bloque: linea-base, clave: en_una_escala_de_1_a_5_siendo_1_muy_bajo_y_5_muy_alto_mencio, tipo: escala, titulo: ¿Qué tan capaz se siente de conseguir empleo? (1 a 5) }
  - { id: tipo_empleo,         grupo: linea_base, bloque: linea-base, clave: que_tipo_de_empleo_le_gustaria_conseguir, titulo: Tipo de empleo que le gustaría conseguir }
  # ── 3. Barreras (escala 1 a 5) ──
  - { id: b_cultura,       grupo: linea_base, bloque: linea-base, clave: adaptacion_a_la_cultura_organizacional_dificultades_para_ada, tipo: escala, titulo: Adaptación a la cultura organizacional }
  - { id: b_vestuario,     grupo: linea_base, bloque: linea-base, clave: falta_de_recursos_para_el_vestuario_laboral_entrevistas_y_o, tipo: escala, titulo: Recursos para vestuario laboral }
  - { id: b_transporte,    grupo: linea_base, bloque: linea-base, clave: falta_de_recursos_para_movilizarse_a_entrevistas_y_o_inicio, tipo: escala, titulo: Transporte a entrevistas }
  - { id: b_cuidado,       grupo: linea_base, bloque: linea-base, clave: falta_de_apoyo_para_el_cuidado_de_personas_dependientes_hijo, tipo: escala, titulo: Cuidado de dependientes }
  - { id: b_conciliar,     grupo: linea_base, bloque: linea-base, clave: dificultades_para_conciliar_las_responsabilidades_laborales, tipo: escala, titulo: Conciliar trabajo y familia }
  - { id: b_discriminacion, grupo: linea_base, bloque: linea-base, clave: experiencias_previas_de_discriminacion_en_seleccion_y_o_cont, tipo: escala, titulo: Discriminación en selección o contratación }
  - { id: situacion_discriminacion, grupo: linea_base, bloque: linea-base, clave: cual_de_las_siguientes_situaciones_de_discriminacion_ha_expe, titulo: Situación de discriminación vivida, si: { clave: experiencias_previas_de_discriminacion_en_seleccion_y_o_cont, en: ["2 - Barrera baja", "3 - Barrera moderada", "4 - Barrera alta", "5 - Barrera muy alta"], texto: "que calificaron la discriminación como barrera (2 a 5)" } }
  - { id: ajustes_apoyo,   grupo: linea_base, bloque: linea-base, clave: usted_considera_que_requieres_algun_ajuste_adaptacion_o_prod, tipo: multiple, titulo: Ajustes o productos de apoyo que requiere }
  - { id: b_convalidacion, grupo: linea_base, bloque: linea-base, clave: falta_de_recursos_u_orientacion_para_la_convalidacion_de_tit, tipo: escala, titulo: Convalidación de títulos }
  - { id: b_transversales, grupo: linea_base, bloque: linea-base, clave: falencia_en_habilidades_transversales_socioemocionales_neces, tipo: escala, titulo: Habilidades socioemocionales }
  - { id: b_tecnicas,      grupo: linea_base, bloque: linea-base, clave: falencia_en_habilidades_tecnicas_especificas_necesidad_de_fo, tipo: escala, titulo: Habilidades técnicas específicas }
  - { id: b_certificacion, grupo: linea_base, bloque: linea-base, clave: competencias_laborales_no_certificadas_experiencia_o_conocim, tipo: escala, titulo: Competencias laborales no certificadas }
  - { id: b_tramites,      grupo: linea_base, bloque: linea-base, clave: falta_de_conocimiento_en_tramites_de_regulacion_desconocimie, tipo: escala, titulo: Trámites de regulación }
  - { id: b_dependencia,   grupo: linea_base, bloque: linea-base, clave: dependencia_de_otra_persona_para_asumir_costos_asociados_al, tipo: escala, titulo: Dependencia de otra persona para costos }
  - { id: b_recursos,      grupo: linea_base, bloque: linea-base, clave: falta_de_recursos_propios_internet_llamadas_impresion_de_hoj, tipo: escala, titulo: Falta de recursos propios }
  - { id: b_financiera,    grupo: linea_base, bloque: linea-base, clave: dificultades_para_la_inclusion_financiera_como_el_acceso_el, tipo: escala, titulo: Inclusión financiera }
  - { id: b_virtuales,     grupo: linea_base, bloque: linea-base, clave: dificultades_para_realizar_tramites_virtuales_relacionados_c, tipo: escala, titulo: Trámites virtuales }
  - id: barrera_alta
    grupo: linea_base
    bloque: linea-base
    tipo: alguna
    titulo: Personas con al menos una barrera alta (4 o 5)
    en: ["4", "5"]
    claves:
      - adaptacion_a_la_cultura_organizacional_dificultades_para_ada
      - falta_de_recursos_para_el_vestuario_laboral_entrevistas_y_o
      - falta_de_recursos_para_movilizarse_a_entrevistas_y_o_inicio
      - falta_de_apoyo_para_el_cuidado_de_personas_dependientes_hijo
      - dificultades_para_conciliar_las_responsabilidades_laborales
      - experiencias_previas_de_discriminacion_en_seleccion_y_o_cont
      - falta_de_recursos_u_orientacion_para_la_convalidacion_de_tit
      - falencia_en_habilidades_transversales_socioemocionales_neces
      - falencia_en_habilidades_tecnicas_especificas_necesidad_de_fo
      - competencias_laborales_no_certificadas_experiencia_o_conocim
      - falta_de_conocimiento_en_tramites_de_regulacion_desconocimie
      - dependencia_de_otra_persona_para_asumir_costos_asociados_al
      - falta_de_recursos_propios_internet_llamadas_impresion_de_hoj
      - dificultades_para_la_inclusion_financiera_como_el_acceso_el
      - dificultades_para_realizar_tramites_virtuales_relacionados_c
  - { id: apoyo_orientacion,   grupo: linea_base, bloque: linea-base, clave: usted_ha_tenido_apoyo_y_orientacion_laboral_por_parte_de_alg, titulo: ¿Ha tenido apoyo y orientación laboral de alguna entidad? }
  - { id: entidad_orientacion, grupo: linea_base, bloque: linea-base, clave: cual_de_estas_entidades_le_brindo_esta_orientacion, titulo: Entidad que brindó la orientación, si: { clave: usted_ha_tenido_apoyo_y_orientacion_laboral_por_parte_de_alg, en: [Sí] } }
  # ── 4. Autonomía económica ──
  - { id: credito_negado,      grupo: linea_base, bloque: linea-base, clave: alguna_vez_ha_solicitado_un_credito_y_le_fue_negado, titulo: ¿Le han negado un crédito? }
  - { id: conoce_financieros,  grupo: linea_base, bloque: linea-base, clave: considera_que_tiene_suficientes_conocimientos_para_acceder_a, titulo: ¿Tiene conocimientos para acceder a productos financieros? }
  - { id: productos_financieros, grupo: linea_base, bloque: linea-base, clave: cuales_de_los_siguientes_productos_o_servicios_financieros_t, titulo: Producto financiero que tiene, nota: "En la plataforma es de selección única (la encuesta permite varias)." }
  - { id: uso_autonomo,        grupo: linea_base, bloque: linea-base, clave: utiliza_estos_productos_financieros_o_billeteras_digitales_d, titulo: ¿Usa productos financieros o billeteras de forma autónoma? }
  - { id: gota_a_gota,         grupo: linea_base, bloque: linea-base, clave: usted_ha_tenido_que_recurrir_a_creditos_o_prestamos_informal, titulo: ¿Ha recurrido a préstamos informales (gota a gota)? }
  - id: ingresos_personales
    grupo: linea_base
    bloque: linea-base
    clave: en_el_mes_pasado_a_cuanto_ascendieron_sus_ingresos_totales
    tipo: monto
    titulo: Ingresos personales del mes pasado
    rangos: &ingresos
      - { hasta: 0,       label: Sin ingresos }
      - { hasta: 500000,  label: "Hasta $500.000" }
      - { hasta: 1000000, label: "$500.001 – $1.000.000" }
      - { hasta: 1500000, label: "$1.000.001 – $1.500.000" }
      - { hasta: 2000000, label: "$1.500.001 – $2.000.000" }
      - { hasta: 3000000, label: "$2.000.001 – $3.000.000" }
      - { hasta: 5000000, label: "$3.000.001 – $5.000.000" }
      - { label: "Más de $5.000.000" }
  - { id: autonomia_ingresos,  grupo: linea_base, bloque: linea-base, clave: considera_que_tiene_autonomia_para_decidir_sobre_el_uso_de_s, titulo: ¿Tiene autonomía para decidir sobre sus ingresos? }
  - { id: satisfaccion_autonomia, grupo: linea_base, bloque: linea-base, clave: que_tan_satisfecha_o_se_siente_con_su_nivel_actual_de_autono, tipo: escala, titulo: Satisfacción con su autonomía económica }
  - { id: cubre_alimentacion,  grupo: linea_base, bloque: linea-base, clave: lb_ingresos_cubren_alimentacion, titulo: Alimentación }
  - { id: cubre_vivienda,      grupo: linea_base, bloque: linea-base, clave: lb_ingresos_cubren_vivienda, titulo: Vivienda }
  - { id: cubre_servicios,     grupo: linea_base, bloque: linea-base, clave: lb_ingresos_cubren_servicios_publicos, titulo: Servicios públicos }
  - { id: cubre_salud,         grupo: linea_base, bloque: linea-base, clave: lb_ingresos_cubren_salud, titulo: Salud }
  - { id: cubre_vestuario,     grupo: linea_base, bloque: linea-base, clave: lb_ingresos_cubren_vestuario, titulo: Vestuario }
  - { id: ahorrar,             grupo: linea_base, bloque: linea-base, clave: sus_ingresos_actuales_le_permiten_ahorrar, titulo: Ahorrar }
  # ── Salud ──
  - { id: regimen_salud,       grupo: linea_base, bloque: linea-base, clave: a_cual_de_los_siguientes_regimenes_de_seguridad_social_en_sa, titulo: Régimen de salud al que está afiliado }
  - { id: no_afiliacion,       grupo: linea_base, bloque: linea-base, clave: por_que_razon_principal_no_esta_afiliado_o_no_es_beneficiari, titulo: Razón de no afiliación, si: { clave: a_cual_de_los_siguientes_regimenes_de_seguridad_social_en_sa, en: [Ninguno] } }
  - { id: estado_salud,        grupo: linea_base, bloque: linea-base, clave: como_calificaria_su_estado_de_salud_actual, tipo: escala, titulo: Estado de salud actual }
  # ── Hogar y vivienda ──
  - { id: parentesco,          grupo: linea_base, bloque: linea-base, clave: cual_es_su_relacion_parentesco_con_el_la_jefe_del_hogar, titulo: Parentesco con el jefe del hogar }
  - id: tamano_hogar
    grupo: linea_base
    bloque: linea-base
    clave: cuantas_personas_conforman_su_hogar_incluyendolo_a_usted
    tipo: numero
    titulo: Personas en el hogar
    rangos: [{ hasta: 1, label: "1" }, { hasta: 2, label: "2" }, { hasta: 3, label: "3" }, { hasta: 4, label: "4" }, { hasta: 5, label: "5" }, { label: 6 o más }]
  - { id: apoyo_cuidado,       grupo: linea_base, bloque: linea-base, clave: cuando_necesita_estudiar_trabajar_o_asistir_a_actividades_de, titulo: ¿Cuenta con apoyo para el cuidado cuando estudia o trabaja? }
  - { id: vivienda_tipo,       grupo: linea_base, bloque: linea-base, clave: lb_vivienda_tipo, titulo: Tipo de vivienda }
  - { id: vivienda_tenencia,   grupo: linea_base, bloque: linea-base, clave: lb_vivienda_tenencia, titulo: Tenencia de la vivienda }
  - { id: servicios_vivienda,  grupo: linea_base, bloque: linea-base, clave: con_cuales_de_los_siguientes_servicios_cuenta_la_vivienda, tipo: multiple, titulo: Servicios con los que cuenta la vivienda }
  - id: hacinamiento
    grupo: linea_base
    bloque: linea-base
    clave: cuantas_personas_conforman_su_hogar_incluyendolo_a_usted
    entre: en_cuantos_de_esos_cuartos_duermen_las_personas_de_este_hoga
    tipo: razon
    titulo: Hacinamiento (personas por cuarto para dormir)
    rangos: [{ hasta: 2, label: Sin hacinamiento (2 o menos) }, { label: Hacinamiento (más de 2) }]
  - { id: cocina,              grupo: linea_base, bloque: linea-base, clave: en_el_lugar_donde_reside_tiene_acceso_a_una_cocina_para_coci, titulo: ¿Tiene acceso a una cocina? }
  - { id: bienes_hogar,        grupo: linea_base, bloque: linea-base, clave: cuales_de_los_siguientes_bienes_tiene_en_el_hogar, tipo: multiple, titulo: Bienes del hogar }
  - { id: ingresos_hogar,      grupo: linea_base, bloque: linea-base, clave: aproximadamente_cuales_fueron_los_ingresos_de_su_hogar_en_el, tipo: monto, titulo: Ingresos del hogar del último mes, rangos: *ingresos }
  - { id: aporte_mayor,        grupo: linea_base, bloque: linea-base, clave: quien_aporta_la_mayor_parte_de_los_ingresos_de_su_hogar, titulo: Quién aporta la mayor parte de los ingresos }
  - { id: hogar_depende,       grupo: linea_base, bloque: linea-base, clave: su_hogar_depende_economicamente_de_sus_ingresos, titulo: ¿El hogar depende de sus ingresos? }
  - { id: gastos_hogar,        grupo: linea_base, bloque: linea-base, clave: en_promedio_a_cuanto_ascendieron_los_gastos_de_su_hogar_en_e, tipo: monto, titulo: Gastos del hogar del último mes, rangos: [{ hasta: 0, label: Sin gastos }, { hasta: 500000, label: "Hasta $500.000" }, { hasta: 1000000, label: "$500.001 – $1.000.000" }, { hasta: 2000000, label: "$1.000.001 – $2.000.000" }, { hasta: 3000000, label: "$2.000.001 – $3.000.000" }, { hasta: 5000000, label: "$3.000.001 – $5.000.000" }, { label: "Más de $5.000.000" }] }
  - id: aportantes
    grupo: linea_base
    bloque: linea-base
    clave: cuantos_miembros_de_su_familia_aportan_economicamente_a_los
    tipo: numero
    titulo: Miembros que aportan a los gastos del hogar
    rangos: [{ hasta: 0, label: "0" }, { hasta: 1, label: "1" }, { hasta: 2, label: "2" }, { label: 3 o más }]
  - { id: decisiones_gastos,   grupo: linea_base, bloque: linea-base, clave: participa_en_las_decisiones_sobre_los_gastos_principales_del, titulo: ¿Participa en las decisiones de gasto del hogar? }
  - id: gasto_alimentacion
    grupo: linea_base
    bloque: linea-base
    clave: en_el_mes_anterior_cuanto_gasto_su_hogar_en_alimentacion_inc
    tipo: monto
    titulo: "Gasto del hogar: alimentación"
    rangos: &gastos
      - { hasta: 0,       label: No gastó }
      - { hasta: 100000,  label: "Hasta $100.000" }
      - { hasta: 300000,  label: "$100.001 – $300.000" }
      - { hasta: 500000,  label: "$300.001 – $500.000" }
      - { hasta: 1000000, label: "$500.001 – $1.000.000" }
      - { hasta: 2000000, label: "$1.000.001 – $2.000.000" }
      - { label: "Más de $2.000.000" }
  - { id: gasto_vivienda,   grupo: linea_base, bloque: linea-base, clave: en_el_mes_anterior_cuanto_gasto_su_hogar_en_vivienda_incluye, tipo: monto, titulo: "Gasto del hogar: vivienda", rangos: *gastos }
  - { id: gasto_limpieza,   grupo: linea_base, bloque: linea-base, clave: en_el_mes_anterior_cuanto_gasto_su_hogar_en_articulos_de_lim, tipo: monto, titulo: "Gasto del hogar: limpieza e higiene", rangos: *gastos }
  - { id: gasto_educacion,  grupo: linea_base, bloque: linea-base, clave: en_el_mes_anterior_cuanto_gasto_su_hogar_en_educacion_matric, tipo: monto, titulo: "Gasto del hogar: educación", rangos: *gastos }
  - { id: gasto_vestuario,  grupo: linea_base, bloque: linea-base, clave: en_el_mes_anterior_cuanto_gasto_su_hogar_en_vestuario_ropa_y, tipo: monto, titulo: "Gasto del hogar: vestuario", rangos: *gastos }
  - { id: gasto_salud,      grupo: linea_base, bloque: linea-base, clave: en_el_mes_anterior_cuanto_gasto_su_hogar_en_salud_y_medicame, tipo: monto, titulo: "Gasto del hogar: salud", rangos: *gastos }
  - { id: gasto_transporte, grupo: linea_base, bloque: linea-base, clave: en_el_mes_anterior_cuanto_gasto_su_hogar_en_transporte_y_com, tipo: monto, titulo: "Gasto del hogar: transporte", rangos: *gastos }
  - { id: gasto_deudas,     grupo: linea_base, bloque: linea-base, clave: en_el_mes_anterior_cuanto_gasto_su_hogar_en_pago_de_deudas, tipo: monto, titulo: "Gasto del hogar: pago de deudas", rangos: *gastos }
  # ── 5. Expectativas ──
  - { id: expectativas,        grupo: linea_base, bloque: linea-base, clave: que_expectativas_tiene_de_la_ruta_de_inclusion_laboral_recor, titulo: Expectativas de la ruta Recorrer }
  - { id: barreras_mitigar,    grupo: linea_base, bloque: linea-base, clave: que_barreras_quiere_mitigar, tipo: multiple, titulo: Barreras que quiere mitigar, si: { clave: que_expectativas_tiene_de_la_ruta_de_inclusion_laboral_recor, en: ["Mitigar barreras (competencias o habilidades, económica, etc.)"] } }
  - { id: calificacion_ruta,   grupo: linea_base, bloque: linea-base, clave: hasta_el_momento_como_calificaria_en_general_la_ruta_de_incl, tipo: escala, titulo: Calificación de la ruta hasta el momento }
```

## Pestañas del Dashboard

Cada pestaña: hasta 4 cifras y 6 gráficos. `meta` = nombre de la meta en `cohort_goals` (muestra «de N» con barra).

```yaml
pestanas:
  - id: hitos
    titulo: Hitos
    metas: true          # P-09: sin el aviso «fuera de Meta» (pedido de Sebastián, 16-oct)
    embudo: true

  - id: personas
    titulo: Personas
    cifras:
      - { label: Personas registradas, valor: "formularios[recorrer-pnud].personas", meta: Personas registradas }
      - { label: Mujeres registradas,  valor: "formularios[recorrer-pnud].mujeres",  meta: Mujeres registradas }
      - { label: Con línea base,       valor: "formularios[linea-base].personas", de: "formularios[recorrer-pnud].personas", deLabel: registradas, faltan: aún sin línea base }
    graficos:
      # P-22: registros por día, a todo el ancho (D-62)
      - { titulo: Registros por día, nota: "Personas que se registraron cada día · filtro por mes", tipo: linea, datos: registros_por_dia }
      - { titulo: Género y edad, nota: "Registro · campo «Género»", tipo: dona, datos: postulaciones.por_genero, debajo: postulaciones.por_edad_rangos }
      - titulo: Nivel educativo
        nota: Registro · sin agrupar, de menor a mayor
        tipo: barras
        datos: postulaciones.por_nivel_educativo
        orden: [Ninguno, Primaria, Secundaria, Media Bachiller, Técnico, Tecnológico, Profesional, Profesional universitario, Especialización, Maestría, Doctorado]
      # P-11: municipio de las personas registradas, parte del hito P2 (A-18, sin agrupar)
      - { titulo: Municipio de las personas registradas, nota: "Registro · municipio de residencia · todos los municipios", tipo: barras, datos: postulaciones.por_municipio_todos }
      - { titulo: ¿Qué tan capaz se siente de conseguir empleo?, nota: "Línea base · % que responde 4 o 5", tipo: apilada, pregunta: capacidad_empleo, porGenero: true, destacar: ["4", "5"] }
      - titulo: Las 5 barreras más altas
        nota: Línea base · % que la califica 4 o 5 · mujeres vs hombres
        tipo: pareadas
        destacar: ["4", "5"]
        top: 5
        preguntas: [b_cultura, b_vestuario, b_transporte, b_cuidado, b_conciliar, b_discriminacion, b_convalidacion, b_transversales, b_tecnicas, b_certificacion, b_tramites, b_dependencia, b_recursos, b_financiera, b_virtuales]
      - { titulo: ¿Sus ingresos le alcanzan para…?, nota: "Línea base · el número es el % que responde «No»", tipo: apilada, paleta: sino, destacar: ["No"], preguntas: [cubre_alimentacion, cubre_vivienda, cubre_servicios, cubre_salud, cubre_vestuario, ahorrar] }
      - { titulo: Ingresos personales del mes pasado, nota: "Línea base · rangos hasta $5.000.000", tipo: barras, pregunta: ingresos_personales }
    pie: "El detalle completo (salud, vivienda, inclusión financiera, expectativas, las 15 barreras…) se descarga en Informes."

  - id: empresas
    titulo: Empresas
    cifras:
      - { label: Empresas aliadas,        valor: empresas.aliadas }
      - { label: Empresas sensibilizadas, valor: empresas.con_diagnostico, meta: Empresas sensibilizadas en empleo inclusivo }
      - { label: Vacantes del proyecto,   valor: vacantes.total, nota: "En {vacantes.empresas_con_vacantes} empresas" }
      - { label: Personas vinculadas,     valor: empleabilidad.colocados, meta: Personas vinculadas laboralmente }
    graficos:
      - { titulo: Tamaño de las empresas, nota: Por número de trabajadores, tipo: dona, datos: empresas.por_tamano }
      - { titulo: Sector económico, nota: Todas las categorías, tipo: barras, datos: empresas.por_sector }
      - { titulo: Nivel educativo que piden las vacantes, nota: Por puesto, tipo: barras, datos: vacantes.por_nivel_educativo }
      - { titulo: Salario de las vacantes, nota: En SMMLV, tipo: barras, datos: vacantes.por_salario }
    pie: Municipio de operación, experiencia, tipo de contrato y modalidad se descargan en Informes.
```

## Informe (módulo Informes, solo equipo)

```yaml
informe:
  hojas:
    - { nombre: 1 Hitos, contenido: metas, descripcion: "Las 12 metas del contrato: actual, objetivo, % de avance y estado" }
    - nombre: 2 Registro
      descripcion: Género, edad, nivel educativo, municipio y las preguntas de selección del registro
      cifras: [{ label: Personas registradas, valor: "formularios[recorrer-pnud].personas" }, { label: Mujeres registradas, valor: "formularios[recorrer-pnud].mujeres" }]
      listas:
        - { titulo: Género, datos: postulaciones.por_genero, nota: "Campo «Género» del registro" }
        - { titulo: Edad, datos: postulaciones.por_edad_rangos }
        - { titulo: Nivel educativo, datos: postulaciones.por_nivel_educativo }
        - { titulo: Municipio de residencia, datos: postulaciones.por_municipio_todos }
      preguntas: registro
    - nombre: 3 Línea base
      descripcion: "Todas las preguntas de selección de la línea base (15 barreras, empleabilidad, salud, autonomía, hogar, vivienda, expectativas), montos en rangos"
      cifras: [{ label: Personas con línea base, valor: "formularios[linea-base].personas" }, { label: Mujeres con línea base, valor: "formularios[linea-base].mujeres" }]
      preguntas: linea_base
    - nombre: 4 Empresas y vacantes
      descripcion: "Indicadores del P1, tamaño, sector, municipio; nivel educativo, experiencia, salario, contrato y modalidad de las vacantes; intermediación"
      cifras:
        - { label: Empresas aliadas, valor: empresas.aliadas }
        - { label: Empresas sensibilizadas, valor: empresas.con_diagnostico }
        - { label: Espacios de aprendizaje con empresas realizados, valor: "formacion.eventos_por_tipo[sensibilizacion].realizados" }
        - { label: Vacantes (puestos), valor: vacantes.total }
        - { label: Cargos, valor: vacantes.cargos }
        - { label: Empresas con vacantes, valor: vacantes.empresas_con_vacantes }
        - { label: Personas postuladas a vacantes del proyecto (A-16), valor: empleabilidad.personas_postuladas_aliadas }
        - { label: Mujeres postuladas a vacantes del proyecto, valor: empleabilidad.personas_postuladas_aliadas_mujeres }
        - { label: Personas vinculadas laboralmente, valor: empleabilidad.colocados }
      listas:
        - { titulo: Tamaño, datos: empresas.por_tamano }
        - { titulo: Sector económico, datos: empresas.por_sector }
        - { titulo: Ubicación principal, datos: empresas.por_ubicacion }
        - { titulo: Municipio de operación, datos: empresas.por_municipio, nota: Una empresa puede operar en varios municipios }
        - { titulo: "Vacantes: nivel educativo", datos: vacantes.por_nivel_educativo }
        - { titulo: "Vacantes: experiencia", datos: vacantes.por_experiencia }
        - { titulo: "Vacantes: salario", datos: vacantes.por_salario }
        - { titulo: "Vacantes: tipo de contrato", datos: vacantes.por_contrato }
        - { titulo: "Vacantes: modalidad", datos: vacantes.por_modalidad }
```

## Reporte ejecutivo de población (PDF, P-41 · v2 P-44 · D-74/D-75 de la plantilla)

Insumo para el informe PNUD. Estudia la población: sin hitos ni empresas. Rango de fechas de registro (sirve para
cualquier evento entre dos fechas), todo por género, y **solo personas que respondieron el registro y la línea base**;
las respuestas vacías no se cuentan (cada gráfico dice sobre cuántas personas y, si no respondieron todas, a cuántas
les aplicaba). Hallazgos calculados por el sistema. Sin test de Holland (no está en la plataforma).

**v2 (P-44, 02-nov)** — reunión «Data Recorrer 2» (30-oct) y *Guía operativa · Ruta Recorrer Meta*:
- Las secciones fluyen sin una hoja por tema (el PDF v1 tenía ~10 hojas con espacios en blanco).
- Cruces nuevos: barreras × edad, barreras × grupo poblacional, necesidades × edad y × grupo poblacional, tipo de
  empleo × nivel educativo. El género va en cada barra (M / H).
- **Matriz del plan de acción** (guía, sección 5): 10 necesidades; señal = respuesta del registro o barrera 4–5 de la
  línea base (basta una). **Grupos perfilados G1–G6** (una persona puede estar en varios; G6 = sin ninguna necesidad).
  **Prioridad** = mujeres con personas a cargo. Excel «Matriz por persona» (con datos personales, solo equipo).
- Perfil ocupacional (sector, oficio, razones, competencias, tipo de empleo) y preparación / mercado laboral.
- Embudo de la ruta sobre todas las registradas del periodo.
- «Otros» sin especificar se informa aparte (habilidades y competencias técnicas) y una tabla de calidad del dato.
- Recuadro de observaciones del equipo (lo recogido en territorio): se escribe en la vista previa; vacío no se imprime.
- Pendiente de la guía, fuera de la plataforma: test de Holland, cursos recomendados (Excel del perfilamiento), Ficha 3
  y el registro de cada servicio prestado. «Proceso de selección en curso» como criterio de prioridad no se usa aún.

```yaml
reporte:
  titulo: Reporte de población
  completos: [recorrer-pnud, linea-base]
  completosTexto: el registro y la línea base

  # Matriz del plan de acción (Guía operativa, sección 5). Escala de barreras: señal = 4 o 5.
  necesidades:
    - id: transporte
      titulo: Transporte
      apoyo: Apoyo para transporte
      senales:
        - { pregunta: recursos_transporte, en: ["No", Definitivamente no, "Sí, sacrificando otras necesidades básicas"] }
        - { pregunta: b_transporte, en: ["4", "5"] }
        - { pregunta: b_dependencia, en: ["4", "5"] }
    - id: presentacion
      titulo: Presentación personal
      apoyo: Dotación básica para procesos de selección
      senales:
        - { pregunta: vestuario_formal, en: ["No"] }
        - { pregunta: b_vestuario, en: ["4", "5"] }
    - id: cuidado
      titulo: Cuidado
      apoyo: Apoyo parcial para servicios de cuidado
      senales:
        - todas: [{ pregunta: tiene_dependientes, en: [Sí] }, { pregunta: red_apoyo, en: ["No"] }]
        - { pregunta: b_cuidado, en: ["4", "5"] }
        - { pregunta: b_conciliar, en: ["4", "5"] }
        - { pregunta: apoyo_cuidado, en: [Nunca] }
    - id: conectividad
      titulo: Conectividad
      apoyo: Auxilio de conectividad y acompañamiento para entrar a los cursos
      senales:
        - { pregunta: internet, en: [Sin acceso] }
        - { pregunta: b_recursos, en: ["4", "5"] }
        - { pregunta: b_virtuales, en: ["4", "5"] }
    - id: documentos
      titulo: Documentos
      apoyo: Remisión y orientación para el trámite (no es apoyo económico)
      senales:
        - { pregunta: documentos_dia, en: ["No", Necesita gestionar un documento importante para trabajar] }
        - { pregunta: costos_documentos, en: [Sí] }
        - { pregunta: b_tramites, en: ["4", "5"] }
    - id: certificar
      titulo: Certificar lo que ya sabe
      apoyo: Certificación de competencias (por definir)
      senales:
        - { pregunta: certificar, en: [Sí] }
        - { pregunta: certificaciones, en: ["No"] }
        - { pregunta: b_certificacion, en: ["4", "5"] }
    - id: formacion_tecnica
      titulo: Formación técnica
      apoyo: Curso técnico (por definir)
      senales:
        - { pregunta: requiere_curso, en: [Sí] }
        - { pregunta: tiene_competencias, en: ["No"] }
        - { pregunta: b_tecnicas, en: ["4", "5"] }
    - id: preparacion
      titulo: Preparación para entrevistas y habilidades transversales
      apoyo: Curso virtual «Ruta para la empleabilidad 2026» y refuerzo en el seguimiento
      senales:
        - { pregunta: preparado_entrevista, en: ["1", "2"] }
        - { pregunta: b_transversales, en: ["4", "5"] }
        - { pregunta: b_cultura, en: ["4", "5"] }
        - { pregunta: capacidad_empleo, en: ["1", "2"] }
    - id: mercado
      titulo: Conocimiento del mercado laboral
      apoyo: Registro y orientación en el SPE
      senales:
        - { pregunta: conoce_mercado, en: ["No"] }
        - { pregunta: conoce_spe, en: ["No"] }
        - { pregunta: apoyo_orientacion, en: ["No"] }
    - id: discriminacion
      titulo: Discriminación o ajustes
      apoyo: Ajuste razonable o acompañamiento en la intermediación
      senales:
        - { pregunta: b_discriminacion, en: ["4", "5"] }

  grupos:
    - { id: G1, titulo: "G1 · Barreras económicas inmediatas", quienes: Transporte o presentación personal, necesidades: [transporte, presentacion], servicio: "Apoyo para transporte o dotación, por llamada y correo, cuando tenga una entrevista o un inicio de labores" }
    - { id: G2, titulo: "G2 · Cuidado", quienes: Dependientes sin red de apoyo, necesidades: [cuidado], servicio: "Apoyo parcial para servicios de cuidado; prioridad mujeres con hijos menores" }
    - { id: G3, titulo: "G3 · Conectividad y uso digital", quienes: Sin internet o con dificultad en trámites virtuales, necesidades: [conectividad], servicio: Auxilio de conectividad y acompañamiento telefónico para entrar a los cursos }
    - { id: G4, titulo: "G4 · Formación técnica y certificación", quienes: Requiere un curso técnico o certificar una habilidad, necesidades: [formacion_tecnica, certificar], servicio: Análisis de cursos técnicos con el presupuesto de mitigación }
    - { id: G5, titulo: "G5 · Preparación para el empleo", quienes: Baja preparación para entrevistas o poco conocimiento del mercado laboral, necesidades: [preparacion, mercado], servicio: "Curso «Ruta para la empleabilidad 2026», registro en el SPE y refuerzo en el seguimiento" }
    - { id: G6, titulo: "G6 · Lista para intermediación", quienes: Sin señales en ninguna necesidad, ninguna: true, servicio: Intermediación directa con vacantes }

  prioridad: { label: Mujeres con personas a cargo, mujeres: true, senales: [{ pregunta: tiene_dependientes, en: [Sí] }] }

  # Excel «Matriz por persona»: además de necesidades, señales, grupos y prioridad (preguntas que orientan y priorizan).
  matriz:
    columnas: [municipio, nivel, grupos_poblacionales, discapacidad, tiene_dependientes, personas_cuidado, ingresos_registro, personas_hogar_registro, hogar_depende, sector_interes, oficio_interes, razones_trabajar, tipo_empleo, competencias_transv, habilidades_oficios, ha_trabajado, preparado_entrevista]

  paginas:
    - titulo: Resumen en cifras
      cifras:
        - { label: Con al menos una barrera alta, pregunta: barrera_alta, destacar: [Sí], nota: Alguna de las 15 barreras en 4 o 5 }
        - { label: Con al menos una necesidad, pregunta: "grupo:G6", destacar: ["No"], nota: De la matriz del plan de acción }
        - { label: Mujeres con personas a cargo, pregunta: prioridad, destacar: [Sí], nota: Prioridad en los servicios }
        - { label: Ingreso personal más frecuente, pregunta: ingresos_personales, moda: true }
        - { label: No le alcanza para alimentación, pregunta: cubre_alimentacion, destacar: ["No"] }
        - { label: Sin hoja de vida, regla: hv, negar: true, nota: Sin hoja de vida en la plataforma }
      hallazgos: true

    - titulo: ¿Quiénes son?
      subtitulo: Caracterización general
      graficos:
        - { titulo: Género, nota: Registro, tipo: dona, dato: genero }
        - { titulo: Edad, nota: Registro · fecha de nacimiento, tipo: barras, dato: edad, hallazgo: true }
        - { titulo: Grupos poblacionales, nota: Línea base, tipo: barras, pregunta: grupos_poblacionales, hallazgo: true }
        - { titulo: Municipio de residencia, nota: Registro · los 8 más frecuentes, tipo: barras, dato: municipio, top: 8 }
        - { titulo: Área, nota: Registro, tipo: barras, pregunta: area }
        - { titulo: Persona en condición de discapacidad, nota: Línea base, tipo: barras, pregunta: discapacidad }
        - { titulo: ¿Tiene personas dependientes?, nota: Registro, tipo: barras, pregunta: tiene_dependientes }
        - { titulo: Personas a su cuidado, nota: Registro, tipo: barras, pregunta: personas_cuidado }

    - titulo: Educación y formación
      graficos:
        - titulo: Nivel educativo
          nota: Registro · de menor a mayor
          tipo: barras
          dato: nivel
          orden: &niveles [Ninguno, Primaria, Secundaria, Media Bachiller, Técnico, Tecnológico, Profesional, Profesional universitario, Especialización, Maestría, Doctorado]
          hallazgo: true
        - { titulo: ¿Está estudiando actualmente?, nota: Línea base, tipo: barras, pregunta: estudiando }
        - { titulo: Razón principal por la que no estudia, nota: Línea base · quienes no estudian, tipo: barras, pregunta: razon_no_estudia }
        - { titulo: ¿Ha asistido a capacitación para el trabajo?, nota: Línea base, tipo: barras, pregunta: capacitacion }
        - { titulo: ¿Requiere certificar una habilidad?, nota: Registro, tipo: barras, pregunta: certificar }
        - { titulo: ¿Requiere formación para el trabajo o un curso corto?, nota: Registro, tipo: barras, pregunta: requiere_curso }

    - titulo: Barreras
      subtitulo: "% que califica cada barrera como alta (4) o muy alta (5)"
      graficos:
        - titulo: Las 15 barreras, de la más alta a la más baja
          nota: Línea base · escala de 1 a 5
          tipo: ranking
          destacar: ["4", "5"]
          preguntas: &barreras [b_cultura, b_vestuario, b_transporte, b_cuidado, b_conciliar, b_discriminacion, b_convalidacion, b_transversales, b_tecnicas, b_certificacion, b_tramites, b_dependencia, b_recursos, b_financiera, b_virtuales]
          hallazgo: true
        - { titulo: Barreras por rango de edad, nota: "% que la califica 4 o 5 dentro de cada rango", tipo: cruce, por: edad, destacar: ["4", "5"], preguntas: *barreras, hallazgo: true }
        - { titulo: Barreras por nivel educativo, nota: "% que la califica 4 o 5 dentro de cada nivel", tipo: cruce, por: nivel, orden: *niveles, destacar: ["4", "5"], preguntas: *barreras }
        - { titulo: Barreras por grupo poblacional, nota: "% que la califica 4 o 5 dentro de cada grupo · una persona puede estar en varios", tipo: cruce, por: grupos_poblacionales, destacar: ["4", "5"], preguntas: *barreras, hallazgo: true }
        - { titulo: Barreras que quiere mitigar, nota: Línea base · quienes esperan mitigar barreras de la ruta, tipo: barras, pregunta: barreras_mitigar }
        - { titulo: Ajustes o productos de apoyo que requiere, nota: Línea base, tipo: barras, pregunta: ajustes_apoyo }
        - { titulo: Situación de discriminación vivida, nota: Línea base · quienes califican la discriminación de 2 a 5, tipo: barras, pregunta: situacion_discriminacion }

    - titulo: Necesidades y grupos para el plan de acción
      subtitulo: "Matriz de la guía operativa: señal en el registro o barrera 4–5 en la línea base"
      cifras:
        - { label: Lista para intermediación, pregunta: "grupo:G6", destacar: [Sí], nota: Sin ninguna necesidad (G6) }
        - { label: El hogar depende totalmente de sus ingresos, pregunta: hogar_depende, destacar: [Totalmente], nota: Para priorizar }
        - { label: Tiene personas dependientes, pregunta: tiene_dependientes, destacar: [Sí], nota: Para priorizar }
      graficos:
        - { titulo: Necesidades detectadas, nota: "% con al menos una señal en la fila · el detalle por persona va en el Excel «Matriz por persona»", tipo: necesidades, hallazgo: true }
        - { titulo: Grupos perfilados, nota: Servicio de mitigación según la tendencia, tipo: grupos, hallazgo: true }
        - { titulo: Necesidades por rango de edad, nota: "% con la necesidad dentro de cada rango", tipo: cruce, por: edad, destacar: [Sí], preguntas: ["nec:transporte", "nec:presentacion", "nec:cuidado", "nec:conectividad", "nec:documentos", "nec:certificar", "nec:formacion_tecnica", "nec:preparacion", "nec:mercado", "nec:discriminacion"], hallazgo: true }
        - { titulo: Necesidades por grupo poblacional, nota: "% con la necesidad dentro de cada grupo", tipo: cruce, por: grupos_poblacionales, destacar: [Sí], preguntas: ["nec:transporte", "nec:presentacion", "nec:cuidado", "nec:conectividad", "nec:documentos", "nec:certificar", "nec:formacion_tecnica", "nec:preparacion", "nec:mercado", "nec:discriminacion"] }

    - titulo: Economía del hogar
      subtitulo: Ingresos, gastos y autonomía económica
      graficos:
        - { titulo: Ingresos personales del mes pasado, nota: Línea base, tipo: barras, pregunta: ingresos_personales, hallazgo: true }
        - { titulo: Ingresos del hogar del último mes, nota: Línea base, tipo: barras, pregunta: ingresos_hogar }
        - { titulo: ¿Sus ingresos le alcanzan para…?, nota: "Línea base · el número es el % que responde «No»", tipo: apilada, paleta: sino, destacar: ["No"], preguntas: [cubre_alimentacion, cubre_vivienda, cubre_servicios, cubre_salud, cubre_vestuario, ahorrar], hallazgo: true }
        - { titulo: Gasto del hogar por rubro, nota: Línea base · mes anterior, tipo: apilada, preguntas: [gasto_alimentacion, gasto_vivienda, gasto_transporte, gasto_salud, gasto_educacion, gasto_vestuario, gasto_limpieza, gasto_deudas] }
        - { titulo: ¿El hogar depende de sus ingresos?, nota: Línea base, tipo: barras, pregunta: hogar_depende }
        - { titulo: Quién aporta la mayor parte de los ingresos, nota: Línea base, tipo: barras, pregunta: aporte_mayor }
        - { titulo: ¿Ha recurrido a préstamos informales (gota a gota)?, nota: Línea base, tipo: barras, pregunta: gota_a_gota }
        - { titulo: Acceso a internet, nota: Registro, tipo: barras, pregunta: internet }

    - titulo: Perfil ocupacional e intereses
      subtitulo: Orientan la ocupación y los cursos
      graficos:
        - { titulo: Tipo de empleo que le gustaría conseguir, nota: Línea base, tipo: barras, pregunta: tipo_empleo, hallazgo: true }
        - { titulo: Razón principal para trabajar, nota: Registro, tipo: barras, pregunta: razones_trabajar }
        - { titulo: Sector en el que le interesa laborar, nota: Registro · los 8 más frecuentes, tipo: barras, pregunta: sector_interes, top: 8, hallazgo: true }
        - { titulo: Oficio o labor de interés, nota: Registro · los 8 más frecuentes, tipo: barras, pregunta: oficio_interes, top: 8 }
        - { titulo: Competencias transversales más fuertes, nota: Registro · las 8 más frecuentes, tipo: barras, pregunta: competencias_transv, top: 8 }
        - { titulo: "Habilidades, oficios o conocimientos prácticos", nota: Registro · los 8 más frecuentes, tipo: barras, pregunta: habilidades_oficios, top: 8, apartarOtros: true }
        - { titulo: Competencias técnicas con mayores fortalezas, nota: Línea base · las 8 más frecuentes, tipo: barras, pregunta: competencias_tecnicas, top: 8, apartarOtros: true }
        - { titulo: ¿Ha trabajado anteriormente?, nota: Registro, tipo: barras, pregunta: ha_trabajado }
        - { titulo: Tipo de empleo que quiere según nivel educativo, nota: "% de cada nivel que elige cada tipo de empleo", tipo: cruce, pregunta: tipo_empleo, por: nivel, orden: *niveles }

    - titulo: Preparación y mercado laboral
      graficos:
        - { titulo: ¿Se siente preparado/a para una entrevista?, nota: Registro · 1 = nada, 5 = bastante, tipo: barras, pregunta: preparado_entrevista }
        - { titulo: ¿Qué tan capaz se siente de conseguir empleo?, nota: "Línea base · 1 a 5", tipo: barras, pregunta: capacidad_empleo }
        - { titulo: ¿Percibe oportunidades laborales en su zona?, nota: Registro · 1 = nada, 5 = muchas, tipo: barras, pregunta: oportunidades_zona }
        - { titulo: ¿Tiene las competencias para los empleos de su interés?, nota: Registro, tipo: barras, pregunta: tiene_competencias }
        - { titulo: ¿Conoce cómo se mueve el empleo en su región?, nota: Registro, tipo: barras, pregunta: conoce_mercado }
        - { titulo: ¿Conoce la oferta del Servicio Público de Empleo?, nota: Registro, tipo: barras, pregunta: conoce_spe }
        - { titulo: ¿Ha tenido apoyo y orientación laboral de alguna entidad?, nota: Línea base, tipo: barras, pregunta: apoyo_orientacion }
        - { titulo: Entidad que brindó la orientación, nota: Línea base · quienes tuvieron apoyo, tipo: barras, pregunta: entidad_orientacion }

    - titulo: La ruta y lo que sigue
      graficos:
        - titulo: Avance en la ruta Recorrer
          nota: Personas registradas en el periodo (con o sin línea base)
          tipo: embudo
          pasos:
            - { label: Registro inicial, regla: "formulario:recorrer-pnud", nota: E1 · Me registro }
            - { label: Línea base, regla: "formulario:linea-base", nota: E2 · Me conozco }
            - { label: Perfilamiento, regla: "documentos:perfilamiento", nota: E2 · informe individual }
            - { label: Hoja de vida, regla: hv }
            - { label: Atendidas en mitigación, regla: "union:mitigacion", nota: Soporte o sesión formativa }
            - { label: Postuladas a vacantes del proyecto, regla: postulado_proyecto }
            - { label: Vinculadas laboralmente, regla: colocado }
        - { titulo: Expectativas de la ruta Recorrer, nota: Línea base, tipo: barras, pregunta: expectativas, hallazgo: true }
        - { titulo: Calificación de la ruta hasta el momento, nota: Línea base · 1 a 5, tipo: barras, pregunta: calificacion_ruta }

    - titulo: Calidad del dato y observaciones
      subtitulo: Insumo para ajustar los formularios y para el informe
      calidad: true
      observaciones: "Escriba aquí lo recogido en territorio (p. ej. observaciones de la profesional psicosocial) antes de guardar el PDF. Si queda vacío, no se imprime."
```

## Resumen diario por correo

El correo de las 6 p. m. (P-35, D-69). Los destinatarios están en la Data Table de n8n, no aquí (archivo público).
El formulario de registro (`recorrer-pnud`) no se lista porque es igual a «Registros».

```yaml
resumenDiario:
  formularios: { linea-base: Línea base, documentos: Documentos cargados }
```
