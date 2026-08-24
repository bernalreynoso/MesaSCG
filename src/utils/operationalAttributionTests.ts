import { Ticket, ConversacionRow } from '../types';
import { determinarAtribucionOperativa, ResultadoAtribucionOperativa } from './operationalAttributionEngine';

export interface CasoPruebaAtribucion {
  id: number;
  nombre: string;
  descripcion: string;
  ticket: Ticket;
  personasDetectadasEsperadas: string[];
  responsablesEsperados: string[];
}

export interface ResultadoPruebaUnitario {
  id: number;
  nombre: string;
  ticketId: string;
  personasDetectadas: string[];
  responsablesEsperados: string[];
  responsablesObtenidos: string[];
  explicacionReglas: string[];
  esCorrecto: boolean;
}

/**
 * 15 CASOS DE PRUEBA OBLIGATORIOS FASE 10
 */
export const CASOS_PRUEBA_OBLIGATORIOS: CasoPruebaAtribucion[] = [
  // 1. Jhonn solo
  {
    id: 1,
    nombre: 'Jhonn solo',
    descripcion: 'Aparece únicamente Jhonn Piña Miranda en el ticket.',
    ticket: {
      id: 'TEST-101',
      estado: 'Cerrado',
      fechaCreacion: '2026-08-01 10:00:00',
      tecnicoAsignado: 'INFORMATICA',
      categoria: 'SISTEMAS',
      subcategoria: 'Desarrollo',
      articulo: 'Módulo de Declaraciones SCG',
      tipoSolicitud: 'Requerimiento',
      solicitante: 'Dirección de Auditoría',
      conversaciones: [
        {
          index: 1,
          remitenteNombre: 'Jhonn Piña Miranda',
          remitenteCorreo: 'jpinam@scg.cdmx.gob.mx',
          destinatarioCorreo: 'solicitante@scg.cdmx.gob.mx',
          cuerpo: 'Se atendió el requerimiento en el módulo.',
          raw: {},
        },
      ],
      rawRows: [{}],
      raw: {},
    },
    personasDetectadasEsperadas: ['Jhonn Piña Miranda'],
    responsablesEsperados: ['Jhonn Piña Miranda'],
  },

  // 2. Marco solo
  {
    id: 2,
    nombre: 'Marco solo',
    descripcion: 'Aparece únicamente Marco Eric Valle Juárez en el ticket.',
    ticket: {
      id: 'TEST-102',
      estado: 'Cerrado',
      fechaCreacion: '2026-08-01 10:00:00',
      tecnicoAsignado: 'INFORMATICA',
      categoria: 'SISTEMAS',
      subcategoria: 'Bases de Datos',
      articulo: 'Optimización de Consultas SQL',
      tipoSolicitud: 'Requerimiento',
      solicitante: 'Subdirección de Sistemas',
      conversaciones: [
        {
          index: 1,
          remitenteNombre: 'Marco Eric Valle Juarez',
          remitenteCorreo: 'dmg.consultor1@scg.cdmx.gob.mx',
          cuerpo: 'Se ejecutaron los scripts de optimización.',
          raw: {},
        },
      ],
      rawRows: [{}],
      raw: {},
    },
    personasDetectadasEsperadas: ['Marco Eric Valle Juarez'],
    responsablesEsperados: ['Marco Eric Valle Juarez'],
  },

  // 3. Marco + Jhonn
  {
    id: 3,
    nombre: 'Marco + Jhonn',
    descripcion: 'Aparecen simultáneamente Marco Eric Valle Juárez y Jhonn Piña Miranda.',
    ticket: {
      id: 'TEST-103',
      estado: 'Cerrado',
      fechaCreacion: '2026-08-01 10:00:00',
      tecnicoAsignado: 'INFORMATICA',
      categoria: 'SISTEMAS',
      subcategoria: 'Desarrollo',
      articulo: 'Integración API SCG',
      tipoSolicitud: 'Requerimiento',
      solicitante: 'Dirección General',
      conversaciones: [
        {
          index: 1,
          remitenteNombre: 'Jhonn Piña Miranda',
          remitenteCorreo: 'jpinam@scg.cdmx.gob.mx',
          cuerpo: 'Revisión de arquitectura efectuada.',
          raw: {},
        },
        {
          index: 2,
          remitenteNombre: 'Marco Eric Valle Juarez',
          remitenteCorreo: 'dmg.consultor1@scg.cdmx.gob.mx',
          cuerpo: 'Implementación de endpoints completada.',
          raw: {},
        },
      ],
      rawRows: [{}],
      raw: {},
    },
    personasDetectadasEsperadas: ['Jhonn Piña Miranda', 'Marco Eric Valle Juarez'],
    responsablesEsperados: ['Jhonn Piña Miranda', 'Marco Eric Valle Juarez'],
  },

  // 4. Samantha + técnico Soporte
  {
    id: 4,
    nombre: 'Samantha + técnico Soporte',
    descripcion: 'Aparece Samantha Tirado Ross y un técnico de Soporte (Francisco Bernal).',
    ticket: {
      id: 'TEST-104',
      estado: 'Cerrado',
      fechaCreacion: '2026-08-01 10:00:00',
      tecnicoAsignado: 'SOPORTE TECNICO',
      categoria: 'EQUIPOS Y COMPONENTES',
      subcategoria: 'Hardware',
      articulo: 'Equipo de Cómputo',
      tipoSolicitud: 'Incidencia',
      solicitante: 'Dirección de Administración',
      conversaciones: [
        {
          index: 1,
          remitenteNombre: 'Tania Samantha Tirado Ross',
          remitenteCorreo: 'tstirador@scg.cdmx.gob.mx',
          cuerpo: 'Canalizado y verificado requerimiento de usuario.',
          raw: {},
        },
        {
          index: 2,
          remitenteNombre: 'Francisco Bernal Reynoso',
          remitenteCorreo: 'fbernal@scg.cdmx.gob.mx',
          cuerpo: 'Soporte físico realizado en el equipo.',
          raw: {},
        },
      ],
      rawRows: [{}],
      raw: {},
    },
    personasDetectadasEsperadas: ['Tania Samantha Tirado Ross', 'Francisco Bernal Reynoso'],
    responsablesEsperados: ['Francisco Bernal Reynoso', 'Tania Samantha Tirado Ross'],
  },

  // 5. Administrador Mesa + Desarrollo + Sistemas
  {
    id: 5,
    nombre: 'Administrador Mesa + Desarrollo + Sistemas',
    descripcion: 'Aparece Administrador Mesa de Ayuda, Técnico en Atención Desarrollo y Categoría Sistemas.',
    ticket: {
      id: 'TEST-105',
      estado: 'Abierto',
      fechaCreacion: '2026-08-01 10:00:00',
      tecnicoAsignado: 'DESARROLLO',
      categoria: 'SISTEMAS',
      subcategoria: 'Desarrollo de Software',
      articulo: 'Módulo Institucional',
      tipoSolicitud: 'Requerimiento',
      solicitante: 'Órgano Interno de Control',
      conversaciones: [
        {
          index: 1,
          remitenteNombre: 'Mesa de Ayuda',
          remitenteCorreo: 'mesadeayuda@scg.cdmx.gob.mx',
          destinatarioCorreo: 'desarrollo@scg.cdmx.gob.mx',
          cuerpo: 'Se turna requerimiento a Desarrollo de Sistemas.',
          raw: {},
        },
      ],
      rawRows: [{}],
      raw: {},
    },
    personasDetectadasEsperadas: ['Adelaida Valenzuela'],
    responsablesEsperados: ['Adelaida Valenzuela'],
  },

  // 6. Administrador Mesa + Soporte Técnico
  {
    id: 6,
    nombre: 'Administrador Mesa + Soporte Técnico',
    descripcion: 'Aparece Administrador Mesa de Ayuda y Técnico en Atención Soporte Técnico genérico.',
    ticket: {
      id: 'TEST-106',
      estado: 'Abierto',
      fechaCreacion: '2026-08-01 10:00:00',
      tecnicoAsignado: 'SOPORTE TECNICO',
      categoria: 'SERVICIOS GENERALES',
      subcategoria: 'Mesa de Ayuda',
      articulo: 'Asignación de Servicio',
      tipoSolicitud: 'Incidencia',
      solicitante: 'Dirección General',
      conversaciones: [
        {
          index: 1,
          remitenteNombre: 'Administrador Mesa de Ayuda',
          remitenteCorreo: 'mesadeayuda@scg.cdmx.gob.mx',
          destinatarioCorreo: 'soporte@scg.cdmx.gob.mx',
          cuerpo: 'Turnado para atención a Soporte Técnico.',
          raw: {},
        },
      ],
      rawRows: [{}],
      raw: {},
    },
    personasDetectadasEsperadas: ['Jaqueline Alejandra Zamora Tenorio'],
    responsablesEsperados: ['Jaqueline Alejandra Zamora Tenorio'],
  },

  // 7. Capacitación
  {
    id: 7,
    nombre: 'Capacitación',
    descripcion: 'Tipo de Solicitud = CAPACITACIÓN (Subdirección Interinstitucional).',
    ticket: {
      id: 'TEST-107',
      estado: 'Cerrado',
      fechaCreacion: '2026-08-01 10:00:00',
      tecnicoAsignado: 'SUBDIRECCION INTERINSTITUCIONAL',
      categoria: 'CAPACITACION',
      subcategoria: 'Plataforma Virtual',
      articulo: 'Baja de Usuario en Plataforma',
      tipoSolicitud: 'CAPACITACIÓN',
      solicitante: 'Servidor Público SCG',
      conversaciones: [
        {
          index: 1,
          remitenteNombre: 'Plataforma Capacitación',
          remitenteCorreo: 'interinstitucional@scg.cdmx.gob.mx',
          cuerpo: 'Se procesó la baja en el aula virtual de capacitación.',
          raw: {},
        },
      ],
      rawRows: [{}],
      raw: {},
    },
    personasDetectadasEsperadas: ['Dora Mercedes Montaño'],
    responsablesEsperados: ['Dora Mercedes Montaño'],
  },

  // 8. Soporte + Jaqueline
  {
    id: 8,
    nombre: 'Soporte + Jaqueline',
    descripcion: 'Ticket de Soporte donde aparecen un técnico real de Soporte (Francisco Bernal) y Jaqueline Zamora.',
    ticket: {
      id: 'TEST-108',
      estado: 'Cerrado',
      fechaCreacion: '2026-08-01 10:00:00',
      tecnicoAsignado: 'SOPORTE TECNICO',
      categoria: 'EQUIPOS Y COMPONENTES',
      subcategoria: 'Hardware',
      articulo: 'Impresora Departamental',
      tipoSolicitud: 'Incidencia',
      solicitante: 'Recursos Materiales',
      conversaciones: [
        {
          index: 1,
          remitenteNombre: 'Jaqueline Alejandra Zamora Tenorio',
          remitenteCorreo: 'jazamorat@scg.cdmx.gob.mx',
          cuerpo: 'Canalizado a la mesa de soporte para revisión de equipo.',
          raw: {},
        },
        {
          index: 2,
          remitenteNombre: 'Francisco Bernal Reynoso',
          remitenteCorreo: 'fbernal@scg.cdmx.gob.mx',
          cuerpo: 'Se reparó la unidad de fusión de la impresora.',
          raw: {},
        },
      ],
      rawRows: [{}],
      raw: {},
    },
    personasDetectadasEsperadas: ['Francisco Bernal Reynoso', 'Jaqueline Alejandra Zamora Tenorio'],
    responsablesEsperados: ['Francisco Bernal Reynoso'],
  },

  // 9. Evelyn sola
  {
    id: 9,
    nombre: 'Evelyn sola',
    descripcion: 'Aparece únicamente Evelyn Rocío Vanzzini Guerrero.',
    ticket: {
      id: 'TEST-109',
      estado: 'Cerrado',
      fechaCreacion: '2026-08-01 10:00:00',
      tecnicoAsignado: 'INFORMATICA',
      categoria: 'SISTEMAS',
      subcategoria: 'Sistemas Web',
      articulo: 'Portal Web Institucional',
      tipoSolicitud: 'Requerimiento',
      solicitante: 'Comunicación Social',
      conversaciones: [
        {
          index: 1,
          remitenteNombre: 'Evelyn Rocio Vanzzini Guerrero',
          remitenteCorreo: 'evanzzini@scg.cdmx.gob.mx',
          cuerpo: 'Publicación de banners y actualización efectuada.',
          raw: {},
        },
      ],
      rawRows: [{}],
      raw: {},
    },
    personasDetectadasEsperadas: ['Evelyn Rocio Vanzzini Guerrero'],
    responsablesEsperados: ['Evelyn Rocio Vanzzini Guerrero'],
  },

  // 10. Evelyn + Samantha
  {
    id: 10,
    nombre: 'Evelyn + Samantha',
    descripcion: 'Aparecen Evelyn Rocío Vanzzini y Samantha Tirado Ross.',
    ticket: {
      id: 'TEST-110',
      estado: 'Cerrado',
      fechaCreacion: '2026-08-01 10:00:00',
      tecnicoAsignado: 'INFORMATICA',
      categoria: 'SISTEMAS',
      subcategoria: 'Desarrollo',
      articulo: 'Módulo de Gestión',
      tipoSolicitud: 'Requerimiento',
      solicitante: 'Dirección General',
      conversaciones: [
        {
          index: 1,
          remitenteNombre: 'Evelyn Rocio Vanzzini Guerrero',
          remitenteCorreo: 'evanzzini@scg.cdmx.gob.mx',
          cuerpo: 'Diseño de interfaz concluido.',
          raw: {},
        },
        {
          index: 2,
          remitenteNombre: 'Tania Samantha Tirado Ross',
          remitenteCorreo: 'tstirador@scg.cdmx.gob.mx',
          cuerpo: 'Revisión y validación técnica completada.',
          raw: {},
        },
      ],
      rawRows: [{}],
      raw: {},
    },
    personasDetectadasEsperadas: ['Evelyn Rocio Vanzzini Guerrero', 'Tania Samantha Tirado Ross'],
    responsablesEsperados: ['Evelyn Rocio Vanzzini Guerrero', 'Tania Samantha Tirado Ross'],
  },

  // 11. Evelyn + Soporte
  {
    id: 11,
    nombre: 'Evelyn + Soporte',
    descripcion: 'Aparecen Evelyn Rocío Vanzzini y un técnico de Soporte (José Moncayo).',
    ticket: {
      id: 'TEST-111',
      estado: 'Cerrado',
      fechaCreacion: '2026-08-01 10:00:00',
      tecnicoAsignado: 'SOPORTE TECNICO',
      categoria: 'SISTEMAS',
      subcategoria: 'Hardware y Software',
      articulo: 'Instalación de Sistema y Configuración de Terminal',
      tipoSolicitud: 'Incidencia',
      solicitante: 'Subdirección de Auditoría',
      conversaciones: [
        {
          index: 1,
          remitenteNombre: 'Evelyn Rocio Vanzzini Guerrero',
          remitenteCorreo: 'evanzzini@scg.cdmx.gob.mx',
          cuerpo: 'Configuración remota de permisos de base de datos.',
          raw: {},
        },
        {
          index: 2,
          remitenteNombre: 'José Moncayo Sánchez',
          remitenteCorreo: 'jmoncayo@scg.cdmx.gob.mx',
          cuerpo: 'Instalación presencial en estación de trabajo.',
          raw: {},
        },
      ],
      rawRows: [{}],
      raw: {},
    },
    personasDetectadasEsperadas: ['Evelyn Rocio Vanzzini Guerrero', 'José Moncayo Sánchez'],
    responsablesEsperados: ['José Moncayo Sánchez', 'Evelyn Rocio Vanzzini Guerrero'],
  },

  // 12. Evelyn + Samantha + Soporte
  {
    id: 12,
    nombre: 'Evelyn + Samantha + Soporte',
    descripcion: 'Aparecen Evelyn, Samantha y un técnico de Soporte (Francisco Bernal).',
    ticket: {
      id: 'TEST-112',
      estado: 'Cerrado',
      fechaCreacion: '2026-08-01 10:00:00',
      tecnicoAsignado: 'SOPORTE TECNICO',
      categoria: 'SISTEMAS',
      subcategoria: 'Implementación Mixta',
      articulo: 'Despliegue Institucional',
      tipoSolicitud: 'Requerimiento',
      solicitante: 'Secretaría Ejecutiva',
      conversaciones: [
        {
          index: 1,
          remitenteNombre: 'Evelyn Rocio Vanzzini Guerrero',
          remitenteCorreo: 'evanzzini@scg.cdmx.gob.mx',
          cuerpo: 'Despliegue del paquete de software.',
          raw: {},
        },
        {
          index: 2,
          remitenteNombre: 'Tania Samantha Tirado Ross',
          remitenteCorreo: 'tstirador@scg.cdmx.gob.mx',
          cuerpo: 'Coordinación y validación de usuarios.',
          raw: {},
        },
        {
          index: 3,
          remitenteNombre: 'Francisco Bernal Reynoso',
          remitenteCorreo: 'fbernal@scg.cdmx.gob.mx',
          cuerpo: 'Configuración presencial en equipos de cómputo.',
          raw: {},
        },
      ],
      rawRows: [{}],
      raw: {},
    },
    personasDetectadasEsperadas: ['Evelyn Rocio Vanzzini Guerrero', 'Tania Samantha Tirado Ross', 'Francisco Bernal Reynoso'],
    responsablesEsperados: ['Francisco Bernal Reynoso', 'Tania Samantha Tirado Ross', 'Evelyn Rocio Vanzzini Guerrero'],
  },

  // 13. Rafael → Jhonn como responsable actual
  {
    id: 13,
    nombre: 'Rafael → Jhonn como responsable actual',
    descripcion: 'Aparece históricamente el ex-subdirector Rafael Muñoz Cerrillo; la responsabilidad actual se atribuye a Jhonn Piña Miranda y Rafael se conserva como histórico.',
    ticket: {
      id: 'TEST-113',
      estado: 'Cerrado',
      fechaCreacion: '2025-05-15 10:00:00',
      tecnicoAsignado: 'INFORMATICA',
      categoria: 'SISTEMAS',
      subcategoria: 'Infraestructura',
      articulo: 'Servidores de Aplicación',
      tipoSolicitud: 'Requerimiento',
      solicitante: 'Dirección General de Informática',
      conversaciones: [
        {
          index: 1,
          remitenteNombre: 'Rafael Muñoz Cerrillo',
          remitenteCorreo: 'rmunoz@scg.cdmx.gob.mx',
          cuerpo: 'Instrucción de migración de servidores aprobada.',
          raw: {},
        },
      ],
      rawRows: [{}],
      raw: {},
    },
    personasDetectadasEsperadas: ['Rafael Muñoz Cerrillo'],
    responsablesEsperados: ['Jhonn Piña Miranda'],
  },

  // 14. Angélica sola
  {
    id: 14,
    nombre: 'Angélica sola',
    descripcion: 'Aparece únicamente Angélica Janette Torres Plata.',
    ticket: {
      id: 'TEST-114',
      estado: 'Cerrado',
      fechaCreacion: '2026-08-01 10:00:00',
      tecnicoAsignado: 'INFORMATICA',
      categoria: 'SISTEMAS',
      subcategoria: 'Consultoría',
      articulo: 'Módulo de Seguimiento de Acuerdos',
      tipoSolicitud: 'Requerimiento',
      solicitante: 'Coordinación de Asesores',
      conversaciones: [
        {
          index: 1,
          remitenteNombre: 'Angelica Janette Torres Plata',
          remitenteCorreo: 'dmg.consultor2@scg.cdmx.gob.mx',
          cuerpo: 'Ajustes en flujo de trabajo concluidos.',
          raw: {},
        },
      ],
      rawRows: [{}],
      raw: {},
    },
    personasDetectadasEsperadas: ['Angelica Janette Torres Plata'],
    responsablesEsperados: ['Angelica Janette Torres Plata'],
  },

  // 15. Angélica + Soporte
  {
    id: 15,
    nombre: 'Angélica + Soporte',
    descripcion: 'Aparecen Angélica Janette Torres Plata y un técnico de Soporte (Ernesto Pérez).',
    ticket: {
      id: 'TEST-115',
      estado: 'Cerrado',
      fechaCreacion: '2026-08-01 10:00:00',
      tecnicoAsignado: 'SOPORTE TECNICO',
      categoria: 'SISTEMAS',
      subcategoria: 'Soporte y Consultoría',
      articulo: 'Configuración de Estación y Validación de Módulo',
      tipoSolicitud: 'Incidencia',
      solicitante: 'Dirección General',
      conversaciones: [
        {
          index: 1,
          remitenteNombre: 'Angelica Janette Torres Plata',
          remitenteCorreo: 'dmg.consultor2@scg.cdmx.gob.mx',
          cuerpo: 'Validación funcional del sistema.',
          raw: {},
        },
        {
          index: 2,
          remitenteNombre: 'Ernesto Adan Pérez Hernández',
          remitenteCorreo: 'eperezh@scg.cdmx.gob.mx',
          cuerpo: 'Reinstalación de certificados en la máquina del usuario.',
          raw: {},
        },
      ],
      rawRows: [{}],
      raw: {},
    },
    personasDetectadasEsperadas: ['Angelica Janette Torres Plata', 'Ernesto Adan Pérez Hernández'],
    responsablesEsperados: ['Ernesto Adan Pérez Hernández', 'Angelica Janette Torres Plata'],
  },

  // 16. Técnico en Atención - Jesús Emmanuel (Casos Reales #4839 y #4375)
  {
    id: 16,
    nombre: 'Técnico en Atención - Jesús Emmanuel (No asignado)',
    descripcion: 'Ticket con Técnico Asignado = "No asignado" y Técnico en Atención = "Jesús Emmanuel Hernández Ramírez".',
    ticket: {
      id: '4839',
      estado: 'Abierto',
      fechaCreacion: '2026-08-10 09:15:00',
      tecnicoAsignado: 'No asignado',
      tecnicoEnAtencion: 'Jesús Emmanuel Hernández Ramírez',
      tecnicoAtencion: 'Jesús Emmanuel Hernández Ramírez',
      categoria: 'HARDWARE',
      subcategoria: 'Equipo de Cómputo',
      articulo: 'Mantenimiento Correctivo',
      tipoSolicitud: 'Incidencia',
      solicitante: 'Dirección General de Auditoría',
      conversaciones: [],
      rawRows: [
        {
          'ID Original': '4839',
          'Tecnico Asignado': 'No asignado',
          'Técnico en Atención': 'Jesús Emmanuel Hernández Ramírez',
          Estado: 'Abierto',
        },
      ],
      raw: {
        'ID Original': '4839',
        'Tecnico Asignado': 'No asignado',
        'Técnico en Atención': 'Jesús Emmanuel Hernández Ramírez',
        Estado: 'Abierto',
      },
    },
    personasDetectadasEsperadas: ['Jesús Emmanuel Hernández Ramírez'],
    responsablesEsperados: ['Jesús Emmanuel Hernández Ramírez'],
  },

  // 17. Técnico en Atención - Francisco Bernal (Buzón SOPORTE 1)
  {
    id: 17,
    nombre: 'Técnico en Atención - Francisco Bernal (SOPORTE 1)',
    descripcion: 'Ticket con Técnico Asignado = "SOPORTE 1" y Técnico en Atención = "Francisco Bernal Reynoso".',
    ticket: {
      id: '4840',
      estado: 'Abierto',
      fechaCreacion: '2026-08-10 10:00:00',
      tecnicoAsignado: 'SOPORTE 1',
      tecnicoEnAtencion: 'Francisco Bernal Reynoso',
      tecnicoAtencion: 'Francisco Bernal Reynoso',
      categoria: 'HARDWARE',
      subcategoria: 'Impresoras',
      articulo: 'Configuración',
      tipoSolicitud: 'Incidencia',
      solicitante: 'Subdirección de Recursos Humanos',
      conversaciones: [],
      rawRows: [
        {
          'ID Original': '4840',
          'Tecnico Asignado': 'SOPORTE 1',
          'Técnico en Atención': 'Francisco Bernal Reynoso',
          Estado: 'Abierto',
        },
      ],
      raw: {
        'ID Original': '4840',
        'Tecnico Asignado': 'SOPORTE 1',
        'Técnico en Atención': 'Francisco Bernal Reynoso',
        Estado: 'Abierto',
      },
    },
    personasDetectadasEsperadas: ['Francisco Bernal Reynoso'],
    responsablesEsperados: ['Francisco Bernal Reynoso'],
  },

  // 18. Técnico en Atención - Múltiples Responsables (Francisco + Samantha)
  {
    id: 18,
    nombre: 'Técnico en Atención + Samantha (Acumulativo)',
    descripcion: 'Técnico en Atención = "Francisco Bernal Reynoso" y conversación de "Tania Samantha Tirado Ross".',
    ticket: {
      id: '4841',
      estado: 'Abierto',
      fechaCreacion: '2026-08-10 11:00:00',
      tecnicoAsignado: 'SOPORTE 1',
      tecnicoEnAtencion: 'Francisco Bernal Reynoso',
      tecnicoAtencion: 'Francisco Bernal Reynoso',
      categoria: 'SISTEMAS',
      subcategoria: 'Soporte y Consultoría',
      articulo: 'Módulo SCG',
      tipoSolicitud: 'Requerimiento',
      solicitante: 'Órgano Interno de Control',
      conversaciones: [
        {
          index: 1,
          remitenteNombre: 'Tania Samantha Tirado Ross',
          remitenteCorreo: 'tstirador@scg.cdmx.gob.mx',
          cuerpo: 'Revisión y configuración del sistema realizada en conjunto.',
          raw: {},
        },
      ],
      rawRows: [
        {
          'ID Original': '4841',
          'Tecnico Asignado': 'SOPORTE 1',
          'Técnico en Atención': 'Francisco Bernal Reynoso',
          Estado: 'Abierto',
        },
      ],
      raw: {
        'ID Original': '4841',
        'Tecnico Asignado': 'SOPORTE 1',
        'Técnico en Atención': 'Francisco Bernal Reynoso',
        Estado: 'Abierto',
      },
    },
    personasDetectadasEsperadas: ['Francisco Bernal Reynoso', 'Tania Samantha Tirado Ross'],
    responsablesEsperados: ['Francisco Bernal Reynoso', 'Tania Samantha Tirado Ross'],
  },

  // 19. Técnico en Atención - José Moncayo Sánchez
  {
    id: 19,
    nombre: 'Técnico en Atención - José Moncayo Sánchez',
    descripcion: 'Ticket con Técnico en Atención = "José Moncayo Sánchez" en reporte resumido de Soporte.',
    ticket: {
      id: '4842',
      estado: 'Abierto',
      fechaCreacion: '2026-08-10 12:00:00',
      tecnicoAsignado: 'SOPORTE 1',
      tecnicoEnAtencion: 'José Moncayo Sánchez',
      tecnicoAtencion: 'José Moncayo Sánchez',
      categoria: 'HARDWARE',
      subcategoria: 'Equipo de Cómputo',
      articulo: 'Diagnóstico y Reparación',
      tipoSolicitud: 'Incidencia',
      solicitante: 'Dirección General de Legalidad',
      conversaciones: [],
      rawRows: [
        {
          'ID Original': '4842',
          'Tecnico Asignado': 'SOPORTE 1',
          'Técnico en Atención': 'José Moncayo Sánchez',
          Estado: 'Abierto',
        },
      ],
      raw: {
        'ID Original': '4842',
        'Tecnico Asignado': 'SOPORTE 1',
        'Técnico en Atención': 'José Moncayo Sánchez',
        Estado: 'Abierto',
      },
    },
    personasDetectadasEsperadas: ['José Moncayo Sánchez'],
    responsablesEsperados: ['José Moncayo Sánchez'],
  },

  // 20. Técnico en Atención - Gustavo Dzib Palacios
  {
    id: 20,
    nombre: 'Técnico en Atención - Gustavo Dzib Palacios',
    descripcion: 'Ticket con Técnico en Atención = "Gustavo Dzib Palacios" en reporte de Soporte.',
    ticket: {
      id: '4843',
      estado: 'Abierto',
      fechaCreacion: '2026-08-10 13:00:00',
      tecnicoAsignado: 'SOPORTE 1',
      tecnicoEnAtencion: 'Gustavo Dzib Palacios',
      tecnicoAtencion: 'Gustavo Dzib Palacios',
      categoria: 'REDES',
      subcategoria: 'Conectividad',
      articulo: 'Punto de Red',
      tipoSolicitud: 'Incidencia',
      solicitante: 'Alcaldía Iztapalapa',
      conversaciones: [],
      rawRows: [
        {
          'ID Original': '4843',
          'Tecnico Asignado': 'SOPORTE 1',
          'Técnico en Atención': 'Gustavo Dzib Palacios',
          Estado: 'Abierto',
        },
      ],
      raw: {
        'ID Original': '4843',
        'Tecnico Asignado': 'SOPORTE 1',
        'Técnico en Atención': 'Gustavo Dzib Palacios',
        Estado: 'Abierto',
      },
    },
    personasDetectadasEsperadas: ['Gustavo Dzib Palacios'],
    responsablesEsperados: ['Gustavo Dzib Palacios'],
  },

  // 21. Técnico en Atención - Ernesto Adán Pérez Hernández
  {
    id: 21,
    nombre: 'Técnico en Atención - Ernesto Adán Pérez Hernández',
    descripcion: 'Ticket con Técnico en Atención = "Ernesto Adán Pérez Hernández" en reporte de Soporte.',
    ticket: {
      id: '4844',
      estado: 'Abierto',
      fechaCreacion: '2026-08-10 14:00:00',
      tecnicoAsignado: 'SOPORTE 1',
      tecnicoEnAtencion: 'Ernesto Adan Pérez Hernández',
      tecnicoAtencion: 'Ernesto Adan Pérez Hernández',
      categoria: 'HARDWARE',
      subcategoria: 'Impresoras',
      articulo: 'Mantenimiento Preventivo',
      tipoSolicitud: 'Incidencia',
      solicitante: 'Dirección General de Administración',
      conversaciones: [],
      rawRows: [
        {
          'ID Original': '4844',
          'Tecnico Asignado': 'SOPORTE 1',
          'Técnico en Atención': 'Ernesto Adán Pérez Hernández',
          Estado: 'Abierto',
        },
      ],
      raw: {
        'ID Original': '4844',
        'Tecnico Asignado': 'SOPORTE 1',
        'Técnico en Atención': 'Ernesto Adán Pérez Hernández',
        Estado: 'Abierto',
      },
    },
    personasDetectadasEsperadas: ['Ernesto Adan Pérez Hernández'],
    responsablesEsperados: ['Ernesto Adan Pérez Hernández'],
  },

  // 22. Técnico en Atención - Dora Mercedes (INTERINSTITUCIONAL 1)
  {
    id: 22,
    nombre: 'Técnico en Atención - Dora Mercedes (INTERINSTITUCIONAL 1)',
    descripcion: 'Ticket con Técnico Asignado = "INTERINSTITUCIONAL 1" y Técnico en Atención = "Dora Mercedes Montaño".',
    ticket: {
      id: '4845',
      estado: 'Abierto',
      fechaCreacion: '2026-08-10 15:00:00',
      tecnicoAsignado: 'INTERINSTITUCIONAL 1',
      tecnicoEnAtencion: 'Dora Mercedes Montaño',
      tecnicoAtencion: 'Dora Mercedes Montaño',
      categoria: 'INTERINSTITUCIONAL',
      subcategoria: 'Plataforma Cursos',
      articulo: 'Habilitación de Claves',
      tipoSolicitud: 'CAPACITACIÓN',
      solicitante: 'Alcaldía Cuauhtémoc',
      conversaciones: [],
      rawRows: [
        {
          'ID Original': '4845',
          'Tecnico Asignado': 'INTERINSTITUCIONAL 1',
          'Técnico en Atención': 'Dora Mercedes Montaño',
          Estado: 'Abierto',
        },
      ],
      raw: {
        'ID Original': '4845',
        'Tecnico Asignado': 'INTERINSTITUCIONAL 1',
        'Técnico en Atención': 'Dora Mercedes Montaño',
        Estado: 'Abierto',
      },
    },
    personasDetectadasEsperadas: ['Dora Mercedes Montaño'],
    responsablesEsperados: ['Dora Mercedes Montaño'],
  },
];

/**
 * Ejecuta los 15 casos de prueba unitarios contra el motor de atribución operativa
 */
export function ejecutarPruebasAtribucionOperativa(): ResultadoPruebaUnitario[] {
  return CASOS_PRUEBA_OBLIGATORIOS.map((caso) => {
    const res = determinarAtribucionOperativa(caso.ticket);
    const nombresObtenidos = res.nombresResponsables;

    // Verificar si los conjuntos de responsables coinciden (orden no relevante)
    const esperadosNorm = caso.responsablesEsperados.map((n) => n.toLowerCase().trim()).sort();
    const obtenidosNorm = nombresObtenidos.map((n) => n.toLowerCase().trim()).sort();

    const coincideLongitud = esperadosNorm.length === obtenidosNorm.length;
    const coincidenTodos = coincideLongitud && esperadosNorm.every((n, i) => n === obtenidosNorm[i]);

    // Personas detectadas en evidencia
    const personasDetectadas = res.participaciones.map((p) => p.tecnicoNombre);
    if (personasDetectadas.length === 0 && res.nombresResponsables.length > 0) {
      personasDetectadas.push(...res.nombresResponsables);
    }

    return {
      id: caso.id,
      nombre: caso.nombre,
      ticketId: caso.ticket.id,
      personasDetectadas: Array.from(new Set(personasDetectadas)),
      responsablesEsperados: caso.responsablesEsperados,
      responsablesObtenidos: nombresObtenidos,
      explicacionReglas: res.explicacionReglas,
      esCorrecto: coincidenTodos,
    };
  });
}

export { ejecutarPruebasFormatosServiceDesk } from './serviceDeskFormatDetector';
export type { ReportePruebaFormato, ResultadoDeteccionFormato } from './serviceDeskFormatDetector';
