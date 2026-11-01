// Alineaciones: cualquiera (jugadores incluidos) puede montar una y compartirla
// por enlace, WhatsApp o imagen. El míster además puede fijarla como la oficial de un partido.
//
// Toda la alineación viaja en la URL (#/alineacion?f=4-3-3&j=id1,id2,...&t=Título),
// así que compartir no necesita guardar nada en ningún sitio.

import { estado, esMister, guardar } from './datos.js';
import { $, $$, esc, aviso, iniciales, fechaCorta } from './util.js';
import { FORMACIONES, POSICIONES, jugador, partido, partidosOrdenados, proximoPartido } from './stats.js';
import { foto, nombreDe } from './componentes.js';

let A = null; // { f, slots: [id|null], t, sel, partido }

const LS_BORRADOR = 'sop.alineacion';
const formacionPorDefecto = () => (estado.equipo.modalidad === 'F8' ? 'F8 3-3-1' : '4-3-3');
const tituloPartido = (p) => `J${p.jornada ?? ''} vs ${p.rival}`;

function construir(f, ids, t = '', partidoId = null) {
  if (!FORMACIONES[f]) f = formacionPorDefecto();
  const n = FORMACIONES[f].length;
  const slots = Array.from({ length: n }, (_, i) => (ids?.[i] && jugador(ids[i]) ? ids[i] : null));
  return { f, slots, t, sel: null, partido: partidoId };
}

function desdePartido(p) {
  return construir(p.alineacion.f, p.alineacion.j, tituloPartido(p), p.id);
}

function leerBorrador() {
  try { const b = JSON.parse(localStorage.getItem(LS_BORRADOR) || 'null'); return b?.f ? b : null; } catch { return null; }
}
function guardarBorrador() {
  try { localStorage.setItem(LS_BORRADOR, JSON.stringify({ f: A.f, j: A.slots, t: A.t })); } catch { /* modo privado */ }
}

const conAlineacion = () => partidosOrdenados().filter(p => p.alineacion?.j?.some(Boolean));

// Qué se muestra al abrir la pestaña "Once":
// 1) lo que venga en el enlace compartido; 2) la alineación oficial del próximo partido;
// 3) la última oficial fijada; 4) el borrador de este dispositivo; 5) campo vacío.
function inicial(q) {
  if (q.get('p') && partido(q.get('p'))?.alineacion) return desdePartido(partido(q.get('p')));
  if (q.has('f') || q.has('j')) return construir(q.get('f'), (q.get('j') || '').split(','), q.get('t') || '');
  const prox = proximoPartido();
  if (prox?.alineacion?.j?.some(Boolean)) return desdePartido(prox);
  const ultima = conAlineacion().pop();
  if (ultima) return desdePartido(ultima);
  const b = leerBorrador();
  if (b) return construir(b.f, b.j, b.t || '');
  return construir(formacionPorDefecto(), []);
}

// ¿Lo que hay en el campo coincide con la oficial del partido cargado?
function esOficialSinCambios() {
  const p = A.partido && partido(A.partido);
  if (!p?.alineacion) return false;
  const guardada = p.alineacion.j.map(x => x || null);
  return p.alineacion.f === A.f && A.slots.every((s, i) => (s || null) === (guardada[i] || null));
}

function urlCompartir() {
  const q = new URLSearchParams({ f: A.f, j: A.slots.map(s => s || '').join(',') });
  if (A?.partido && esOficialSinCambios()) q.set('p', A.partido);
  if (A.t) q.set('t', A.t);
  return `${location.origin}${location.pathname}#/alineacion?${q}`;
}

function htmlCampo() {
  const pos = FORMACIONES[A.f];
  return `
  <div class="campo" id="campo">
    <div class="campo-lineas"><i class="medio"></i><i class="circulo"></i><i class="area arriba"></i><i class="area abajo"></i></div>
    ${pos.map((p, i) => {
      const j = A.slots[i] && jugador(A.slots[i]);
      return `<button type="button" class="hueco ${A.sel === i ? 'sel' : ''} ${j ? 'lleno' : ''}" data-hueco="${i}" style="left:${p.x}%;top:${p.y}%">
        ${j ? foto(j, 'en-campo') : `<span class="foto foto-vacia en-campo">+</span>`}
        <span class="hueco-nombre">${j ? `${esc(j.dorsal ?? '')} ${esc(nombreDe(j))}` : (i === 0 ? 'Portero' : '')}</span>
      </button>`;
    }).join('')}
  </div>`;
}

function htmlBanquillo() {
  const puestos = new Set(A.slots.filter(Boolean));
  const disponibles = estado.jugadores.filter(j => j.activo !== false)
    .sort((a, b) => Object.keys(POSICIONES).indexOf(a.posicion) - Object.keys(POSICIONES).indexOf(b.posicion) || (a.dorsal || 99) - (b.dorsal || 99));
  return `
  <p class="ayuda">${A.sel == null ? '1️⃣ Toca un hueco del campo · 2️⃣ toca un jugador.' : '👇 Elige jugador para el hueco marcado (vuelve a tocar el hueco para vaciarlo).'}</p>
  <div class="banquillo">${disponibles.map(j => `
    <button type="button" class="ficha ${puestos.has(j.id) ? 'puesto' : ''}" data-jug="${esc(j.id)}">
      ${foto(j, 'mini')}<span>${esc(j.dorsal ?? '')} ${esc(nombreDe(j))}</span><small>${esc(j.posicion || '')}</small></button>`).join('')}
  </div>
  ${!disponibles.length ? '<p class="sub">Todavía no hay jugadores en la plantilla.</p>' : ''}`;
}

function htmlTodo() {
  const partidos = partidosOrdenados().filter(p => p.estado !== 'jugado');
  const oficiales = conAlineacion();
  const pCargado = A.partido && partido(A.partido);
  const hayBorrador = !!leerBorrador();
  const sinCambios = esOficialSinCambios();
  return `
  <div class="cabecera"><h1>📋 Alineación</h1></div>
  ${pCargado ? `<p class="${sinCambios ? 'ok-linea' : 'aviso-linea'}">${sinCambios
      ? `📌 Alineación oficial · <b>${esc(tituloPartido(pCargado))}</b> · ${esc(fechaCorta(pCargado.fecha))}`
      : `✏️ Modificando la oficial de <b>${esc(tituloPartido(pCargado))}</b>${esMister() ? ' — pulsa «Fijar» para guardar los cambios' : ''}`}</p>` : ''}
  ${oficiales.length || hayBorrador ? `
  <div class="formulario fila-campos">
    <label>Ver <select id="al-cargar">
      <option value="">— elegir —</option>
      ${oficiales.slice().reverse().map(p => `<option value="${esc(p.id)}" ${p.id === A.partido ? 'selected' : ''}>📌 ${esc(tituloPartido(p))} · ${esc(fechaCorta(p.fecha))}</option>`).join('')}
      ${hayBorrador ? '<option value="__borrador">✏️ Mi alineación (este móvil)</option>' : ''}
    </select></label>
  </div>` : ''}
  <div class="formulario fila-campos">
    <label>Sistema <select id="al-f">${Object.keys(FORMACIONES).map(f => `<option ${f === A.f ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
    <label>Título <input id="al-t" value="${esc(A.t)}" placeholder="Ej.: J5 vs Sondika"></label>
  </div>
  ${htmlCampo()}
  <div class="acciones centro compartir">
    <button class="boton" id="al-wa">💬 WhatsApp</button>
    <button class="boton secundario" id="al-img">🖼️ Imagen</button>
    <button class="boton secundario" id="al-link">🔗 Copiar enlace</button>
    <button class="boton secundario" id="al-vaciar">🧹 Vaciar</button>
  </div>
  ${esMister() && partidos.length ? `
  <div class="formulario fila-campos">
    <label>Fijar como oficial del partido <select id="al-partido">${partidos.map(p =>
      `<option value="${esc(p.id)}" ${p.id === (A.partido || proximoPartido()?.id) ? 'selected' : ''}>J${esc(p.jornada ?? '-')} · ${esc(fechaCorta(p.fecha))} · ${esc(p.rival)}${p.alineacion ? ' 📌' : ''}</option>`).join('')}</select></label>
    <button class="boton" id="al-oficial">📌 Fijar</button>
  </div>` : ''}
  <div id="al-banquillo">${htmlBanquillo()}</div>`;
}

function pintar() {
  const caja = $('#alin');
  if (!caja) return;
  caja.innerHTML = htmlTodo();
  enlazar();
  // Lo que monta cada uno se guarda en su móvil, para no perderlo al cambiar de pestaña.
  if (!esOficialSinCambios()) guardarBorrador();
  // Mantiene la URL al día (sin recargar) para que "atrás" y "compartir" funcionen.
  history.replaceState(null, '', urlCompartir());
}

function enlazar() {
  $('#al-cargar')?.addEventListener('change', ev => {
    const v = ev.target.value;
    if (!v) return;
    if (v === '__borrador') { const b = leerBorrador(); if (b) A = construir(b.f, b.j, b.t || ''); }
    else if (partido(v)?.alineacion) A = desdePartido(partido(v));
    pintar();
  });
  $('#al-f').addEventListener('change', ev => {
    const anteriores = A.slots.filter(Boolean);
    A.f = ev.target.value;
    A.slots = Array.from({ length: FORMACIONES[A.f].length }, (_, i) => anteriores[i] || null);
    A.sel = null;
    pintar();
  });
  $('#al-t').addEventListener('change', ev => { A.t = ev.target.value.trim(); pintar(); });
  $$('[data-hueco]').forEach(b => b.addEventListener('click', () => {
    const i = Number(b.dataset.hueco);
    if (A.sel === i) { A.slots[i] = null; A.sel = null; } else A.sel = i;
    pintar();
    if (A.sel != null) $('#al-banquillo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  $$('[data-jug]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.jug;
    let i = A.sel;
    if (i == null) i = A.slots.indexOf(null);           // sin hueco elegido: primer hueco libre
    if (i < 0) { aviso('El once está completo. Toca un hueco para cambiarlo.', 'info'); return; }
    const antes = A.slots.indexOf(id);
    if (antes >= 0) A.slots[antes] = A.slots[i];        // intercambio si ya estaba puesto
    A.slots[i] = id;
    A.sel = null;
    pintar();
    $('#campo')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));
  $('#al-vaciar').addEventListener('click', () => { A.slots = A.slots.map(() => null); A.sel = null; pintar(); });
  $('#al-link').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(urlCompartir()); aviso('🔗 Enlace copiado'); }
    catch { prompt('Copia este enlace:', urlCompartir()); }
  });
  $('#al-wa').addEventListener('click', () => {
    const texto = `📋 ${A.t || 'Alineación'} (${A.f})\n${listaTexto()}\n\n${urlCompartir()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  });
  $('#al-img').addEventListener('click', compartirImagen);
  $('#al-oficial')?.addEventListener('click', async () => {
    const p = estado.partidos.find(x => x.id === $('#al-partido').value);
    if (!p) return;
    const anterior = p.alineacion;
    p.alineacion = { f: A.f, j: A.slots.map(s => s || '') };
    try {
      await guardar('partidos', `Alineación ${tituloPartido(p)}`);
      A.partido = p.id;
      if (!A.t) A.t = tituloPartido(p);
      aviso('📌 Alineación fijada. Todos la verán en «Once» en 1-2 minutos.');
      pintar();
    } catch (e) { p.alineacion = anterior; aviso(e.message, 'error', 6000); }
  });
}

function listaTexto() {
  return A.slots.map((id, i) => {
    const j = id && jugador(id);
    return j ? `${i === 0 ? '🧤' : '•'} ${j.dorsal ?? ''} ${nombreDe(j)}` : null;
  }).filter(Boolean).join('\n');
}

// ---------- Imagen para compartir (canvas, 1080x1350, formato vertical) ----------
function cargarImg(src) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

async function dibujar() {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const col = estado.equipo.colores || {};
  const club = col.primario || '#1d4ed8', acento = col.acento || '#facc15';

  // Fondo y césped a franjas
  g.fillStyle = '#0b1220'; g.fillRect(0, 0, W, H);
  const top = 170, campoH = H - top - 40, izq = 40, campoW = W - 80;
  for (let i = 0; i < 10; i++) {
    g.fillStyle = i % 2 ? '#15803d' : '#16a34a';
    g.fillRect(izq, top + (campoH / 10) * i, campoW, campoH / 10 + 1);
  }
  g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 4;
  g.strokeRect(izq, top, campoW, campoH);
  g.beginPath(); g.moveTo(izq, top + campoH / 2); g.lineTo(izq + campoW, top + campoH / 2); g.stroke();
  g.beginPath(); g.arc(W / 2, top + campoH / 2, 110, 0, Math.PI * 2); g.stroke();
  g.strokeRect(W / 2 - 220, top, 440, 170); g.strokeRect(W / 2 - 220, top + campoH - 170, 440, 170);

  // Cabecera
  g.fillStyle = club; g.fillRect(0, 0, W, 150);
  g.fillStyle = acento; g.fillRect(0, 150, W, 8);
  const escudo = await cargarImg(estado.equipo.escudo || 'img/escudo.png');
  if (escudo) g.drawImage(escudo, 34, 12, 125 * escudo.width / escudo.height, 125);
  g.fillStyle = '#fff'; g.textBaseline = 'middle';
  g.font = '900 54px "Bebas Neue", Impact, sans-serif';
  g.fillText((A.t || estado.equipo.nombre).toUpperCase(), 150, 60);
  g.font = '600 32px system-ui, sans-serif';
  g.fillText(`${estado.equipo.nombre_corto || ''} · ${A.f}`, 150, 112);

  // Jugadores
  const pos = FORMACIONES[A.f];
  const R = 62;
  for (let i = 0; i < pos.length; i++) {
    const j = A.slots[i] && jugador(A.slots[i]);
    const x = izq + (pos[i].x / 100) * campoW;
    const y = top + (pos[i].y / 100) * campoH;
    g.save();
    g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.closePath();
    g.fillStyle = j ? club : 'rgba(255,255,255,.25)'; g.fill();
    g.lineWidth = 6; g.strokeStyle = i === 0 ? acento : '#fff'; g.stroke();
    g.clip();
    const img = j?.foto ? await cargarImg(j.foto) : null;
    if (img) g.drawImage(img, x - R, y - R, R * 2, R * 2);
    else {
      g.fillStyle = '#fff'; g.textAlign = 'center';
      g.font = '900 52px "Bebas Neue", Impact, sans-serif';
      g.fillText(j ? String(j.dorsal ?? iniciales(nombreDe(j))) : '?', x, y + 4);
    }
    g.restore();
    if (j) {
      const etiqueta = `${j.dorsal ?? ''} ${nombreDe(j)}`.trim().toUpperCase();
      g.font = '800 30px system-ui, sans-serif'; g.textAlign = 'center';
      const w = g.measureText(etiqueta).width + 24;
      g.fillStyle = 'rgba(0,0,0,.7)';
      g.beginPath(); g.roundRect?.(x - w / 2, y + R + 6, w, 42, 10); g.fill();
      g.fillStyle = '#fff'; g.fillText(etiqueta, x, y + R + 28);
    }
  }
  g.textAlign = 'left';
  return new Promise(res => c.toBlob(res, 'image/png'));
}

async function compartirImagen() {
  const blob = await dibujar();
  const nombre = `alineacion-${(A.t || A.f).replace(/[^\w-]+/g, '_')}.png`;
  const file = new File([blob], nombre, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: A.t || 'Alineación' }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  aviso('🖼️ Imagen descargada');
}

export function vistaAlineacion(q) {
  A = inicial(q);
  return [`<div id="alin">${htmlTodo()}</div>`, enlazar];
}
