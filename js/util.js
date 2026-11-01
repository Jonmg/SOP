// Utilidades sin dependencias: escapado, fechas, base64, imágenes, avisos.

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

// Escapa texto antes de meterlo en HTML. TODO lo que venga de datos pasa por aquí.
export function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Lee obj[clave] solo si es propia del objeto. Imprescindible con claves que vienen de
// ids de jugador: un jugador con id "constructor" devolvería Object.prototype.constructor.
export function propio(obj, clave) {
  return obj != null && Object.hasOwn(obj, clave) ? obj[clave] : undefined;
}

export function slug(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'x';
}

export function idUnico(base, existentes) {
  const raiz = slug(base);
  let id = raiz, n = 2;
  const set = new Set(existentes);
  // Evita ids que coinciden con propiedades internas de JavaScript ("constructor"…).
  while (set.has(id) || id in Object.prototype) id = `${raiz}-${n++}`;
  return id;
}

// Normaliza nombres de equipos para compararlos ("C.D. Cultural Durango 'A'" ~ "cultural durango a").
export function normalizarEquipo(t) {
  return String(t || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function esNuestroEquipo(nombre, equipo) {
  const n = normalizarEquipo(nombre);
  const objetivo = normalizarEquipo(equipo?.nombre_en_federacion || equipo?.nombre || '');
  if (!n || !objetivo) return false;
  return n.includes(objetivo) || objetivo.includes(n);
}

// ---------- Fechas ----------
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export function parseFecha(f, hora) {
  if (!f) return null;
  const [y, m, d] = f.split('-').map(Number);
  const [hh, mm] = (hora || '00:00').split(':').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
  return isNaN(dt) ? null : dt;
}

export function fechaCorta(f) {
  const d = parseFecha(f);
  if (!d) return 'Fecha por definir';
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}

export function fechaLarga(f, hora) {
  const d = parseFecha(f);
  if (!d) return 'Fecha por definir';
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}${hora ? ' · ' + hora : ''}`;
}

export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function diasHasta(f) {
  const d = parseFecha(f);
  if (!d) return null;
  const hoy = parseFecha(hoyISO());
  return Math.round((d - hoy) / 86400000);
}

// ---------- Base64 con UTF-8 (la API de GitHub trabaja en base64) ----------
export function bytesABase64(bytes) {
  let bin = '';
  const trozo = 0x8000;
  for (let i = 0; i < bytes.length; i += trozo) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + trozo));
  }
  return btoa(bin);
}

export function textoABase64(texto) {
  return bytesABase64(new TextEncoder().encode(texto));
}

export function base64ATexto(b64) {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function blobABase64(blob) {
  return blob.arrayBuffer().then(buf => bytesABase64(new Uint8Array(buf)));
}

// Reduce una foto a un cuadrado (recorte centrado) o a un ancho máximo, en JPEG.
// Así el repo no se llena de fotos de 5 MB sacadas del móvil.
export async function redimensionarImagen(file, { lado = 480, cuadrado = true, maxLado = 1600, calidad = 0.85 } = {}) {
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (cuadrado) {
    const s = Math.min(bmp.width, bmp.height);
    canvas.width = canvas.height = lado;
    // Recorte centrado, algo desplazado hacia arriba para no cortar cabezas.
    const sx = (bmp.width - s) / 2;
    const sy = Math.max(0, (bmp.height - s) / 2 - (bmp.height - s) * 0.25);
    ctx.drawImage(bmp, sx, sy, s, s, 0, 0, lado, lado);
  } else {
    const k = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
    canvas.width = Math.round(bmp.width * k);
    canvas.height = Math.round(bmp.height * k);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  }
  bmp.close?.();
  return new Promise(res => canvas.toBlob(res, 'image/jpeg', calidad));
}

// ---------- Avisos ----------
export function aviso(texto, tipo = 'ok', ms = 3500) {
  let caja = $('#avisos');
  if (!caja) {
    caja = document.createElement('div');
    caja.id = 'avisos';
    document.body.appendChild(caja);
  }
  const el = document.createElement('div');
  el.className = `aviso aviso-${tipo}`;
  el.textContent = texto;
  caja.appendChild(el);
  setTimeout(() => el.classList.add('fuera'), ms);
  setTimeout(() => el.remove(), ms + 400);
}

export function iniciales(nombre) {
  return String(nombre || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || '?';
}

// Confeti ligero para celebrar victorias. Sin librerías.
export function confeti(colores = ['#facc15', '#ffffff', '#1d4ed8', '#22c55e']) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const capa = document.createElement('div');
  capa.className = 'confeti';
  for (let i = 0; i < 80; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = colores[i % colores.length];
    p.style.animationDelay = Math.random() * 0.6 + 's';
    p.style.animationDuration = 1.8 + Math.random() * 1.4 + 's';
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    capa.appendChild(p);
  }
  document.body.appendChild(capa);
  setTimeout(() => capa.remove(), 3800);
}
