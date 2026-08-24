export interface ConversacionRow {
  index: number;
  fecha?: string;
  asunto?: string;
  descripcion?: string;
  cuerpo?: string;
  remitenteCorreo?: string;
  remitenteNombre?: string;
  destinatarioCorreo?: string;
  participantes?: string;
  cc?: string;
  cco?: string;
  resolucion?: string;
  estado?: string;
  raw: Record<string, any>;
}

export interface Ticket {
  id: string;
  estado: string;
  fechaCreacion: string;
  tecnicoAsignado: string;
  tecnicoEnAtencion?: string;
  tecnicoAtencion?: string;
  categoria: string;
  subcategoria: string;
  articulo: string;
  tipoSolicitud: string;
  solicitante: string;
  correoDestinatario?: string;
  participantesEquipo?: string;
  participantesMesaAyuda?: string;
  asunto?: string;
  descripcion?: string;
  resolucion?: string;
  conversaciones: ConversacionRow[];
  rawRows: Record<string, any>[];
  raw: Record<string, any>;
}

export interface ColumnMapping {
  col_id: string | null;
  col_estado: string | null;
  col_fecha: string | null;
  col_tecnico: string | null;
  col_tecnico_atencion: string | null;
  col_categoria: string | null;
  col_subcategoria: string | null;
  col_articulo: string | null;
  col_tipo: string | null;
  col_solicitante: string | null;
  col_correo_dest: string | null;
  col_participantes: string | null;
  col_mesa_ayuda: string | null;
  col_asunto: string | null;
  col_descripcion: string | null;
  col_resolucion: string | null;
  col_remitente_correo: string | null;
  col_remitente_nombre: string | null;
  col_destinatario: string | null;
  col_cc: string | null;
  col_cco: string | null;
  col_fecha_conversacion: string | null;
  col_cuerpo_conversacion: string | null;
}

export interface TecnicoRegistro {
  id: string;
  nombre: string;
  correoPrincipal: string;
  correosAlternativos?: string[];
  alias?: string[];
  area: 'Soporte' | 'Informática' | 'Interinstitucional' | string;
  activo: boolean;
  filtroDesarrollo?: boolean;
}

export interface TecnicoSCGConfig {
  nombre: string;
  correoExacto: string;
  aliasParticipante: string[];
  filtroDesarrollo: boolean;
}

export interface TecnicoInformaticaConfig {
  nombre: string;
  correo: string;
  prefijo: string;
}

export interface AuditError {
  ticket: Ticket;
  motivo: string;
}

export type ViewType =
  | 'dashboard_general'
  | 'auditoria_catalogo'
  | 'calidad_tiempos'
  | 'control_soporte'
  | 'control_informatica'
  | 'control_interinstitucional'
  | 'catalogo_tecnicos'
  | 'validacion_motores';
