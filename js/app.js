// SOP · Stats of Players — app de una sola página, sin frameworks ni compilación.
// Rutas por hash (#/plantilla, #/jugador/ID, ...) para que funcione en GitHub Pages.

import { estado, cargarTodo, guardar, esMister, credenciales, comprobarToken, subirArchivo, repo } from './datos.js';
import {
  $, $$, esc, fechaCorta, fechaLarga, diasHasta, aviso, idUnico, confeti,
  redimensionarImagen, blobABase64, esNuestroEquipo, hoyISO,
} from './util.js';
import {
  POSICIONES, jugador, partido, partidosOrdenados, jugados, proximoPartido, ultimoJugado, resultado,
  balanceEquipo, racha, statsJugador, ranking, logros,
} from './stats.js';
import { leerConIA } from './ia.js';
import { vistaAlineacion } from './alineacion.js';
import { foto, nombreDe } from './componentes.js';

const app = $('#app');

// ---------- Componentes ----------
function carta(j) {
  const s = statsJugador(j.id);
  const pos = POSICIONES[j.posicion] || { nombre: '', emoji: '' };
  const extra = j.posicion === 'POR'
    ? `<div><b>${s.cero}</b><small>CERO</small></div>`
    : `<div><b>${s.asist}</b><small>ASI</small></div>`;
  return `
  <a class="carta pos-${esc(j.posicion)}" href="#/jugador/${esc(j.id)}">
    <div class="carta-top"><span class="dorsal">${esc(j.dorsal ?? '')}</span><span class="carta-pos">${pos.emoji} ${esc(j.posicion || '')}</span></div>
    <div class="carta-foto">${foto(j)}</div>
    <div class="carta-nombre">${esc(nombreDe(j))}</div>
    <div class="carta-stats">
      <div><b>${s.pj}</b><small>PJ</small></div>
      <div><b>${s.goles}</b><small>GOL</small></div>
      ${extra}
      <div><b>${s.mvp}</b><small>MVP</small></div>
    </div>
  </a>`;
}

function marcador(p, grande = false) {
  const eq = estado.equipo;
  const nos = `<span class="eq nos">${esc(eq.nombre_corto || eq.nombre)}</span>`;
  const ellos = `<span class="eq">${esc(p.rival || 'Rival')}</span>`;
  const jugado = p.estado === 'jugado' && p.goles_favor != null;
  const gl = p.local ? p.goles_favor : p.goles_contra;
  const gv = p.local ? p.goles_contra : p.goles_favor;
  const centro = jugado
    ? `<span class="goles res-${resultado(p)}">${gl} - ${gv}</span>`
    : `<span class="goles vs">${p.estado === 'aplazado' ? 'APLAZ.' : esc(p.hora || 'vs')}</span>`;
  return `<div class="marcador ${grande ? 'grande' : ''}">${p.local ? nos : ellos}${centro}${p.local ? ellos : nos}</div>`;
}

function filaPartido(p) {
  const r = resultado(p);
  return `
  <a class="fila-partido ${r ? 'res-borde-' + r : ''}" href="#/partido/${esc(p.id)}">
    <div class="fp-fecha"><b>J${esc(p.jornada ?? '-')}</b><span>${esc(fechaCorta(p.fecha))}</span></div>
    <div class="fp-centro">${marcador(p)}<small>${p.local ? '🏠 En casa' : '🚌 Fuera'}${p.campo ? ' · ' + esc(p.campo) : ''}</small></div>
    ${r ? `<span class="chip-res res-${r}">${r}</span>` : ''}
  </a>`;
}

function vacio(icono, texto, accion = '') {
  return `<div class="vacio"><div class="vacio-icono">${icono}</div><p>${texto}</p>${accion}</div>`;
}

const botonMister = (href, texto) => (esMister() ? `<a class="boton" href="${href}">${texto}</a>` : '');

function podio(titulo, icono, campo) {
  const top = ranking(campo, 3);
  if (!top.length) return '';
  return `
  <div class="podio-caja">
    <h3>${icono} ${titulo}</h3>
    <ol class="podio">${top.map((x, i) => `
      <li><a href="#/jugador/${esc(x.jugador.id)}">
        <span class="medalla">${['🥇', '🥈', '🥉'][i]}</span>${foto(x.jugador, 'mini')}
        <span class="podio-nombre">${esc(nombreDe(x.jugador))}</span><b>${x.s[campo]}</b></a></li>`).join('')}
    </ol>
  </div>`;
}

// Enlace a la página oficial de la Federación (definida en data/equipo.json → fvf).
function enlaceFVF(tipo) {
  const url = estado.equipo.fvf?.[tipo];
  if (!url || !/^https:\/\//.test(url)) return '';
  return `<p class="centro"><a class="boton secundario" href="${esc(url)}" target="_blank" rel="noopener">🌐 Ver en la web de la FVF</a></p>`;
}

function posicionEnTabla() {
  return (estado.clasificacion?.tabla || []).find(f => esNuestroEquipo(f.equipo, estado.equipo));
}

// ---------- Vistas ----------
function vistaInicio() {
  const eq = estado.equipo;
  const prox = proximoPartido();
  const ult = ultimoJugado();
  const b = balanceEquipo();
  const fila = posicionEnTabla();
  const dias = prox ? diasHasta(prox.fecha) : null;
  const cuenta = dias == null ? '' : dias === 0 ? '¡HOY!' : dias === 1 ? '¡MAÑANA!' : dias > 1 ? `Faltan ${dias} días` : '';

  return `
  <section class="hero">
    <img class="escudo" src="${esc(eq.escudo || 'img/escudo.png')}" alt="Escudo">
    <div>
      <h1>${esc(eq.nombre)}</h1>
      <p>${esc(eq.categoria)} · Gen. ${esc(eq.generacion)} · ${esc(eq.temporada)}</p>
    </div>
  </section>

  ${prox ? `
  <a class="tarjeta proximo" href="#/partido/${esc(prox.id)}">
    <div class="etiqueta">PRÓXIMO PARTIDO · J${esc(prox.jornada ?? '-')}</div>
    ${marcador(prox, true)}
    <div class="proximo-info">${esc(fechaLarga(prox.fecha, prox.hora))}${prox.campo ? ' · 📍 ' + esc(prox.campo) : ''}</div>
    ${cuenta ? `<div class="cuenta">${cuenta}</div>` : ''}
  </a>` : vacio('📅', 'Todavía no hay partidos en el calendario.', botonMister('#/calendario', 'Añadir partidos'))}

  <div class="rejilla-2">
    ${ult ? `
    <a class="tarjeta" href="#/partido/${esc(ult.id)}">
      <div class="etiqueta">ÚLTIMO RESULTADO</div>
      ${marcador(ult)}
      ${ult.mvp && jugador(ult.mvp) ? `<div class="mvp-linea">⭐ MVP: <b>${esc(nombreDe(jugador(ult.mvp)))}</b></div>` : ''}
    </a>` : ''}
    <a class="tarjeta" href="#/clasificacion">
      <div class="etiqueta">CLASIFICACIÓN</div>
      ${fila ? `<div class="gran-numero">${esc(fila.pos)}º</div><div class="sub">${esc(fila.pts)} puntos</div>`
        : `<div class="sub">Sin datos todavía</div>`}
    </a>
  </div>

  ${b.pj ? `
  <div class="tarjeta">
    <div class="etiqueta">TEMPORADA</div>
    <div class="balance">
      <div><b>${b.pj}</b><small>Jugados</small></div>
      <div class="v"><b>${b.v}</b><small>Ganados</small></div>
      <div class="e"><b>${b.e}</b><small>Empates</small></div>
      <div class="d"><b>${b.d}</b><small>Perdidos</small></div>
      <div><b>${b.gf}</b><small>Goles</small></div>
      <div><b>${b.porteriasCero}</b><small>Port. a 0</small></div>
    </div>
    <div class="racha">Racha: ${racha().map(r => `<span class="chip-res res-${r}">${r}</span>`).join('')}</div>
  </div>` : ''}

  <div class="rejilla-3">
    ${podio('Goleadores', '⚽', 'goles')}
    ${podio('Asistencias', '🎁', 'asist')}
    ${podio('MVP', '⭐', 'mvp')}
  </div>
  ${b.pj ? `<p class="centro"><a class="boton secundario" href="#/stats">Ver todas las estadísticas →</a></p>` : ''}`;
}

function vistaPlantilla() {
  const activos = estado.jugadores.filter(j => j.activo !== false);
  const grupos = Object.keys(POSICIONES).map(pos => ({ pos, js: activos.filter(j => j.posicion === pos).sort((a, b) => (a.dorsal || 99) - (b.dorsal || 99)) }));
  const sinPos = activos.filter(j => !POSICIONES[j.posicion]);
  return `
  <div class="cabecera"><h1>👕 Plantilla</h1>${botonMister('#/jugador-nuevo', '+ Jugador')}</div>
  ${!activos.length ? vacio('👕', 'Aún no hay jugadores.', botonMister('#/jugador-nuevo', 'Añadir el primero')) : ''}
  ${grupos.filter(g => g.js.length).map(g => `
    <h2 class="titulo-pos">${POSICIONES[g.pos].emoji} ${POSICIONES[g.pos].nombre}s</h2>
    <div class="cartas">${g.js.map(carta).join('')}</div>`).join('')}
  ${sinPos.length ? `<h2 class="titulo-pos">Otros</h2><div class="cartas">${sinPos.map(carta).join('')}</div>` : ''}`;
}

function vistaJugador(id) {
  const j = jugador(id);
  if (!j) return vacio('🤷', 'Jugador no encontrado.');
  const s = statsJugador(id);
  const pos = POSICIONES[j.posicion] || { nombre: '', emoji: '' };
  const L = logros(id);
  return `
  <div class="perfil pos-${esc(j.posicion)}">
    <div class="perfil-foto">${foto(j, 'grande')}<span class="perfil-dorsal">${esc(j.dorsal ?? '')}</span></div>
    <h1>${esc(nombreDe(j))}</h1>
    ${j.apodo && j.nombre ? `<p class="sub">${esc(j.nombre)}</p>` : ''}
    <p class="perfil-pos">${pos.emoji} ${esc(pos.nombre)}</p>
    ${j.superpoder ? `<p class="superpoder">💥 ${esc(j.superpoder)}</p>` : ''}
    ${esMister() ? `
    <div class="acciones">
      <label class="boton">📸 Subir foto<input type="file" accept="image/*" id="subir-foto" hidden></label>
      <a class="boton secundario" href="#/jugador/${esc(id)}/editar">✏️ Editar</a>
    </div>` : ''}
  </div>

  <div class="stats-grid">
    ${[['Partidos', s.pj, '🏟️'], ['Titular', s.tit, '🔝'], ['Minutos', s.min, '⏱️'], ['Goles', s.goles, '⚽'],
      ['Asistencias', s.asist, '🎁'], ['MVP', s.mvp, '⭐'],
      ...(j.posicion === 'POR' ? [['Port. a 0', s.cero, '🧱'], ['Paradas', s.paradas, '🧤']] : []),
      ['Amarillas', s.amarillas, '🟨'], ['Rojas', s.rojas, '🟥']]
      .map(([t, v, i]) => `<div class="stat"><span>${i}</span><b>${v}</b><small>${t}</small></div>`).join('')}
  </div>

  <h2>🏅 Logros <small>${L.filter(l => l.ok).length}/${L.length}</small></h2>
  <div class="logros">${L.map(l => `
    <div class="logro ${l.ok ? 'ok' : ''}" title="${esc(l.desc)}"><span>${l.icono}</span><b>${esc(l.nombre)}</b><small>${esc(l.desc)}</small></div>`).join('')}
  </div>

  <h2>📒 Partido a partido</h2>
  ${s.historial.length ? `<div class="tabla-scroll"><table class="tabla">
    <thead><tr><th>J</th><th>Rival</th><th>Res.</th><th>Min</th><th>⚽</th><th>🎁</th><th></th></tr></thead>
    <tbody>${s.historial.slice().reverse().map(({ partido: p, st }) => `
      <tr onclick="location.hash='#/partido/${esc(p.id)}'">
        <td>${esc(p.jornada ?? '')}</td><td>${esc(p.rival)}</td>
        <td><span class="chip-res res-${resultado(p)}">${p.goles_favor}-${p.goles_contra}</span></td>
        <td>${st.min || (st.tit ? 'T' : '')}</td><td>${st.goles || ''}</td><td>${st.asist || ''}</td>
        <td>${p.mvp === id ? '⭐' : ''}${'🟨'.repeat(st.amarillas || 0)}${st.rojas ? '🟥' : ''}</td>
      </tr>`).join('')}</tbody></table></div>` : `<p class="sub">Todavía sin partidos.</p>`}`;
}

function enlazarJugador(id) {
  const input = $('#subir-foto');
  if (!input) return;
  input.addEventListener('change', async () => {
    const f = input.files?.[0];
    if (!f) return;
    const j = jugador(id);
    try {
      aviso('Subiendo foto…', 'info');
      const blob = await redimensionarImagen(f, { lado: 480 });
      const ruta = `img/jugadores/${id}.jpg`;
      await subirArchivo(ruta, await blobABase64(blob), `Foto de ${nombreDe(j)}`);
      j.foto = `${ruta}?v=${Date.now()}`;
      await guardar('jugadores', `Foto de ${nombreDe(j)}`);
      // Vista previa inmediata (GitHub Pages tarda un minuto en publicar).
      $$('.perfil .foto').forEach(el => el.outerHTML = `<img class="foto grande" src="${URL.createObjectURL(blob)}" alt="">`);
      aviso('📸 Foto guardada. Todos la verán en 1-2 minutos.');
    } catch (e) { aviso(e.message, 'error', 6000); }
  });
}

function vistaEditarJugador(id) {
  if (!esMister()) return vacio('🔒', 'Solo el míster puede editar.');
  const j = id ? jugador(id) : { posicion: 'MED', activo: true };
  if (!j) return vacio('🤷', 'Jugador no encontrado.');
  return `
  <h1>${id ? '✏️ Editar jugador' : '➕ Nuevo jugador'}</h1>
  <form id="form-jugador" class="formulario">
    <label>Nombre <input name="nombre" required value="${esc(j.nombre || '')}" placeholder="Nombre (mejor sin apellidos)"></label>
    <label>Apodo (lo que sale en la carta) <input name="apodo" value="${esc(j.apodo || '')}"></label>
    <div class="fila-campos">
      <label>Dorsal <input name="dorsal" type="number" min="0" max="99" value="${esc(j.dorsal ?? '')}"></label>
      <label>Posición <select name="posicion">${Object.entries(POSICIONES).map(([k, v]) =>
        `<option value="${k}" ${j.posicion === k ? 'selected' : ''}>${v.emoji} ${v.nombre}</option>`).join('')}</select></label>
    </div>
    <label>Superpoder 💥 <input name="superpoder" value="${esc(j.superpoder || '')}" placeholder="Ej.: Regate imposible, Zurda mágica…"></label>
    <label class="check"><input type="checkbox" name="activo" ${j.activo !== false ? 'checked' : ''}> Activo en la plantilla</label>
    <div class="acciones">
      <button class="boton" type="submit">💾 Guardar</button>
      ${id ? `<button class="boton peligro" type="button" id="borrar-jugador">🗑 Borrar</button>` : ''}
    </div>
  </form>`;
}

function enlazarEditarJugador(id) {
  const form = $('#form-jugador');
  if (!form) return;
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const datos = {
      nombre: d.nombre.trim(), apodo: d.apodo.trim(),
      dorsal: d.dorsal === '' ? null : Number(d.dorsal), posicion: d.posicion,
      superpoder: d.superpoder.trim(), activo: !!d.activo,
    };
    let j = id ? jugador(id) : null;
    if (j) Object.assign(j, datos);
    else {
      j = { id: idUnico(datos.apodo || datos.nombre, estado.jugadores.map(x => x.id)), foto: null, ...datos };
      estado.jugadores.push(j);
    }
    try {
      await guardar('jugadores', `${id ? 'Edita' : 'Añade'} jugador ${nombreDe(j)}`);
      aviso('✅ Jugador guardado');
      location.hash = `#/jugador/${j.id}`;
    } catch (e) { aviso(e.message, 'error', 6000); }
  });
  $('#borrar-jugador')?.addEventListener('click', async () => {
    if (!confirm('¿Borrar este jugador? Sus estadísticas en partidos ya jugados se conservan en los partidos, pero dejará de aparecer. Si solo se ha ido del equipo, mejor desmarca "Activo".')) return;
    estado.jugadores = estado.jugadores.filter(x => x.id !== id);
    try { await guardar('jugadores', `Borra jugador ${id}`); aviso('Jugador borrado'); location.hash = '#/plantilla'; }
    catch (e) { aviso(e.message, 'error', 6000); }
  });
}

// ---------- Calendario y partidos ----------
let filtroCal = 'todos';
function vistaCalendario() {
  const ps = partidosOrdenados().filter(p =>
    filtroCal === 'todos' ? true : filtroCal === 'jugados' ? p.estado === 'jugado' : p.estado !== 'jugado');
  const prox = proximoPartido();
  return `
  <div class="cabecera"><h1>📅 Partidos</h1>
    ${esMister() ? `<div class="acciones"><a class="boton" href="#/partido-nuevo">+ Partido</a><a class="boton secundario" href="#/importar/calendario">🤖 Importar</a></div>` : ''}
  </div>
  <div class="pestanas">${['todos', 'proximos', 'jugados'].map(f =>
    `<button data-filtro="${f}" class="${filtroCal === f ? 'activa' : ''}">${{ todos: 'Todos', proximos: 'Próximos', jugados: 'Jugados' }[f]}</button>`).join('')}
  </div>
  ${ps.length ? `<div class="lista-partidos">${ps.map(p => (p === prox ? filaPartido(p).replace('fila-partido', 'fila-partido es-proximo') : filaPartido(p))).join('')}</div>`
    : vacio('📅', 'No hay partidos aquí.', botonMister('#/partido-nuevo', 'Añadir partido'))}
  ${enlaceFVF('calendario')}`;
}

function enlazarCalendario() {
  $$('[data-filtro]').forEach(b => b.addEventListener('click', () => { filtroCal = b.dataset.filtro; render(); }));
}

function vistaPartido(id) {
  const p = partido(id);
  if (!p) return vacio('🤷', 'Partido no encontrado.');
  const r = resultado(p);
  const st = p.stats || {};
  const lista = (campo, icono) => Object.entries(st).filter(([, v]) => v[campo] > 0)
    .map(([jid, v]) => `<span class="pastilla">${icono.repeat(Math.min(v[campo], 5))} ${esc(nombreDe(jugador(jid)) || jid)}${v[campo] > 5 ? ' ×' + v[campo] : ''}</span>`).join('');
  const convocados = Object.entries(st).filter(([, v]) => v.conv).map(([jid]) => jugador(jid)).filter(Boolean);
  const mvp = p.mvp && jugador(p.mvp);
  return `
  <div class="partido-cabecera ${r ? 'res-fondo-' + r : ''}">
    <div class="etiqueta">${esc(p.competicion || estado.equipo.categoria)} · Jornada ${esc(p.jornada ?? '-')}</div>
    ${marcador(p, true)}
    <div class="sub">${esc(fechaLarga(p.fecha, p.hora))}</div>
    <div class="sub">${p.local ? '🏠 En casa' : '🚌 Fuera'}${p.campo ? ' · 📍 ' + esc(p.campo) : ''}</div>
    ${r ? `<div class="veredicto">${{ V: '¡VICTORIA! 🎉', E: 'EMPATE 🤝', D: 'DERROTA · ¡a por el siguiente! 💪' }[r]}</div>` : ''}
  </div>
  ${esMister() ? `<div class="acciones centro">
      <a class="boton" href="#/partido/${esc(id)}/stats">📝 Meter estadísticas</a>
      <a class="boton secundario" href="#/partido/${esc(id)}/editar">✏️ Datos del partido</a>
    </div>` : ''}
  ${mvp ? `<a class="tarjeta mvp" href="#/jugador/${esc(mvp.id)}"><div class="etiqueta">⭐ MVP DEL PARTIDO</div>${foto(mvp, 'media')}<b>${esc(nombreDe(mvp))}</b></a>` : ''}
  ${lista('goles', '⚽') ? `<h2>⚽ Goles</h2><div class="pastillas">${lista('goles', '⚽')}</div>` : ''}
  ${lista('asist', '🎁') ? `<h2>🎁 Asistencias</h2><div class="pastillas">${lista('asist', '🎁')}</div>` : ''}
  ${lista('amarillas', '🟨') || lista('rojas', '🟥') ? `<h2>Tarjetas</h2><div class="pastillas">${lista('amarillas', '🟨')}${lista('rojas', '🟥')}</div>` : ''}
  ${p.cronica ? `<h2>📰 Crónica</h2><p class="cronica">${esc(p.cronica)}</p>` : ''}
  ${p.alineacion ? `<h2>📋 Alineación</h2><p><a class="boton secundario" href="#/alineacion?p=${encodeURIComponent(p.id)}">📌 Ver alineación oficial (${esc(p.alineacion.f)})</a></p>` : ''}
  ${convocados.length ? `<h2>👥 Convocados (${convocados.length})</h2><div class="pastillas">${convocados.map(j => `<a class="pastilla" href="#/jugador/${esc(j.id)}">${esc(j.dorsal ?? '')} ${esc(nombreDe(j))}</a>`).join('')}</div>` : ''}`;
}

function enlazarPartido(id) {
  const p = partido(id);
  if (resultado(p) === 'V' && sessionStorage.getItem('confeti') !== id) {
    try { sessionStorage.setItem('confeti', id); } catch { /* da igual */ }
    const c = estado.equipo.colores || {};
    confeti([c.acento, c.primario, c.secundario, '#22c55e'].filter(Boolean));
  }
}

function vistaEditarPartido(id) {
  if (!esMister()) return vacio('🔒', 'Solo el míster puede editar.');
  const p = id ? partido(id) : { local: true, estado: 'pendiente' };
  if (!p) return vacio('🤷', 'Partido no encontrado.');
  return `
  <h1>${id ? '✏️ Datos del partido' : '➕ Nuevo partido'}</h1>
  <form id="form-partido" class="formulario">
    <div class="fila-campos">
      <label>Jornada <input name="jornada" type="number" min="0" value="${esc(p.jornada ?? '')}"></label>
      <label>Fecha <input name="fecha" type="date" value="${esc(p.fecha || '')}"></label>
      <label>Hora <input name="hora" type="time" value="${esc(p.hora || '')}"></label>
    </div>
    <label>Rival <input name="rival" required value="${esc(p.rival || '')}"></label>
    <div class="fila-campos">
      <label>¿Dónde? <select name="local"><option value="1" ${p.local ? 'selected' : ''}>🏠 En casa</option><option value="0" ${!p.local ? 'selected' : ''}>🚌 Fuera</option></select></label>
      <label>Estado <select name="estado">${['pendiente', 'jugado', 'aplazado'].map(e => `<option ${p.estado === e ? 'selected' : ''}>${e}</option>`).join('')}</select></label>
    </div>
    <label>Campo <input name="campo" value="${esc(p.campo || '')}" placeholder="Ej.: Tabira"></label>
    <label>Competición <input name="competicion" value="${esc(p.competicion || '')}" placeholder="${esc(estado.equipo.categoria)}"></label>
    <div class="acciones">
      <button class="boton" type="submit">💾 Guardar</button>
      ${id ? `<button class="boton peligro" type="button" id="borrar-partido">🗑 Borrar</button>` : ''}
    </div>
  </form>`;
}

function enlazarEditarPartido(id) {
  const form = $('#form-partido');
  if (!form) return;
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const datos = {
      jornada: d.jornada === '' ? null : Number(d.jornada), fecha: d.fecha || null, hora: d.hora || null,
      rival: d.rival.trim(), local: d.local === '1', estado: d.estado, campo: d.campo.trim() || null,
      competicion: d.competicion.trim() || null,
    };
    let p = id ? partido(id) : null;
    if (p) Object.assign(p, datos);
    else {
      p = { id: idUnico(`j${datos.jornada ?? ''}-${datos.rival}`, estado.partidos.map(x => x.id)), goles_favor: null, goles_contra: null, stats: {}, mvp: null, cronica: '', ...datos };
      estado.partidos.push(p);
    }
    try { await guardar('partidos', `${id ? 'Edita' : 'Añade'} partido J${p.jornada ?? ''} vs ${p.rival}`); aviso('✅ Partido guardado'); location.hash = `#/partido/${p.id}`; }
    catch (e) { aviso(e.message, 'error', 6000); }
  });
  $('#borrar-partido')?.addEventListener('click', async () => {
    if (!confirm('¿Borrar este partido y sus estadísticas?')) return;
    estado.partidos = estado.partidos.filter(x => x.id !== id);
    try { await guardar('partidos', `Borra partido ${id}`); aviso('Partido borrado'); location.hash = '#/calendario'; }
    catch (e) { aviso(e.message, 'error', 6000); }
  });
}

// ---------- Meter estadísticas (pensado para el móvil, a pie de campo) ----------
let borrador = null;

function vistaStatsPartido(id) {
  if (!esMister()) return vacio('🔒', 'Solo el míster puede meter estadísticas.');
  const p = partido(id);
  if (!p) return vacio('🤷', 'Partido no encontrado.');
  if (!borrador || borrador.id !== id) {
    borrador = JSON.parse(JSON.stringify({ id, gf: p.goles_favor ?? 0, gc: p.goles_contra ?? 0, stats: p.stats || {}, mvp: p.mvp || null, cronica: p.cronica || '' }));
  }
  const activos = estado.jugadores.filter(j => j.activo !== false || borrador.stats[j.id])
    .sort((a, b) => Object.keys(POSICIONES).indexOf(a.posicion) - Object.keys(POSICIONES).indexOf(b.posicion) || (a.dorsal || 99) - (b.dorsal || 99));
  const sumaGoles = Object.values(borrador.stats).reduce((a, s) => a + (s.conv ? s.goles || 0 : 0), 0);
  const contador = (jid, campo, icono) => {
    const v = borrador.stats[jid]?.[campo] || 0;
    // Tocar el icono suma 1; el "−" pequeño corrige.
    return `<div class="contador compacto" data-j="${esc(jid)}" data-c="${campo}">
      <button type="button" data-d="1" class="suma ${v ? 'con-valor' : ''}" aria-label="sumar ${campo}">${icono}${v ? ' ' + v : ''}</button>${v ? `<button type="button" data-d="-1" class="resta" aria-label="restar ${campo}">−</button>` : ''}</div>`;
  };
  return `
  <h1>📝 Estadísticas</h1>
  <p class="sub">J${esc(p.jornada ?? '-')} · ${p.local ? 'vs' : 'en casa de'} ${esc(p.rival)} · ${esc(fechaCorta(p.fecha))}</p>

  <div class="tarjeta resultado-editor">
    <div><small>${esc(estado.equipo.nombre_corto || 'Nosotros')}</small>
      <div class="contador grande" data-g="gf"><button type="button" data-d="-1">−</button><b>${borrador.gf}</b><button type="button" data-d="1">+</button></div></div>
    <div><small>${esc(p.rival)}</small>
      <div class="contador grande" data-g="gc"><button type="button" data-d="-1">−</button><b>${borrador.gc}</b><button type="button" data-d="1">+</button></div></div>
  </div>
  ${sumaGoles !== borrador.gf ? `<p class="aviso-linea">⚠️ Goles asignados a jugadores: ${sumaGoles} de ${borrador.gf}. ${sumaGoles < borrador.gf ? '(¿algún autogol del rival?)' : ''}</p>` : ''}

  <p class="ayuda">Toca el nombre para marcar <b>convocado</b>. 🔝 = titular · ⭐ = MVP.</p>
  ${!activos.length ? vacio('👕', 'Primero añade jugadores a la plantilla.', botonMister('#/jugador-nuevo', '+ Jugador')) : ''}
  <div class="lista-stats">${activos.map(j => {
    const s = borrador.stats[j.id] || {};
    return `
    <div class="fila-stat ${s.conv ? 'conv' : ''}">
      <button type="button" class="fs-nombre" data-conv="${esc(j.id)}">${foto(j, 'mini')}<span><b>${esc(j.dorsal ?? '')}</b> ${esc(nombreDe(j))}</span><span class="tick">${s.conv ? '✅' : '➕'}</span></button>
      ${s.conv ? `
      <div class="fs-controles">
        <button type="button" class="toggle ${s.tit ? 'on' : ''}" data-tit="${esc(j.id)}">🔝</button>
        <button type="button" class="toggle ${borrador.mvp === j.id ? 'on' : ''}" data-mvp="${esc(j.id)}">⭐</button>
        ${contador(j.id, 'goles', '⚽')}${contador(j.id, 'asist', '🎁')}
        ${j.posicion === 'POR' ? contador(j.id, 'paradas', '🧤') : ''}
        ${contador(j.id, 'amarillas', '🟨')}${contador(j.id, 'rojas', '🟥')}
        <label class="minutos">⏱️<input type="number" min="0" max="120" inputmode="numeric" data-min="${esc(j.id)}" value="${esc(s.min ?? '')}" placeholder="min"></label>
      </div>` : ''}
    </div>`;
  }).join('')}</div>

  <label class="formulario">📰 Crónica (opcional)<textarea id="cronica" rows="3" placeholder="Lo mejor del partido…">${esc(borrador.cronica)}</textarea></label>

  <div class="barra-guardar">
    <button class="boton" id="guardar-stats">💾 Guardar partido</button>
  </div>`;
}

function enlazarStatsPartido(id) {
  if (!borrador) return;
  const st = (jid) => (borrador.stats[jid] ||= { conv: false });
  const repintar = () => { const y = scrollY; render(); scrollTo(0, y); };

  $$('[data-g]').forEach(c => c.addEventListener('click', ev => {
    const d = Number(ev.target.closest('[data-d]')?.dataset.d); if (!d) return;
    borrador[c.dataset.g] = Math.max(0, borrador[c.dataset.g] + d); repintar();
  }));
  $$('[data-conv]').forEach(b => b.addEventListener('click', () => {
    const s = st(b.dataset.conv); s.conv = !s.conv; repintar();
  }));
  $$('[data-tit]').forEach(b => b.addEventListener('click', () => { const s = st(b.dataset.tit); s.tit = !s.tit; repintar(); }));
  $$('[data-mvp]').forEach(b => b.addEventListener('click', () => { borrador.mvp = borrador.mvp === b.dataset.mvp ? null : b.dataset.mvp; repintar(); }));
  $$('.contador[data-j]').forEach(c => c.addEventListener('click', ev => {
    const d = Number(ev.target.closest('[data-d]')?.dataset.d); if (!d) return;
    const s = st(c.dataset.j); const campo = c.dataset.c;
    s[campo] = Math.max(0, (s[campo] || 0) + d);
    if (campo === 'goles' && d > 0 && Object.values(borrador.stats).reduce((a, x) => a + (x.goles || 0), 0) > borrador.gf) borrador.gf++;
    repintar();
  }));
  $$('[data-min]').forEach(i => i.addEventListener('change', () => { st(i.dataset.min).min = i.value === '' ? null : Number(i.value); }));
  $('#cronica')?.addEventListener('input', ev => { borrador.cronica = ev.target.value; });

  $('#guardar-stats')?.addEventListener('click', async () => {
    const p = partido(id);
    // Limpieza: solo se guardan los convocados y los campos con valor.
    const limpio = {};
    for (const [jid, s] of Object.entries(borrador.stats)) {
      if (!s.conv) continue;
      const o = { conv: true };
      for (const k of ['tit', 'min', 'goles', 'asist', 'amarillas', 'rojas', 'paradas']) if (s[k]) o[k] = s[k];
      limpio[jid] = o;
    }
    Object.assign(p, { goles_favor: borrador.gf, goles_contra: borrador.gc, stats: limpio, mvp: borrador.mvp && limpio[borrador.mvp] ? borrador.mvp : null, cronica: borrador.cronica.trim(), estado: 'jugado' });
    try {
      await guardar('partidos', `Estadísticas J${p.jornada ?? ''} vs ${p.rival}: ${p.goles_favor}-${p.goles_contra}`);
      borrador = null;
      aviso('✅ ¡Partido guardado!');
      location.hash = `#/partido/${id}`;
    } catch (e) { aviso(e.message, 'error', 6000); }
  });
}

// ---------- Clasificación ----------
function vistaClasificacion() {
  const c = estado.clasificacion || {};
  const tabla = c.tabla || [];
  const conGoles = tabla.some(f => f.gf != null || f.gc != null);
  return `
  <div class="cabecera"><h1>🏆 Clasificación</h1>
    ${esMister() ? `<div class="acciones"><a class="boton" href="#/importar/clasificacion">📸 Actualizar</a></div>` : ''}</div>
  <p class="sub">${esc(estado.equipo.categoria)}${c.jornada ? ' · Jornada ' + esc(c.jornada) : ''}${c.actualizado ? ' · Actualizada ' + esc(fechaCorta(c.actualizado)) : ''}</p>
  ${tabla.length ? `<div class="tabla-scroll"><table class="tabla clasif">
    <thead><tr><th>#</th><th class="izq">Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th>${conGoles ? '<th>GF</th><th>GC</th>' : ''}<th>Pts</th></tr></thead>
    <tbody>${tabla.map(f => `
      <tr class="${esNuestroEquipo(f.equipo, estado.equipo) ? 'nosotros' : ''}">
        <td>${esc(f.pos)}</td><td class="izq">${esc(f.equipo)}</td><td>${esc(f.pj ?? '')}</td><td>${esc(f.g ?? '')}</td><td>${esc(f.e ?? '')}</td>
        <td>${esc(f.p ?? '')}</td>${conGoles ? `<td>${esc(f.gf ?? '')}</td><td>${esc(f.gc ?? '')}</td>` : ''}<td><b>${esc(f.pts)}</b></td></tr>`).join('')}
    </tbody></table></div>
    ${c.fuente ? `<p class="sub">Fuente: ${esc(c.fuente)}</p>` : ''}
    ${enlaceFVF('clasificacion')}`
    : vacio('🏆', 'La clasificación todavía no está cargada.', botonMister('#/importar/clasificacion', '📸 Cargar desde captura') + enlaceFVF('clasificacion'))}`;
}

// ---------- Importar con IA (clasificación o calendario) ----------
let propuesta = null;

function vistaImportar(tipo) {
  if (!esMister()) return vacio('🔒', 'Solo el míster.');
  const titulo = tipo === 'clasificacion' ? '📸 Actualizar clasificación' : '🤖 Importar calendario';
  const sinClave = !credenciales.claveIA;
  return `
  <h1>${titulo}</h1>
  <ol class="pasos">
    <li>Haz una <b>captura de pantalla</b> en la app de la FVF (o copia el texto de su web).</li>
    <li>Súbela aquí y pulsa <b>Leer con IA</b>.</li>
    <li><b>Revisa</b> lo que ha leído (puedes corregir cualquier casilla) y guarda.</li>
  </ol>
  ${sinClave ? `<p class="aviso-linea">⚠️ Falta la clave de IA. Ponla en <a href="#/mister">Modo míster</a>. ${tipo === 'clasificacion' ? 'Mientras tanto puedes rellenar la tabla a mano abajo.' : ''}</p>` : ''}
  <div class="formulario">
    <label>Captura <input type="file" accept="image/*" id="imp-archivo"></label>
    <label>…o pega el texto <textarea id="imp-texto" rows="4" placeholder="Pega aquí la tabla copiada de la web"></textarea></label>
    <div class="acciones">
      <button class="boton" id="imp-leer" ${sinClave ? 'disabled' : ''}>🤖 Leer con IA</button>
      ${tipo === 'clasificacion' ? `<button class="boton secundario" id="imp-manual">✏️ Editar a mano</button>` : ''}
    </div>
  </div>
  <div id="imp-resultado"></div>`;
}

function tablaPropuestaClasif(filas) {
  const cols = ['pos', 'equipo', 'pj', 'g', 'e', 'p', 'gf', 'gc', 'pts'];
  return `
  <h2>Revisa y corrige</h2>
  <div class="tabla-scroll"><table class="tabla editable">
    <thead><tr>${cols.map(c => `<th>${c.toUpperCase()}</th>`).join('')}<th></th></tr></thead>
    <tbody>${filas.map((f, i) => `<tr class="${esNuestroEquipo(f.equipo, estado.equipo) ? 'nosotros' : ''}">${cols.map(c =>
      `<td><input data-i="${i}" data-c="${c}" value="${esc(f[c] ?? '')}" ${c === 'equipo' ? 'class="ancho"' : 'inputmode="numeric"'}></td>`).join('')}
      <td><button class="mini-x" data-quitar="${i}">✕</button></td></tr>`).join('')}</tbody>
  </table></div>
  <div class="acciones"><button class="boton secundario" id="imp-fila">+ Fila</button>
    <label>Jornada <input id="imp-jornada" type="number" value="${esc(propuesta.jornada ?? '')}" style="width:5em"></label></div>
  <div class="barra-guardar"><button class="boton" id="imp-guardar">💾 Guardar clasificación</button></div>`;
}

function tablaPropuestaCal(lista) {
  return `
  <h2>Partidos encontrados de ${esc(estado.equipo.nombre)}</h2>
  <p class="sub">Se emparejan por jornada: si la jornada ya existe se actualiza, si no se añade.</p>
  <div class="lista-import">${lista.map((p, i) => `
    <label class="fila-import"><input type="checkbox" data-sel="${i}" ${p.sel ? 'checked' : ''}>
      <span><b>J${esc(p.jornada ?? '?')}</b> · ${esc(fechaCorta(p.fecha))} ${esc(p.hora || '')}<br>
      ${p.local ? '🏠' : '🚌'} vs <b>${esc(p.rival)}</b>${p.goles_favor != null ? ` · ${p.goles_favor}-${p.goles_contra}` : ''}${p.campo ? ' · ' + esc(p.campo) : ''}</span></label>`).join('')}
  </div>
  ${!lista.length ? '<p class="aviso-linea">No he encontrado partidos de nuestro equipo. Revisa el nombre "nombre en federación" en Ajustes.</p>' : ''}
  <div class="barra-guardar"><button class="boton" id="imp-guardar" ${!lista.length ? 'disabled' : ''}>💾 Guardar partidos</button></div>`;
}

function enlazarImportar(tipo) {
  const zona = $('#imp-resultado');
  if (!zona) return;
  const pintar = () => {
    if (!propuesta || propuesta.tipo !== tipo) return;
    zona.innerHTML = tipo === 'clasificacion' ? tablaPropuestaClasif(propuesta.filas) : tablaPropuestaCal(propuesta.partidos);
    enlazarPropuesta();
  };
  const enlazarPropuesta = () => {
    $$('input[data-c]', zona).forEach(inp => inp.addEventListener('change', () => {
      const v = inp.value.trim();
      propuesta.filas[inp.dataset.i][inp.dataset.c] = inp.dataset.c === 'equipo' ? v : (v === '' ? null : Number(v));
    }));
    $$('[data-quitar]', zona).forEach(b => b.addEventListener('click', () => { propuesta.filas.splice(Number(b.dataset.quitar), 1); pintar(); }));
    $('#imp-fila')?.addEventListener('click', () => { propuesta.filas.push({ pos: propuesta.filas.length + 1, equipo: '', pts: 0 }); pintar(); });
    $('#imp-jornada')?.addEventListener('change', ev => { propuesta.jornada = ev.target.value ? Number(ev.target.value) : null; });
    $$('[data-sel]', zona).forEach(c => c.addEventListener('change', () => { propuesta.partidos[c.dataset.sel].sel = c.checked; }));
    $('#imp-guardar')?.addEventListener('click', guardarPropuesta);
  };

  const guardarPropuesta = async () => {
    try {
      if (tipo === 'clasificacion') {
        estado.clasificacion = {
          actualizado: hoyISO(), jornada: propuesta.jornada ?? null, fuente: propuesta.fuente || 'Captura FVF revisada por el míster',
          tabla: propuesta.filas.filter(f => f.equipo).sort((a, b) => (a.pos || 99) - (b.pos || 99)),
        };
        await guardar('clasificacion', `Clasificación jornada ${propuesta.jornada ?? '?'}`);
        location.hash = '#/clasificacion';
      } else {
        let nuevos = 0, act = 0;
        for (const x of propuesta.partidos.filter(p => p.sel)) {
          const existente = x.jornada != null && estado.partidos.find(p => p.jornada === x.jornada && (p.competicion || null) === null);
          const datos = { jornada: x.jornada, fecha: x.fecha, hora: x.hora, rival: x.rival, local: x.local, campo: x.campo };
          if (x.goles_favor != null) Object.assign(datos, { goles_favor: x.goles_favor, goles_contra: x.goles_contra, estado: 'jugado' });
          if (existente) {
            // No se pisan datos buenos con nulos.
            for (const [k, v] of Object.entries(datos)) if (v != null) existente[k] = v;
            act++;
          } else {
            estado.partidos.push({ id: idUnico(`j${x.jornada ?? ''}-${x.rival}`, estado.partidos.map(p => p.id)), estado: 'pendiente', goles_favor: null, goles_contra: null, stats: {}, mvp: null, cronica: '', competicion: null, ...datos });
            nuevos++;
          }
        }
        await guardar('partidos', `Importa calendario: ${nuevos} nuevos, ${act} actualizados`);
        aviso(`✅ ${nuevos} partidos nuevos, ${act} actualizados`);
        location.hash = '#/calendario';
      }
      propuesta = null;
    } catch (e) { aviso(e.message, 'error', 6000); }
  };

  $('#imp-manual')?.addEventListener('click', () => {
    propuesta = { tipo, jornada: estado.clasificacion?.jornada ?? null, fuente: 'Introducida a mano', filas: JSON.parse(JSON.stringify(estado.clasificacion?.tabla || [])) };
    if (!propuesta.filas.length) propuesta.filas.push({ pos: 1, equipo: '', pts: 0 });
    pintar();
  });

  $('#imp-leer')?.addEventListener('click', async (ev) => {
    const archivo = $('#imp-archivo').files?.[0];
    const texto = $('#imp-texto').value;
    const boton = ev.currentTarget;
    boton.disabled = true; boton.textContent = '🤖 Leyendo… (puede tardar 20-40 s)';
    try {
      const r = await leerConIA(tipo, { archivo, texto, temporada: estado.equipo.temporada });
      if (tipo === 'clasificacion') {
        propuesta = { tipo, jornada: r.jornada, filas: r.filas, fuente: 'Captura FVF leída con IA y revisada por el míster' };
      } else {
        const nuestros = r.partidos.filter(p => esNuestroEquipo(p.local, estado.equipo) || esNuestroEquipo(p.visitante, estado.equipo));
        propuesta = {
          tipo,
          partidos: nuestros.map(p => {
            const local = esNuestroEquipo(p.local, estado.equipo);
            return {
              sel: true, jornada: p.jornada, fecha: p.fecha, hora: p.hora, campo: p.campo, local,
              rival: local ? p.visitante : p.local,
              goles_favor: local ? p.goles_local : p.goles_visitante,
              goles_contra: local ? p.goles_visitante : p.goles_local,
            };
          }),
        };
      }
      pintar();
    } catch (e) { aviso(e.message, 'error', 7000); }
    finally { boton.disabled = false; boton.textContent = '🤖 Leer con IA'; }
  });
  pintar();
}

// ---------- Estadísticas completas ----------
function vistaStats() {
  const b = balanceEquipo();
  const tabla = (titulo, campo, icono) => {
    const r = ranking(campo);
    if (!r.length) return '';
    return `<div class="tarjeta"><h3>${icono} ${titulo}</h3><ol class="ranking">${r.map(x =>
      `<li><a href="#/jugador/${esc(x.jugador.id)}">${foto(x.jugador, 'mini')}<span>${esc(nombreDe(x.jugador))}</span><b>${x.s[campo]}</b></a></li>`).join('')}</ol></div>`;
  };
  return `
  <h1>📊 Estadísticas</h1>
  <div class="tarjeta"><div class="balance">
    <div><b>${b.pj}</b><small>PJ</small></div><div class="v"><b>${b.v}</b><small>G</small></div>
    <div class="e"><b>${b.e}</b><small>E</small></div><div class="d"><b>${b.d}</b><small>P</small></div>
    <div><b>${b.gf}</b><small>GF</small></div><div><b>${b.gc}</b><small>GC</small></div>
    <div><b>${b.pts}</b><small>Pts</small></div></div></div>
  <div class="rejilla-2">
    ${tabla('Goleadores', 'goles', '⚽')}${tabla('Asistencias', 'asist', '🎁')}
    ${tabla('MVP', 'mvp', '⭐')}${tabla('Partidos jugados', 'pj', '🏟️')}
    ${tabla('Minutos', 'min', '⏱️')}${tabla('Porterías a cero', 'cero', '🧱')}
  </div>`;
}

// ---------- Modo míster ----------
function vistaMister() {
  const { owner, nombre } = repo();
  const eq = estado.equipo;
  return `
  <h1>🧢 Modo míster</h1>
  ${esMister() ? `<p class="ok-linea">✅ Modo míster activo en este dispositivo.</p>` : `
  <p>Para guardar cambios necesitas un <b>token de GitHub</b> con permiso de escritura solo sobre <b>${esc(owner)}/${esc(nombre)}</b>.
  Se guarda únicamente en este navegador.</p>
  <details class="ayuda-caja"><summary>¿Cómo creo el token?</summary><ol>
    <li>Entra en <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">GitHub → Fine-grained token</a>.</li>
    <li>Repository access: <b>Only select repositories</b> → <b>${esc(nombre)}</b>.</li>
    <li>Permissions → Repository → <b>Contents: Read and write</b>.</li>
    <li>Caducidad: hasta final de temporada. Copia el token y pégalo aquí.</li></ol></details>`}
  <form id="form-token" class="formulario">
    <label>Token de GitHub <input name="token" type="password" autocomplete="off" placeholder="${esMister() ? '•••••• (guardado)' : 'github_pat_…'}"></label>
    <div class="acciones"><button class="boton" type="submit">🔑 ${esMister() ? 'Cambiar token' : 'Entrar como míster'}</button>
      ${esMister() ? `<button class="boton peligro" type="button" id="salir-mister">Salir</button>` : ''}</div>
  </form>

  <h2>🤖 IA para leer capturas (opcional)</h2>
  <p class="sub">Clave de la API de Anthropic (<a href="https://platform.claude.com/" target="_blank" rel="noopener">platform.claude.com</a>). Solo se usa al pulsar "Leer con IA" y se queda en este navegador. Cada lectura cuesta céntimos.</p>
  <form id="form-ia" class="formulario">
    <label>Clave <input name="clave" type="password" autocomplete="off" placeholder="${credenciales.claveIA ? '•••••• (guardada)' : 'sk-ant-…'}"></label>
    <div class="acciones"><button class="boton secundario" type="submit">Guardar clave</button>
    ${credenciales.claveIA ? `<button class="boton peligro" type="button" id="borrar-ia">Borrar clave</button>` : ''}</div>
  </form>

  ${esMister() ? `
  <h2>⚙️ Ajustes del equipo</h2>
  <form id="form-equipo" class="formulario">
    <label>Nombre <input name="nombre" value="${esc(eq.nombre)}"></label>
    <div class="fila-campos">
      <label>Nombre corto <input name="nombre_corto" value="${esc(eq.nombre_corto || '')}"></label>
      <label>Temporada <input name="temporada" value="${esc(eq.temporada || '')}"></label>
    </div>
    <label>Nombre en la federación (para reconocerlo en tablas y calendarios) <input name="nombre_en_federacion" value="${esc(eq.nombre_en_federacion || '')}"></label>
    <label>Categoría <input name="categoria" value="${esc(eq.categoria || '')}"></label>
    <div class="fila-campos">
      <label>Color 1 <input type="color" name="primario" value="${esc(eq.colores?.primario || '#1d4ed8')}"></label>
      <label>Color 2 <input type="color" name="secundario" value="${esc(eq.colores?.secundario || '#ffffff')}"></label>
      <label>Acento <input type="color" name="acento" value="${esc(eq.colores?.acento || '#facc15')}"></label>
      <label>Banda <input type="color" name="banda" value="${esc(eq.colores?.banda || '#a82418')}"></label>
    </div>
    <label>Escudo <input type="file" accept="image/*" name="escudo_archivo"></label>
    <button class="boton" type="submit">💾 Guardar ajustes</button>
  </form>` : ''}`;
}

function enlazarMister() {
  $('#form-token')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const t = new FormData(ev.target).get('token').trim();
    if (!t) return;
    const anterior = credenciales.token;
    credenciales.token = t;
    try {
      await comprobarToken();
      await cargarTodo();
      aviso('✅ ¡Hola, míster!');
      render();
    } catch (e) { credenciales.token = anterior; aviso(e.message, 'error', 7000); }
  });
  $('#salir-mister')?.addEventListener('click', () => { credenciales.token = ''; aviso('Has salido del modo míster'); render(); });
  $('#form-ia')?.addEventListener('submit', ev => {
    ev.preventDefault();
    const c = new FormData(ev.target).get('clave').trim();
    if (c) { credenciales.claveIA = c; aviso('Clave guardada en este navegador'); render(); }
  });
  $('#borrar-ia')?.addEventListener('click', () => { credenciales.claveIA = ''; render(); });
  $('#form-equipo')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const d = new FormData(ev.target);
    const eq = estado.equipo;
    for (const k of ['nombre', 'nombre_corto', 'temporada', 'nombre_en_federacion', 'categoria']) eq[k] = String(d.get(k) || '').trim();
    eq.colores = { primario: d.get('primario'), secundario: d.get('secundario'), acento: d.get('acento'), banda: d.get('banda') };
    try {
      const f = d.get('escudo_archivo');
      if (f && f.size) {
        const blob = await redimensionarImagen(f, { cuadrado: false, maxLado: 400, calidad: 0.92 });
        await subirArchivo('img/escudo.jpg', await blobABase64(blob), 'Escudo del equipo');
        eq.escudo = `img/escudo.jpg?v=${Date.now()}`;
      }
      await guardar('equipo', 'Ajustes del equipo');
      aplicarColores();
      aviso('✅ Ajustes guardados');
      render();
    } catch (e) { aviso(e.message, 'error', 6000); }
  });
}

// ---------- Router ----------
function aplicarColores() {
  const c = estado.equipo.colores || {};
  const r = document.documentElement.style;
  if (c.primario) r.setProperty('--club', c.primario);
  if (c.secundario) r.setProperty('--club2', c.secundario);
  if (c.acento) r.setProperty('--acento', c.acento);
  if (c.banda) r.setProperty('--banda', c.banda);
  document.title = `SOP · ${estado.equipo.nombre || 'Stats of Players'}`;
}

const RUTAS = [
  [/^\/?$/, () => [vistaInicio()]],
  [/^\/plantilla$/, () => [vistaPlantilla()]],
  [/^\/jugador-nuevo$/, () => [vistaEditarJugador(null), () => enlazarEditarJugador(null)]],
  [/^\/jugador\/([^/]+)\/editar$/, (id) => [vistaEditarJugador(id), () => enlazarEditarJugador(id)]],
  [/^\/jugador\/([^/]+)$/, (id) => [vistaJugador(id), () => enlazarJugador(id)]],
  [/^\/calendario$/, () => [vistaCalendario(), enlazarCalendario]],
  [/^\/partido-nuevo$/, () => [vistaEditarPartido(null), () => enlazarEditarPartido(null)]],
  [/^\/partido\/([^/]+)\/editar$/, (id) => [vistaEditarPartido(id), () => enlazarEditarPartido(id)]],
  [/^\/partido\/([^/]+)\/stats$/, (id) => [vistaStatsPartido(id), () => enlazarStatsPartido(id)]],
  [/^\/partido\/([^/]+)$/, (id) => [vistaPartido(id), () => enlazarPartido(id)]],
  [/^\/clasificacion$/, () => [vistaClasificacion()]],
  [/^\/importar\/(clasificacion|calendario)$/, (t) => [vistaImportar(t), () => enlazarImportar(t)]],
  [/^\/stats$/, () => [vistaStats()]],
  [/^\/alineacion$/, (_, q) => vistaAlineacion(q)],
  [/^\/mister$/, () => [vistaMister(), enlazarMister]],
];

let rutaAnterior = '';
export function render() {
  const [ruta, query = ''] = location.hash.replace(/^#/, '').split('?');
  for (const [re, fn] of RUTAS) {
    const m = ruta.match(re);
    if (!m) continue;
    const [html, enlazar] = fn(decodeURIComponent(m[1] || ''), new URLSearchParams(query));
    app.innerHTML = html;
    enlazar?.();
    break;
  }
  if (ruta !== rutaAnterior) { scrollTo(0, 0); rutaAnterior = ruta; }
  const seccion = '/' + (ruta.split('/')[1] || '');
  $$('#nav a').forEach(a => {
    const destino = a.getAttribute('href').slice(1);
    const grupo = { '/jugador': '/plantilla', '/jugador-nuevo': '/plantilla', '/partido': '/calendario', '/partido-nuevo': '/calendario', '/stats': '/', '/importar': ruta.endsWith('clasificacion') ? '/clasificacion' : '/calendario' }[seccion] ?? seccion;
    a.classList.toggle('activa', destino === grupo || (destino === '/' && grupo === '/'));
  });
  $('#chip-mister').hidden = !esMister();
}

async function arrancar() {
  try {
    await cargarTodo();
  } catch (e) {
    app.innerHTML = vacio('⚠️', `No se han podido cargar los datos: ${esc(e.message)}`);
    return;
  }
  aplicarColores();
  window.addEventListener('hashchange', render);
  render();
}

arrancar();
