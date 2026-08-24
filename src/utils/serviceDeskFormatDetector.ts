import { ColumnMapping, Ticket } from '../types';
import { buscarColumnaFlexible, autoDetectMapping, parseRowsToTickets } from './columnMapper';
import { determinarAtribucionOperativa, ResultadoAtribucionOperativa } from './operationalAttributionEngine';
import { normalizarTexto } from './technicianDetector';

export type TipoFormatoServiceDesk =
  | 'FORMATO_1_RESUMIDO'
  | 'FORMATO_2_PENDIENTES'
  | 'FORMATO_3_FUSIONADO'
  | 'FORMATO_ESTANDAR';

export interface ColumnaMapeadaInfo {
  campoEstandar: string;
  nombreColumnaReal: string;
}

export interface ResultadoDeteccionFormato {
  tipoFormato: TipoFormatoServiceDesk;
  nombreFormato: string;
  descripcion: string;
  archivoNombre?: string;
  totalFilas: number;
  totalTicketsUnicos: number;
  esMultiFila: boolean;
  tieneTecnicoAtencion: boolean;
  tieneHistorialConversaciones: boolean;
  tieneParticipantesEquipo: boolean;
  columnasDetectadas: string[];
  columnasPresentes: ColumnaMapeadaInfo[];
  columnasAusentes: string[];
  fuenteResponsabilidad: string;
  advertencias: string[];
}

export interface ReportePruebaFormato {
  id: number;
  archivoSimulado: string;
  tipoDetectado: TipoFormatoServiceDesk;
  nombreFormato: string;
  totalTickets: number;
  totalFilas: number;
  columnasDetectadas: string[];
  columnasAusentes: string[];
  fuenteResponsabilidad: string;
  responsablesEncontrados: { nombre: string; area: string; cantidadTickets: number }[];
  totalTicketsSinResponsable: number;
  advertencias: string[];
  tickets: Ticket[];
  atribuciones: ResultadoAtribucionOperativa[];
}

/**
 * Detecta automáticamente la estructura y el formato real de ServiceDesk Plus
 * a partir de las columnas presentes y las filas de datos.
 */
export function detectarFormatoServiceDesk(
  columns: string[],
  rawRows: Record<string, any>[],
  fileName?: string
): ResultadoDeteccionFormato {
  const totalFilas = rawRows.length;
  const mapping = autoDetectMapping(columns);

  // Analizar presencia de columnas clave
  const tieneTecnicoAtencion = !!mapping.col_tecnico_atencion;
  const tieneRemitente = !!(mapping.col_remitente_correo || mapping.col_remitente_nombre);
  const tieneDestinatario = !!(mapping.col_correo_dest || mapping.col_destinatario);
  const tieneCopia = !!(mapping.col_cc || mapping.col_cco);
  const tieneCuerpoConversacion = !!(mapping.col_cuerpo_conversacion || mapping.col_fecha_conversacion);
  const tieneParticipantesEquipo = !!mapping.col_participantes;

  const tieneHistorialConversaciones =
    tieneRemitente || tieneDestinatario || tieneCopia || tieneCuerpoConversacion;

  // Analizar si hay IDs duplicados (estructura multi-fila)
  let esMultiFila = false;
  let totalTicketsUnicos = totalFilas;

  if (mapping.col_id && totalFilas > 0) {
    const idsSet = new Set<string>();
    for (const r of rawRows) {
      const val = r[mapping.col_id];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        idsSet.add(String(val).trim());
      }
    }
    totalTicketsUnicos = idsSet.size > 0 ? idsSet.size : totalFilas;
    esMultiFila = totalFilas > totalTicketsUnicos * 1.05; // Margen de duplicidad
  }

  // Lista de columnas presentes mapeadas
  const columnasPresentes: ColumnaMapeadaInfo[] = [];
  const mapeoEntries: [string, string | null][] = [
    ['ID Original', mapping.col_id],
    ['Estado', mapping.col_estado],
    ['Fecha de Creación', mapping.col_fecha],
    ['Técnico Asignado (Buzón)', mapping.col_tecnico],
    ['Técnico en Atención', mapping.col_tecnico_atencion],
    ['Categoría', mapping.col_categoria],
    ['Subcategoría', mapping.col_subcategoria],
    ['Artículo', mapping.col_articulo],
    ['Tipo de Solicitud', mapping.col_tipo],
    ['Nombre del Solicitante', mapping.col_solicitante],
    ['Participantes del Equipo', mapping.col_participantes],
    ['Participantes Mesa de Ayuda', mapping.col_mesa_ayuda],
    ['Asunto de la Conversación', mapping.col_asunto],
    ['Descripción', mapping.col_descripcion],
    ['Resolución', mapping.col_resolucion],
    ['Correo del Remitente', mapping.col_remitente_correo],
    ['Nombre del Remitente', mapping.col_remitente_nombre],
    ['Destinatario', mapping.col_destinatario || mapping.col_correo_dest],
    ['En Copia (CC)', mapping.col_cc],
    ['En Copia Oculta (CCO)', mapping.col_cco],
    ['Fecha de Conversación', mapping.col_fecha_conversacion],
    ['Cuerpo de Conversación', mapping.col_cuerpo_conversacion],
  ];

  const columnasAusentes: string[] = [];

  for (const [estandar, real] of mapeoEntries) {
    if (real) {
      columnasPresentes.push({ campoEstandar: estandar, nombreColumnaReal: real });
    } else {
      columnasAusentes.push(estandar);
    }
  }

  // Identificación del formato
  let tipoFormato: TipoFormatoServiceDesk = 'FORMATO_ESTANDAR';
  let nombreFormato = 'Reporte Estándar ServiceDesk';
  let descripcion = 'Formato general de ServiceDesk con mapeo adaptable.';
  let fuenteResponsabilidad = '';
  const advertencias: string[] = [];

  // Lógica de discriminación de formatos
  if (esMultiFila || (tieneHistorialConversaciones && (tieneRemitente || tieneCopia))) {
    tipoFormato = 'FORMATO_3_FUSIONADO';
    nombreFormato = 'Formato 3 — Excel Fusionado (Multi-fila con Conversaciones)';
    descripcion =
      'Contiene trazabilidad detallada de conversaciones, múltiples filas por ticket, correos de remitente, destinatario, CC y CCO.';
    fuenteResponsabilidad =
      'Historial de conversaciones activas (Remitente / Destinatario / Copia) + Reglas de Negocio Acumulativas.';
    advertencias.push(
      'Consolidación multi-fila activada: Todas las filas fueron preservadas y agrupadas cronológicamente en sus respectivos tickets.'
    );
  } else if (tieneTecnicoAtencion) {
    tipoFormato = 'FORMATO_2_PENDIENTES';
    nombreFormato = 'Formato 2 — Reporte de Tickets Pendientes (Con Técnico en Atención)';
    descripcion =
      'Contiene la columna directa "Técnico en Atención", reflejando al responsable operativo actual de la solicitud.';
    fuenteResponsabilidad =
      'Columna "Técnico en Atención" como evidencia directa de responsabilidad operativa + Reglas de Negocio Explícitas.';
    advertencias.push(
      'Evidencia directa de atención disponible. El campo "Técnico en Atención" se utiliza como responsable primario.'
    );
  } else {
    tipoFormato = 'FORMATO_1_RESUMIDO';
    nombreFormato = 'Formato 1 — Reporte Resumido (1 fila por ticket sin conversaciones)';
    descripcion =
      'Reporte consolidado de 1 fila por solicitud. No incluye "Técnico en Atención" ni historial de conversaciones desglosado.';
    fuenteResponsabilidad =
      'Reglas de Negocio Explícitas + Categoría/Área + "Participantes del Equipo" (como evidencia de participación, sin suponer atención individual arbitraria).';
    advertencias.push(
      'Reporte resumido: No contiene historial de correos ni Técnico en Atención. "Técnico Asignado" se trata como buzón de ServiceDesk.'
    );
    if (tieneParticipantesEquipo) {
      advertencias.push(
        '"Participantes del Equipo" detectado: Se registrarán como participantes sin forzar responsabilidad operativa inventada.'
      );
    }
  }

  return {
    tipoFormato,
    nombreFormato,
    descripcion,
    archivoNombre: fileName,
    totalFilas,
    totalTicketsUnicos,
    esMultiFila,
    tieneTecnicoAtencion,
    tieneHistorialConversaciones,
    tieneParticipantesEquipo,
    columnasDetectadas: columns,
    columnasPresentes,
    columnasAusentes,
    fuenteResponsabilidad,
    advertencias,
  };
}

/**
 * Genera datasets simulados de los 3 formatos reales y ejecuta las pruebas de compatibilidad.
 */
export function ejecutarPruebasFormatosServiceDesk(): ReportePruebaFormato[] {
  // -------------------------------------------------------------------------
  // 1. REPORTE RESUMIDO (ej. 1787272702896.xlsx)
  // -------------------------------------------------------------------------
  const columnasF1 = [
    'ID Original',
    'Fecha de Creación',
    'Tipo de Solicitud',
    'Nombre del Solicitante',
    'Categoria',
    'Subcategoria',
    'Articulo',
    'Tecnico Asignado',
    'Participantes del Equipo',
    'Estado',
    'Piso o Ubicacion',
    'Ubicacion General',
    'Descripcion',
    'Prioridad',
    'Resolucion',
  ];

  const filasF1: Record<string, any>[] = [
    {
      'ID Original': '101',
      'Fecha de Creación': '2026-08-01 08:30:00',
      'Tipo de Solicitud': 'Incidencia',
      'Nombre del Solicitante': 'Dirección General de Auditoría',
      Categoria: 'HARDWARE',
      Subcategoria: 'Equipo de Cómputo',
      Articulo: 'Mantenimiento Correctivo',
      'Tecnico Asignado': 'SOPORTE 1',
      'Participantes del Equipo': 'Francisco Bernal Reynoso, Tania Samantha Tirado Ross',
      Estado: 'Abierto',
      'Piso o Ubicacion': 'Piso 3',
      'Ubicacion General': 'Sede Central',
      Descripcion: 'Falla en encendido de equipo de escritorio',
      Prioridad: 'Normal',
      Resolucion: '',
    },
    {
      'ID Original': '102',
      'Fecha de Creación': '2026-08-01 09:00:00',
      'Tipo de Solicitud': 'CAPACITACIÓN',
      'Nombre del Solicitante': 'Alcaldía Cuauhtémoc',
      Categoria: 'INTERINSTITUCIONAL',
      Subcategoria: 'Plataforma Cursos',
      Articulo: 'Habilitación de Claves',
      'Tecnico Asignado': 'INTERINSTITUCIONAL 1',
      'Participantes del Equipo': 'Dora Mercedes Montaño',
      Estado: 'Abierto',
      'Piso o Ubicacion': 'Piso 1',
      'Ubicacion General': 'Sede Central',
      Descripcion: 'Solicitud de acceso al curso de inducción',
      Prioridad: 'Normal',
      Resolucion: '',
    },
    {
      'ID Original': '103',
      'Fecha de Creación': '2026-08-01 10:00:00',
      'Tipo de Solicitud': 'Requerimiento',
      'Nombre del Solicitante': 'Subdirección de Finanzas',
      Categoria: 'SISTEMAS',
      Subcategoria: 'Desarrollo',
      Articulo: 'Módulo SCG',
      'Tecnico Asignado': 'DESARROLLO 1',
      'Participantes del Equipo': 'Jhonn Piña Miranda',
      Estado: 'Abierto',
      'Piso o Ubicacion': 'Piso 4',
      'Ubicacion General': 'Sede Central',
      Descripcion: 'Ajuste de validación en módulo de pagos',
      Prioridad: 'Alta',
      Resolucion: '',
    },
    {
      'ID Original': '104',
      'Fecha de Creación': '2026-08-01 11:30:00',
      'Tipo de Solicitud': 'Incidencia',
      'Nombre del Solicitante': 'Recepción',
      Categoria: 'GENERAL',
      Subcategoria: 'Sin Clasificar',
      Articulo: 'Sin Artículo',
      'Tecnico Asignado': 'No asignado',
      'Participantes del Equipo': '',
      Estado: 'Abierto',
      'Piso o Ubicacion': 'Planta Baja',
      'Ubicacion General': 'Sede Central',
      Descripcion: 'Reporte sin datos de asignación ni participantes',
      Prioridad: 'Baja',
      Resolucion: '',
    },
  ];

  // -------------------------------------------------------------------------
  // 2. REPORTE DE TICKETS PENDIENTES (ej. Tickets Pendientes Soporte.xlsx)
  // -------------------------------------------------------------------------
  const columnasF2 = [
    'ID Original',
    'Fecha de Creación',
    'Tipo de Solicitud',
    'Nombre del Solicitante',
    'Categoria',
    'Subcategoria',
    'Articulo',
    'Tecnico Asignado',
    'Técnico en Atención',
    'Estado',
    'Descripcion',
  ];

  const filasF2: Record<string, any>[] = [
    {
      'ID Original': '4839',
      'Fecha de Creación': '2026-08-02 09:15:00',
      'Tipo de Solicitud': 'Incidencia',
      'Nombre del Solicitante': 'Dirección General de Auditoría',
      Categoria: 'HARDWARE',
      Subcategoria: 'Equipo de Cómputo',
      Articulo: 'Mantenimiento Correctivo',
      'Tecnico Asignado': 'No asignado',
      'Técnico en Atención': 'Jesús Emmanuel Hernández Ramírez',
      Estado: 'Abierto',
      Descripcion: 'Mantenimiento preventivo y correctivo',
    },
    {
      'ID Original': '4840',
      'Fecha de Creación': '2026-08-02 10:00:00',
      'Tipo de Solicitud': 'Incidencia',
      'Nombre del Solicitante': 'Subdirección de Recursos Humanos',
      Categoria: 'HARDWARE',
      Subcategoria: 'Impresoras',
      Articulo: 'Configuración',
      'Tecnico Asignado': 'SOPORTE 1',
      'Técnico en Atención': 'Francisco Bernal Reynoso',
      Estado: 'Abierto',
      Descripcion: 'Configuración de red en impresora departamental',
    },
    {
      'ID Original': '4841',
      'Fecha de Creación': '2026-08-02 11:30:00',
      'Tipo de Solicitud': 'Requerimiento',
      'Nombre del Solicitante': 'Órgano Interno de Control',
      Categoria: 'SISTEMAS',
      Subcategoria: 'Desarrollo',
      Articulo: 'Módulos Institucionales',
      'Tecnico Asignado': 'DESARROLLO 1',
      'Técnico en Atención': 'Jhonn Piña Miranda',
      Estado: 'Abierto',
      Descripcion: 'Ajuste en consultas de base de datos',
    },
    {
      'ID Original': '4842',
      'Fecha de Creación': '2026-08-02 12:00:00',
      'Tipo de Solicitud': 'CAPACITACIÓN',
      'Nombre del Solicitante': 'Alcaldía Iztapalapa',
      Categoria: 'INTERINSTITUCIONAL',
      Subcategoria: 'Cursos',
      Articulo: 'Plataforma',
      'Tecnico Asignado': 'INTERINSTITUCIONAL 1',
      'Técnico en Atención': 'Dora Mercedes Montaño',
      Estado: 'Abierto',
      Descripcion: 'Capacitación presencial programada',
    },
    {
      'ID Original': '4843',
      'Fecha de Creación': '2026-08-02 14:00:00',
      'Tipo de Solicitud': 'Incidencia',
      'Nombre del Solicitante': 'Usuario Desconocido',
      Categoria: 'TELEFONIA',
      Subcategoria: 'Extensiones',
      Articulo: 'Sin Asignar',
      'Tecnico Asignado': 'No asignado',
      'Técnico en Atención': 'No asignado',
      Estado: 'Abierto',
      Descripcion: 'Ticket sin técnico asignado en atención',
    },
  ];

  // -------------------------------------------------------------------------
  // 3. EXCEL FUSIONADO (ej. Excel_Fusionado.xlsx)
  // -------------------------------------------------------------------------
  const columnasF3 = [
    'ID Original',
    'Fecha de Creación',
    'Tipo de Solicitud',
    'Nombre del Solicitante',
    'Categoria',
    'Subcategoria',
    'Articulo',
    'Tecnico Asignado',
    'Estado',
    'Fecha de la conversación',
    'Asunto de la conversación',
    'Nombre del remitente',
    'Correo electrónico del remitente',
    'Destinatario de la conversación',
    'En copia (CC)',
    'En copia oculta (CCO)',
    'Cuerpo de la conversación',
  ];

  const filasF3: Record<string, any>[] = [
    // Ticket 201 - Conversación multi-fila (Fila 1: Solicitud inicial, Fila 2: Respuesta de Ernesto Adán)
    {
      'ID Original': '201',
      'Fecha de Creación': '2026-08-03 08:00:00',
      'Tipo de Solicitud': 'Incidencia',
      'Nombre del Solicitante': 'María Fernández',
      Categoria: 'HARDWARE',
      Subcategoria: 'Equipo de Cómputo',
      Articulo: 'Revisión',
      'Tecnico Asignado': 'SOPORTE 1',
      Estado: 'Cerrado',
      'Fecha de la conversación': '2026-08-03 08:00:00',
      'Asunto de la conversación': 'Mi equipo no enciende',
      'Nombre del remitente': 'María Fernández',
      'Correo electrónico del remitente': 'mfernandez@contraloria.cdmx.gob.mx',
      'Destinatario de la conversación': 'mesadeayuda@scg.cdmx.gob.mx',
      'En copia (CC)': '',
      'En copia oculta (CCO)': '',
      'Cuerpo de la conversación': 'Solicito apoyo con mi PC.',
    },
    {
      'ID Original': '201',
      'Fecha de Creación': '2026-08-03 08:00:00',
      'Tipo de Solicitud': 'Incidencia',
      'Nombre del Solicitante': 'María Fernández',
      Categoria: 'HARDWARE',
      Subcategoria: 'Equipo de Cómputo',
      Articulo: 'Revisión',
      'Tecnico Asignado': 'SOPORTE 1',
      Estado: 'Cerrado',
      'Fecha de la conversación': '2026-08-03 08:45:00',
      'Asunto de la conversación': 'Respuesta: Mi equipo no enciende',
      'Nombre del remitente': 'Ernesto Adan Pérez Hernández',
      'Correo electrónico del remitente': 'eaperez@scg.cdmx.gob.mx',
      'Destinatario de la conversación': 'mfernandez@contraloria.cdmx.gob.mx',
      'En copia (CC)': 'fbernalr@scg.cdmx.gob.mx',
      'En copia oculta (CCO)': '',
      'Cuerpo de la conversación': 'Se cambió la fuente de poder, equipo operativo.',
    },

    // Ticket 202 - Samantha Tirado + Francisco Bernal (Colaboración Informática + Soporte)
    {
      'ID Original': '202',
      'Fecha de Creación': '2026-08-03 09:30:00',
      'Tipo de Solicitud': 'Requerimiento',
      'Nombre del Solicitante': 'Dirección de Auditoría',
      Categoria: 'SISTEMAS',
      Subcategoria: 'Soporte y Consultoría',
      Articulo: 'Módulo SCG',
      'Tecnico Asignado': 'SOPORTE 1',
      Estado: 'Abierto',
      'Fecha de la conversación': '2026-08-03 09:30:00',
      'Asunto de la conversación': 'Configuración de acceso y hardware de firma',
      'Nombre del remitente': 'Francisco Bernal Reynoso',
      'Correo electrónico del remitente': 'fbernalr@scg.cdmx.gob.mx',
      'Destinatario de la conversación': 'solicitante@scg.cdmx.gob.mx',
      'En copia (CC)': '',
      'En copia oculta (CCO)': '',
      'Cuerpo de la conversación': 'Instalación de lector óptico completada.',
    },
    {
      'ID Original': '202',
      'Fecha de Creación': '2026-08-03 09:30:00',
      'Tipo de Solicitud': 'Requerimiento',
      'Nombre del Solicitante': 'Dirección de Auditoría',
      Categoria: 'SISTEMAS',
      Subcategoria: 'Soporte y Consultoría',
      Articulo: 'Módulo SCG',
      'Tecnico Asignado': 'SOPORTE 1',
      Estado: 'Abierto',
      'Fecha de la conversación': '2026-08-03 10:15:00',
      'Asunto de la conversación': 'Respuesta: Configuración de acceso y hardware de firma',
      'Nombre del remitente': 'Tania Samantha Tirado Ross',
      'Correo electrónico del remitente': 'tstirador@scg.cdmx.gob.mx',
      'Destinatario de la conversación': 'solicitante@scg.cdmx.gob.mx',
      'En copia (CC)': 'fbernalr@scg.cdmx.gob.mx',
      'En copia oculta (CCO)': '',
      'Cuerpo de la conversación': 'Módulo habilitado con permisos de firma electrónica en el servidor.',
    },

    // Ticket 203 - Informática (Marco Eric Valle)
    {
      'ID Original': '203',
      'Fecha de Creación': '2026-08-03 11:00:00',
      'Tipo de Solicitud': 'Requerimiento',
      'Nombre del Solicitante': 'Subdirección de Tecnologías',
      Categoria: 'SISTEMAS',
      Subcategoria: 'Bases de Datos',
      Articulo: 'Respaldo',
      'Tecnico Asignado': 'DESARROLLO 1',
      Estado: 'Cerrado',
      'Fecha de la conversación': '2026-08-03 11:00:00',
      'Asunto de la conversación': 'Respaldo y mantenimiento de BD',
      'Nombre del remitente': 'Marco Eric Valle Juarez',
      'Correo electrónico del remitente': 'dmg.consultor1@scg.cdmx.gob.mx',
      'Destinatario de la conversación': 'soporte@scg.cdmx.gob.mx',
      'En copia (CC)': '',
      'En copia oculta (CCO)': '',
      'Cuerpo de la conversación': 'Respaldo ejecutado exitosamente.',
    },

    // Ticket 204 - Ticket sin respuesta técnica
    {
      'ID Original': '204',
      'Fecha de Creación': '2026-08-03 12:00:00',
      'Tipo de Solicitud': 'Incidencia',
      'Nombre del Solicitante': 'Carlos Gómez',
      Categoria: 'SERVICIOS',
      Subcategoria: 'Dudas',
      Articulo: 'Consulta',
      'Tecnico Asignado': 'No asignado',
      Estado: 'Abierto',
      'Fecha de la conversación': '2026-08-03 12:00:00',
      'Asunto de la conversación': 'Consulta sobre horarios',
      'Nombre del remitente': 'Carlos Gómez',
      'Correo electrónico del remitente': 'cgomez@externo.cdmx.gob.mx',
      'Destinatario de la conversación': 'mesadeayuda@scg.cdmx.gob.mx',
      'En copia (CC)': '',
      'En copia oculta (CCO)': '',
      'Cuerpo de la conversación': '¿Cuál es el horario de atención telefónica?',
    },
  ];

  // Helper para procesar y compilar resultados de prueba
  const procesarPrueba = (
    id: number,
    archivoNombre: string,
    columnas: string[],
    filas: Record<string, any>[]
  ): ReportePruebaFormato => {
    const mapping = autoDetectMapping(columnas);
    const tickets = parseRowsToTickets(filas, mapping);
    const formatoInfo = detectarFormatoServiceDesk(columnas, filas, archivoNombre);

    const atribuciones = tickets.map((t) => determinarAtribucionOperativa(t));

    const respMap = new Map<string, { area: string; count: number }>();
    let totalTicketsSinResponsable = 0;

    for (const a of atribuciones) {
      if (a.responsablesOperativos.length === 0) {
        totalTicketsSinResponsable++;
      } else {
        for (const r of a.responsablesOperativos) {
          const prev = respMap.get(r.nombre);
          if (prev) {
            prev.count++;
          } else {
            respMap.set(r.nombre, { area: r.area, count: 1 });
          }
        }
      }
    }

    const responsablesEncontrados = Array.from(respMap.entries()).map(([nombre, data]) => ({
      nombre,
      area: data.area,
      cantidadTickets: data.count,
    }));

    return {
      id,
      archivoSimulado: archivoNombre,
      tipoDetectado: formatoInfo.tipoFormato,
      nombreFormato: formatoInfo.nombreFormato,
      totalTickets: tickets.length,
      totalFilas: filas.length,
      columnasDetectadas: columnas,
      columnasAusentes: formatoInfo.columnasAusentes,
      fuenteResponsabilidad: formatoInfo.fuenteResponsabilidad,
      responsablesEncontrados,
      totalTicketsSinResponsable,
      advertencias: formatoInfo.advertencias,
      tickets,
      atribuciones,
    };
  };

  return [
    procesarPrueba(1, '1787272702896.xlsx', columnasF1, filasF1),
    procesarPrueba(2, 'Tickets Pendientes Soporte.xlsx', columnasF2, filasF2),
    procesarPrueba(3, 'Excel_Fusionado.xlsx', columnasF3, filasF3),
  ];
}
