---
name: actualizar-base-seguimiento
description: Actualiza la Base de Seguimiento del PNUD (Base de Seguimiento.xlsx, hoja «Base Participantes») con los datos actuales de la plataforma. Usar cuando Sebastián pida «actualiza la base de seguimiento», «actualiza los participantes del seguimiento» o similar.
---

# Actualizar la Base de Seguimiento (PNUD)

Todo el detalle (reglas, mapa de las 81 columnas, columnas sin equivalente) está en
`databases/base_seguimiento/README.md`. Decisiones P-55 y P-56 en `docs/DECISIONES.md`. Leer el README antes de empezar.

## Pasos
1. Pedir a Sebastián que cierre `Base de Seguimiento.xlsx` si está abierto (el script se detiene si lo encuentra abierto).
2. Correr el contenido de `databases/base_seguimiento/participantes.sql` **sin cambios** con `execute_sql`
   (Supabase, proyecto `iccyjiaseyfupappdtvo`). Es esperable que la herramienta diga que el resultado es demasiado
   grande y lo guarde en un archivo: **no leerlo**, el script lo encuentra solo.
3. Si hubo perfilamientos nuevos (preguntar o revisar `EVENTOS\Carpetas perfilamientos`), agregar `--releer-perfiles`.
4. Desde `databases/base_seguimiento/`: `python actualizar.py participantes` (con `--prueba` si Sebastián quiere ver
   antes una copia).
5. Informar: total de personas, nuevas y que salieron, filas amarillas, sexo distinto del registro, fechas imposibles,
   perfilamientos sin cruzar y la ruta del respaldo. Si aparece un perfilamiento sin cruzar de alguien que sí está en
   la plataforma, agregarlo a los casos «revisado a mano» de `perfiles.py` y volver a correr.

## No hacer
- No escribir en la base de datos (solo lectura).
- No cambiar reglas sin que Sebastián lo pida; si las cambia, actualizar README, P-55 y la memoria.
- No agregar hojas al Excel ni tocar las otras hojas desde este subcomando.
