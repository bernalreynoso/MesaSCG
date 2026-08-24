import { Ticket, ConversacionRow } from '../types';
import { normalizarTexto } from './technicianDetector';
import {
  EvidenciaTipoTrabajo,
  NivelConfianza,
  ResultadoClasificacionIndividual,
  ResultadoClasificacionTicket,
  TipoTrabajo,
} from './workTypeTypes';

// ==========================================
// PATRONES Y REGEX PARA DICTAMEN DE NO UTILIDAD
// ==========================================

// 1. Patrones de Alta Certeza (Dictamen Explícito de No Utilidad o Técnico de Equipo)
const PATRONES_DICTAMEN_FUERTES = [
  /dictamen\s+(?:tecnico\s+)?(?:de\s+)?no\s+utilidad/i,
  /dictamen\s+de\s+(?:inutilidad|dano\s+irreparable|no\s+util)/i,
  /dictamen\s+tecnico\s+(?:para|de)\s+baja/i,
  /dictamen\s+(?:tecnico\s+)?no\.?\s*[a-z0-9\-_/]+/i, // Ej: Dictamen No. SCG-DTI-2026-088
  /formato\s+de\s+dictamen\s+(?:tecnico|de\s+no\s+utilidad|de\s+baja)/i,
  /elaboracion\s+de\s+dictamen\s+(?:tecnico\s+)?(?:de\s+)?no\s+utilidad/i,
  /emision\s+del?\s+dictamen\s+(?:tecnico\s+)?(?:de\s+no\s+utilidad|de\s+baja)/i,
  /revision\s+tecnica\s+y\s+(?:emision|elaboracion)\s+del?\s+dictamen/i,
];

// 2. Patrones de Certeza Moderada (Menciones de Dictamen + Contexto de Equipo/Daño/Obsolescencia)
const PATRONES_DICTAMEN_MODERADOS = [
  /dictamen\s+tecnico/i,
  /elaborar\s+dictamen/i,
  /solicitud\s+de\s+dictamen/i,
  /se\s+emiti[oó]\s+(?:el\s+)?dictamen/i,
  /dictamen\s+de\s+(?:baja|equipo|hardware|computo)/i,
  /inutilidad\s+tecnica/i,
];

// Contextos de hardware/daño que elevan la confianza de un dictamen moderado
const CONTEXTO_HARDWARE_DANO = [
  /tarjeta\s+madre/i,
  /dano\s+(?:irreparable|irreversible|grave)/i,
  /falla\s+(?:irreparable|electronica|de\s+hardware)/i,
  /no\s+es\s+costeable\s+reparar/i,
  /sin\s+reparaci[oó]n/i,
  /obsolescencia|obsoleto/i,
  /equipo\s+(?:de\s+computo|danado|quemado|inservible)/i,
  /cpu|laptop|monitor|impresora|servidor/i,
];

// Falsos positivos a descartar para Dictamen (no informáticos)
const PATRONES_DICTAMEN_FALSOS_POSITIVOS = [
  /dictamen\s+(?:de\s+estados\s+financieros|contable|fiscal|juridico|legal|presupuestal)/i,
  /dictamen\s+de\s+auditor[ií]a\s+(?:integral|financiera)/i,
  /dictaminar\s+(?:cuenta|acta|contrato|convenio)/i,
];

// ==========================================
// PATRONES Y REGEX PARA BAJA DE EQUIPO
// ==========================================

// 1. Patrones de Alta Certeza (Baja o Desincorporación de Bienes/Equipos Físicos)
const PATRONES_BAJA_FUERTES = [
  /baja\s+y\s+desincorporaci[oó]n/i,
  /desincorporaci[oó]n\s+(?:de\s+)?(?:equipos?|bienes|hardware|computo|activos?)/i,
  /baja\s+(?:definitiva\s+)?(?:de\s+)?(?:equipos?|bienes\s+informaticos|activo\s+fijo|hardware|computo)/i,
  /baja\s+de\s+(?:cpu|laptop|pc|monitor|impresora|escaner|servidor|switch|disco\s+duro)/i,
  /dar\s+de\s+baja\s+(?:el\s+|este\s+)?(?:equipos?|computadora|laptop|cpu|impresora)/i,
  /retiro\s+del?\s+inventario\s+(?:de\s+equipos?|patrimonial)?/i,
  /tramite\s+de\s+baja\s+(?:patrimonial|de\s+bienes)/i,
  /resguardo\s+del?\s+equipo\s+para\s+(?:su\s+)?(?:posterior\s+)?desincorporaci[oó]n/i,
];

// 2. Patrones de Certeza Moderada
const PATRONES_BAJA_MODERADOS = [
  /desincorporaci[oó]n/i,
  /baja\s+patrimonial/i,
  /baja\s+de\s+inventario/i,
  /desecho\s+electr[oó]nico/i,
  /chatarrizaci[oó]n/i,
  /baja\s+por\s+(?:inutilidad|obsolescencia|dano)/i,
  /destrucci[oó]n\s+de\s+disco\s+duro\s+por\s+baja/i,
];

// Contextos de inventario/bienes para bajas
const CONTEXTO_BIENES_INVENTARIO = [
  /inventario/i,
  /patrimonio|patrimonial/i,
  /activo\s+fijo/i,
  /almacen\s+de\s+bajas/i,
  /resguardo/i,
  /numero\s+de\s+inventario/i,
  /placa\s+de\s+inventario/i,
  /serie\s+del?\s+equipo/i,
];

// Falsos positivos a descartar para Baja (bajas lógicas de cuentas o términos no relacionados)
const PATRONES_BAJA_FALSOS_POSITIVOS = [
  /baja\s+(?:de\s+)?(?:usuarios?|cuentas?|personal|empleados?|accesos?|correos?|perfiles?)/i,
  /dar\s+de\s+baja\s+(?:al?\s+)?(?:usuarios?|cuentas?|empleados?|correos?|accesos?)/i,
  /baja\s+(?:en|de)\s+active\s+directory/i,
  /baja\s+(?:m[eé]dica|laboral|temporal\s+de\s+servicio)/i,
  /baja\s+(?:velocidad|latencia|se[nñ]al|cobertura|calidad|presi[oó]n|tensi[oó]n|frecuencia)/i,
  /de\s+baja\s+(?:resoluci[oó]n|gama|potencia|calidad)/i,
];

/**
 * Evalúa si un texto específico contiene falsos positivos para el tipo de trabajo dado.
 */
function contieneFalsosPositivos(texto: string, tipo: TipoTrabajo): boolean {
  const norm = normalizarTexto(texto);
  const patrones =
    tipo === 'DICTAMEN_DE_NO_UTILIDAD'
      ? PATRONES_DICTAMEN_FALSOS_POSITIVOS
      : PATRONES_BAJA_FALSOS_POSITIVOS;

  return patrones.some((p) => p.test(norm));
}

/**
 * Escanea un fragmento de texto en busca de evidencias de Dictamen de No Utilidad.
 */
function escanearTextoParaDictamen(
  textoOriginal: string | undefined | null,
  origen: EvidenciaTipoTrabajo['origen'],
  conversacionIndex?: number
): EvidenciaTipoTrabajo[] {
  if (!textoOriginal || typeof textoOriginal !== 'string') return [];
  const textoNorm = normalizarTexto(textoOriginal);
  if (!textoNorm || textoNorm.length < 3) return [];

  // Si contiene un falso positivo explícito, descartar
  if (contieneFalsosPositivos(textoNorm, 'DICTAMEN_DE_NO_UTILIDAD')) {
    return [];
  }

  const evidencias: EvidenciaTipoTrabajo[] = [];

  // 1. Coincidencias Fuertes
  for (const regex of PATRONES_DICTAMEN_FUERTES) {
    const match = textoNorm.match(regex);
    if (match) {
      evidencias.push({
        tipo: 'DICTAMEN_DE_NO_UTILIDAD',
        origen,
        conversacionIndex,
        textoEncontrado: match[0],
        patronCoincidente: regex.toString(),
        peso: 'FUERTE',
        descripcionJustificacion: `Referencia explícita y directa a dictamen técnico/no utilidad en ${origen}: "${match[0]}"`,
      });
      return evidencias; // Si ya encontramos evidencia fuerte en este campo, retornamos
    }
  }

  // 2. Coincidencias Moderadas
  for (const regex of PATRONES_DICTAMEN_MODERADOS) {
    const match = textoNorm.match(regex);
    if (match) {
      // Verificar si además hay contexto de hardware/daño en el mismo texto
      const tieneContextoHardware = CONTEXTO_HARDWARE_DANO.some((c) => c.test(textoNorm));

      evidencias.push({
        tipo: 'DICTAMEN_DE_NO_UTILIDAD',
        origen,
        conversacionIndex,
        textoEncontrado: match[0],
        patronCoincidente: regex.toString(),
        peso: tieneContextoHardware ? 'FUERTE' : 'MODERADO',
        descripcionJustificacion: tieneContextoHardware
          ? `Mención de dictamen con contexto comprobado de equipo/falla física en ${origen}`
          : `Mención de dictamen técnico en ${origen}`,
      });
      return evidencias;
    }
  }

  return evidencias;
}

/**
 * Escanea un fragmento de texto en busca de evidencias de Baja de Equipo.
 */
function escanearTextoParaBaja(
  textoOriginal: string | undefined | null,
  origen: EvidenciaTipoTrabajo['origen'],
  conversacionIndex?: number
): EvidenciaTipoTrabajo[] {
  if (!textoOriginal || typeof textoOriginal !== 'string') return [];
  const textoNorm = normalizarTexto(textoOriginal);
  if (!textoNorm || textoNorm.length < 3) return [];

  // Si contiene un falso positivo explícito (ej: baja de usuario/cuenta/velocidad), descartar
  if (contieneFalsosPositivos(textoNorm, 'BAJA_DE_EQUIPO')) {
    return [];
  }

  const evidencias: EvidenciaTipoTrabajo[] = [];

  // 1. Coincidencias en catálogo directo (Artículo / Subcategoría)
  if (origen === 'subcategoria' || origen === 'articulo') {
    if (/baja\s+y\s+desincorporaci[oó]n/i.test(textoNorm) || /baja\s+de\s+equipo/i.test(textoNorm)) {
      evidencias.push({
        tipo: 'BAJA_DE_EQUIPO',
        origen,
        conversacionIndex,
        textoEncontrado: textoOriginal,
        patronCoincidente: 'CATALOGO_OFICIAL_BAJA',
        peso: 'FUERTE',
        descripcionJustificacion: `Catálogo de servicio (${origen}) clasificado oficialmente como: "${textoOriginal}"`,
      });
      return evidencias;
    }
  }

  // 2. Coincidencias Fuertes en texto libre
  for (const regex of PATRONES_BAJA_FUERTES) {
    const match = textoNorm.match(regex);
    if (match) {
      evidencias.push({
        tipo: 'BAJA_DE_EQUIPO',
        origen,
        conversacionIndex,
        textoEncontrado: match[0],
        patronCoincidente: regex.toString(),
        peso: 'FUERTE',
        descripcionJustificacion: `Referencia explícita a desincorporación/baja de equipo físico en ${origen}: "${match[0]}"`,
      });
      return evidencias;
    }
  }

  // 3. Coincidencias Moderadas
  for (const regex of PATRONES_BAJA_MODERADOS) {
    const match = textoNorm.match(regex);
    if (match) {
      const tieneContextoInventario = CONTEXTO_BIENES_INVENTARIO.some((c) => c.test(textoNorm));

      evidencias.push({
        tipo: 'BAJA_DE_EQUIPO',
        origen,
        conversacionIndex,
        textoEncontrado: match[0],
        patronCoincidente: regex.toString(),
        peso: tieneContextoInventario ? 'FUERTE' : 'MODERADO',
        descripcionJustificacion: tieneContextoInventario
          ? `Mención de baja/desincorporación asociada a inventario o resguardo patrimonial en ${origen}`
          : `Término de desincorporación/baja en ${origen}`,
      });
      return evidencias;
    }
  }

  return evidencias;
}

/**
 * Evalúa y calcula el resultado para un tipo de trabajo específico (Dictamen o Baja).
 */
function evaluarTipoIndividual(
  tipo: TipoTrabajo,
  evidencias: EvidenciaTipoTrabajo[]
): ResultadoClasificacionIndividual {
  if (evidencias.length === 0) {
    return {
      tipo,
      detectado: false,
      confianza: 'NO_DETERMINADO',
      scoreNumerico: 0,
      evidencias: [],
      justificacionPrincipal: `No se encontraron coincidencias ni patrones para ${tipo}.`,
    };
  }

  const fuertes = evidencias.filter((e) => e.peso === 'FUERTE');
  const moderadas = evidencias.filter((e) => e.peso === 'MODERADO');
  const debiles = evidencias.filter((e) => e.peso === 'DEBIL');

  // Cálculo de score numérico
  let score = fuertes.length * 3 + moderadas.length * 2 + debiles.length * 1;
  let confianza: NivelConfianza = 'BAJA';

  if (fuertes.length >= 1 || (moderadas.length >= 2 && score >= 4)) {
    confianza = 'ALTA';
  } else if (moderadas.length >= 1 || fuertes.length === 1) {
    confianza = 'MEDIA';
  } else if (score > 0) {
    confianza = 'BAJA';
  }

  const justificacionPrincipal =
    fuertes.length > 0
      ? fuertes[0].descripcionJustificacion
      : moderadas.length > 0
      ? moderadas[0].descripcionJustificacion
      : evidencias[0].descripcionJustificacion;

  return {
    tipo,
    detectado: confianza === 'ALTA' || confianza === 'MEDIA',
    confianza,
    scoreNumerico: score,
    evidencias,
    justificacionPrincipal,
  };
}

// Cache en memoria para clasificación de tipos de trabajo
const clasificacionTipoTrabajoCache = new WeakMap<Ticket, ResultadoClasificacionTicket>();

/**
 * MOTOR CENTRAL: Clasifica contextualmente un Ticket en DICTAMEN DE NO UTILIDAD y/o BAJA DE EQUIPO.
 * 
 * Analiza campos de cabecera y todas las conversaciones del historial sin perder contexto.
 */
export function clasificarTipoTrabajo(ticket: Ticket): ResultadoClasificacionTicket {
  if (!ticket) {
    return {
      ticketId: '',
      esDictamenNoUtilidad: false,
      confianzaDictamen: 'NO_DETERMINADO',
      resultadoDictamen: {
        tipo: 'DICTAMEN_DE_NO_UTILIDAD',
        detectado: false,
        confianza: 'NO_DETERMINADO',
        scoreNumerico: 0,
        evidencias: [],
        justificacionPrincipal: '',
      },
      esBajaEquipo: false,
      confianzaBaja: 'NO_DETERMINADO',
      resultadoBaja: {
        tipo: 'BAJA_DE_EQUIPO',
        detectado: false,
        confianza: 'NO_DETERMINADO',
        scoreNumerico: 0,
        evidencias: [],
        justificacionPrincipal: '',
      },
      esAmbos: false,
      todasLasEvidencias: [],
    };
  }

  const cached = clasificacionTipoTrabajoCache.get(ticket);
  if (cached) return cached;

  const evidenciasDictamen: EvidenciaTipoTrabajo[] = [];
  const evidenciasBaja: EvidenciaTipoTrabajo[] = [];

  // 1. Escanear campos estructurados de cabecera
  // Artículo
  evidenciasDictamen.push(...escanearTextoParaDictamen(ticket.articulo, 'articulo'));
  evidenciasBaja.push(...escanearTextoParaBaja(ticket.articulo, 'articulo'));

  // Subcategoría
  evidenciasDictamen.push(...escanearTextoParaDictamen(ticket.subcategoria, 'subcategoria'));
  evidenciasBaja.push(...escanearTextoParaBaja(ticket.subcategoria, 'subcategoria'));

  // Categoría
  evidenciasDictamen.push(...escanearTextoParaDictamen(ticket.categoria, 'categoria'));
  evidenciasBaja.push(...escanearTextoParaBaja(ticket.categoria, 'categoria'));

  // Asunto del Ticket
  evidenciasDictamen.push(...escanearTextoParaDictamen(ticket.asunto, 'asunto'));
  evidenciasBaja.push(...escanearTextoParaBaja(ticket.asunto, 'asunto'));

  // Descripción del Ticket
  evidenciasDictamen.push(...escanearTextoParaDictamen(ticket.descripcion, 'descripcion'));
  evidenciasBaja.push(...escanearTextoParaBaja(ticket.descripcion, 'descripcion'));

  // Resolución del Ticket
  evidenciasDictamen.push(...escanearTextoParaDictamen(ticket.resolucion, 'resolucion'));
  evidenciasBaja.push(...escanearTextoParaBaja(ticket.resolucion, 'resolucion'));

  // 2. Escanear todas las filas del historial de conversaciones
  if (ticket.conversaciones && ticket.conversaciones.length > 0) {
    ticket.conversaciones.forEach((conv: ConversacionRow) => {
      // Asunto de la conversación
      evidenciasDictamen.push(
        ...escanearTextoParaDictamen(conv.asunto, 'conversacion_asunto', conv.index)
      );
      evidenciasBaja.push(...escanearTextoParaBaja(conv.asunto, 'conversacion_asunto', conv.index));

      // Cuerpo / mensaje
      evidenciasDictamen.push(
        ...escanearTextoParaDictamen(conv.cuerpo, 'conversacion_cuerpo', conv.index)
      );
      evidenciasBaja.push(...escanearTextoParaBaja(conv.cuerpo, 'conversacion_cuerpo', conv.index));

      // Descripción
      evidenciasDictamen.push(
        ...escanearTextoParaDictamen(conv.descripcion, 'conversacion_descripcion', conv.index)
      );
      evidenciasBaja.push(
        ...escanearTextoParaBaja(conv.descripcion, 'conversacion_descripcion', conv.index)
      );

      // Resolución en conversación
      evidenciasDictamen.push(
        ...escanearTextoParaDictamen(conv.resolucion, 'conversacion_resolucion', conv.index)
      );
      evidenciasBaja.push(
        ...escanearTextoParaBaja(conv.resolucion, 'conversacion_resolucion', conv.index)
      );
    });
  }

  // 3. Evaluar de forma no excluyente cada tipo
  const resultadoDictamen = evaluarTipoIndividual('DICTAMEN_DE_NO_UTILIDAD', evidenciasDictamen);
  const resultadoBaja = evaluarTipoIndividual('BAJA_DE_EQUIPO', evidenciasBaja);

  // Verificación estricta: Excluir tickets del área de Capacitación (Subdirección Interinstitucional)
  // donde "baja de usuario / plataforma" no debe clasificarse como baja de equipo ni dictamen de no utilidad.
  const tipoSolNorm = normalizarTexto(ticket.tipoSolicitud || '');
  const catNorm = normalizarTexto(ticket.categoria || '');
  const subcatNorm = normalizarTexto(ticket.subcategoria || '');
  const artNorm = normalizarTexto(ticket.articulo || '');

  const esCapacitacion =
    tipoSolNorm.includes('capacita') ||
    tipoSolNorm.includes('interinstitucional') ||
    catNorm.includes('capacita') ||
    subcatNorm.includes('capacita') ||
    artNorm.includes('capacita');

  if (esCapacitacion) {
    return {
      ticketId: ticket.id,
      esDictamenNoUtilidad: false,
      confianzaDictamen: 'NO_DETERMINADO',
      resultadoDictamen: {
        tipo: 'DICTAMEN_DE_NO_UTILIDAD',
        detectado: false,
        confianza: 'NO_DETERMINADO',
        scoreNumerico: 0,
        evidencias: [],
        justificacionPrincipal: 'Ticket perteneciente a Capacitación / Interinstitucional (excluido de dictámenes de hardware).',
      },
      esBajaEquipo: false,
      confianzaBaja: 'NO_DETERMINADO',
      resultadoBaja: {
        tipo: 'BAJA_DE_EQUIPO',
        detectado: false,
        confianza: 'NO_DETERMINADO',
        scoreNumerico: 0,
        evidencias: [],
        justificacionPrincipal: 'Gestión de usuarios en plataforma de capacitación (no es baja de activo de cómputo físico).',
      },
      esAmbos: false,
      todasLasEvidencias: [],
    };
  }

  const esBajaEquipo = resultadoBaja.detectado;

  // REGLA DE NEGOCIO SCG:
  // Cuando se solicita una BAJA DE EQUIPO DE CÓMPUTO, automáticamente se requiere un DICTAMEN DE NO UTILIDAD.
  // Por lo tanto, toda solicitud de baja de equipo físico se incorpora formalmente al flujo de Dictámenes.
  let esDictamenNoUtilidad = resultadoDictamen.detectado;
  let confianzaDictamen = resultadoDictamen.confianza;

  if (esBajaEquipo && !esDictamenNoUtilidad) {
    esDictamenNoUtilidad = true;
    confianzaDictamen = resultadoBaja.confianza;
    resultadoDictamen.detectado = true;
    resultadoDictamen.confianza = resultadoBaja.confianza;
    resultadoDictamen.justificacionPrincipal = `Solicitud clasificada como Baja de Equipo de Cómputo, la cual requiere y forma parte del flujo de Dictamen de No Utilidad. (${resultadoBaja.justificacionPrincipal})`;
  }

  const esAmbos = esDictamenNoUtilidad && esBajaEquipo;

  const resultado: ResultadoClasificacionTicket = {
    ticketId: ticket.id,
    esDictamenNoUtilidad,
    confianzaDictamen,
    resultadoDictamen,

    esBajaEquipo,
    confianzaBaja: resultadoBaja.confianza,
    resultadoBaja,

    esAmbos,
    todasLasEvidencias: [...evidenciasDictamen, ...evidenciasBaja],
  };

  clasificacionTipoTrabajoCache.set(ticket, resultado);
  return resultado;
}

/**
 * Funciones utilitarias rápidas para dashboards y componentes
 */
export function esTicketDictamen(ticket: Ticket): boolean {
  return clasificarTipoTrabajo(ticket).esDictamenNoUtilidad;
}

export function esTicketBaja(ticket: Ticket): boolean {
  return clasificarTipoTrabajo(ticket).esBajaEquipo;
}
