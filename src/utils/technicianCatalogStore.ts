import { useEffect, useState } from 'react';
import { TecnicoRegistro } from '../types';

const STORAGE_KEY = 'scg_catalogo_tecnicos_v2';
const EVENT_NAME = 'scg_catalogo_tecnicos_changed';

// Cache en memoria para rendimiento ultra-rápido
let cachedCatalogoMemoria: TecnicoRegistro[] | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener(EVENT_NAME, () => {
    cachedCatalogoMemoria = null;
  });
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      cachedCatalogoMemoria = null;
    }
  });
}

export const TECNICOS_INICIALES_DEFAULT: TecnicoRegistro[] = [
  // Área Soporte
  {
    id: 'tec-sop-1',
    nombre: 'Francisco Bernal Reynoso',
    correoPrincipal: 'fbernal@scg.cdmx.gob.mx',
    correosAlternativos: [],
    alias: ['francisco bernal reynoso', 'fbernal', 'francisco bernal'],
    area: 'Soporte',
    activo: true,
    filtroDesarrollo: false,
  },
  {
    id: 'tec-sop-2',
    nombre: 'José Moncayo Sánchez',
    correoPrincipal: 'jmoncayo@scg.cdmx.gob.mx',
    correosAlternativos: [],
    alias: ['jose moncayo', 'jmoncayo', 'jose jose', 'jose moncayo sanchez'],
    area: 'Soporte',
    activo: true,
    filtroDesarrollo: false,
  },
  {
    id: 'tec-sop-3',
    nombre: 'Ernesto Adan Pérez Hernández',
    correoPrincipal: 'eperezh@scg.cdmx.gob.mx',
    correosAlternativos: [],
    alias: ['ernesto adan perez hernandez', 'eperezh', 'ernesto perez'],
    area: 'Soporte',
    activo: true,
    filtroDesarrollo: false,
  },
  {
    id: 'tec-sop-4',
    nombre: 'Jesús Emmanuel Hernández Ramírez',
    correoPrincipal: 'jhernandezr@scg.cdmx.gob.mx',
    correosAlternativos: [],
    alias: ['jesus emmanuel hernandez', 'jhernandezr', 'jesus emmanuel hernandez ramirez'],
    area: 'Soporte',
    activo: true,
    filtroDesarrollo: false,
  },
  {
    id: 'tec-sop-5',
    nombre: 'Yoshio Giovanni Velazquez Servin',
    correoPrincipal: 'yvelazquez@scg.cdmx.gob.mx',
    correosAlternativos: ['yvelazquezs@scg.cdmx.gob.mx'],
    alias: ['yoshio giovanni velazquez servin', 'yvelazquez', 'yvelazquezs', 'yoshio giovanni', 'yoshio servin'],
    area: 'Soporte',
    activo: true,
    filtroDesarrollo: false,
  },
  {
    id: 'tec-sop-6',
    nombre: 'Gustavo Dzib Palacios',
    correoPrincipal: 'gdzibp@scg.cdmx.gob.mx',
    correosAlternativos: [],
    alias: ['gustavo dzib palacios', 'gdzibp', 'gustavo dzib'],
    area: 'Soporte',
    activo: true,
    filtroDesarrollo: true,
  },

  // Área Informática
  {
    id: 'tec-inf-1',
    nombre: 'Jhonn Piña Miranda',
    correoPrincipal: 'jpinam@scg.cdmx.gob.mx',
    correosAlternativos: [],
    alias: ['jpinam', 'jhonn pina', 'jhonn pina miranda'],
    area: 'Informática',
    activo: true,
  },
  {
    id: 'tec-inf-2',
    nombre: 'Tania Samantha Tirado Ross',
    correoPrincipal: 'tstirador@scg.cdmx.gob.mx',
    correosAlternativos: [],
    alias: ['tstirador', 'tania tirado', 'tania samantha tirado ross'],
    area: 'Informática',
    activo: true,
  },
  {
    id: 'tec-inf-3',
    nombre: 'Evelyn Rocio Vanzzini Guerrero',
    correoPrincipal: 'evanzzini@scg.cdmx.gob.mx',
    correosAlternativos: [],
    alias: ['evanzzini', 'evelyn vanzzini', 'evelyn rocio vanzzini guerrero'],
    area: 'Informática',
    activo: true,
  },
  {
    id: 'tec-inf-4',
    nombre: 'Jaqueline Alejandra Zamora Tenorio',
    correoPrincipal: 'jazamorat@scg.cdmx.gob.mx',
    correosAlternativos: [],
    alias: ['jazamorat', 'jaqueline zamora', 'jaqueline alejandra zamora tenorio'],
    area: 'Informática',
    activo: true,
  },
  {
    id: 'tec-inf-5',
    nombre: 'Rafael Muñoz Cerrillo',
    correoPrincipal: 'rmunoz@scg.cdmx.gob.mx',
    correosAlternativos: [],
    alias: ['rmunoz', 'rafael munoz', 'rafael munoz cerrillo'],
    area: 'Informática',
    activo: true,
  },
  {
    id: 'tec-inf-6',
    nombre: 'Adelaida Valenzuela',
    correoPrincipal: 'avalenzuela@scg.cdmx.gob.mx',
    correosAlternativos: ['avalenzuelab@scg.cdmx.gob.mx'],
    alias: ['avalenzuela', 'avalenzuelab', 'adelaida valenzuela', 'adelaida valenzuela b'],
    area: 'Informática',
    activo: true,
  },
  {
    id: 'tec-inf-7',
    nombre: 'Marco Eric Valle Juarez',
    correoPrincipal: 'dmg.consultor1@scg.cdmx.gob.mx',
    correosAlternativos: [],
    alias: ['dmg.consultor1', 'marco valle', 'marco eric valle juarez'],
    area: 'Informática',
    activo: true,
  },
  {
    id: 'tec-inf-8',
    nombre: 'Angelica Janette Torres Plata',
    correoPrincipal: 'dmg.consultor2@scg.cdmx.gob.mx',
    correosAlternativos: [],
    alias: ['dmg.consultor2', 'angelica torres', 'angelica janette torres plata'],
    area: 'Informática',
    activo: true,
  },

  // Área Interinstitucional (Subdirección Interinstitucional)
  {
    id: 'tec-int-1',
    nombre: 'Dora Mercedes Montaño',
    correoPrincipal: 'dmontano@scg.cdmx.gob.mx',
    correosAlternativos: [
      'dmontanov@scg.cdmx.gob.mx',
      'sub.interi@scg.cdmx.gob.mx',
      'dora.montano@scg.cdmx.gob.mx',
      'interinstitucional@scg.cdmx.gob.mx',
    ],
    alias: ['dora mercedes montano', 'dora montano', 'dora mercedes', 'dmontano', 'dmontanov', 'sub.interi'],
    area: 'Interinstitucional',
    activo: true,
  },
  {
    id: 'tec-int-2',
    nombre: 'Mesa de Capacitación e Interinstitucional',
    correoPrincipal: 'interinstitucional@scg.cdmx.gob.mx',
    correosAlternativos: ['capacitacion@scg.cdmx.gob.mx', 'plataforma.capacitacion@scg.cdmx.gob.mx'],
    alias: ['interinstitucional', 'capacitacion', 'plataforma capacitacion', 'subdireccion interinstitucional'],
    area: 'Interinstitucional',
    activo: true,
  },
  {
    id: 'tec-int-3',
    nombre: 'Administrador Plataforma Capacitación',
    correoPrincipal: 'admin.capacitacion@scg.cdmx.gob.mx',
    correosAlternativos: ['soporte.capacitacion@scg.cdmx.gob.mx'],
    alias: ['admin capacitacion', 'soporte capacitacion', 'capacitacion scg'],
    area: 'Interinstitucional',
    activo: true,
  },
];

/**
 * Obtiene la lista completa de técnicos desde localStorage o del seed por defecto.
 * Aplica migración automática para convertir áreas históricas 'Capacitación' en 'Interinstitucional'.
 */
export function obtenerCatalogoTecnicos(): TecnicoRegistro[] {
  if (cachedCatalogoMemoria) {
    return cachedCatalogoMemoria;
  }

  if (typeof window === 'undefined') {
    return TECNICOS_INICIALES_DEFAULT;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Guardar el catálogo inicial en storage para futuras ediciones
      localStorage.setItem(STORAGE_KEY, JSON.stringify(TECNICOS_INICIALES_DEFAULT));
      cachedCatalogoMemoria = TECNICOS_INICIALES_DEFAULT;
      return TECNICOS_INICIALES_DEFAULT;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      let modificado = false;
      const migrado = parsed.map((t: TecnicoRegistro) => {
        let actual = { ...t };
        if (
          actual.area &&
          (actual.area.toLowerCase().trim() === 'capacitación' ||
            actual.area.toLowerCase().trim() === 'capacitacion')
        ) {
          modificado = true;
          actual.area = 'Interinstitucional';
        }

        // Buscar valores iniciales para sincronizar correos/alias nuevos
        const def = TECNICOS_INICIALES_DEFAULT.find(
          (d) => d.id === actual.id || d.nombre.toLowerCase().trim() === actual.nombre.toLowerCase().trim()
        );
        if (def) {
          const correosExistentes = new Set((actual.correosAlternativos || []).map((e) => e.toLowerCase().trim()));
          (def.correosAlternativos || []).forEach((e) => {
            if (!correosExistentes.has(e.toLowerCase().trim())) {
              actual.correosAlternativos = [...(actual.correosAlternativos || []), e];
              modificado = true;
            }
          });

          const aliasExistentes = new Set((actual.alias || []).map((a) => a.toLowerCase().trim()));
          (def.alias || []).forEach((a) => {
            if (!aliasExistentes.has(a.toLowerCase().trim())) {
              actual.alias = [...(actual.alias || []), a];
              modificado = true;
            }
          });
        }

        return actual;
      });

      // Asegurar que Dora esté presente en el catálogo
      const tieneDora = migrado.some((t: TecnicoRegistro) =>
        t.nombre.toLowerCase().includes('dora mercedes') || t.nombre.toLowerCase().includes('dora montano')
      );
      if (!tieneDora) {
        migrado.push(TECNICOS_INICIALES_DEFAULT[14]); // Dora Mercedes Montaño
        modificado = true;
      }

      if (modificado) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrado));
      }
      cachedCatalogoMemoria = migrado;
      return migrado;
    }
  } catch (error) {
    console.error('Error al leer catálogo de técnicos de localStorage:', error);
  }

  cachedCatalogoMemoria = TECNICOS_INICIALES_DEFAULT;
  return TECNICOS_INICIALES_DEFAULT;
}

/**
 * Guarda el catálogo completo de técnicos en localStorage y emite el evento de sincronización.
 */
export function guardarCatalogoTecnicos(tecnicos: TecnicoRegistro[]): void {
  cachedCatalogoMemoria = tecnicos;
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tecnicos));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch (error) {
    console.error('Error al guardar catálogo de técnicos en localStorage:', error);
  }
}

/**
 * Agrega o actualiza un técnico en el catálogo.
 */
export function guardarTecnico(tecnico: TecnicoRegistro): void {
  const lista = obtenerCatalogoTecnicos();
  const index = lista.findIndex((t) => t.id === tecnico.id || t.nombre.toLowerCase().trim() === tecnico.nombre.toLowerCase().trim());

  let nuevaLista: TecnicoRegistro[];
  if (index >= 0) {
    nuevaLista = [...lista];
    nuevaLista[index] = { ...nuevaLista[index], ...tecnico };
  } else {
    nuevaLista = [...lista, tecnico];
  }

  guardarCatalogoTecnicos(nuevaLista);
}

/**
 * Cambia el estado activo/inactivo de un técnico por su ID o nombre.
 */
export function toggleEstadoTecnico(id: string): void {
  const lista = obtenerCatalogoTecnicos();
  const index = lista.findIndex((t) => t.id === id);
  if (index >= 0) {
    const nuevaLista = [...lista];
    nuevaLista[index] = {
      ...nuevaLista[index],
      activo: !nuevaLista[index].activo,
    };
    guardarCatalogoTecnicos(nuevaLista);
  }
}

/**
 * Elimina un técnico del catálogo.
 */
export function eliminarTecnico(id: string): void {
  const lista = obtenerCatalogoTecnicos();
  const nuevaLista = lista.filter((t) => t.id !== id);
  guardarCatalogoTecnicos(nuevaLista);
}

/**
 * Restablece el catálogo al listado predeterminado de fábrica.
 */
export function restablecerCatalogoDefault(): TecnicoRegistro[] {
  guardarCatalogoTecnicos(TECNICOS_INICIALES_DEFAULT);
  return TECNICOS_INICIALES_DEFAULT;
}

/**
 * Hook de React para suscribirse a cambios en el catálogo de técnicos en tiempo real.
 */
export function useTecnicosCatalogo(): {
  tecnicos: TecnicoRegistro[];
  tecnicosActivos: TecnicoRegistro[];
  tecnicosSoporteActivos: TecnicoRegistro[];
  tecnicosInformaticaActivos: TecnicoRegistro[];
  tecnicosInterinstitucionalActivos: TecnicoRegistro[];
  tecnicosCapacitacionActivos: TecnicoRegistro[]; // Alias de compatibilidad
  recargar: () => void;
} {
  const [tecnicos, setTecnicos] = useState<TecnicoRegistro[]>(() => obtenerCatalogoTecnicos());

  useEffect(() => {
    const handler = () => {
      setTecnicos(obtenerCatalogoTecnicos());
    };

    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener('storage', handler);

    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const tecnicosActivos = tecnicos.filter((t) => t.activo);
  
  // Filtros estrictos por área (evitan que técnicos de una se mezclen con otra)
  const tecnicosSoporteActivos = tecnicos.filter(
    (t) => t.activo && t.area.toLowerCase().trim() === 'soporte'
  );
  
  const tecnicosInformaticaActivos = tecnicos.filter(
    (t) =>
      t.activo &&
      (t.area.toLowerCase().trim() === 'informática' ||
        t.area.toLowerCase().trim() === 'informatica' ||
        t.area.toLowerCase().includes('desarrollo') ||
        t.area.toLowerCase().includes('sistemas'))
  );

  const tecnicosInterinstitucionalActivos = tecnicos.filter(
    (t) =>
      t.activo &&
      (t.area.toLowerCase().trim() === 'interinstitucional' ||
        t.area.toLowerCase().includes('interinstitucional'))
  );

  return {
    tecnicos,
    tecnicosActivos,
    tecnicosSoporteActivos,
    tecnicosInformaticaActivos,
    tecnicosInterinstitucionalActivos,
    tecnicosCapacitacionActivos: tecnicosInterinstitucionalActivos,
    recargar: () => setTecnicos(obtenerCatalogoTecnicos()),
  };
}
