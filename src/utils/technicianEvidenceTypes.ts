import { ConversacionRow, Ticket } from '../types';

export type RolEvidenciaTecnico =
  | 'REMITENTE'          // El técnico redactó y envió un mensaje/respuesta
  | 'DESTINATARIO'       // El técnico fue destinatario directo (Para)
  | 'PARTICIPANTE'       // El técnico figura como participante explícito del equipo/mesa
  | 'ATENCION_ASIGNADA'  // Asignado explícitamente en la columna Técnico en Atención
  | 'CC'                 // El técnico estuvo en copia
  | 'CCO';               // El técnico estuvo en copia oculta

export type NivelEvidencia = 'FUERTE' | 'DEBIL';

export type CategoriaParticipacion =
  | 'ATENDIO'        // Intervino activamente / redactó respuesta / Técnico en Atención
  | 'RECIBIO'        // Recibió la solicitud (destinatario directo) sin respuesta registrada
  | 'PARTICIPO'      // Registrado como participante del equipo / mesa
  | 'SOLO_CC'        // Mencionado únicamente en copia (CC / CCO)
  | 'NINGUNA';

export interface AccionHumanaDetectada {
  tipo:
    | 'SOLICITO'
    | 'ENVIO_SOLICITUD'
    | 'RECIBIO_SOLICITUD'
    | 'RESPONDIO'
    | 'CONTESTO'
    | 'REENVIO'
    | 'PARTICIPO'
    | 'COPIADO'
    | 'ACTUALIZO';
  etiquetaHumana: string;
  descripcion: string;
  fecha?: string;
  conversacionIndex?: number;
  detalles?: string;
}

export interface EvidenciaTecnico {
  tecnicoNombre: string;
  ticketId: string;
  conversacionIndex: number;
  fecha?: string;
  rol: RolEvidenciaTecnico;
  nivel: NivelEvidencia;
  campoOrigen:
    | 'remitenteCorreo'
    | 'remitenteNombre'
    | 'destinatarioCorreo'
    | 'participantesEquipo'
    | 'participantesMesaAyuda'
    | 'cc'
    | 'cco'
    | 'correoDestinatario_legacy'
    | 'tecnicoAtencion'
    | 'tecnicoEnAtencion';
  valorEncontrado: string;
  coincidenciaPor: 'correo' | 'nombre' | 'alias';
}

export interface ParticipacionTecnicoEnTicket {
  tecnicoNombre: string;
  ticketId: string;
  // Categoria canónica de participación (desacopla Atendió de Recibió)
  categoriaPrincipal: CategoriaParticipacion;
  etiquetaRolHumano: string;      // e.g. "INTERVINO / ATENDIÓ", "RECIBIÓ SOLICITUD", "SOLO EN COPIA"
  // Resumen del tipo de participación
  esRemitente: boolean;           // Envió al menos 1 respuesta/mensaje
  esDestinatarioDirecto: boolean; // Fue destinatario directo en al menos 1 mensaje
  esParticipante: boolean;        // Aparece como participante del equipo/mesa
  esCopiadoSoloCC: boolean;       // Aparece ÚNICAMENTE en CC/CCO sin haber respondido ni ser destinatario directo
  // Conclusión basada en evidencia
  tieneEvidenciaFuerte: boolean;  // Intervino activamente (remitente de respuesta o participante directo); NO incluye destinatario pasivo
  evidencias: EvidenciaTecnico[]; // Listado exhaustivo de todas las evidencias encontradas
  accionesHumanas: AccionHumanaDetectada[]; // Explicaciones en lenguaje administrativo de lo que hizo
  totalInteracciones: number;
}

export interface TecnicoConfigUniversal {
  nombre: string;
  correo: string;
  correos?: string[];
  alias: string[];
}
