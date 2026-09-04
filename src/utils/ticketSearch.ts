import { Ticket } from '../types';
import { normalizarTexto } from './technicianDetector';
import { determinarAtribucionOperativa } from './operationalAttributionEngine';

export interface ResultadoCoincidenciaTicket {
  coincide: boolean;
  camposCoincidentes: string[];
  fragmentoCoincidencia?: {
    campo: string;
    texto: string;
  };
}

// Cache débil de texto completo normalizado por ticket para búsquedas instantáneas
const ticketTextCache = new WeakMap<
  Ticket,
  {
    textoCompletoNormalizado: string;
    camposEstructurados: { campo: string; textoOriginal: string; textoNormalizado: string }[];
  }
>();

/**
 * Extrae y normaliza todos los campos textuales de un ticket para búsqueda exhaustiva.
 */
function compilarDatosBusquedaTicket(ticket: Ticket) {
  const cached = ticketTextCache.get(ticket);
  if (cached) return cached;

  const campos: { campo: string; textoOriginal: string; textoNormalizado: string }[] = [];

  const agregarCampo = (nombreCampo: string, valor: any) => {
    if (valor === null || valor === undefined) return;
    const str = String(valor).trim();
    if (!str) return;
    const norm = normalizarTexto(str);
    if (!norm) return;
    campos.push({
      campo: nombreCampo,
      textoOriginal: str,
      textoNormalizado: norm,
    });
  };

  // 1. Identificadores y Estado
  agregarCampo('Folio ID', ticket.id);
  agregarCampo('Estado', ticket.estado);
  agregarCampo('Fecha', ticket.fechaCreacion);

  // 2. Solicitud Principal
  agregarCampo('Asunto', ticket.asunto);
  agregarCampo('Descripción', ticket.descripcion);
  agregarCampo('Resolución', ticket.resolucion);
  agregarCampo('Solicitante', ticket.solicitante);

  // 3. Taxonomía
  agregarCampo('Categoría', ticket.categoria);
  agregarCampo('Subcategoría', ticket.subcategoria);
  agregarCampo('Artículo / Servicio', ticket.articulo);
  agregarCampo('Tipo de Solicitud', ticket.tipoSolicitud);

  // 4. Personal y Asignación
  agregarCampo('Técnico Asignado', ticket.tecnicoAsignado);
  if (ticket.tecnicoEnAtencion) agregarCampo('Técnico en Atención', ticket.tecnicoEnAtencion);
  if (ticket.tecnicoAtencion && ticket.tecnicoAtencion !== ticket.tecnicoEnAtencion) {
    agregarCampo('Técnico Atención', ticket.tecnicoAtencion);
  }

  // Atribución operativa (responsables detectados en historial)
  try {
    const atribucion = determinarAtribucionOperativa(ticket);
    if (atribucion?.nombresResponsables?.length) {
      agregarCampo('Responsables Operativos', atribucion.nombresResponsables.join(', '));
    }
  } catch {
    // Continuar si hay error de atribución
  }

  // 5. Destinatarios y Participantes
  if (ticket.correoDestinatario) agregarCampo('Correo Destinatario', ticket.correoDestinatario);
  if (ticket.participantesEquipo) agregarCampo('Participantes Equipo', ticket.participantesEquipo);
  if (ticket.participantesMesaAyuda) agregarCampo('Participantes Mesa', ticket.participantesMesaAyuda);

  // 6. Conversaciones e Interacciones registradas
  if (ticket.conversaciones && ticket.conversaciones.length > 0) {
    ticket.conversaciones.forEach((conv, idx) => {
      const prefijo = `Conversación #${idx + 1}`;
      if (conv.asunto && conv.asunto !== ticket.asunto) {
        agregarCampo(`${prefijo} (Asunto)`, conv.asunto);
      }
      if (conv.descripcion && conv.descripcion !== ticket.descripcion) {
        agregarCampo(`${prefijo} (Descripción)`, conv.descripcion);
      }
      if (conv.cuerpo && conv.cuerpo !== ticket.descripcion && conv.cuerpo !== conv.descripcion) {
        agregarCampo(`${prefijo} (Cuerpo)`, conv.cuerpo);
      }
      if (conv.resolucion && conv.resolucion !== ticket.resolucion) {
        agregarCampo(`${prefijo} (Resolución)`, conv.resolucion);
      }
      if (conv.remitenteNombre) agregarCampo(`${prefijo} (Remitente)`, conv.remitenteNombre);
      if (conv.remitenteCorreo) agregarCampo(`${prefijo} (Correo Remitente)`, conv.remitenteCorreo);
      if (conv.destinatarioCorreo) agregarCampo(`${prefijo} (Destinatario)`, conv.destinatarioCorreo);
      if (conv.participantes) agregarCampo(`${prefijo} (Participantes)`, conv.participantes);
      if (conv.cc) agregarCampo(`${prefijo} (CC)`, conv.cc);
    });
  }

  // 7. Campos adicionales del registro RAW (Piso, Ubicación, Prioridad, Modo, etc.)
  if (ticket.raw && typeof ticket.raw === 'object') {
    Object.entries(ticket.raw).forEach(([clave, val]) => {
      if (val === null || val === undefined) return;
      const strVal = String(val).trim();
      if (!strVal || strVal.length > 1000) return; // evitar bloques masivos repetidos
      // No repetir si ya está mapeado
      const claveNorm = normalizarTexto(clave);
      if (
        claveNorm.includes('id') ||
        claveNorm.includes('asunto') ||
        claveNorm.includes('descripcion') ||
        claveNorm.includes('estado') ||
        claveNorm.includes('solicitante')
      ) {
        return;
      }
      agregarCampo(`Dato (${clave})`, `${clave}: ${strVal}`);
    });
  }

  // Generar cadena consolidada para filtrado ultra rápido
  const textoCompletoNormalizado = campos.map((c) => `${c.campo}: ${c.textoNormalizado}`).join(' | ');

  const resultado = {
    textoCompletoNormalizado,
    camposEstructurados: campos,
  };

  ticketTextCache.set(ticket, resultado);
  return resultado;
}

/**
 * Evalúa si un ticket coincide con el término o frase de búsqueda.
 * Busca en Asunto, Descripción, Folio, Solicitante, Resolución, Categoría y cualquier otro dato de la solicitud.
 */
export function coincideTicketConBusqueda(
  ticket: Ticket,
  query: string
): ResultadoCoincidenciaTicket {
  if (!query || !query.trim()) {
    return { coincide: true, camposCoincidentes: [] };
  }

  const queryNorm = normalizarTexto(query);
  if (!queryNorm) {
    return { coincide: true, camposCoincidentes: [] };
  }

  const { textoCompletoNormalizado, camposEstructurados } = compilarDatosBusquedaTicket(ticket);

  // Palabras individuales de la búsqueda para coincidencia compuesta (AND)
  const palabras = queryNorm.split(' ').filter((p) => p.length > 0);

  // Comprobar si todas las palabras están en el texto completo
  const coincidenciaGlobal = palabras.every((p) => textoCompletoNormalizado.includes(p));

  if (!coincidenciaGlobal) {
    return { coincide: false, camposCoincidentes: [] };
  }

  // Identificar qué campos específicos contienen los términos para mostrar al usuario
  const camposCoincidentesSet = new Set<string>();
  let mejorFragmento: { campo: string; texto: string } | undefined = undefined;

  for (const c of camposEstructurados) {
    // Si contiene la frase completa o alguna palabra clave
    const contieneFrase = c.textoNormalizado.includes(queryNorm);
    const contienePalabra = palabras.some((p) => c.textoNormalizado.includes(p));

    if (contieneFrase || contienePalabra) {
      camposCoincidentesSet.add(c.campo);

      // Si aún no tenemos fragmento o este campo es prioritario (Asunto o Descripción)
      if (
        !mejorFragmento ||
        c.campo === 'Asunto' ||
        c.campo === 'Descripción' ||
        c.campo.includes('Descripción')
      ) {
        // Extraer snippet representativo
        const idx = c.textoNormalizado.indexOf(palabras[0] || queryNorm);
        const inicio = Math.max(0, idx - 40);
        const fin = Math.min(c.textoOriginal.length, idx + (palabras[0]?.length || 10) + 80);
        let fragmento = c.textoOriginal.slice(inicio, fin).trim();

        if (inicio > 0) fragmento = '...' + fragmento;
        if (fin < c.textoOriginal.length) fragmento = fragmento + '...';

        mejorFragmento = {
          campo: c.campo,
          texto: fragmento,
        };
      }
    }
  }

  return {
    coincide: true,
    camposCoincidentes: Array.from(camposCoincidentesSet),
    fragmentoCoincidencia: mejorFragmento,
  };
}

/**
 * Filtra una lista de tickets utilizando el motor de búsqueda universal.
 */
export function filtrarTicketsPorBusquedaUniversal(tickets: Ticket[], query: string): Ticket[] {
  if (!query || !query.trim()) return tickets;
  return tickets.filter((t) => coincideTicketConBusqueda(t, query).coincide);
}
