# Ajustes recomendados a los formularios — Registro y Línea base (PNUD)

Fecha: 2026-10-16 · Revisión hecha con los registros de prueba que llenaron ambos formularios.

## Conclusión

Las respuestas se guardan por persona, en su bloque de formulario (`recorrer-pnud` = registro, `linea-base` = línea base)
y con una clave fija por pregunta. Con esa estructura **sí se puede contar y medir**: se verificaron las 87 preguntas
configuradas en el dashboard y todas se leen y cuentan bien (opciones, escalas, selección múltiple, montos por rangos,
hacinamiento y preguntas condicionadas).

Los ajustes de abajo no impiden medir. Mejoran la calidad del dato y conviene hacerlos **antes** de que la línea base se
llene masivamente, porque después hay que limpiar respuestas ya guardadas.

## 1. Validar los montos (prioridad alta)

Ingresos y gastos se escriben como número libre, sin límite. Un cero de más cambia el rango en el que cae la persona.

- Preguntas: ingresos personales del mes, ingresos del hogar, gastos promedio del hogar y los 7 gastos del mes anterior
  (alimentación, vivienda, limpieza, educación, vestuario, salud, transporte, deudas).
- Ajuste: definir un máximo razonable por pregunta (o pedir confirmación si el valor es muy alto) y aceptar solo números.
- Mientras tanto: revisar valores atípicos antes de cada reporte.

## 2. Unificar la escritura de las opciones (prioridad media)

Dentro de cada pregunta se cuenta bien, pero al comparar preguntas o presentar resultados se ve desordenado.

| Pregunta | Problema | Ajuste |
|---|---|---|
| Falencia en habilidades técnicas específicas (barreras) | La opción dice «4 -Barrera alta» (sin espacio) | «4 - Barrera alta», igual que las demás barreras |
| Varias preguntas Sí/No del registro (requiere certificar, requiere formación, busca empleo, interés en fortalecer destrezas) y autonomía sobre ingresos (línea base) | Usan «Si» sin tilde; el resto usa «Sí» | Usar «Sí» en todas |
| Preguntas con opción de no responder | Unas dicen «Prefiero no responder» y otras «Prefiere no responder» | Una sola forma en todo el formulario |
| Tipo de vinculación laboral que tenía | La opción dice «No tengo vinculación labora» | «No tengo vinculación laboral» |
| Parentesco con el jefe del hogar | La opción empieza con espacio y dice «Hijo/Hijo/adoptado/a/ Hijastro/a» | «Hijo/a, adoptado/a o hijastro/a» |
| Servicios con que cuenta la vivienda | La opción «Energía eléctrica» empieza con espacio | Quitar el espacio |
| Expectativas de la ruta | La opción «Acceder a un empleo formal» termina con espacio | Quitar el espacio |
| Tipo de discapacidad | Repite «intelectual» y no tiene «visual» ni «múltiple» | Corregir la lista de opciones |

## 3. Limpiar respuestas de preguntas condicionadas (prioridad media)

Si una persona responde una pregunta que depende de otra y luego cambia la respuesta de la que depende, la primera queda
guardada. Ejemplos vistos: situación de discriminación guardada aunque respondió «1 - No ha sido una barrera»; razón de no
afiliación guardada aunque su régimen es «Contributivo»; barreras a mitigar guardadas aunque su expectativa es otra.

- El dashboard ya las ignora (solo cuenta a quien cumple la condición).
- Ajuste en el formulario: al ocultar una pregunta condicionada, borrar su respuesta. Así el export crudo queda limpio.

## 4. Datos que se contradicen entre formularios (decisión)

La condición de discapacidad se pregunta en el registro y en la línea base, y pueden no coincidir (en la prueba: «ninguna»
en registro y «Sí, física» en línea base).

- Decidir cuál manda para el reporte. Recomendación: la línea base, que es más detallada.
- Opcional: no volver a preguntarlo en la línea base, o mostrar la respuesta del registro para confirmarla.

## 5. Departamento escrito a mano en registros antiguos (prioridad baja)

Algunos registros antiguos tienen el departamento como texto libre («Villavicencio meta», «Meta, Restrepo»…).
El filtro de Meta ya los reconoce, pero la gráfica por departamento los muestra separados.

- Ajuste: dejar el departamento solo como lista desplegable (ya lo es en los registros nuevos) y, si se quiere, normalizar
  los antiguos.

## 6. Para medir cambio: encuesta de salida o seguimiento (planeación)

La línea base es la foto de entrada. Para medir mejoras (ingresos, barreras, autonomía, cobertura de necesidades) se
necesita una encuesta de salida o seguimiento con **las mismas preguntas y las mismas claves**. Así el dashboard puede
comparar entrada contra salida sin rehacer la configuración.

## 7. Antes de reportar

Borrar los 2 registros de prueba que hoy son las únicas respuestas de línea base (PRUEBA FASE DOS y prueba x).
