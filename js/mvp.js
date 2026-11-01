// Votación del MVP en el grupo de WhatsApp del equipo.
//
// La web no tiene servidor, así que la votación se hace con una ENCUESTA de WhatsApp
// (un voto por persona, la garantiza WhatsApp). La app ayuda a prepararla, avisa a todos
// de que está abierta y guarda el resultado que el míster cuenta al cerrarla.
//
// Para no exponer a nadie, solo se publica el ganador (con sus votos) y el 2º y 3º
// sin número. Los votos de cada jugador no se guardan en el repositorio.

import { estado, esMister, guardar } from './datos.js';
import { $, $$, esc, aviso, parseFecha, propio } from './util.js';
import { jugador, partido, partidosOrdenados } from './stats.js';
import { foto, nombreDe } from './componentes.js';

const MAX_OPCIONES = 12; // límite de opciones de una encuesta de WhatsApp
const LS_VOTOS = (id) => `sop.votos.${id}`;

const titulo = (p) => `J${p.jornada ?? ''} vs ${p.rival}`;

export function cierreTexto(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d)) return '';
  const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  return `${dias[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1} a las ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const haCerrado = (v) => v?.cierre && new Date(v.cierre) < new Date();
export const votacionAbierta = (p) => p?.votacion?.estado === 'abierta' && !haCerrado(p.votacion);

function cierrePorDefecto(p) {
  // El día siguiente al partido a las 21:00 (o mañana si no hay fecha).
  const base = parseFecha(p.fecha) || new Date();
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1, 21, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T21:00`;
}

function enlacePartido(p) {
  return `${location.origin}${location.pathname}#/partido/${encodeURIComponent(p.id)}`;
}

function textoPregunta(p) {
  return `⭐ MVP ${titulo(p)}: ¿quién ha sido el mejor? (no vale votarse a uno mismo 😉)`;
}

function textoAviso(p, v) {
  return `🗳️ ¡Votación del MVP abierta!\n${titulo(p)}\n\n` +
    `Votad en la encuesta del grupo${v.cierre ? ` hasta el ${cierreTexto(v.cierre)}` : ''}.\n` +
    `Un voto cada uno y no vale votarse a uno mismo.\n\n` +
    `El resultado saldrá en la app: ${enlacePartido(p)}`;
}

// ---------- Bloques públicos ----------

// En la página del partido: aviso de votación abierta o resultado.
export function bloqueVotacion(p) {
  const v = p.votacion;
  if (!v) return '';
  if (v.estado === 'abierta') {
    if (haCerrado(v)) {
      return `<div class="tarjeta votacion"><div class="etiqueta">🗳️ VOTACIÓN MVP</div>
        <p>Votación cerrada. ¡El míster está haciendo el recuento! ⏳</p></div>`;
    }
    const cands = (v.candidatos || []).map(jugador).filter(Boolean);
    return `<div class="tarjeta votacion abierta">
      <div class="etiqueta">🗳️ VOTACIÓN MVP ABIERTA</div>
      <p><b>Vota en la encuesta del grupo de WhatsApp</b>${v.cierre ? ` · hasta el ${esc(cierreTexto(v.cierre))}` : ''}</p>
      <div class="candidatos">${cands.map(j => `<span class="candidato">${foto(j, 'mini')}<small>${esc(nombreDe(j))}</small></span>`).join('')}</div>
    </div>`;
  }
  return ''; // cerrada: se muestra en la tarjeta del MVP (ver tarjetaMVP)
}

export function tarjetaMVP(p) {
  const mvp = p.mvp && jugador(p.mvp);
  if (!mvp) return '';
  const v = p.votacion;
  const votada = v?.estado === 'cerrada' && v.ganador === p.mvp;
  const podio = votada ? (v.podio || []).map(jugador).filter(Boolean) : [];
  return `
  <a class="tarjeta mvp" href="#/jugador/${esc(mvp.id)}">
    ${foto(mvp, 'media')}
    <span>
      <div class="etiqueta">⭐ MVP DEL PARTIDO${votada ? ' · ELEGIDO POR EL EQUIPO' : ''}</div>
      <b>${esc(nombreDe(mvp))}</b>
      ${votada && v.votos_ganador ? `<small class="sub">${v.votos_ganador} voto${v.votos_ganador === 1 ? '' : 's'}${v.total ? ` de ${v.total}` : ''}</small>` : ''}
    </span>
  </a>
  ${podio.length ? `<p class="sub centro">También muy votados: ${podio.map((j, i) => `${['🥈', '🥉'][i]} ${esc(nombreDe(j))}`).join(' · ')}</p>` : ''}`;
}

// En Inicio: llamada a votar si hay alguna votación abierta.
export function avisoInicio() {
  const abiertas = partidosOrdenados().filter(votacionAbierta);
  return abiertas.map(p => `
  <a class="tarjeta votacion abierta" href="#/partido/${esc(p.id)}">
    <div class="etiqueta">🗳️ VOTA AL MVP</div>
    <b>${esc(titulo(p))}</b>
    <p class="sub">En la encuesta del grupo de WhatsApp${p.votacion.cierre ? ` · hasta el ${esc(cierreTexto(p.votacion.cierre))}` : ''}</p>
  </a>`).join('');
}

// ---------- Página del míster: preparar, abrir y contar ----------
let V = null; // { id, candidatos:Set, cierre, votos:{}, elegido, rehacer }

function candidatosPorDefecto(p) {
  const conv = Object.entries(p.stats || {}).filter(([, s]) => s.conv).map(([id]) => id).filter(jugador);
  const base = conv.length ? conv : estado.jugadores.filter(j => j.activo !== false).map(j => j.id);
  return base.length <= MAX_OPCIONES ? base : [];
}

const votosDe = (id) => Number(propio(V.votos, id)) || 0;

function leerVotos(id) {
  try { return JSON.parse(localStorage.getItem(LS_VOTOS(id)) || '{}'); } catch { return {}; }
}
function guardarVotos() {
  try { localStorage.setItem(LS_VOTOS(V.id), JSON.stringify(V.votos)); } catch { /* modo privado */ }
}

function html() {
  const p = partido(V.id);
  const v = p.votacion;
  const cerrada = v?.estado === 'cerrada' && !V.rehacer;
  const abierta = v?.estado === 'abierta' || V.rehacer;
  const lista = [...V.candidatos].map(jugador).filter(Boolean);
  const disponibles = estado.jugadores.filter(j => j.activo !== false || V.candidatos.has(j.id));
  const convocados = new Set(Object.entries(p.stats || {}).filter(([, s]) => s.conv).map(([id]) => id));

  const pasoPreparar = `
  <h2>1️⃣ Candidatos <small>${V.candidatos.size}/${MAX_OPCIONES}</small></h2>
  <p class="ayuda">WhatsApp admite como máximo ${MAX_OPCIONES} opciones por encuesta. ${convocados.size ? 'Están marcados los convocados.' : ''}</p>
  <div class="banquillo">${disponibles.map(j => `
    <button type="button" class="ficha ${V.candidatos.has(j.id) ? 'elegida' : 'puesto'}" data-cand="${esc(j.id)}">
      ${foto(j, 'mini')}<span>${esc(j.dorsal ?? '')} ${esc(nombreDe(j))}</span><small>${V.candidatos.has(j.id) ? '✅' : ''}</small></button>`).join('')}
  </div>
  <div class="formulario fila-campos">
    <label>Cierre de la votación <input type="datetime-local" id="mvp-cierre" value="${esc(V.cierre)}"></label>
  </div>

  <h2>2️⃣ Crear la encuesta en el grupo</h2>
  <ol class="pasos">
    <li>En el grupo de WhatsApp: <b>📎 → Encuesta</b>.</li>
    <li>Pregunta: <button type="button" class="boton secundario mini-boton" id="mvp-copiar-pregunta">📋 Copiar pregunta</button></li>
    <li>Una opción por jugador (desactiva «Permitir varias respuestas»):</li>
  </ol>
  <div class="opciones-encuesta">${lista.map(j => `<span>${esc(j.dorsal ?? '')} ${esc(nombreDe(j))}</span>`).join('') || '<span class="sub">Elige candidatos arriba</span>'}</div>
  <p><button type="button" class="boton secundario" id="mvp-copiar-nombres">📋 Copiar nombres</button></p>

  <h2>3️⃣ Avisar y abrir</h2>
  <div class="acciones">
    <button type="button" class="boton" id="mvp-abrir">🗳️ ${v?.estado === 'abierta' ? 'Guardar cambios' : 'Abrir votación en la app'}</button>
    <button type="button" class="boton secundario" id="mvp-avisar">💬 Avisar en el grupo</button>
  </div>
  <p class="ayuda">«Abrir» hace que en la app salga a todos «Vota al MVP». «Avisar» prepara un mensaje para el grupo con el enlace.</p>`;

  const total = lista.reduce((a, j) => a + votosDe(j.id), 0);
  const max = Math.max(0, ...lista.map(j => votosDe(j.id)));
  const empatados = max ? lista.filter(j => votosDe(j.id) === max) : [];
  const pasoContar = `
  <h2>4️⃣ Recuento <small>${total} voto${total === 1 ? '' : 's'}</small></h2>
  <p class="ayuda">Cuando cierre la encuesta, apunta los votos de cada uno con + / −. Los votos individuales <b>no se publican</b>: solo el ganador y el podio.</p>
  <div class="lista-stats">${lista.map(j => {
    const n = votosDe(j.id);
    return `<div class="fila-stat conv recuento">
      <span class="fs-nombre">${foto(j, 'mini')}<span><b>${esc(j.dorsal ?? '')}</b> ${esc(nombreDe(j))}</span></span>
      <div class="contador grande" data-voto="${esc(j.id)}"><button type="button" data-d="-1">−</button><b>${n}</b><button type="button" data-d="1">+</button></div>
    </div>`;
  }).join('')}</div>
  ${empatados.length > 1 ? `
  <p class="aviso-linea">🤝 Empate a ${max}. Elige quién se lleva el MVP (o desempatad como queráis):</p>
  <div class="pastillas">${empatados.map(j => `<button type="button" class="pastilla ${V.elegido === j.id ? 'elegida' : ''}" data-desempate="${esc(j.id)}">⭐ ${esc(nombreDe(j))}</button>`).join('')}</div>` : ''}
  <div class="barra-guardar"><button class="boton" id="mvp-cerrar" ${max ? '' : 'disabled'}>🏆 Cerrar y publicar MVP</button></div>`;

  const ganador = v?.ganador && jugador(v.ganador);
  const resultado = `
  <div class="ok-linea">🏆 Votación cerrada. MVP: <b>${esc(nombreDe(ganador))}</b>${v?.votos_ganador ? ` (${v.votos_ganador} votos de ${v.total})` : ''}.</div>
  <div class="acciones"><a class="boton" href="#/partido/${esc(p.id)}">Ver el partido</a>
    <button type="button" class="boton secundario" id="mvp-rehacer">✏️ Corregir recuento</button></div>`;

  return `
  <h1>⭐ Votación MVP</h1>
  <p class="sub">${esc(titulo(p))}</p>
  ${cerrada ? resultado : (abierta ? pasoContar + '<hr class="separador">' + pasoPreparar : pasoPreparar)}`;
}

function pintar() {
  const caja = $('#mvp');
  if (!caja) return;
  const y = scrollY;
  caja.innerHTML = html();
  enlazar();
  scrollTo(0, y);
}

async function copiar(texto, ok) {
  try { await navigator.clipboard.writeText(texto); aviso(ok); }
  catch { prompt('Copia este texto:', texto); }
}

function enlazar() {
  const p = partido(V.id);
  $$('[data-cand]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.cand;
    if (V.candidatos.has(id)) V.candidatos.delete(id);
    else if (V.candidatos.size >= MAX_OPCIONES) { aviso(`Máximo ${MAX_OPCIONES} candidatos (límite de WhatsApp)`, 'info'); return; }
    else V.candidatos.add(id);
    pintar();
  }));
  $('#mvp-cierre')?.addEventListener('change', ev => { V.cierre = ev.target.value; });
  $('#mvp-copiar-pregunta')?.addEventListener('click', () => copiar(textoPregunta(p), '📋 Pregunta copiada'));
  $('#mvp-copiar-nombres')?.addEventListener('click', () =>
    copiar([...V.candidatos].map(jugador).filter(Boolean).map(j => `${j.dorsal ?? ''} ${nombreDe(j)}`.trim()).join('\n'), '📋 Nombres copiados'));
  $('#mvp-avisar')?.addEventListener('click', () => {
    const v = { cierre: V.cierre };
    window.open(`https://wa.me/?text=${encodeURIComponent(textoAviso(p, v))}`, '_blank', 'noopener');
  });
  $('#mvp-abrir')?.addEventListener('click', async () => {
    if (V.candidatos.size < 2) { aviso('Elige al menos 2 candidatos', 'info'); return; }
    const anterior = p.votacion;
    p.votacion = { estado: 'abierta', candidatos: [...V.candidatos], cierre: V.cierre || null };
    try {
      await guardar('partidos', `Abre votación MVP ${titulo(p)}`);
      V.rehacer = false;
      aviso('🗳️ Votación abierta. En la app saldrá a todos en 1-2 minutos.');
      pintar();
    } catch (e) { p.votacion = anterior; aviso(e.message, 'error', 6000); }
  });
  $$('[data-voto]').forEach(c => c.addEventListener('click', ev => {
    const d = Number(ev.target.closest('[data-d]')?.dataset.d);
    if (!d) return;
    const id = c.dataset.voto;
    V.votos[id] = Math.max(0, votosDe(id) + d);
    guardarVotos();
    pintar();
  }));
  $$('[data-desempate]').forEach(b => b.addEventListener('click', () => { V.elegido = b.dataset.desempate; pintar(); }));
  $('#mvp-rehacer')?.addEventListener('click', () => { V.rehacer = true; pintar(); });
  $('#mvp-cerrar')?.addEventListener('click', async () => {
    const lista = [...V.candidatos].filter(jugador);
    const orden = lista.map(id => ({ id, n: votosDe(id) })).filter(x => x.n > 0).sort((a, b) => b.n - a.n);
    if (!orden.length) return;
    const max = orden[0].n;
    const empatados = orden.filter(x => x.n === max).map(x => x.id);
    let ganador = empatados[0];
    if (empatados.length > 1) {
      if (!V.elegido || !empatados.includes(V.elegido)) { aviso('Hay empate: elige quién se lleva el MVP', 'info'); return; }
      ganador = V.elegido;
    }
    const podio = orden.map(x => x.id).filter(id => id !== ganador).slice(0, 2);
    const total = orden.reduce((a, x) => a + x.n, 0);
    const anterior = { votacion: p.votacion, mvp: p.mvp };
    p.votacion = { estado: 'cerrada', candidatos: lista, cierre: V.cierre || p.votacion?.cierre || null, ganador, votos_ganador: max, podio, total };
    p.mvp = ganador;
    try {
      await guardar('partidos', `MVP ${titulo(p)}: ${nombreDe(jugador(ganador))} (votación del equipo)`);
      try { localStorage.removeItem(LS_VOTOS(p.id)); } catch { /* da igual */ }
      aviso(`🏆 ¡${nombreDe(jugador(ganador))} es el MVP!`);
      location.hash = `#/partido/${p.id}`;
    } catch (e) { Object.assign(p, anterior); aviso(e.message, 'error', 6000); }
  });
}

export function vistaVotacion(id) {
  const p = partido(id);
  if (!esMister()) return [`<div class="vacio"><div class="vacio-icono">🔒</div><p>Solo el míster.</p></div>`];
  if (!p) return [`<div class="vacio"><div class="vacio-icono">🤷</div><p>Partido no encontrado.</p></div>`];
  if (!V || V.id !== id) {
    const v = p.votacion;
    V = {
      id,
      candidatos: new Set(v?.candidatos?.filter(jugador) || candidatosPorDefecto(p)),
      cierre: v?.cierre || cierrePorDefecto(p),
      votos: leerVotos(id),
      elegido: null,
      rehacer: false,
    };
  }
  return [`<div id="mvp">${html()}</div>`, enlazar];
}

// Para los logros: partidos en los que el jugador fue MVP por votación del equipo.
export function mvpsPorVotacion(idJugador) {
  return estado.partidos.filter(p => p.votacion?.estado === 'cerrada' && p.votacion.ganador === idJugador && p.mvp === idJugador).length;
}
