export type NivelConfianza = 'ALTA' | 'MEDIA' | 'BAJA' | 'NO_DETERMINADO';

export type TipoTrabajo = 'DICTAMEN_DE_NO_UTILIDAD' | 'BAJA_DE_EQUIPO';

export interface EvidenciaTipoTrabajo {
  tipo: TipoTrabajo;
  origen:
    | 'articulo'
    | 'categoria'
    | 'subcategoria'
    | 'asunto'
    | 'descripcion'
    | 'resolucion'
    | 'conversacion_asunto'
    | 'conversacion_cuerpo'
    | 'conversacion_descripcion'
    | 'conversacion_resolucion';
  conversacionIndex?: number;
  textoEncontrado: string;
  patronCoincidente: string;
  peso: 'FUERTE' | 'MODERADO' | 'DEBIL';
  descripcionJustificacion: string;
}

export interface ResultadoClasificacionIndividual {
  tipo: TipoTrabajo;
  detectado: boolean;
  confianza: NivelConfianza;
  scoreNumerico: number;
  evidencias: EvidenciaTipoTrabajo[];
  justificacionPrincipal: string;
}

export interface ResultadoClasificacionTicket {
  ticketId: string;
  esDictamenNoUtilidad: boolean;
  confianzaDictamen: NivelConfianza;
  resultadoDictamen: ResultadoClasificacionIndividual;

  esBajaEquipo: boolean;
  confianzaBaja: NivelConfianza;
  resultadoBaja: ResultadoClasificacionIndividual;

  // Un ticket puede ser simultáneamente ambos
  esAmbos: boolean;
  todasLasEvidencias: EvidenciaTipoTrabajo[];
}
