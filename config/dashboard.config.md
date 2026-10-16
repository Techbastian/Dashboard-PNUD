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
"Mujer" = Género Femenino, campo «Género» del registro (D-42, P-07). `pendiente` = el dato aún no existe en la base ("Sin fuente aún").

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
  - { label: Postuladas a vacantes,    valor: empleabilidad.personas_postuladas_aliadas, ayuda: P3 · intermediación atribuible (A-16) }
  - { label: Atendidas en mitigación,  valor: grupos.mitigadas }
  - { label: Vinculadas laboralmente,  valor: empleabilidad.colocados }
```

## Ruta de la persona (P-03, D-37)

Orientación = asistió a una sesión de orientación; Aceleración = matriculada y asistió a una sesión formativa (D-33).
Se marcan en el Calendario. Intermediación = postulaciones **atribuibles** al proyecto (A-16, P-08): a vacantes de
empresas vinculadas a la cohorte o creadas para ella, más las externas que registra el equipo.

```yaml
embudo:
  - { etapa: Registro,       valor: "formularios[recorrer-pnud].personas" }
  - { etapa: Orientación,    valor: "formacion.asistencia_por_tipo[orientacion].personas" }
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
  - { tipo: sensibilizacion,     label: Sensibilización con empresas, modalidad: Presencial, empresas: true, descripcion: "Marca las empresas que asistieron: quedan sensibilizadas (P1). Cuenta como espacio de aprendizaje con empresas." }
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

## Secciones del Dashboard

```yaml
secciones: [metas, cifras, registros, embudo, estados, empresas, vacantes]
```

## Módulos del menú (D-35)

```yaml
modulos: [dashboard, participantes, colocacion, empresas, calendario, listados, informes]
```

---

# Dashboard ejecutivo (P-08 · blueprint v3 aprobado el 16-oct · D-43 de la plantilla)

El Dashboard es ejecutivo y el detalle está en **Informes**. Con `pestanas`, el bloque `secciones` de arriba ya no se usa
(queda como referencia). Decisiones de Sebastián del 15-oct: ver `docs/blueprint/BLUEPRINT_DASHBOARD.md`.

## Foco territorial

Decisión 6: el foco es **Meta**. Las personas y empresas de otros departamentos no se bloquean; se muestran como alerta.
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
      - { label: Fuera de Meta,        foco: personas }
    graficos:
      - { titulo: Género y edad, nota: "Registro · campo «Género»", tipo: dona, datos: postulaciones.por_genero, debajo: postulaciones.por_edad_rangos }
      - titulo: Nivel educativo
        nota: Registro · sin agrupar, de menor a mayor
        tipo: barras
        datos: postulaciones.por_nivel_educativo
        orden: [Ninguno, Primaria, Secundaria, Media Bachiller, Técnico, Tecnológico, Profesional, Profesional universitario, Especialización, Maestría, Doctorado]
      - { titulo: ¿Qué tan capaz se siente de conseguir empleo?, nota: "Línea base · % que responde 4 o 5", tipo: apilada, pregunta: capacidad_empleo, porGenero: true, destacar: ["4", "5"] }
      - titulo: Las 5 barreras más altas
        nota: Línea base · % que la califica 4 o 5 · mujeres vs hombres
        tipo: pareadas
        destacar: ["4", "5"]
        top: 5
        preguntas: [b_cultura, b_vestuario, b_transporte, b_cuidado, b_conciliar, b_discriminacion, b_convalidacion, b_transversales, b_tecnicas, b_certificacion, b_tramites, b_dependencia, b_recursos, b_financiera, b_virtuales]
      - { titulo: ¿Sus ingresos le alcanzan para…?, nota: "Línea base · el número es el % que responde «No»", tipo: apilada, paleta: sino, destacar: ["No"], preguntas: [cubre_alimentacion, cubre_vivienda, cubre_servicios, cubre_salud, cubre_vestuario, ahorrar] }
      - { titulo: Ingresos personales del mes pasado, nota: "Línea base · rangos hasta $5.000.000", tipo: barras, pregunta: ingresos_personales }
    pie: "El detalle completo (municipio, salud, vivienda, inclusión financiera, expectativas, las 15 barreras…) se descarga en Informes."

  - id: empresas
    titulo: Empresas
    cifras:
      - { label: Empresas aliadas,        valor: empresas.aliadas, foco: empresas }
      - { label: Empresas sensibilizadas, valor: "empresas.asistencia_por_tipo[sensibilizacion].empresas", meta: Empresas sensibilizadas en empleo inclusivo }
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
    - { nombre: 1 Hitos, contenido: metas, descripcion: "Las 13 metas del contrato: actual, objetivo, % de avance y estado" }
    - nombre: 2 Registro
      descripcion: Género, edad, nivel educativo y las preguntas de selección del registro
      cifras: [{ label: Personas registradas, valor: "formularios[recorrer-pnud].personas" }, { label: Mujeres registradas, valor: "formularios[recorrer-pnud].mujeres" }]
      listas:
        - { titulo: Género, datos: postulaciones.por_genero, nota: "Campo «Género» del registro" }
        - { titulo: Edad, datos: postulaciones.por_edad_rangos }
        - { titulo: Nivel educativo, datos: postulaciones.por_nivel_educativo }
      preguntas: registro
    - nombre: 3 Línea base
      descripcion: "Todas las preguntas de selección de la línea base (15 barreras, empleabilidad, salud, autonomía, hogar, vivienda, expectativas), montos en rangos"
      cifras: [{ label: Personas con línea base, valor: "formularios[linea-base].personas" }, { label: Mujeres con línea base, valor: "formularios[linea-base].mujeres" }]
      preguntas: linea_base
    - nombre: 4 Empresas y vacantes
      descripcion: "Indicadores del P1, tamaño, sector, municipio; nivel educativo, experiencia, salario, contrato y modalidad de las vacantes; intermediación"
      cifras:
        - { label: Empresas aliadas, valor: empresas.aliadas }
        - { label: Empresas sensibilizadas, valor: "empresas.asistencia_por_tipo[sensibilizacion].empresas" }
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
    - nombre: 5 Alertas
      contenido: alertas
      descripcion: Personas y empresas fuera de Meta; personas registradas sin línea base
      cifras: [{ label: Personas registradas, valor: "formularios[recorrer-pnud].personas" }, { label: Personas con línea base, valor: "formularios[linea-base].personas" }]
```
