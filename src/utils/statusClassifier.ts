import { Ticket } from '../types';
import { normalizarTexto } from './technicianDetector';
import { EstadoCanonico, EvaluacionEstadoTicket } from './statusTypes';

// ==========================================
// REGLAS Y PATRONES DE ESTADOS REALES (ServiceDesk Plus SCG)
// ==========================================

// 1. CANCELADO / RECHAZADO (Terminal no exitoso - NO es Cerrado)
const PATRONES_CANCELADO = [
  /^cancelado$/i,
  /^cancelada$/i,
  /^cancelled$/i,
  /^rechazado$/i,
  /^rechazada$/i,
  /^rejected$/i,
  /^anulado$/i,
  /^anulada$/i,
  /^descartado$/i,
  /^duplicado\s*-\s*cancelado$/i,
  /^cerrado\s*-\s*cancelado$/i,
];

// 2. EN ESPERA / ON HOLD (Pausado / Esperando insumos o usuario - Estado específico)
const PATRONES_EN_ESPERA = [
  /en\s+espera/i,
  /espera\s+de\s+usuario/i,
  /espera\s+de\s+insumos/i,
  /espera\s+de\s+terceros/i,
  /espera\s+de\s+proveedor/i,
  /on\s*hold/i,
  /^hold$/i,
  /^detenido$/i,
  /^pausado$/i,
  /^pendiente\s*-\s*en\s+espera/i,
];

// 3. CERRADO / RESUELTO (Concluido exitosamente / Dictaminado)
const PATRONES_CERRADO = [
  /^cerrado$/i,
  /^cerrada$/i,
  /^closed$/i,
  /^resuelto$/i,
  /^resuelta$/i,
  /^resolved$/i,
  /^finalizado$/i,
  /^finalizada$/i,
  /^concluido$/i,
  /^concluida$/i,
  /^completado$/i,
  /^completada$/i,
  /^solucionado$/i,
];

// 4. PENDIENTE / ABIERTO / EN PROGRESO / ASIGNADO (En curso de atención)
const PATRONES_PENDIENTE = [
  /^pendiente$/i,
  /^abierto$/i,
  /^abierta$/i,
  /^open$/i,
  /^en\s+progreso$/i,
  /^in\s+progress$/i,
  /^asignado$/i,
  /^asignada$/i,
  /^assigned$/i,
  /^en\s+proceso$/i,
  /^en\s+atenci[oó]n$/i,
  /^en\s+revision$/i,
  /^canalizado$/i,
  /^nuevo$/i,
  /^nueva$/i,
  /^new$/i,
  /^reabierto$/i,
  /^reopened$/i,
];

const estadoEvaluacionCache = new Map<string, EvaluacionEstadoTicket>();

/**
 * Evalúa cualquier cadena de texto de estado y determina su Estado Canónico
 * y propiedades booleanas según las reglas estrictas de ServiceDesk Plus.
 */
export function evaluarEstado(estadoStr: string | undefined | null): EvaluacionEstadoTicket {
  const cacheKey = !estadoStr || typeof estadoStr !== 'string' ? '__empty__' : estadoStr.trim();
  const cached = estadoEvaluacionCache.get(cacheKey);
  if (cached) return cached;

  if (!estadoStr || typeof estadoStr !== 'string') {
    const emptyRes: EvaluacionEstadoTicket = {
      estadoOriginal: '',
      estadoNormalizado: '',
      estadoCanonico: 'DESCONOCIDO',
      esPendiente: false,
      esCerrado: false,
      esCancelado: false,
      esEnEspera: false,
      esDesconocido: true,
      esAbiertoOperativo: true, // NUEVA REGLA (Fase 9): Si no es terminal cerrado o cancelado, permanece abierto operativo
      descripcion: 'Estado vacío o no especificado (abierto operativo)',
    };
    estadoEvaluacionCache.set(cacheKey, emptyRes);
    return emptyRes;
  }

  const trimmed = estadoStr.trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'nan' || trimmed.toLowerCase() === 'null') {
    const nullRes: EvaluacionEstadoTicket = {
      estadoOriginal: estadoStr,
      estadoNormalizado: '',
      estadoCanonico: 'DESCONOCIDO',
      esPendiente: false,
      esCerrado: false,
      esCancelado: false,
      esEnEspera: false,
      esDesconocido: true,
      esAbiertoOperativo: true, // NUEVA REGLA (Fase 9): Si no es terminal cerrado o cancelado, permanece abierto operativo
      descripcion: 'Estado vacío o no especificado (abierto operativo)',
    };
    estadoEvaluacionCache.set(cacheKey, nullRes);
    return nullRes;
  }

  const normalizado = normalizarTexto(trimmed);

  // 1. Verificar CANCELADO primero (previene que un 'Cancelado' sea confundido)
  for (const regex of PATRONES_CANCELADO) {
    if (regex.test(normalizado)) {
      const res: EvaluacionEstadoTicket = {
        estadoOriginal: estadoStr,
        estadoNormalizado: normalizado,
        estadoCanonico: 'CANCELADO',
        esPendiente: false,
        esCerrado: false,
        esCancelado: true,
        esEnEspera: false,
        esDesconocido: false,
        esAbiertoOperativo: false,
        descripcion: 'Ticket Cancelado o Rechazado (Terminal no exitoso)',
      };
      estadoEvaluacionCache.set(cacheKey, res);
      return res;
    }
  }

  // 2. Verificar EN ESPERA
  for (const regex of PATRONES_EN_ESPERA) {
    if (regex.test(normalizado)) {
      const res: EvaluacionEstadoTicket = {
        estadoOriginal: estadoStr,
        estadoNormalizado: normalizado,
        estadoCanonico: 'EN_ESPERA',
        esPendiente: false,
        esCerrado: false,
        esCancelado: false,
        esEnEspera: true,
        esDesconocido: false,
        esAbiertoOperativo: true,
        descripcion: 'Ticket en Espera / On Hold (Pausado operativamente)',
      };
      estadoEvaluacionCache.set(cacheKey, res);
      return res;
    }
  }

  // 3. Verificar CERRADO / RESUELTO
  for (const regex of PATRONES_CERRADO) {
    if (regex.test(normalizado)) {
      const res: EvaluacionEstadoTicket = {
        estadoOriginal: estadoStr,
        estadoNormalizado: normalizado,
        estadoCanonico: 'CERRADO',
        esPendiente: false,
        esCerrado: true,
        esCancelado: false,
        esEnEspera: false,
        esDesconocido: false,
        esAbiertoOperativo: false,
        descripcion: 'Ticket Concluido / Cerrado / Resuelto',
      };
      estadoEvaluacionCache.set(cacheKey, res);
      return res;
    }
  }

  // 4. Verificar PENDIENTE / ABIERTO / ASIGNADO / EN PROGRESO
  for (const regex of PATRONES_PENDIENTE) {
    if (regex.test(normalizado)) {
      const res: EvaluacionEstadoTicket = {
        estadoOriginal: estadoStr,
        estadoNormalizado: normalizado,
        estadoCanonico: 'PENDIENTE',
        esPendiente: true,
        esCerrado: false,
        esCancelado: false,
        esEnEspera: false,
        esDesconocido: false,
        esAbiertoOperativo: true,
        descripcion: 'Ticket Pendiente / En Progreso / Asignado',
      };
      estadoEvaluacionCache.set(cacheKey, res);
      return res;
    }
  }

  // 5. Casos con prefijo "pendiente - ..." no capturados arriba
  if (normalizado.startsWith('pendiente') || normalizado.startsWith('en proceso')) {
    const res: EvaluacionEstadoTicket = {
      estadoOriginal: estadoStr,
      estadoNormalizado: normalizado,
      estadoCanonico: 'PENDIENTE',
      esPendiente: true,
      esCerrado: false,
      esCancelado: false,
      esEnEspera: false,
      esDesconocido: false,
      esAbiertoOperativo: true,
      descripcion: 'Ticket con subtipo de pendiente',
    };
    estadoEvaluacionCache.set(cacheKey, res);
    return res;
  }

  // 6. Si no coincide con ninguno conocido (NUEVA REGLA Fase 9: esAbiertoOperativo = true)
  const defaultRes: EvaluacionEstadoTicket = {
    estadoOriginal: estadoStr,
    estadoNormalizado: normalizado,
    estadoCanonico: 'DESCONOCIDO',
    esPendiente: false,
    esCerrado: false,
    esCancelado: false,
    esEnEspera: false,
    esDesconocido: true,
    esAbiertoOperativo: true, // Si no es cerrado ni cancelado, no debe descartarse de la carga operativa
    descripcion: `Estado no clasificado (abierto operativo): "${estadoStr}"`,
  };
  estadoEvaluacionCache.set(cacheKey, defaultRes);
  return defaultRes;
}

/**
 * Determina el estado canónico de un Ticket.
 */
export function obtenerEstadoTicket(ticket: Ticket): EvaluacionEstadoTicket {
  return evaluarEstado(ticket.estado);
}

/**
 * Funciones de conveniencia directas para reemplazar expresiones regulares en componentes:
 */
export function esTicketPendiente(estado: string | undefined | null): boolean {
  const evalEstado = evaluarEstado(estado);
  return evalEstado.esPendiente;
}

export function esTicketCerrado(estado: string | undefined | null): boolean {
  const evalEstado = evaluarEstado(estado);
  return evalEstado.esCerrado;
}

export function esTicketCancelado(estado: string | undefined | null): boolean {
  const evalEstado = evaluarEstado(estado);
  return evalEstado.esCancelado;
}

export function esTicketEnEspera(estado: string | undefined | null): boolean {
  const evalEstado = evaluarEstado(estado);
  return evalEstado.esEnEspera;
}

/**
 * Identifica si un ticket sigue abierto/activo en la operación
 * (Incluye PENDIENTE, EN PROGRESO, ASIGNADO y EN ESPERA).
 */
export function esTicketAbiertoOperativo(estado: string | undefined | null): boolean {
  const evalEstado = evaluarEstado(estado);
  return evalEstado.esAbiertoOperativo;
}
