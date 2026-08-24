import { Ticket } from '../types';
import { ParticipacionTecnicoEnTicket } from './technicianEvidenceTypes';
import {
  obtenerParticipacionesDeTicket,
  normalizarTexto,
  normalizarCorreo,
  resolverNombreYCorreo,
} from './technicianDetector';
import { determinarAreaTicket } from './areaClassifier';

// Cache en memoria para resultados de atribución operativa por ticket
let atribucionOperativaCache = new WeakMap<Ticket, ResultadoAtribucionOperativa>();

export function limpiarCacheAtribucion(): void {
  atribucionOperativaCache = new WeakMap<Ticket, ResultadoAtribucionOperativa>();
}

if (typeof window !== 'undefined') {
  window.addEventListener('scg_catalogo_tecnicos_changed', limpiarCacheAtribucion);
  window.addEventListener('storage', (e) => {
    if (e.key === 'scg_catalogo_tecnicos_v2') {
      limpiarCacheAtribucion();
    }
  });
}

export interface ResponsableOperativoDetectado {
  nombre: string;
  area: 'Soporte' | 'Informática' | 'Interinstitucional' | string;
  reglaAplicada: string;
  esResponsableActual: boolean;
  esSustitucionHistorica?: boolean;
  sustitutoDe?: string;
  detalle?: string;
}

export interface ResultadoAtribucionOperativa {
  ticketId: string;
  areaOperativa: 'Soporte' | 'Informática' | 'Interinstitucional' | string;
  responsablesOperativos: ResponsableOperativoDetectado[];
  nombresResponsables: string[];
  participaciones: ParticipacionTecnicoEnTicket[];
  participantesHistoricos: string[];
  explicacionReglas: string[];
}

/**
 * Extrae de forma limpia y robusta el valor de la columna "Técnico en Atención"
 * desde el ticket tipado, su objeto raw o sus rawRows originales.
 */
export function extraerTecnicoEnAtencion(ticket: Ticket): string | null {
  const tecAtn = ticket.tecnicoEnAtencion || ticket.tecnicoAtencion;
  if (tecAtn && typeof tecAtn === 'string' && tecAtn.trim()) {
    const val = tecAtn.trim();
    if (!esValorNuloOInvalido(val)) {
      return val;
    }
  }

  const candidateKeys = [
    'tecnico en atencion',
    'tecnico en atención',
    'tecnico de atencion',
    'tecnico de atención',
    'tecnico atencion',
    'tecnico atención',
    'tecnico atiende',
    'assigned technician',
    'technician in charge',
    'responsable de atencion',
    'responsable atencion',
    'responsable de atención',
    'responsable atención',
  ];

  const buscarEnObjeto = (obj: Record<string, any> | undefined): string | null => {
    if (!obj || typeof obj !== 'object') return null;
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;
      const keyNorm = normalizarTexto(key);
      if (candidateKeys.some((c) => keyNorm === c || keyNorm.includes(c))) {
        const valStr = String(value).trim();
        if (!esValorNuloOInvalido(valStr)) {
          return valStr;
        }
      }
    }
    return null;
  };

  const deRaw = buscarEnObjeto(ticket.raw);
  if (deRaw) return deRaw;

  if (ticket.rawRows && ticket.rawRows.length > 0) {
    for (const row of ticket.rawRows) {
      const deRow = buscarEnObjeto(row);
      if (deRow) return deRow;
    }
  }

  return null;
}

function esValorNuloOInvalido(val: string): boolean {
  const norm = normalizarTexto(val);
  return (
    !norm ||
    norm === 'sin asignar' ||
    norm === 'no asignado' ||
    norm === 'none' ||
    norm === 'nan' ||
    norm === 'null' ||
    norm === '-' ||
    norm === 'n/a' ||
    norm === 'na' ||
    norm === '0'
  );
}

/**
 * MOTOR CENTRAL DE ATRIBUCIÓN OPERATIVA (FASE 11B):
 * Implementa las reglas de negocio acumulativas oficiales para determinar los RESPONSABLES OPERATIVOS
 * de un ticket, separando la responsabilidad operativa de la evidencia conversacional pura.
 * 
 * Jerarquía de Fuentes:
 * 1. Reglas de negocio explícitas (Capacitación, Admin Mesa + Desarrollo, sustituciones)
 * 2. Técnico en Atención (Evidencia directa de asignación operativa)
 * 3. Evidencia activa en conversaciones (Remitente, Participante)
 * 4. Otras evidencias de participación
 * 5. Destinatario pasivo
 * 6. CC / CCO
 */
export function determinarAtribucionOperativa(
  ticket: Ticket,
  participacionesPrevias?: ParticipacionTecnicoEnTicket[]
): ResultadoAtribucionOperativa {
  if (!participacionesPrevias && ticket) {
    const cached = atribucionOperativaCache.get(ticket);
    if (cached) return cached;
  }

  const participaciones = participacionesPrevias || obtenerParticipacionesDeTicket(ticket);
  let areaDetectada = determinarAreaTicket(ticket);

  const responsablesMap = new Map<string, ResponsableOperativoDetectado>();
  const participantesHistoricos: string[] = [];
  const explicacionReglas: string[] = [];

  // Extraer e identificar al "Técnico en Atención"
  const tecAtencionRaw = extraerTecnicoEnAtencion(ticket);
  let tecAtencionResuelto: { nombre: string; correo: string; esTecnico: boolean; area?: string } | null = null;
  if (tecAtencionRaw) {
    tecAtencionResuelto = resolverNombreYCorreo(null, tecAtencionRaw);
  }

  // Variables normalizadas para coincidencia en cabeceras y textos
  const tipoSol = normalizarTexto(ticket.tipoSolicitud);
  const cat = normalizarTexto(ticket.categoria);
  const subcat = normalizarTexto(ticket.subcategoria);
  const art = normalizarTexto(ticket.articulo);
  const tecAsignado = normalizarTexto(ticket.tecnicoAsignado);
  const descTicket = normalizarTexto(ticket.descripcion);
  const asuntoTicket = normalizarTexto(ticket.asunto);
  const correoDestTicket = normalizarCorreo(ticket.correoDestinatario);

  // Helper para verificar presencia de un técnico específico en participaciones o textos
  const tieneTecnico = (nombreOFrac: string): boolean => {
    const q = normalizarTexto(nombreOFrac);
    if (tecAtencionResuelto && tecAtencionResuelto.esTecnico) {
      if (normalizarTexto(tecAtencionResuelto.nombre).includes(q)) return true;
    }
    if (tecAtencionRaw && normalizarTexto(tecAtencionRaw).includes(q)) return true;
    return participaciones.some(
      (p) =>
        normalizarTexto(p.tecnicoNombre).includes(q) ||
        p.evidencias.some(
          (e) =>
            normalizarTexto(e.tecnicoNombre).includes(q) ||
            normalizarTexto(e.valorEncontrado).includes(q)
        )
    );
  };

  // Helper para verificar si un técnico pertenece al área de Soporte en las participaciones
  const tecnicosSoporteParticipantes = participaciones.filter((p) => {
    const n = normalizarTexto(p.tecnicoNombre);
    return (
      n.includes('francisco bernal') ||
      n.includes('jose moncayo') ||
      n.includes('ernesto') ||
      n.includes('jesus emmanuel') ||
      n.includes('yoshio') ||
      n.includes('gustavo dzib')
    );
  });

  // =========================================================================
  // REGLA 7: CAPACITACIÓN / INTERINSTITUCIONAL (Alta prioridad de negocio)
  // =========================================================================
  // Si Tipo de Solicitud = CAPACITACIÓN -> Área: INTERINSTITUCIONAL,
  // Responsable: DORA MERCEDES MONTAÑO, Buzón: INTERINSTITUCIONAL.
  // Esto tiene prioridad sobre la aparición accidental de técnicos de Soporte/Informática.
  const esCasoCapacitacion =
    tipoSol.includes('capacita') ||
    tipoSol.includes('interinstitucional') ||
    cat.includes('capacita') ||
    cat.includes('interinstitucional') ||
    subcat.includes('capacita') ||
    art.includes('capacita') ||
    tecAsignado.includes('interinstitucional');

  if (esCasoCapacitacion) {
    responsablesMap.set('Dora Mercedes Montaño', {
      nombre: 'Dora Mercedes Montaño',
      area: 'Interinstitucional',
      reglaAplicada: 'Regla 7 (Capacitación -> Dora Mercedes Montaño / Subdirección Interinstitucional)',
      esResponsableActual: true,
      detalle: 'Responsable operativa asignada por regla de negocio de Interinstitucional / Capacitación.',
    });
    explicacionReglas.push('Regla 7: Ticket de Interinstitucional (Capacitación) atribuido a Dora Mercedes Montaño.');
    
    // En Interinstitucional, la regla oficial estipula que tiene prioridad y no se asigna a Soporte ni Informática
    return {
      ticketId: ticket.id,
      areaOperativa: 'Interinstitucional',
      responsablesOperativos: Array.from(responsablesMap.values()),
      nombresResponsables: Array.from(responsablesMap.keys()),
      participaciones,
      participantesHistoricos,
      explicacionReglas,
    };
  }

  // =========================================================================
  // REGLA 5: ADMINISTRADOR MESA + DESARROLLO + SISTEMAS
  // =========================================================================
  // Si aparece ADMINISTRADOR MESA DE AYUDA, "Técnico en Atención" = DESARROLLO, Categoría = SISTEMAS
  // -> Responsable: ADELAIDA VALENZUELA.
  const esAdminMesa =
    tecAsignado.includes('administrador') ||
    tecAsignado.includes('mesa') ||
    participaciones.some((p) => normalizarTexto(p.tecnicoNombre).includes('mesa') || normalizarTexto(p.tecnicoNombre).includes('administrador')) ||
    ticket.conversaciones?.some((c) =>
      normalizarTexto(c.remitenteNombre).includes('mesa de ayuda') ||
      normalizarTexto(c.remitenteNombre).includes('administrador') ||
      normalizarTexto(c.remitenteCorreo).includes('mesadeayuda')
    );

  const esTecnicoDesarrollo =
    tecAsignado.includes('desarrollo') ||
    (tecAtencionRaw && normalizarTexto(tecAtencionRaw).includes('desarrollo')) ||
    descTicket.includes('desarrollo') ||
    subcat.includes('desarrollo') ||
    art.includes('desarrollo') ||
    correoDestTicket.includes('desarrollo');

  const esCategoriaSistemas =
    cat.includes('sistema') ||
    cat.includes('sistemas') ||
    subcat.includes('sistema') ||
    subcat.includes('sistemas');

  if (esAdminMesa && esTecnicoDesarrollo && esCategoriaSistemas) {
    responsablesMap.set('Adelaida Valenzuela', {
      nombre: 'Adelaida Valenzuela',
      area: 'Informática',
      reglaAplicada: 'Regla 5 (Admin Mesa + Desarrollo + Sistemas -> Adelaida Valenzuela)',
      esResponsableActual: true,
      detalle: 'Atribución prioritaria por perfil de Desarrollo de Sistemas.',
    });
    explicacionReglas.push('Regla 5: Atribuido a Adelaida Valenzuela por coincidencia Admin Mesa + Desarrollo + Sistemas.');
  }

  // =========================================================================
  // REGLA 6: ADMINISTRADOR MESA + SOPORTE TÉCNICO (Sin técnico específico de soporte)
  // =========================================================================
  // Si aparece ADMINISTRADOR MESA DE AYUDA y "Técnico en Atención" = SOPORTE TÉCNICO
  // -> Responsable: JAQUELINE ALEJANDRA ZAMORA.
  const esTecnicoSoporteGenerico =
    tecAsignado === 'soporte tecnico' ||
    tecAsignado === 'soporte' ||
    tecAsignado === 'mesa de ayuda';

  if (
    esAdminMesa &&
    esTecnicoSoporteGenerico &&
    tecnicosSoporteParticipantes.length === 0 &&
    (!tecAtencionResuelto || !tecAtencionResuelto.esTecnico) &&
    !responsablesMap.has('Adelaida Valenzuela')
  ) {
    responsablesMap.set('Jaqueline Alejandra Zamora Tenorio', {
      nombre: 'Jaqueline Alejandra Zamora Tenorio',
      area: 'Informática',
      reglaAplicada: 'Regla 6 (Admin Mesa + Soporte Técnico -> Jaqueline Alejandra Zamora)',
      esResponsableActual: true,
      detalle: 'Atribución a Jaqueline Zamora como administradora técnica de canalizaciones.',
    });
    explicacionReglas.push('Regla 6: Atribuido a Jaqueline Alejandra Zamora por canalización genérica de Soporte.');
  }

  // =========================================================================
  // REGLA 1 y REGLA 8: TÉCNICOS DE SOPORTE (+ JAQUELINE)
  // =========================================================================
  // Regla 1: Si un técnico de SOPORTE aparece de acuerdo con la evidencia disponible,
  // el ticket pertenece al técnico correspondiente.
  // Regla 8: Si el ticket es de SOPORTE y aparecen un técnico real de Soporte + Jaqueline Zamora,
  // el responsable operativo es el técnico de Soporte (Jaqueline se conserva en evidencia/participación).
  for (const tecSop of tecnicosSoporteParticipantes) {
    responsablesMap.set(tecSop.tecnicoNombre, {
      nombre: tecSop.tecnicoNombre,
      area: 'Soporte',
      reglaAplicada: 'Regla 1 (Técnico de Soporte en evidencia)',
      esResponsableActual: true,
      detalle: `Técnico de soporte con evidencia registrada (${tecSop.etiquetaRolHumano}).`,
    });
    explicacionReglas.push(`Regla 1: Responsabilidad operativa asignada al técnico de Soporte ${tecSop.tecnicoNombre}.`);
  }

  // Si hay técnicos reales de Soporte y estaba Jaqueline por regla 6 o detección pasiva,
  // la regla 8 especifica que el responsable operativo es el técnico de Soporte.
  if (tecnicosSoporteParticipantes.length > 0 && responsablesMap.has('Jaqueline Alejandra Zamora Tenorio')) {
    responsablesMap.delete('Jaqueline Alejandra Zamora Tenorio');
    participantesHistoricos.push('Jaqueline Alejandra Zamora Tenorio (Participante en canalización)');
    explicacionReglas.push('Regla 8: Jaqueline Zamora conservada como participante/evidencia sin sustituir al técnico de Soporte.');
  }

  // =========================================================================
  // REGLA 2: JHONN PIÑA MIRANDA
  // =========================================================================
  // Si aparece Jhonn Piña Miranda -> pertenece a Jhonn Piña Miranda.
  if (tieneTecnico('Jhonn') || tieneTecnico('jpinam')) {
    responsablesMap.set('Jhonn Piña Miranda', {
      nombre: 'Jhonn Piña Miranda',
      area: 'Informática',
      reglaAplicada: 'Regla 2 (Jhonn Piña Miranda)',
      esResponsableActual: true,
    });
    explicacionReglas.push('Regla 2: Responsabilidad operativa atribuida a Jhonn Piña Miranda.');
  }

  // =========================================================================
  // REGLA 10: RAFAEL MUÑOZ CERRILLO (Sustitución histórica a Jhonn Piña)
  // =========================================================================
  // Si aparece Rafael -> responsabilidad operativa actual = Jhonn Piña Miranda.
  // Rafael permanece en el historial como participante histórico.
  if (tieneTecnico('Rafael') || tieneTecnico('rmunoz')) {
    participantesHistoricos.push('Rafael Muñoz Cerrillo (Ex-Subdirector)');
    responsablesMap.set('Jhonn Piña Miranda', {
      nombre: 'Jhonn Piña Miranda',
      area: 'Informática',
      reglaAplicada: 'Regla 10 (Sustitución operativa Rafael Muñoz -> Jhonn Piña actual)',
      esResponsableActual: true,
      esSustitucionHistorica: true,
      sustitutoDe: 'Rafael Muñoz Cerrillo',
      detalle: 'Rafael Muñoz figura en el historial técnico; la responsabilidad operativa actual corresponde a Jhonn Piña Miranda.',
    });
    explicacionReglas.push('Regla 10: Rafael Muñoz detectado históricamente -> Responsabilidad actual asignada a Jhonn Piña Miranda.');
  }

  // =========================================================================
  // REGLA 3: MARCO ERIC VALLE JUÁREZ
  // =========================================================================
  // Si aparece Marco Eric Valle Juárez -> pertenece a Marco.
  // Si aparecen Marco + Jhonn -> pertenece a AMBOS (acumulativo).
  if (tieneTecnico('Marco') || tieneTecnico('dmg.consultor1')) {
    responsablesMap.set('Marco Eric Valle Juarez', {
      nombre: 'Marco Eric Valle Juarez',
      area: 'Informática',
      reglaAplicada: 'Regla 3 (Marco Eric Valle Juárez)',
      esResponsableActual: true,
    });
    explicacionReglas.push('Regla 3: Responsabilidad operativa atribuida a Marco Eric Valle Juárez.');
  }

  // =========================================================================
  // REGLA 4: SAMANTHA TIRADO ROSS
  // =========================================================================
  // Si aparece Samantha Tirado Ross y además aparece un técnico de SOPORTE -> pertenece a Samantha + Soporte.
  if (tieneTecnico('Samantha') || tieneTecnico('tstirador')) {
    responsablesMap.set('Tania Samantha Tirado Ross', {
      nombre: 'Tania Samantha Tirado Ross',
      area: 'Informática',
      reglaAplicada: 'Regla 4 (Samantha Tirado Ross)',
      esResponsableActual: true,
    });
    explicacionReglas.push('Regla 4: Responsabilidad operativa atribuida a Tania Samantha Tirado Ross.');
  }

  // =========================================================================
  // REGLA 9: EVELYN ROCÍO VANZZINI GUERRERO
  // =========================================================================
  // Si aparece Evelyn -> pertenece a Evelyn.
  // Excepción: Si aparece Samantha -> Evelyn + Samantha.
  // Si aparece Soporte -> Evelyn + Soporte.
  // Si aparecen los tres -> Evelyn + Samantha + Soporte (ninguno elimina a los demás).
  if (tieneTecnico('Evelyn') || tieneTecnico('evanzzini')) {
    responsablesMap.set('Evelyn Rocio Vanzzini Guerrero', {
      nombre: 'Evelyn Rocio Vanzzini Guerrero',
      area: 'Informática',
      reglaAplicada: 'Regla 9 (Evelyn Rocío Vanzzini)',
      esResponsableActual: true,
    });
    explicacionReglas.push('Regla 9: Responsabilidad operativa atribuida a Evelyn Rocío Vanzzini Guerrero.');
  }

  // =========================================================================
  // REGLA 11: ANGÉLICA JANETTE TORRES PLATA
  // =========================================================================
  // Si aparece Angélica -> pertenece a Angélica.
  // Si además aparece Soporte -> pertenece al técnico de Soporte y a Angélica.
  if (tieneTecnico('Angelica') || tieneTecnico('dmg.consultor2')) {
    responsablesMap.set('Angelica Janette Torres Plata', {
      nombre: 'Angelica Janette Torres Plata',
      area: 'Informática',
      reglaAplicada: 'Regla 11 (Angélica Janette Torres Plata)',
      esResponsableActual: true,
    });
    explicacionReglas.push('Regla 11: Responsabilidad operativa atribuida a Angélica Janette Torres Plata.');
  }

  // =========================================================================
  // FUENTE 2: TÉCNICO EN ATENCIÓN (Responsable Operativo Asignado en Reporte)
  // =========================================================================
  // Si la columna "Técnico en Atención" contiene un técnico válido del catálogo,
  // se incorpora como Responsable Operativo sin borrar las demás reglas acumulativas.
  if (tecAtencionResuelto && tecAtencionResuelto.esTecnico) {
    const areaTec = (tecAtencionResuelto.area as any) || areaDetectada;
    if (!responsablesMap.has(tecAtencionResuelto.nombre)) {
      responsablesMap.set(tecAtencionResuelto.nombre, {
        nombre: tecAtencionResuelto.nombre,
        area: areaTec,
        reglaAplicada: 'Técnico en Atención (Responsable Operativo Asignado)',
        esResponsableActual: true,
        detalle: `Asignado directamente en la columna Técnico en Atención del reporte (${tecAtencionRaw}).`,
      });
      explicacionReglas.push(`Técnico en Atención: Asignado directamente a ${tecAtencionResuelto.nombre} (${areaTec}).`);
    }

    // Si el técnico en atención es un técnico real de Soporte, remover asignación genérica a Jaqueline
    if (areaTec === 'Soporte' && responsablesMap.has('Jaqueline Alejandra Zamora Tenorio')) {
      responsablesMap.delete('Jaqueline Alejandra Zamora Tenorio');
      participantesHistoricos.push('Jaqueline Alejandra Zamora Tenorio (Participante en canalización)');
      explicacionReglas.push('Regla 8: Jaqueline Zamora conservada como participante sin sustituir al técnico de Soporte en Atención.');
    }
  }

  // =========================================================================
  // REGLA FALLBACK: Si no se activó ninguna regla específica pero hay técnicos
  // con evidencia fuerte en el catálogo
  // =========================================================================
  if (responsablesMap.size === 0) {
    const tecnicosFuertes = participaciones.filter((p) => p.tieneEvidenciaFuerte);
    for (const p of tecnicosFuertes) {
      responsablesMap.set(p.tecnicoNombre, {
        nombre: p.tecnicoNombre,
        area: areaDetectada,
        reglaAplicada: 'Atribución directa por evidencia de intervención',
        esResponsableActual: true,
      });
    }
  }

  // Ajuste contextual del área operativa según los responsables finales determinados
  if (responsablesMap.size > 0) {
    const listaResp = Array.from(responsablesMap.values());
    const todosSoporte = listaResp.every((r) => r.area === 'Soporte');
    const todosInformatica = listaResp.every((r) => r.area === 'Informática');
    const algunoInter = listaResp.some((r) => r.area === 'Interinstitucional');

    if (algunoInter) {
      areaDetectada = 'Interinstitucional';
    } else if (todosSoporte && areaDetectada !== 'Interinstitucional') {
      areaDetectada = 'Soporte';
    } else if (todosInformatica && areaDetectada !== 'Interinstitucional') {
      areaDetectada = 'Informática';
    }
  }

  const resultadoFinal: ResultadoAtribucionOperativa = {
    ticketId: ticket.id,
    areaOperativa: areaDetectada,
    responsablesOperativos: Array.from(responsablesMap.values()),
    nombresResponsables: Array.from(responsablesMap.keys()),
    participaciones,
    participantesHistoricos,
    explicacionReglas,
  };

  if (!participacionesPrevias && ticket) {
    atribucionOperativaCache.set(ticket, resultadoFinal);
  }

  return resultadoFinal;
}

