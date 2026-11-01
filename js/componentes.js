// Piezas de HTML compartidas entre vistas.
import { esc, iniciales } from './util.js';

export const nombreDe = (j) => j?.apodo || j?.nombre || '¿?';

export function foto(j, clase = '') {
  if (j?.foto) return `<img class="foto ${clase}" src="${esc(j.foto)}" alt="${esc(nombreDe(j))}" loading="lazy">`;
  return `<span class="foto foto-vacia ${clase}">${esc(iniciales(nombreDe(j)))}</span>`;
}
