// Lectura de capturas (o texto pegado) con Claude: clasificación y calendario.
//
// Se llama a la API de Anthropic directamente desde el navegador del míster con SU clave,
// guardada solo en su navegador. Nunca se publica en el repositorio.
// La IA solo PROPONE: el resultado se muestra en una tabla editable y el míster lo revisa
// antes de guardarlo.

import { credenciales } from './datos.js';
import { redimensionarImagen, blobABase64 } from './util.js';

// SDK oficial cargado desde CDN, versión fijada (sin paso de compilación en GitHub Pages).
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.134.0/+esm';
const MODELO = 'claude-opus-5-5';

const nulo = (tipo) => ({ anyOf: [{ type: tipo }, { type: 'null' }] });

const ESQUEMA_CLASIFICACION = {
  type: 'object',
  additionalProperties: false,
  required: ['jornada', 'filas'],
  properties: {
    jornada: nulo('integer'),
    filas: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['pos', 'equipo', 'pj', 'g', 'e', 'p', 'gf', 'gc', 'pts'],
        properties: {
          pos: { type: 'integer' },
          equipo: { type: 'string' },
          pj: nulo('integer'), g: nulo('integer'), e: nulo('integer'), p: nulo('integer'),
          gf: nulo('integer'), gc: nulo('integer'), pts: { type: 'integer' },
        },
      },
    },
  },
};

const ESQUEMA_CALENDARIO = {
  type: 'object',
  additionalProperties: false,
  required: ['partidos'],
  properties: {
    partidos: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['jornada', 'fecha', 'hora', 'local', 'visitante', 'goles_local', 'goles_visitante', 'campo'],
        properties: {
          jornada: nulo('integer'),
          fecha: { ...nulo('string'), description: 'Formato YYYY-MM-DD' },
          hora: { ...nulo('string'), description: 'Formato HH:MM, 24 h' },
          local: { type: 'string' },
          visitante: { type: 'string' },
          goles_local: nulo('integer'),
          goles_visitante: nulo('integer'),
          campo: nulo('string'),
        },
      },
    },
  },
};

const INSTRUCCIONES = {
  clasificacion: `Es una clasificación de una liga de fútbol base (Federación Vizcaína de Fútbol).
Transcribe TODAS las filas de la tabla, en orden, tal y como aparecen.
Columnas: pos (posición), equipo (nombre exacto tal como aparece), pj (jugados), g (ganados), e (empatados), p (perdidos), gf (goles a favor), gc (goles en contra), pts (puntos).
Si una columna no aparece en la imagen, pon null. No inventes datos ni completes con suposiciones.
Si se ve el número de jornada, ponlo en "jornada"; si no, null.`,
  calendario: `Es un calendario o lista de resultados de una liga de fútbol base (Federación Vizcaína de Fútbol).
Transcribe TODOS los partidos que aparezcan: jornada, fecha (YYYY-MM-DD; la temporada es TEMPORADA, deduce el año correcto para cada mes), hora (HH:MM), equipo local, equipo visitante, goles si ya se ha jugado (si no, null) y campo si aparece (si no, null).
Copia los nombres de equipo exactamente como aparecen. No inventes datos.`,
};

let sdk = null;
async function cliente() {
  const clave = credenciales.claveIA;
  if (!clave) throw new Error('Falta la clave de la API de Anthropic. Ponla en la página del míster.');
  if (!sdk) sdk = (await import(SDK_URL)).default;
  return new sdk({ apiKey: clave, dangerouslyAllowBrowser: true });
}

/**
 * @param {'clasificacion'|'calendario'} tipo
 * @param {{archivo?: File, texto?: string, temporada?: string}} entrada
 */
export async function leerConIA(tipo, { archivo, texto, temporada }) {
  const client = await cliente();
  const contenido = [];
  if (archivo) {
    const blob = await redimensionarImagen(archivo, { cuadrado: false, maxLado: 1800, calidad: 0.9 });
    contenido.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: await blobABase64(blob) } });
  }
  if (texto?.trim()) contenido.push({ type: 'text', text: `Texto copiado de la web:\n\n${texto.trim()}` });
  if (!contenido.length) throw new Error('Sube una captura o pega el texto.');
  contenido.push({ type: 'text', text: INSTRUCCIONES[tipo].replace('TEMPORADA', temporada || '') });

  const peticion = {
    model: MODELO,
    max_tokens: 16000,
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: tipo === 'clasificacion' ? ESQUEMA_CLASIFICACION : ESQUEMA_CALENDARIO },
    },
    messages: [{ role: 'user', content: contenido }],
  };

  let resp;
  try {
    // Si el modelo rechazara la petición, el servidor reintenta solo con otro modelo.
    resp = await client.beta.messages.create({
      ...peticion,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
  } catch (e) {
    if (e?.status === 400) {
      // Por si la combinación con fallbacks no estuviera disponible: petición normal.
      resp = await client.messages.create(peticion);
    } else {
      throw traducirError(e);
    }
  }

  if (resp.stop_reason === 'refusal') throw new Error('La IA no ha podido procesar esta imagen. Prueba con otra captura o pega el texto.');
  if (resp.stop_reason === 'max_tokens') throw new Error('La respuesta se ha cortado. Prueba con una captura más pequeña.');
  const bloque = resp.content.find(b => b.type === 'text');
  if (!bloque) throw new Error('La IA no ha devuelto datos.');
  return JSON.parse(bloque.text);
}

function traducirError(e) {
  const s = e?.status;
  if (s === 401) return new Error('La clave de Anthropic no es válida.');
  if (s === 429) return new Error('Demasiadas peticiones seguidas. Espera un minuto.');
  if (s === 529 || s >= 500) return new Error('El servicio de IA está saturado. Inténtalo en un rato.');
  return new Error(e?.message || 'Error al llamar a la IA.');
}
