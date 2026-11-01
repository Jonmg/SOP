// Carga y guardado de datos.
//
// La "base de datos" son ficheros JSON dentro del propio repositorio (carpeta data/).
// - Cualquiera que abra la web los lee como ficheros estáticos de GitHub Pages.
// - El míster, con un token de GitHub guardado en SU navegador, los lee y escribe
//   a través de la API de GitHub: cada guardado es un commit, con historial completo.

import { textoABase64, base64ATexto } from './util.js';

const LS_TOKEN = 'sop.githubToken';
const LS_CLAVE_IA = 'sop.anthropicKey';

export const ARCHIVOS = {
  equipo: 'data/equipo.json',
  jugadores: 'data/jugadores.json',
  partidos: 'data/partidos.json',
  clasificacion: 'data/clasificacion.json',
};

export const estado = {
  equipo: {},
  jugadores: [],
  partidos: [],
  clasificacion: { tabla: [] },
  shas: {},           // sha de cada fichero en GitHub, necesario para sobrescribir
  cargadoDesdeAPI: false,
};

// ---------- Credenciales (solo en este navegador) ----------
function leerLS(k) { try { return localStorage.getItem(k) || ''; } catch { return ''; } }
function escribirLS(k, v) { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch { /* modo privado */ } }

export const credenciales = {
  get token() { return leerLS(LS_TOKEN); },
  set token(v) { escribirLS(LS_TOKEN, v.trim()); },
  get claveIA() { return leerLS(LS_CLAVE_IA); },
  set claveIA(v) { escribirLS(LS_CLAVE_IA, v.trim()); },
};

export const esMister = () => !!credenciales.token;

// ---------- Repositorio ----------
export function repo() {
  const r = estado.equipo?.repo || {};
  // Si la web está en usuario.github.io/REPO, se deduce de la URL como respaldo.
  const hostUser = location.hostname.endsWith('github.io') ? location.hostname.split('.')[0] : '';
  const pathRepo = location.pathname.split('/').filter(Boolean)[0] || '';
  return {
    owner: r.owner || hostUser || 'Jonmg',
    nombre: r.nombre || pathRepo || 'SOP',
    rama: r.rama || 'main',
  };
}

async function gh(ruta, opciones = {}) {
  const { owner, nombre } = repo();
  const resp = await fetch(`https://api.github.com/repos/${owner}/${nombre}${ruta}`, {
    ...opciones,
    headers: {
      Authorization: `Bearer ${credenciales.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opciones.headers || {}),
    },
  });
  if (!resp.ok) {
    let detalle = '';
    try { detalle = (await resp.json()).message || ''; } catch { /* sin cuerpo */ }
    const e = new Error(mensajeErrorGH(resp.status, detalle));
    e.status = resp.status;
    throw e;
  }
  return resp.status === 204 ? null : resp.json();
}

function mensajeErrorGH(status, detalle) {
  if (status === 401) return 'El token de GitHub no es válido o ha caducado.';
  if (status === 403) return 'El token no tiene permiso de escritura en el repositorio (Contents: Read and write).';
  if (status === 404) return 'No encuentro el repositorio o el fichero. ¿El token tiene acceso a este repo?';
  if (status === 409 || status === 422) return 'Alguien ha guardado cambios a la vez. Recarga la página y vuelve a intentarlo.';
  return `Error de GitHub (${status}) ${detalle}`;
}

export async function comprobarToken() {
  const datos = await gh('');
  if (!datos.permissions?.push) {
    throw new Error('El token puede leer el repo pero no escribir. Dale permiso "Contents: Read and write".');
  }
  return datos;
}

async function leerArchivoAPI(ruta) {
  const { rama } = repo();
  const d = await gh(`/contents/${ruta}?ref=${encodeURIComponent(rama)}`);
  estado.shas[ruta] = d.sha;
  return base64ATexto(d.content);
}

async function shaActual(ruta) {
  if (estado.shas[ruta]) return estado.shas[ruta];
  try {
    const { rama } = repo();
    const d = await gh(`/contents/${ruta}?ref=${encodeURIComponent(rama)}`);
    return (estado.shas[ruta] = d.sha);
  } catch (e) {
    if (e.status === 404) return null; // fichero nuevo
    throw e;
  }
}

export async function subirArchivo(ruta, contenidoBase64, mensaje) {
  const { rama } = repo();
  const sha = await shaActual(ruta);
  const cuerpo = { message: mensaje, content: contenidoBase64, branch: rama };
  if (sha) cuerpo.sha = sha;
  const r = await gh(`/contents/${ruta.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'PUT',
    body: JSON.stringify(cuerpo),
  });
  estado.shas[ruta] = r.content.sha;
  return r;
}

// Guarda una de las colecciones (equipo, jugadores, partidos, clasificacion) como commit.
export async function guardar(clave, mensaje) {
  if (!esMister()) throw new Error('Solo el míster puede guardar cambios.');
  const ruta = ARCHIVOS[clave];
  const texto = JSON.stringify(estado[clave], null, 2) + '\n';
  await subirArchivo(ruta, textoABase64(texto), mensaje || `Actualiza ${ruta}`);
}

// ---------- Carga ----------
async function leerEstatico(ruta) {
  const r = await fetch(`${ruta}?t=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`No se pudo cargar ${ruta}`);
  return r.text();
}

export async function cargarTodo() {
  // equipo.json primero en estático: contiene owner/repo para la API.
  estado.equipo = JSON.parse(await leerEstatico(ARCHIVOS.equipo));
  const usarAPI = esMister();
  const leer = async (ruta) => {
    if (usarAPI) {
      try { return await leerArchivoAPI(ruta); } catch (e) {
        console.warn('API de GitHub no disponible, uso la copia publicada', e);
      }
    }
    return leerEstatico(ruta);
  };
  const [eq, jug, par, cla] = await Promise.all(Object.values(ARCHIVOS).map(leer));
  estado.equipo = JSON.parse(eq);
  estado.jugadores = JSON.parse(jug);
  estado.partidos = JSON.parse(par);
  estado.clasificacion = JSON.parse(cla);
  estado.cargadoDesdeAPI = usarAPI && Object.keys(estado.shas).length > 0;
}
