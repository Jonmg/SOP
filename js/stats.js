// Estadísticas derivadas. La única fuente de verdad son los partidos:
// las cifras de cada jugador se calculan sumando sus estadísticas partido a partido.

import { estado } from './datos.js';
import { parseFecha, hoyISO, propio } from './util.js';

export const POSICIONES = {
  POR: { nombre: 'Portero', emoji: '🧤' },
  DEF: { nombre: 'Defensa', emoji: '🛡️' },
  MED: { nombre: 'Centrocampista', emoji: '🎯' },
  DEL: { nombre: 'Delantero', emoji: '⚡' },
};

export const jugador = (id) => estado.jugadores.find(j => j.id === id);
export const partido = (id) => estado.partidos.find(p => p.id === id);

export function partidosOrdenados() {
  return [...estado.partidos].sort((a, b) =>
    (a.fecha || '9999').localeCompare(b.fecha || '9999') || (a.jornada || 0) - (b.jornada || 0));
}

export const jugados = () => partidosOrdenados().filter(p => p.estado === 'jugado');

export function proximoPartido() {
  const hoy = hoyISO();
  return partidosOrdenados().find(p => p.estado !== 'jugado' && p.estado !== 'aplazado' && (p.fecha || '9999') >= hoy)
    || partidosOrdenados().find(p => p.estado === 'pendiente');
}

export function ultimoJugado() {
  const j = jugados();
  return j[j.length - 1];
}

export function resultado(p) {
  if (p?.estado !== 'jugado' || p.goles_favor == null || p.goles_contra == null) return null;
  if (p.goles_favor > p.goles_contra) return 'V';
  if (p.goles_favor < p.goles_contra) return 'D';
  return 'E';
}

export function balanceEquipo() {
  const b = { pj: 0, v: 0, e: 0, d: 0, gf: 0, gc: 0, pts: 0, porteriasCero: 0 };
  for (const p of jugados()) {
    const r = resultado(p);
    if (!r) continue;
    b.pj++;
    b.gf += p.goles_favor;
    b.gc += p.goles_contra;
    if (r === 'V') { b.v++; b.pts += 3; }
    if (r === 'E') { b.e++; b.pts += 1; }
    if (r === 'D') b.d++;
    if (p.goles_contra === 0) b.porteriasCero++;
  }
  return b;
}

export function racha(n = 5) {
  return jugados().map(resultado).filter(Boolean).slice(-n);
}

const VACIO = () => ({ conv: 0, pj: 0, tit: 0, min: 0, goles: 0, asist: 0, amarillas: 0, rojas: 0, mvp: 0, cero: 0, paradas: 0 });

export function statsJugador(id) {
  const s = VACIO();
  s.historial = [];
  s.maxGolesPartido = 0;
  for (const p of jugados()) {
    const st = propio(p.stats, id);
    if (!st?.conv) continue;
    s.conv++;
    const jugo = st.jugo !== false; // por defecto, convocado = ha jugado
    if (jugo) s.pj++;
    if (st.tit) s.tit++;
    s.min += Number(st.min) || 0;
    s.goles += Number(st.goles) || 0;
    s.asist += Number(st.asist) || 0;
    s.amarillas += Number(st.amarillas) || 0;
    s.rojas += Number(st.rojas) || 0;
    s.paradas += Number(st.paradas) || 0;
    if (p.mvp === id) s.mvp++;
    if (jugo && p.goles_contra === 0 && jugador(id)?.posicion === 'POR') s.cero++;
    s.maxGolesPartido = Math.max(s.maxGolesPartido, Number(st.goles) || 0);
    s.historial.push({ partido: p, st });
  }
  return s;
}

export function todasLasStats() {
  return estado.jugadores.filter(j => j.activo !== false).map(j => ({ jugador: j, s: statsJugador(j.id) }));
}

export function ranking(campo, n = 99) {
  return todasLasStats()
    .filter(x => x.s[campo] > 0)
    .sort((a, b) => b.s[campo] - a.s[campo] || a.s.pj - b.s.pj)
    .slice(0, n);
}

// Logros: medallas que se desbloquean. Pensados para motivar, no para comparar.
export function logros(id) {
  const s = statsJugador(id);
  const j = jugador(id);
  const total = jugados().length;
  const L = [];
  const add = (cond, icono, nombre, desc) => L.push({ ok: !!cond, icono, nombre, desc });
  add(s.pj >= 1, '👟', 'Debut', 'Juega tu primer partido');
  add(s.goles >= 1, '⚽', 'Primer gol', 'Marca tu primer gol');
  add(s.asist >= 1, '🎁', 'Primer pase de gol', 'Da tu primera asistencia');
  add(s.maxGolesPartido >= 2, '✌️', 'Doblete', '2 goles en un partido');
  add(s.maxGolesPartido >= 3, '🎩', 'Hat-trick', '3 goles en un partido');
  add(s.goles >= 5, '🔥', 'Goleador', '5 goles en la temporada');
  add(s.goles >= 10, '🚀', 'Pichichi', '10 goles en la temporada');
  add(s.asist >= 5, '🧠', 'Cerebro', '5 asistencias');
  add(s.mvp >= 1, '⭐', 'MVP', 'Elegido mejor del partido');
  add(s.mvp >= 3, '🌟', 'Estrella', '3 veces MVP');
  const votado = estado.partidos.filter(p => p.votacion?.estado === 'cerrada' && p.votacion.ganador === id && p.mvp === id).length;
  add(votado >= 1, '👥', 'Elegido por el equipo', 'MVP votado por los compañeros');
  if (j?.posicion === 'POR') {
    add(s.cero >= 1, '🧱', 'Muro', 'Portería a cero');
    add(s.cero >= 5, '🏰', 'Fortaleza', '5 porterías a cero');
  }
  add(s.pj >= 10, '💪', 'Fijo', '10 partidos jugados');
  add(total >= 5 && s.conv === total, '📅', 'Siempre presente', 'Convocado en todos los partidos');
  add(s.pj >= 5 && s.amarillas === 0 && s.rojas === 0, '😇', 'Juego limpio', '5 partidos sin tarjetas');
  return L;
}

export function diasParaPartido(p) {
  const d = parseFecha(p?.fecha, p?.hora);
  if (!d) return null;
  return Math.ceil((d - new Date()) / 86400000);
}

// ---------- Formaciones (x, y en % del campo; y=0 portería rival) ----------
const P = (x, y) => ({ x, y });
const POR = P(50, 90);
const DEF4 = [P(14, 70), P(37, 75), P(63, 75), P(86, 70)];
const DEF3 = [P(24, 73), P(50, 76), P(76, 73)];
const DEL3 = [P(18, 24), P(50, 17), P(82, 24)];

export const FORMACIONES = {
  '4-3-3': [POR, ...DEF4, P(24, 50), P(50, 54), P(76, 50), ...DEL3],
  '4-4-2': [POR, ...DEF4, P(12, 47), P(37, 52), P(63, 52), P(88, 47), P(35, 21), P(65, 21)],
  '4-2-3-1': [POR, ...DEF4, P(35, 57), P(65, 57), P(15, 36), P(50, 37), P(85, 36), P(50, 16)],
  '3-5-2': [POR, ...DEF3, P(8, 47), P(30, 54), P(50, 42), P(70, 54), P(92, 47), P(35, 19), P(65, 19)],
  '3-4-3': [POR, ...DEF3, P(12, 49), P(37, 53), P(63, 53), P(88, 49), ...DEL3],
  '4-1-4-1': [POR, ...DEF4, P(50, 59), P(12, 42), P(37, 44), P(63, 44), P(88, 42), P(50, 17)],
  'F8 3-3-1': [POR, P(20, 70), P(50, 74), P(80, 70), P(20, 46), P(50, 49), P(80, 46), P(50, 19)],
  'F8 2-3-2': [POR, P(30, 72), P(70, 72), P(15, 48), P(50, 51), P(85, 48), P(33, 21), P(67, 21)],
  'F7 2-3-1': [POR, P(30, 70), P(70, 70), P(18, 46), P(50, 49), P(82, 46), P(50, 19)],
};
