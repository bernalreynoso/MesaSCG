import { Ticket, ConversacionRow, TecnicoRegistro } from '../types';
import { obtenerCatalogoTecnicos } from './technicianCatalogStore';
import {
  EvidenciaTecnico,
  ParticipacionTecnicoEnTicket,
  TecnicoConfigUniversal,
  RolEvidenciaTecnico,
  NivelEvidencia,
  CategoriaParticipacion,
  AccionHumanaDetectada,
} from './technicianEvidenceTypes';

// ============================================================================
// CACHES DE ALTO RENDIMIENTO (Optimizados para miles de tickets)
// ============================================================================
const textNormCache = new Map<string, string>();
const emailNormCache = new Map<string, string>();
let cachedUniversalCatalog: Record<string, TecnicoConfigUniversal> | null = null;
let participacionesTicketCache = new WeakMap<Ticket, ParticipacionTecnicoEnTicket[]>();
let perfilTecnicoTicketCache = new WeakMap<Ticket, Map<string, ParticipacionTecnicoEnTicket>>();

export function limpiarCachesDeteccion(): void {
  textNormCache.clear();
  emailNormCache.clear();
  cachedUniversalCatalog = null;
  participacionesTicketCache = new WeakMap<Ticket, ParticipacionTecnicoEnTicket[]>();
  perfilTecnicoTicketCache = new WeakMap<Ticket, Map<string, ParticipacionTecnicoEnTicket>>();
}

if (typeof window !== 'undefined') {
  window.addEventListener('scg_catalogo_tecnicos_changed', limpiarCachesDeteccion);
  window.addEventListener('storage', (e) => {
    if (e.key === 'scg_catalogo_tecnicos_v2') {
      limpiarCachesDeteccion();
    }
  });
}

/**
 * Resuelve el nombre oficial y correo asociado a cualquier dirección o remitente.
 * Si coincide con el catálogo de técnicos, devuelve su nombre formal completo.
 */
export function resolverNombreYCorreo(
  emailTexto?: string | null,
  nombreTexto?: string | null,
  catalogo?: TecnicoRegistro[]
): { nombre: string; correo: string; esTecnico: boolean; area?: string } {
  const lista = catalogo || obtenerCatalogoTecnicos();
  const cNorm = normalizarCorreo(emailTexto);
  const nNorm = normalizarTexto(nombreTexto);

  // Buscar en el catálogo por correo o alias/nombre
  for (const tec of lista) {
    const tecEmail = normalizarCorreo(tec.correoPrincipal);
    const tecAlts = (tec.correosAlternativos || []).map((e) => normalizarCorreo(e));
    const allEmails = [tecEmail, ...tecAlts];

    if (cNorm && allEmails.includes(cNorm)) {
      return {
        nombre: tec.nombre,
        correo: emailTexto || tec.correoPrincipal,
        esTecnico: true,
        area: tec.area,
      };
    }

    const nomNorm = normalizarTexto(tec.nombre);
    if (nNorm && (nNorm === nomNorm || nNorm.includes(nomNorm) || nomNorm.includes(nNorm))) {
      return {
        nombre: tec.nombre,
        correo: emailTexto || tec.correoPrincipal,
        esTecnico: true,
        area: tec.area,
      };
    }

    if (
      tec.alias &&
      tec.alias.some((a) => {
        const aNorm = normalizarTexto(a);
        return aNorm === nNorm || nNorm.includes(aNorm) || aNorm.includes(nNorm);
      })
    ) {
      return {
        nombre: tec.nombre,
        correo: emailTexto || tec.correoPrincipal,
        esTecnico: true,
        area: tec.area,
      };
    }
  }

  // Si no está en el catálogo, estructurar con lo disponible limpiamente
  const finalEmail = emailTexto ? normalizarCorreo(emailTexto) : '';
  let finalNombre = nombreTexto ? nombreTexto.trim() : '';

  if (!finalNombre && finalEmail) {
    // Si no hay nombre pero hay correo, usar parte local capitalizada como referencia
    const localPart = finalEmail.split('@')[0].replace(/[._-]/g, ' ');
    finalNombre = localPart.replace(/\b\w/g, (c) => c.toUpperCase());
  } else if (!finalNombre) {
    finalNombre = 'Participante';
  }

  return {
    nombre: finalNombre,
    correo: finalEmail,
    esTecnico: false,
  };
}

/**
 * Normaliza un correo electrónico: minúsculas, sin espacios ni caracteres extraños.
 */
export function normalizarCorreo(email: string | null | undefined): string {
  if (!email) return '';
  const cached = emailNormCache.get(email);
  if (cached !== undefined) return cached;

  const result = String(email).toLowerCase().trim().replace(/['"<>]/g, '');
  if (emailNormCache.size < 5000) {
    emailNormCache.set(email, result);
  }
  return result;
}

/**
 * Normaliza una cadena de texto (nombres, alias): minúsculas, sin acentos redundantes, espacios simples.
 */
export function normalizarTexto(texto: string | null | undefined): string {
  if (!texto) return '';
  const cached = textNormCache.get(texto);
  if (cached !== undefined) return cached;

  const result = String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');

  if (textNormCache.size < 8000) {
    textNormCache.set(texto, result);
  }
  return result;
}

/**
 * Extrae y separa una lista de correos que puede venir separada por comas, puntos y comas o saltos de línea.
 */
export function extraerCorreos(cadena: string | null | undefined): string[] {
  if (!cadena) return [];
  return String(cadena)
    .split(/[,;\n\r]+/)
    .map((e) => normalizarCorreo(e))
    .filter((e) => e.length > 0);
}

/**
 * Extrae y separa una lista de nombres o fragmentos de participantes.
 */
export function extraerNombres(cadena: string | null | undefined): string[] {
  if (!cadena) return [];
  return String(cadena)
    .split(/[,;\n\r]+/)
    .map((n) => normalizarTexto(n))
    .filter((n) => n.length > 0);
}

/**
 * Convierte el catálogo de técnicos administrable en un catálogo unificado para el motor.
 * NOTA: Incluye todos los técnicos registrados (activos e inactivos) para que los tickets
 * históricos analizados sigan identificando correctamente al técnico.
 */
export function obtenerCatalogoUniversalTecnicos(): Record<string, TecnicoConfigUniversal> {
  if (cachedUniversalCatalog) {
    return cachedUniversalCatalog;
  }

  const catalogo: Record<string, TecnicoConfigUniversal> = {};
  const listaTecnicos = obtenerCatalogoTecnicos();

  listaTecnicos.forEach((t) => {
    const primaryEmail = normalizarCorreo(t.correoPrincipal);
    const altEmails = (t.correosAlternativos || []).map((e) => normalizarCorreo(e)).filter((e) => e.length > 0);
    const allEmails = Array.from(new Set([primaryEmail, ...altEmails])).filter((e) => e.length > 0);

    const aliasList: string[] = [normalizarTexto(t.nombre)];
    (t.alias || []).forEach((a) => {
      const aNorm = normalizarTexto(a);
      if (aNorm && !aliasList.includes(aNorm)) {
        aliasList.push(aNorm);
      }
    });

    catalogo[t.nombre] = {
      nombre: t.nombre,
      correo: primaryEmail,
      correos: allEmails,
      alias: aliasList,
    };
  });

  cachedUniversalCatalog = catalogo;
  return catalogo;
}

/**
 * Verifica si un correo dado coincide con el correo principal o alternativo del técnico de forma exacta.
 */
function coincideCorreoExacto(correoTexto: string, tecnico: TecnicoConfigUniversal): boolean {
  if (!correoTexto || !tecnico) return false;
  const cNorm = normalizarCorreo(correoTexto);
  if (!cNorm) return false;

  if (tecnico.correo && cNorm === normalizarCorreo(tecnico.correo)) {
    return true;
  }

  if (tecnico.correos && tecnico.correos.some((c) => normalizarCorreo(c) === cNorm)) {
    return true;
  }

  return false;
}

/**
 * Verifica si un texto contiene el nombre completo o alias exacto del técnico.
 * Utiliza límites de palabra o coincidencia de segmento para evitar falsos positivos con subcadenas cortas.
 */
function coincideNombreOAlias(texto: string, tecnico: TecnicoConfigUniversal): { coincide: boolean; valor?: string; por?: 'nombre' | 'alias' } {
  if (!texto) return { coincide: false };
  const txtNorm = normalizarTexto(texto);
  const nomNorm = normalizarTexto(tecnico.nombre);

  // 1. Coincidencia con nombre completo
  if (txtNorm === nomNorm || txtNorm.includes(nomNorm)) {
    return { coincide: true, valor: tecnico.nombre, por: 'nombre' };
  }

  // 2. Coincidencia con alias
  for (const alias of tecnico.alias) {
    const aNorm = normalizarTexto(alias);
    if (!aNorm || aNorm.length < 3) continue; // Descartar alias extremadamente cortos

    // Si el texto es una lista separada, verificar por elemento
    const segmentos = extraerNombres(texto);
    if (segmentos.some((seg) => seg === aNorm || seg.includes(aNorm))) {
      return { coincide: true, valor: alias, por: 'alias' };
    }

    if (txtNorm === aNorm || txtNorm.includes(aNorm)) {
      return { coincide: true, valor: alias, por: 'alias' };
    }
  }

  return { coincide: false };
}

/**
 * Analiza una conversación individual buscando apariciones del técnico.
 */
function analizarConversacionParaTecnico(
  conv: ConversacionRow,
  ticketId: string,
  tecnico: TecnicoConfigUniversal
): EvidenciaTecnico[] {
  const evidencias: EvidenciaTecnico[] = [];

  // 1. Remitente por correo (EVIDENCIA FUERTE: redactó y envió)
  if (conv.remitenteCorreo) {
    const correosRem = extraerCorreos(conv.remitenteCorreo);
    for (const c of correosRem) {
      if (coincideCorreoExacto(c, tecnico)) {
        evidencias.push({
          tecnicoNombre: tecnico.nombre,
          ticketId,
          conversacionIndex: conv.index,
          fecha: conv.fecha,
          rol: 'REMITENTE',
          nivel: 'FUERTE',
          campoOrigen: 'remitenteCorreo',
          valorEncontrado: conv.remitenteCorreo,
          coincidenciaPor: 'correo',
        });
      }
    }
  }

  // 2. Remitente por nombre (EVIDENCIA FUERTE)
  if (conv.remitenteNombre) {
    const match = coincideNombreOAlias(conv.remitenteNombre, tecnico);
    if (match.coincide) {
      evidencias.push({
        tecnicoNombre: tecnico.nombre,
        ticketId,
        conversacionIndex: conv.index,
        fecha: conv.fecha,
        rol: 'REMITENTE',
        nivel: 'FUERTE',
        campoOrigen: 'remitenteNombre',
        valorEncontrado: conv.remitenteNombre,
        coincidenciaPor: match.por || 'nombre',
      });
    }
  }

  // 3. Destinatario directo (Para) (EVIDENCIA DE RECIBIDO: recibió la solicitud, pero no cuenta como atendió por sí solo)
  if (conv.destinatarioCorreo) {
    const correosDest = extraerCorreos(conv.destinatarioCorreo);
    for (const c of correosDest) {
      if (coincideCorreoExacto(c, tecnico)) {
        evidencias.push({
          tecnicoNombre: tecnico.nombre,
          ticketId,
          conversacionIndex: conv.index,
          fecha: conv.fecha,
          rol: 'DESTINATARIO',
          nivel: 'DEBIL',
          campoOrigen: 'destinatarioCorreo',
          valorEncontrado: conv.destinatarioCorreo,
          coincidenciaPor: 'correo',
        });
      }
    }
  }

  // 4. Participantes explícitos de la conversación (EVIDENCIA FUERTE)
  if (conv.participantes) {
    const match = coincideNombreOAlias(conv.participantes, tecnico);
    const correosPart = extraerCorreos(conv.participantes);
    const tieneCorreo = correosPart.some((c) => coincideCorreoExacto(c, tecnico));

    if (tieneCorreo || match.coincide) {
      evidencias.push({
        tecnicoNombre: tecnico.nombre,
        ticketId,
        conversacionIndex: conv.index,
        fecha: conv.fecha,
        rol: 'PARTICIPANTE',
        nivel: 'FUERTE',
        campoOrigen: 'participantesEquipo',
        valorEncontrado: conv.participantes,
        coincidenciaPor: tieneCorreo ? 'correo' : match.por || 'nombre',
      });
    }
  }

  // 5. En copia (CC) (EVIDENCIA DÉBIL)
  if (conv.cc) {
    const correosCC = extraerCorreos(conv.cc);
    const tieneCorreo = correosCC.some((c) => coincideCorreoExacto(c, tecnico));
    const match = coincideNombreOAlias(conv.cc, tecnico);

    if (tieneCorreo || match.coincide) {
      evidencias.push({
        tecnicoNombre: tecnico.nombre,
        ticketId,
        conversacionIndex: conv.index,
        fecha: conv.fecha,
        rol: 'CC',
        nivel: 'DEBIL',
        campoOrigen: 'cc',
        valorEncontrado: conv.cc,
        coincidenciaPor: tieneCorreo ? 'correo' : match.por || 'nombre',
      });
    }
  }

  // 6. En copia oculta (CCO) (EVIDENCIA DÉBIL)
  if (conv.cco) {
    const correosCCO = extraerCorreos(conv.cco);
    const tieneCorreo = correosCCO.some((c) => coincideCorreoExacto(c, tecnico));
    const match = coincideNombreOAlias(conv.cco, tecnico);

    if (tieneCorreo || match.coincide) {
      evidencias.push({
        tecnicoNombre: tecnico.nombre,
        ticketId,
        conversacionIndex: conv.index,
        fecha: conv.fecha,
        rol: 'CCO',
        nivel: 'DEBIL',
        campoOrigen: 'cco',
        valorEncontrado: conv.cco,
        coincidenciaPor: tieneCorreo ? 'correo' : match.por || 'nombre',
      });
    }
  }

  return evidencias;
}

/**
 * Analiza las cabeceras consolidadas del ticket (legacy / fallback) si no se encontraron evidencias en conversaciones detalladas.
 */
function analizarCabecerasTicketParaTecnico(
  ticket: Ticket,
  tecnico: TecnicoConfigUniversal
): EvidenciaTecnico[] {
  const evidencias: EvidenciaTecnico[] = [];

  // 1. correoDestinatario a nivel ticket (EVIDENCIA DE RECIBIDO: débil para atención)
  if (ticket.correoDestinatario) {
    const correos = extraerCorreos(ticket.correoDestinatario);
    for (const c of correos) {
      if (coincideCorreoExacto(c, tecnico)) {
        evidencias.push({
          tecnicoNombre: tecnico.nombre,
          ticketId: ticket.id,
          conversacionIndex: 0,
          fecha: ticket.fechaCreacion,
          rol: 'DESTINATARIO',
          nivel: 'DEBIL',
          campoOrigen: 'correoDestinatario_legacy',
          valorEncontrado: ticket.correoDestinatario,
          coincidenciaPor: 'correo',
        });
      }
    }
  }

  // 2. participantesEquipo a nivel ticket
  if (ticket.participantesEquipo) {
    const correos = extraerCorreos(ticket.participantesEquipo);
    const tieneCorreo = correos.some((c) => coincideCorreoExacto(c, tecnico));
    const match = coincideNombreOAlias(ticket.participantesEquipo, tecnico);

    if (tieneCorreo || match.coincide) {
      evidencias.push({
        tecnicoNombre: tecnico.nombre,
        ticketId: ticket.id,
        conversacionIndex: 0,
        fecha: ticket.fechaCreacion,
        rol: 'PARTICIPANTE',
        nivel: 'FUERTE',
        campoOrigen: 'participantesEquipo',
        valorEncontrado: ticket.participantesEquipo,
        coincidenciaPor: tieneCorreo ? 'correo' : match.por || 'nombre',
      });
    }
  }

  // 3. participantesMesaAyuda a nivel ticket
  if (ticket.participantesMesaAyuda) {
    const correos = extraerCorreos(ticket.participantesMesaAyuda);
    const tieneCorreo = correos.some((c) => coincideCorreoExacto(c, tecnico));
    const match = coincideNombreOAlias(ticket.participantesMesaAyuda, tecnico);

    if (tieneCorreo || match.coincide) {
      evidencias.push({
        tecnicoNombre: tecnico.nombre,
        ticketId: ticket.id,
        conversacionIndex: 0,
        fecha: ticket.fechaCreacion,
        rol: 'PARTICIPANTE',
        nivel: 'FUERTE',
        campoOrigen: 'participantesMesaAyuda',
        valorEncontrado: ticket.participantesMesaAyuda,
        coincidenciaPor: tieneCorreo ? 'correo' : match.por || 'nombre',
      });
    }
  }

  // 4. tecnicoEnAtencion / tecnicoAtencion a nivel ticket (Evidencia directa de Técnico en Atención)
  const tecAtencionVal = ticket.tecnicoEnAtencion || ticket.tecnicoAtencion;
  if (tecAtencionVal) {
    const match = coincideNombreOAlias(tecAtencionVal, tecnico);
    if (match.coincide) {
      evidencias.push({
        tecnicoNombre: tecnico.nombre,
        ticketId: ticket.id,
        conversacionIndex: 0,
        fecha: ticket.fechaCreacion,
        rol: 'ATENCION_ASIGNADA',
        nivel: 'FUERTE',
        campoOrigen: 'tecnicoEnAtencion',
        valorEncontrado: tecAtencionVal,
        coincidenciaPor: match.por || 'nombre',
      });
    }
  }

  return evidencias;
}

/**
 * MOTOR CENTRAL: Evalúa un ticket contra un técnico específico y genera su perfil de evidencia.
 */
export function evaluarParticipacionTecnico(
  ticket: Ticket,
  tecnicoConfig: TecnicoConfigUniversal
): ParticipacionTecnicoEnTicket {
  const todasEvidencias: EvidenciaTecnico[] = [];

  // 1. Analizar todas las conversaciones disponibles
  if (ticket.conversaciones && ticket.conversaciones.length > 0) {
    for (const conv of ticket.conversaciones) {
      const evs = analizarConversacionParaTecnico(conv, ticket.id, tecnicoConfig);
      todasEvidencias.push(...evs);
    }
  }

  // 2. Analizar SIEMPRE cabeceras a nivel ticket (participantesEquipo, participantesMesaAyuda, tecnicoEnAtencion)
  const evsCabecera = analizarCabecerasTicketParaTecnico(ticket, tecnicoConfig);
  for (const evC of evsCabecera) {
    const yaExiste = todasEvidencias.some(
      (e) => e.rol === evC.rol && e.campoOrigen === evC.campoOrigen && e.valorEncontrado === evC.valorEncontrado
    );
    if (!yaExiste) {
      todasEvidencias.push(evC);
    }
  }

  // 3. Calcular roles
  const esAtencionAsignada = todasEvidencias.some((e) => e.rol === 'ATENCION_ASIGNADA');
  const esRemitente = todasEvidencias.some((e) => e.rol === 'REMITENTE');
  const esDestinatarioDirecto = todasEvidencias.some((e) => e.rol === 'DESTINATARIO');
  const esParticipante = todasEvidencias.some((e) => e.rol === 'PARTICIPANTE');
  const soloCC =
    todasEvidencias.length > 0 &&
    todasEvidencias.every((e) => e.rol === 'CC' || e.rol === 'CCO');

  // NUEVA REGLA (Fase 9 & 11):
  // ATENDIÓ / INTERVINO exige evidencia activa (atención asignada, remitente o participante explícito).
  // Ser destinatario directo no otorga evidencia fuerte de atención.
  const tieneEvidenciaFuerte = esAtencionAsignada || esRemitente || esParticipante;

  // 4. Determinar Categoría Canónica y Etiqueta Administrativa Clara
  let categoriaPrincipal: CategoriaParticipacion = 'NINGUNA';
  let etiquetaRolHumano = 'SIN PARTICIPACIÓN';

  if (esAtencionAsignada) {
    categoriaPrincipal = 'ATENDIO';
    etiquetaRolHumano = 'TÉCNICO EN ATENCIÓN';
  } else if (esRemitente) {
    categoriaPrincipal = 'ATENDIO';
    etiquetaRolHumano = 'INTERVINO / ATENDIÓ';
  } else if (esParticipante) {
    categoriaPrincipal = 'PARTICIPO';
    etiquetaRolHumano = 'PARTICIPÓ EN EQUIPO';
  } else if (esDestinatarioDirecto) {
    categoriaPrincipal = 'RECIBIO';
    etiquetaRolHumano = 'RECIBIÓ SOLICITUD';
  } else if (soloCC) {
    categoriaPrincipal = 'SOLO_CC';
    etiquetaRolHumano = 'SOLO EN COPIA';
  }

  // 5. Construir lista de acciones humanas detectadas
  const accionesHumanas: AccionHumanaDetectada[] = [];

  if (esAtencionAsignada) {
    const atnEvs = todasEvidencias.filter((e) => e.rol === 'ATENCION_ASIGNADA');
    accionesHumanas.push({
      tipo: 'ACTUALIZO',
      etiquetaHumana: 'Técnico en Atención Asignado',
      descripcion: `Designado explícitamente en la columna 'Técnico en Atención' (${atnEvs[0]?.valorEncontrado || ''}).`,
      fecha: atnEvs[0]?.fecha,
      conversacionIndex: 0,
    });
  }

  if (esRemitente) {
    const remEvs = todasEvidencias.filter((e) => e.rol === 'REMITENTE');
    accionesHumanas.push({
      tipo: 'RESPONDIO',
      etiquetaHumana: 'Respondió la solicitud',
      descripcion: `Redactó y envió ${remEvs.length} mensaje(s) / respuesta(s) en la atención del ticket.`,
      fecha: remEvs[0]?.fecha,
      conversacionIndex: remEvs[0]?.conversacionIndex,
    });
  }

  if (esDestinatarioDirecto) {
    const destEvs = todasEvidencias.filter((e) => e.rol === 'DESTINATARIO');
    accionesHumanas.push({
      tipo: 'RECIBIO_SOLICITUD',
      etiquetaHumana: 'Recibió la solicitud',
      descripcion: `Figura como destinatario directo en ${destEvs.length} comunicación(es).`,
      fecha: destEvs[0]?.fecha,
      conversacionIndex: destEvs[0]?.conversacionIndex,
    });
  }

  if (esParticipante) {
    const partEvs = todasEvidencias.filter((e) => e.rol === 'PARTICIPANTE');
    accionesHumanas.push({
      tipo: 'PARTICIPO',
      etiquetaHumana: 'Registrado en equipo',
      descripcion: `Asignado como participante de la mesa de soporte o equipo técnico.`,
      fecha: partEvs[0]?.fecha,
      conversacionIndex: partEvs[0]?.conversacionIndex,
    });
  }

  if (soloCC || todasEvidencias.some((e) => e.rol === 'CC' || e.rol === 'CCO')) {
    const ccEvs = todasEvidencias.filter((e) => e.rol === 'CC' || e.rol === 'CCO');
    if (ccEvs.length > 0) {
      accionesHumanas.push({
        tipo: 'COPIADO',
        etiquetaHumana: 'Fue incluido en copia',
        descripcion: `Incluido en copia (CC/CCO) para conocimiento en ${ccEvs.length} mensaje(s).`,
        fecha: ccEvs[0]?.fecha,
        conversacionIndex: ccEvs[0]?.conversacionIndex,
      });
    }
  }

  return {
    tecnicoNombre: tecnicoConfig.nombre,
    ticketId: ticket.id,
    categoriaPrincipal,
    etiquetaRolHumano,
    esRemitente,
    esDestinatarioDirecto,
    esParticipante,
    esCopiadoSoloCC: soloCC,
    tieneEvidenciaFuerte,
    evidencias: todasEvidencias,
    accionesHumanas,
    totalInteracciones: todasEvidencias.length,
  };
}

/**
 * MOTOR CENTRAL: Evalúa un ticket contra TODOS los técnicos del catálogo.
 * Retorna las participaciones encontradas con evidencia.
 */
export function obtenerParticipacionesDeTicket(
  ticket: Ticket,
  catalogoTecnicos?: Record<string, TecnicoConfigUniversal>
): ParticipacionTecnicoEnTicket[] {
  if (!catalogoTecnicos && ticket) {
    const cached = participacionesTicketCache.get(ticket);
    if (cached) return cached;
  }

  const catalogo = catalogoTecnicos || obtenerCatalogoUniversalTecnicos();
  const resultados: ParticipacionTecnicoEnTicket[] = [];

  for (const tecnico of Object.values(catalogo)) {
    const participacion = evaluarParticipacionTecnico(ticket, tecnico);
    if (participacion.evidencias.length > 0) {
      resultados.push(participacion);
    }
  }

  if (!catalogoTecnicos && ticket) {
    participacionesTicketCache.set(ticket, resultados);
  }

  return resultados;
}

/**
 * Función utilitaria principal para dashboards: Determina si un ticket corresponde a un técnico dado.
 * 
 * @param ticket El ticket a evaluar
 * @param tecnicoNombre El nombre del técnico (exacto según catálogo)
 * @param requerirEvidenciaFuerte Si es true (por defecto), solo incluye tickets donde el técnico atendió/recibió/participó (excluye solo CC).
 */
export function ticketPerteneceATecnico(
  ticket: Ticket,
  tecnicoNombre: string,
  requerirEvidenciaFuerte: boolean = true
): boolean {
  const perfil = obtenerPerfilTecnicoEnTicket(ticket, tecnicoNombre);
  if (!perfil) return false;

  if (requerirEvidenciaFuerte) {
    return perfil.tieneEvidenciaFuerte;
  }

  return perfil.evidencias.length > 0;
}

/**
 * Obtiene el perfil completo de participación y evidencias de un técnico específico en un ticket.
 */
export function obtenerPerfilTecnicoEnTicket(
  ticket: Ticket,
  tecnicoNombre: string
): ParticipacionTecnicoEnTicket | null {
  if (!ticket || !tecnicoNombre) return null;

  let mapPorTicket = perfilTecnicoTicketCache.get(ticket);
  if (!mapPorTicket) {
    mapPorTicket = new Map<string, ParticipacionTecnicoEnTicket>();
    perfilTecnicoTicketCache.set(ticket, mapPorTicket);
  }

  const cached = mapPorTicket.get(tecnicoNombre);
  if (cached) return cached;

  const catalogo = obtenerCatalogoUniversalTecnicos();
  const config = catalogo[tecnicoNombre];
  if (!config) return null;

  const perfil = evaluarParticipacionTecnico(ticket, config);
  mapPorTicket.set(tecnicoNombre, perfil);
  return perfil;
}
