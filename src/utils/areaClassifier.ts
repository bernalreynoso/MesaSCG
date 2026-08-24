import { Ticket } from '../types';
import { normalizarTexto } from './technicianDetector';

export type AreaOperativa = 'Soporte' | 'Informática' | 'Interinstitucional';

const areaTicketCache = new WeakMap<Ticket, AreaOperativa>();

/**
 * MOTOR CENTRAL DE ÁREAS:
 * Clasifica de forma consistente y centralizada a qué área operativa / subdirección pertenece un ticket.
 * 
 * Áreas Oficiales:
 * 1. SOPORTE:
 *    - Soporte Técnico, Hardware, Equipos de Cómputo, Dictámenes de No Utilidad, Impresoras, Redes locales.
 * 2. INFORMÁTICA:
 *    - Sistemas, Desarrollo, Bases de Datos, Módulos SCG, Consultoría Técnica, Servidores de Aplicación.
 * 3. INTERINSTITUCIONAL:
 *    - Subdirección Interinstitucional.
 *    - Atiende diversos tipos de solicitudes, entre ellos:
 *      * Tipo de Solicitud = 'CAPACITACIÓN' (Altas/bajas de usuarios en plataforma de cursos, claves de acceso, etc.)
 *      * Otros tipos de solicitudes interinstitucionales (oficios, plataformas, vinculación, etc.)
 */
export function determinarAreaTicket(ticket: Ticket): AreaOperativa {
  if (!ticket) return 'Soporte';
  const cached = areaTicketCache.get(ticket);
  if (cached) return cached;

  const tipoSol = normalizarTexto(ticket.tipoSolicitud);
  const cat = normalizarTexto(ticket.categoria);
  const subcat = normalizarTexto(ticket.subcategoria);
  const art = normalizarTexto(ticket.articulo);
  const tec = normalizarTexto(ticket.tecnicoAsignado);
  const tecAtn = normalizarTexto(ticket.tecnicoEnAtencion || ticket.tecnicoAtencion || '');
  const dest = normalizarTexto(ticket.correoDestinatario);

  let result: AreaOperativa = 'Soporte';

  // 1. Regla de Interinstitucional (incluye Tipo de Solicitud = 'CAPACITACIÓN' y demás solicitudes interinstitucionales)
  if (
    tipoSol.includes('capacita') ||
    tipoSol.includes('interinstitucional') ||
    cat.includes('capacita') ||
    cat.includes('interinstitucional') ||
    subcat.includes('capacita') ||
    subcat.includes('interinstitucional') ||
    art.includes('capacita') ||
    art.includes('interinstitucional') ||
    tec.includes('interinstitucional') ||
    dest.includes('interinstitucional') ||
    tecAtn.includes('dora') ||
    tecAtn.includes('interinstitucional')
  ) {
    result = 'Interinstitucional';
  } else if (
    cat.includes('sistema') ||
    cat.includes('desarrollo') ||
    cat.includes('base de datos') ||
    cat.includes('informa') ||
    subcat.includes('desarrollo') ||
    subcat.includes('base de datos') ||
    subcat.includes('sql') ||
    subcat.includes('oracle') ||
    art.includes('desarrollo') ||
    art.includes('consulta sql') ||
    art.includes('modulo') ||
    tec.includes('desarrollo') ||
    tecAtn.includes('jhonn') ||
    tecAtn.includes('marco eric') ||
    tecAtn.includes('samantha') ||
    tecAtn.includes('vanzzini') ||
    tecAtn.includes('adelaida') ||
    tecAtn.includes('zamora') ||
    tecAtn.includes('torres plata')
  ) {
    result = 'Informática';
  } else {
    result = 'Soporte';
  }

  areaTicketCache.set(ticket, result);
  return result;
}

export const determinarAreaDeTicket = determinarAreaTicket;

