# ⚽ SOP · Stats of Players

App web del **Cultural Durango · generación 2013** (Infantil Liga Honor, temporada 2026-27).
Perfiles de jugador con foto, estadísticas por partido, calendario, clasificación y alineaciones
para compartir por WhatsApp.

Funciona en **GitHub Pages**: sin servidor, sin base de datos y sin compilación.

## Qué tiene

| Sección | Para quién | Qué hace |
|---|---|---|
| 🏠 Inicio | Todos | Próximo partido con cuenta atrás, último resultado, posición en la tabla, racha y podios |
| 👕 Plantilla | Todos | Cartas tipo videojuego por posición (PJ, goles, asistencias o porterías a cero, MVP) |
| Perfil de jugador | Todos | Foto, estadísticas, **logros desbloqueables** (debut, primer gol, hat-trick, muro…), partido a partido |
| 📅 Partidos | Todos | Calendario completo, filtros, detalle con goleadores, MVP, crónica y alineación |
| 🏆 Tabla | Todos | Clasificación con nuestro equipo resaltado |
| 📋 Once | Todos | Montar alineación en el campo y compartirla por **WhatsApp, enlace o imagen** |
| 🧢 Modo míster | Míster | Meter estadísticas, subir fotos, editar plantilla, calendario y clasificación |

## Cómo se guardan los datos

Todo vive en este repositorio:

```
data/equipo.json         nombre, categoría, colores, repo
data/jugadores.json      plantilla (id, nombre, apodo, dorsal, posición, foto)
data/partidos.json       calendario + estadísticas de cada partido (fuente única)
data/clasificacion.json  última tabla cargada
img/jugadores/           fotos (se reducen a 480×480 antes de subir)
```

Las estadísticas de cada jugador **no se guardan aparte**: se calculan sumando sus partidos.
Así nunca se descuadran.

Cuando el míster guarda algo desde la app, se hace un **commit** en este repo a través de
la API de GitHub. Hay historial de todo y se puede deshacer cualquier cambio.
Los demás lo ven en 1-2 minutos (lo que tarda GitHub Pages en publicar).

## Puesta en marcha (una vez)

1. **Activar GitHub Pages**: *Settings → Pages → Build and deployment → Deploy from a branch →
   `main` / `(root)`*. La web quedará en `https://jonmg.github.io/SOP/`.
2. **Token del míster**: crear un
   [fine-grained token](https://github.com/settings/personal-access-tokens/new) con
   *Repository access: Only select repositories → SOP* y *Permissions → Contents: Read and write*.
   Abrir la web → 🧢 → pegar el token. Se queda **solo en ese navegador**.
3. **(Opcional) IA para la clasificación**: en la misma pantalla, pegar una clave de la API de
   Anthropic. Solo se usa al pulsar «Leer con IA» y cada lectura cuesta céntimos.
4. **Ajustes**: en 🧢 → Ajustes del equipo, poner los colores reales del club, el escudo y el
   nombre exacto con el que aparece el equipo en la federación (sirve para reconocerlo en las
   tablas).

## Meter un partido (a pie de campo)

Partidos → partido → **📝 Meter estadísticas**:

1. Marcador con los botones − / +.
2. Toca cada nombre para marcarlo como **convocado**.
3. Toca ⚽ / 🎁 / 🟨 / 🟥 para sumar (el «−» corrige). 🔝 = titular, ⭐ = MVP. Los minutos son opcionales.
4. **Guardar partido**. Si los goles de los jugadores no suman el marcador, avisa (¿autogol?).

## Clasificación y calendario desde la FVF

La web de la Federación Vizcaína (fvf-bff.eus) y su app no ofrecen datos abiertos: la web pide
sesión y no se puede leer desde GitHub Pages. Por eso:

- **📸 Actualizar** (Tabla) o **🤖 Importar** (Partidos): sube una **captura de la app de la FVF**
  o pega el texto copiado de su web. La IA (Claude) la convierte en tabla.
- **Siempre se revisa antes de guardar**: la propuesta sale en una tabla editable.
- Sin clave de IA se puede rellenar a mano.

## Privacidad (importante: son menores)

- El repositorio y la web son **públicos**: cualquiera con el enlace ve nombres y fotos.
- Recomendado: **solo nombre o apodo, sin apellidos**, y fotos solo con **permiso de las familias**.
- La web lleva `noindex` para que no salga en buscadores, pero eso no la hace privada.
- Si se quiere privada de verdad: repo privado + GitHub Pages con acceso restringido (requiere
  plan de pago de GitHub) o un alojamiento con contraseña.
- El token y la clave de IA nunca se suben al repo; viven en el navegador del míster.

## Desarrollo

HTML + CSS + JavaScript (módulos ES) sin dependencias. Para probar en local:

```bash
python3 -m http.server 8000   # y abrir http://localhost:8000
```

```
index.html          esqueleto + navegación
css/estilos.css     todo el estilo
js/app.js           rutas y vistas
js/datos.js         carga/guardado (ficheros estáticos o API de GitHub)
js/stats.js         cálculos, logros, formaciones
js/alineacion.js    editor de alineación, enlace e imagen para compartir
js/ia.js            lectura de capturas con Claude
```
