# SOP · Stats of Players

App web estática (GitHub Pages) del Cultural Durango generación 2013. Ver README.md.

## Decisiones tomadas

- **Sin servidor ni base de datos.** Los datos son JSON en `data/`. El míster escribe con la API
  de GitHub (token en su navegador). Cada guardado es un commit.
- **Sin compilación ni frameworks.** Módulos ES nativos. Nada de npm en el proyecto.
- **Los partidos son la única fuente de verdad** de las estadísticas: las de jugador se calculan
  (`js/stats.js`). No guardar totales por jugador.
- **La IA propone, el míster decide.** Lo que lee `js/ia.js` siempre pasa por una tabla editable.
- **Menores de edad.** No añadir campos de datos personales (apellidos, fecha de nacimiento,
  teléfono…). Nada que compare o puntúe a un niño de forma negativa (sin "media" tipo FIFA).
- Todo texto de datos se inserta con `esc()`.

## Convenciones

Código, comentarios e interfaz en castellano. Pensado primero para móvil.
