export type EstadoCanonico =
  | 'PENDIENTE'
  | 'CERRADO'
  | 'CANCELADO'
  | 'EN_ESPERA'
  | 'DESCONOCIDO';

export interface EvaluacionEstadoTicket {
  estadoOriginal: string;
  estadoNormalizado: string;
  estadoCanonico: EstadoCanonico;
  esPendiente: boolean;
  esCerrado: boolean;
  esCancelado: boolean;
  esEnEspera: boolean;
  esDesconocido: boolean;
  /** Si el ticket se considera activo/abierto en la operación del día a día (PENDIENTE o EN_ESPERA) */
  esAbiertoOperativo: boolean;
  descripcion: string;
}
