import { TecnicoSCGConfig, TecnicoInformaticaConfig } from '../types';

export const TECNICOS_SCG: Record<string, TecnicoSCGConfig> = {
  'Francisco Bernal Reynoso': {
    nombre: 'Francisco Bernal Reynoso',
    correoExacto: 'fbernal@scg.cdmx.gob.mx',
    aliasParticipante: ['francisco bernal reynoso', 'fbernal'],
    filtroDesarrollo: false,
  },
  'José Moncayo Sánchez': {
    nombre: 'José Moncayo Sánchez',
    correoExacto: 'jmoncayo@scg.cdmx.gob.mx',
    aliasParticipante: ['jose moncayo', 'jmoncayo', 'jose jose'],
    filtroDesarrollo: false,
  },
  'Ernesto Adan Pérez Hernández': {
    nombre: 'Ernesto Adan Pérez Hernández',
    correoExacto: 'eperezh@scg.cdmx.gob.mx',
    aliasParticipante: ['ernesto adan perez hernandez', 'eperezh', 'ernesto perez'],
    filtroDesarrollo: false,
  },
  'Jesús Emmanuel Hernández Ramírez': {
    nombre: 'Jesús Emmanuel Hernández Ramírez',
    correoExacto: 'jhernandezr@scg.cdmx.gob.mx',
    aliasParticipante: ['jesus emmanuel hernandez', 'jhernandezr'],
    filtroDesarrollo: false,
  },
  'Yoshio Giovanni Velazquez Servin': {
    nombre: 'Yoshio Giovanni Velazquez Servin',
    correoExacto: 'yvelazquez@scg.cdmx.gob.mx',
    aliasParticipante: ['yoshio giovanni velazquez servin', 'yvelazquez', 'yoshio giovanni', 'yoshio servin'],
    filtroDesarrollo: false,
  },
  'Gustavo Dzib Palacios': {
    nombre: 'Gustavo Dzib Palacios',
    correoExacto: 'gdzibp@scg.cdmx.gob.mx',
    aliasParticipante: ['gustavo dzib palacios', 'gdzibp', 'gustavo dzib'],
    filtroDesarrollo: true,
  },
};

export const TECNICOS_INFORMATICA: Record<string, TecnicoInformaticaConfig> = {
  'Jhonn Piña Miranda': {
    nombre: 'Jhonn Piña Miranda',
    correo: 'jpinam@scg.cdmx.gob.mx',
    prefijo: 'jpinam',
  },
  'Tania Samantha Tirado Ross': {
    nombre: 'Tania Samantha Tirado Ross',
    correo: 'tstirador@scg.cdmx.gob.mx',
    prefijo: 'tstirador',
  },
  'Evelyn Rocio Vanzzini Guerrero': {
    nombre: 'Evelyn Rocio Vanzzini Guerrero',
    correo: 'evanzzini@scg.cdmx.gob.mx',
    prefijo: 'evanzzini',
  },
  'Jaqueline Alejandra Zamora Tenorio': {
    nombre: 'Jaqueline Alejandra Zamora Tenorio',
    correo: 'jazamorat@scg.cdmx.gob.mx',
    prefijo: 'jazamorat',
  },
  'Rafael Muñoz Cerrillo': {
    nombre: 'Rafael Muñoz Cerrillo',
    correo: 'rmunoz@scg.cdmx.gob.mx',
    prefijo: 'rmunoz',
  },
  'Adelaida Valenzuela': {
    nombre: 'Adelaida Valenzuela',
    correo: 'avalenzuela@scg.cdmx.gob.mx',
    prefijo: 'avalenzuela',
  },
  'Marco Eric Valle Juarez': {
    nombre: 'Marco Eric Valle Juarez',
    correo: 'dmg.consultor1@scg.cdmx.gob.mx',
    prefijo: 'dmg.consultor1',
  },
  'Angelica Janette Torres Plata': {
    nombre: 'Angelica Janette Torres Plata',
    correo: 'dmg.consultor2@scg.cdmx.gob.mx',
    prefijo: 'dmg.consultor2',
  },
};

export const BUZONES_PERMITIDOS = [
  'SOPORTE 1',
  'SOPORTE TECNICO',
  'SOPORTE TÉCNICO',
  'DESARROLLO',
  'DESARROLLO 1',
  'INTERINSTITUCIONAL',
  'INTERINSTITUCIONAL 1',
  'MESA DE AYUDA',
];

export const TECNICOS_SOPORTE_PROHIBIDOS_SISTEMAS = [
  'JESUS',
  'ERNESTO',
  'FRANCISCO',
  'MONCAYO',
  'GIOVANNI',
  'EVELYN',
  'VANZZINI',
];
