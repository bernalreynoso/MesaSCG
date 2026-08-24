import React, { useState, useMemo } from 'react';
import {
  Laptop,
  Mail,
  Filter,
  PieChart as PieIcon,
  BarChart2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileText,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';
import { Ticket } from '../types';
import { useTecnicosCatalogo } from '../utils/technicianCatalogStore';
import { EmptyState } from './EmptyState';
import { obtenerPerfilTecnicoEnTicket, normalizarTexto } from '../utils/technicianDetector';
import { determinarAtribucionOperativa } from '../utils/operationalAttributionEngine';
import {
  clasificarTipoTrabajo,
  esTicketDictamen,
  esTicketBaja,
} from '../utils/workTypeClassifier';
import {
  evaluarEstado,
  esTicketAbiertoOperativo,
  esTicketCerrado,
  esTicketCancelado,
  esTicketEnEspera,
} from '../utils/statusClassifier';

interface DashboardInformaticaProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onLoadDemoData?: () => void;
}

type NivelParticipacionFiltro =
  | 'FUERTE'
  | 'RESPUESTA'
  | 'SOLO_DESTINATARIO'
  | 'SOLO_CC'
  | 'TODOS_INCLUYENDO_CC';

type TipoTrabajoFiltro =
  | 'TODOS'
  | 'DICTAMEN'
  | 'BAJA'
  | 'AMBOS'
  | 'DICTAMEN_O_BAJA'
  | 'ESTANDAR';

function extraerPeriodo(fechaStr?: string): string {
  if (!fechaStr) return 'Sin Fecha';
  const str = String(fechaStr).trim();
  const matchIso = str.match(/^(\d{4})[-/](\d{1,2})/);
  if (matchIso) {
    return `${matchIso[1]}-${matchIso[2].padStart(2, '0')}`;
  }
  const matchLatam = str.match(/^\d{1,2}[-/](\d{1,2})[-/](\d{4})/);
  if (matchLatam) {
    return `${matchLatam[2]}-${matchLatam[1].padStart(2, '0')}`;
  }
  return str.substring(0, 7) || 'Sin Fecha';
}

export const DashboardInformatica: React.FC<DashboardInformaticaProps> = ({
  tickets,
  onSelectTicket,
  onLoadDemoData,
}) => {
  const { tecnicosInformaticaActivos, tecnicosActivos } = useTecnicosCatalogo();

  // Lista de técnicos activos disponibles
  const tecnicosDisponibles = useMemo(() => {
    if (tecnicosInformaticaActivos.length > 0) {
      return tecnicosInformaticaActivos;
    }
    return tecnicosActivos;
  }, [tecnicosInformaticaActivos, tecnicosActivos]);

  const [selectedTechName, setSelectedTechName] = useState<string>(() => {
    return tecnicosDisponibles[0]?.nombre || 'Jhonn Piña Miranda';
  });

  const techInfo = useMemo(() => {
    const found = tecnicosDisponibles.find((t) => t.nombre === selectedTechName);
    if (found) return found;
    return (
      tecnicosDisponibles[0] || {
        id: 'default-inf',
        nombre: selectedTechName || 'Jhonn Piña Miranda',
        correoPrincipal: 'jpinam@scg.cdmx.gob.mx',
        area: 'Informática',
        activo: true,
      }
    );
  }, [tecnicosDisponibles, selectedTechName]);

  // Estados de Filtros Combinables
  const [participacionSel, setParticipacionSel] = useState<NivelParticipacionFiltro>('FUERTE');
  const [estadoSel, setEstadoSel] = useState<string>('TODOS');
  const [tipoTrabajoSel, setTipoTrabajoSel] = useState<TipoTrabajoFiltro>('TODOS');
  const [periodoSel, setPeriodoSel] = useState<string>('TODOS');
  const [catSel, setCatSel] = useState<string>('TODAS');
  const [artSel, setArtSel] = useState<string>('TODAS');
  const [showPctTable, setShowPctTable] = useState<boolean>(false);

  // 1. Evaluación centralizada de todos los tickets para el técnico seleccionado
  const ticketsEvaluadosTecnico = useMemo(() => {
    return tickets.map((t) => {
      const atribucion = determinarAtribucionOperativa(t);
      const techNorm = normalizarTexto(techInfo.nombre);
      const esResponsable = atribucion.nombresResponsables.some((n) => {
        const norm = normalizarTexto(n);
        return norm === techNorm || norm.includes(techNorm) || techNorm.includes(norm);
      });

      const perfil = obtenerPerfilTecnicoEnTicket(t, techInfo.nombre);
      const clasificacion = clasificarTipoTrabajo(t);
      const estadoInfo = evaluarEstado(t.estado);
      const periodo = extraerPeriodo(t.fechaCreacion);

      const tieneEvidenciaFuerte = perfil ? perfil.tieneEvidenciaFuerte : false;
      const esRemitente = perfil ? perfil.esRemitente : false;
      const esDestinatarioDirecto = perfil ? perfil.esDestinatarioDirecto : false;
      const esSoloDestinatario = esDestinatarioDirecto && !esRemitente;
      const esSoloCC = perfil ? (perfil.esCopiadoSoloCC && !perfil.tieneEvidenciaFuerte) : false;
      const tieneCualquierInteraccion = perfil ? (perfil.evidencias.length > 0) : false;

      return {
        ticket: t,
        atribucion,
        esResponsable,
        perfil,
        clasificacion,
        estadoInfo,
        periodo,
        tieneEvidenciaFuerte,
        esRemitente,
        esDestinatarioDirecto,
        esSoloDestinatario,
        esSoloCC,
        tieneCualquierInteraccion,
      };
    });
  }, [tickets, techInfo.nombre]);

  const ticketsBaseTecnico = useMemo(() => {
    return ticketsEvaluadosTecnico.filter((item) => item.esResponsable || item.tieneCualquierInteraccion);
  }, [ticketsEvaluadosTecnico]);

  // 2. Cálculo de métricas KPI canónicas para el técnico
  const metricasKPI = useMemo(() => {
    let partFuerte = 0;
    let soloDestinatario = 0;
    let soloCC = 0;
    let pendientes = 0;
    let cerrados = 0;
    let dictamenes = 0;
    let bajas = 0;

    ticketsEvaluadosTecnico.forEach((item) => {
      if (item.esResponsable || item.tieneEvidenciaFuerte) {
        partFuerte++;
        if (item.esSoloDestinatario) soloDestinatario++;
        if (item.estadoInfo.esAbiertoOperativo) pendientes++;
        if (item.estadoInfo.esCerrado) cerrados++;
        if (item.clasificacion.esDictamenNoUtilidad) dictamenes++;
        if (item.clasificacion.esBajaEquipo) bajas++;
      } else if (item.esSoloCC) {
        soloCC++;
      }
    });

    const porcentajeCumplimiento =
      partFuerte > 0 ? Math.round((cerrados / partFuerte) * 100) : 0;

    return {
      partFuerte,
      soloDestinatario,
      soloCC,
      pendientes,
      cerrados,
      dictamenes,
      bajas,
      porcentajeCumplimiento,
    };
  }, [ticketsEvaluadosTecnico]);

  // 3. Filtrado Combinado de Tickets
  const ticketsFiltrados = useMemo(() => {
    return ticketsEvaluadosTecnico.filter((item) => {
      // 1. Filtro por Nivel de Participación / Atribución Operativa
      if (participacionSel === 'FUERTE' && !item.esResponsable && !item.tieneEvidenciaFuerte) return false;
      if (participacionSel === 'RESPUESTA' && !item.esRemitente) return false;
      if (participacionSel === 'SOLO_DESTINATARIO' && !item.esSoloDestinatario) return false;
      if (participacionSel === 'SOLO_CC' && !item.esSoloCC) return false;
      if (participacionSel === 'TODOS_INCLUYENDO_CC' && !item.esResponsable && !item.tieneCualquierInteraccion) return false;

      // 2. Filtro por Estado Canónico
      if (estadoSel !== 'TODOS') {
        if (estadoSel === 'ABIERTOS / PENDIENTES' && !item.estadoInfo.esAbiertoOperativo) return false;
        if (estadoSel === 'CERRADOS / RESUELTOS' && !item.estadoInfo.esCerrado) return false;
        if (estadoSel === 'EN_ESPERA' && !item.estadoInfo.esEnEspera) return false;
        if (estadoSel === 'CANCELADOS' && !item.estadoInfo.esCancelado) return false;
        if (
          estadoSel !== 'ABIERTOS / PENDIENTES' &&
          estadoSel !== 'CERRADOS / RESUELTOS' &&
          estadoSel !== 'EN_ESPERA' &&
          estadoSel !== 'CANCELADOS'
        ) {
          if ((item.ticket.estado || '').trim().toLowerCase() !== estadoSel.trim().toLowerCase()) {
            return false;
          }
        }
      }

      // 3. Filtro por Tipo de Trabajo
      if (tipoTrabajoSel !== 'TODOS') {
        if (tipoTrabajoSel === 'DICTAMEN' && !item.clasificacion.esDictamenNoUtilidad) return false;
        if (tipoTrabajoSel === 'BAJA' && !item.clasificacion.esBajaEquipo) return false;
        if (tipoTrabajoSel === 'AMBOS' && !item.clasificacion.esAmbos) return false;
        if (tipoTrabajoSel === 'DICTAMEN_O_BAJA' && !item.clasificacion.esDictamenNoUtilidad && !item.clasificacion.esBajaEquipo) return false;
        if (tipoTrabajoSel === 'ESTANDAR' && (item.clasificacion.esDictamenNoUtilidad || item.clasificacion.esBajaEquipo)) return false;
      }

      // 4. Filtro por Periodo
      if (periodoSel !== 'TODOS' && item.periodo !== periodoSel) {
        return false;
      }

      // 5. Filtros de Catálogo
      if (catSel !== 'TODAS' && item.ticket.categoria !== catSel) return false;
      if (artSel !== 'TODAS' && item.ticket.articulo !== artSel) return false;

      return true;
    });
  }, [
    ticketsEvaluadosTecnico,
    participacionSel,
    estadoSel,
    tipoTrabajoSel,
    periodoSel,
    catSel,
    artSel,
  ]);

  const listaPeriodos = useMemo(() => {
    const setP = new Set<string>();
    ticketsBaseTecnico.forEach((t) => {
      if (t.periodo && t.periodo !== 'Sin Fecha') {
        setP.add(t.periodo);
      }
    });
    return ['TODOS', ...Array.from(setP).sort().reverse()];
  }, [ticketsBaseTecnico]);

  const listaCategorias = useMemo(() => {
    const setC = new Set(ticketsBaseTecnico.map((t) => t.ticket.categoria).filter(Boolean));
    return ['TODAS', ...Array.from(setC).sort()];
  }, [ticketsBaseTecnico]);

  const listaArticulos = useMemo(() => {
    const filtered = catSel === 'TODAS'
      ? ticketsBaseTecnico
      : ticketsBaseTecnico.filter((t) => t.ticket.categoria === catSel);
    const setA = new Set(filtered.map((t) => t.ticket.articulo).filter(Boolean));
    return ['TODAS', ...Array.from(setA).sort()];
  }, [ticketsBaseTecnico, catSel]);

  const listaEstados = useMemo(() => {
    const setE = new Set<string>();
    ticketsBaseTecnico.forEach((t) => {
      if (t.ticket.estado && t.ticket.estado.trim()) {
        setE.add(t.ticket.estado.trim());
      }
    });
    return ['TODOS', 'ABIERTOS / PENDIENTES', 'CERRADOS / RESUELTOS', 'EN_ESPERA', 'CANCELADOS', ...Array.from(setE).sort()];
  }, [ticketsBaseTecnico]);

  // Pie Chart Data
  const categoryChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    ticketsFiltrados.forEach((item) => {
      const cat = item.ticket.categoria || 'Sin Categoría';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [ticketsFiltrados]);

  // Article Status Chart Data
  const articleStatusChartData = useMemo(() => {
    const map: Record<string, { articulo: string; Pendientes: number; Cerrados: number }> = {};

    ticketsFiltrados.forEach((item) => {
      const art = item.ticket.articulo || 'Sin Artículo';
      if (!map[art]) {
        map[art] = {
          articulo: art.length > 25 ? `${art.substring(0, 22)}...` : art,
          Pendientes: 0,
          Cerrados: 0,
        };
      }
      if (item.estadoInfo.esAbiertoOperativo) {
        map[art].Pendientes += 1;
      } else if (item.estadoInfo.esCerrado) {
        map[art].Cerrados += 1;
      }
    });

    return Object.values(map);
  }, [ticketsFiltrados]);

  const COLORS = ['#4f46e5', '#0284c7', '#7c3aed', '#d97706', '#db2777'];

  const resetFiltros = () => {
    setParticipacionSel('FUERTE');
    setEstadoSel('TODOS');
    setTipoTrabajoSel('TODOS');
    setPeriodoSel('TODOS');
    setCatSel('TODAS');
    setArtSel('TODAS');
  };

  if (tickets.length === 0) {
    return (
      <EmptyState
        title="No hay tickets en el Control de Informática"
        description="Por favor, carga un reporte Excel de ServiceDesk Plus para analizar el rendimiento del área de desarrollo e informática."
        onLoadDemoData={onLoadDemoData}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Title Bento Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 mt-0.5 shrink-0">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Control de Carga por Técnico de Informática
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Información precisa procesada por los motores de Participación, Estados Canónicos y Clasificación de Dictámenes/Bajas.
            </p>
          </div>
        </div>
      </div>

      {/* Technician Selector Header Bento Card */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="w-full md:w-80">
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              1. Selecciona el Desarrollador / Técnico:
            </label>
            <div className="relative">
              <Laptop className="w-4 h-4 text-indigo-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                value={techInfo.nombre}
                onChange={(e) => {
                  setSelectedTechName(e.target.value);
                  resetFiltros();
                }}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
              >
                {tecnicosDisponibles.map((tec) => (
                  <option key={tec.id} value={tec.nombre}>
                    {tec.nombre} ({tec.area})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs bg-indigo-50/80 p-3.5 rounded-xl border border-indigo-100 flex flex-wrap items-center gap-2 text-indigo-900 font-medium">
            <span>Buzón oficial:</span>
            <code className="text-indigo-700 font-mono font-extrabold bg-white px-2.5 py-0.5 rounded-md border border-indigo-200">
              {techInfo.correoPrincipal}
            </code>
            {techInfo.correosAlternativos && techInfo.correosAlternativos.length > 0 && (
              <span className="text-[10px] text-slate-500">
                (+{techInfo.correosAlternativos.length} alias/correos alternos)
              </span>
            )}
          </div>
        </div>

        {/* KPI Bento Cards de Métricas del Técnico */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-1">
          {/* Participación Fuerte */}
          <div
            onClick={() => {
              setParticipacionSel('FUERTE');
              setEstadoSel('TODOS');
              setTipoTrabajoSel('TODOS');
            }}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              participacionSel === 'FUERTE' && estadoSel === 'TODOS' && tipoTrabajoSel === 'TODOS'
                ? 'bg-indigo-50/90 border-indigo-400 shadow-xs'
                : 'bg-slate-50 border-slate-200/80 hover:bg-indigo-50/40'
            }`}
          >
            <span className="text-[10px] font-bold text-indigo-900 uppercase block">Part. Fuerte</span>
            <span className="text-2xl font-extrabold text-indigo-950 mt-0.5 block">{metricasKPI.partFuerte}</span>
            <span className="text-[9px] text-indigo-700 font-semibold">Atendió / Recibió</span>
          </div>

          {/* Solo Recibió Solicitud */}
          <div
            onClick={() => {
              setParticipacionSel('SOLO_DESTINATARIO');
              setEstadoSel('TODOS');
              setTipoTrabajoSel('TODOS');
            }}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              participacionSel === 'SOLO_DESTINATARIO'
                ? 'bg-blue-50 border-blue-400 shadow-xs'
                : 'bg-slate-50 border-slate-200/80 hover:bg-blue-50/40'
            }`}
          >
            <span className="text-[10px] font-bold text-blue-900 uppercase block">Solo Solicitud</span>
            <span className="text-2xl font-extrabold text-blue-950 mt-0.5 block">{metricasKPI.soloDestinatario}</span>
            <span className="text-[9px] text-blue-700 font-semibold">Destinatario directo</span>
          </div>

          {/* Solo en Copia CC (Separado de atendidos) */}
          <div
            onClick={() => {
              setParticipacionSel('SOLO_CC');
              setEstadoSel('TODOS');
              setTipoTrabajoSel('TODOS');
            }}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              participacionSel === 'SOLO_CC'
                ? 'bg-slate-200 border-slate-400 shadow-xs'
                : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            <span className="text-[10px] font-bold text-slate-700 uppercase block">Solo en Copia (CC)</span>
            <span className="text-2xl font-extrabold text-slate-900 mt-0.5 block">{metricasKPI.soloCC}</span>
            <span className="text-[9px] text-slate-500 font-semibold">No atribuido como atendido</span>
          </div>

          {/* Pendientes Operativos */}
          <div
            onClick={() => {
              setParticipacionSel('FUERTE');
              setEstadoSel('ABIERTOS / PENDIENTES');
              setTipoTrabajoSel('TODOS');
            }}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              estadoSel === 'ABIERTOS / PENDIENTES'
                ? 'bg-amber-50 border-amber-400 shadow-xs'
                : 'bg-slate-50 border-slate-200/80 hover:bg-amber-50/40'
            }`}
          >
            <span className="text-[10px] font-bold text-amber-900 uppercase block">Pendientes</span>
            <span className="text-2xl font-extrabold text-amber-950 mt-0.5 block">{metricasKPI.pendientes}</span>
            <span className="text-[9px] text-amber-700 font-semibold">Abiertos operativos</span>
          </div>

          {/* Cerrados */}
          <div
            onClick={() => {
              setParticipacionSel('FUERTE');
              setEstadoSel('CERRADOS / RESUELTOS');
              setTipoTrabajoSel('TODOS');
            }}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              estadoSel === 'CERRADOS / RESUELTOS'
                ? 'bg-emerald-50 border-emerald-400 shadow-xs'
                : 'bg-slate-50 border-slate-200/80 hover:bg-emerald-50/40'
            }`}
          >
            <span className="text-[10px] font-bold text-emerald-900 uppercase block">Cerrados</span>
            <span className="text-2xl font-extrabold text-emerald-950 mt-0.5 block">{metricasKPI.cerrados}</span>
            <span className="text-[9px] text-emerald-700 font-semibold">Resueltos</span>
          </div>

          {/* Dictámenes */}
          <div
            onClick={() => {
              setParticipacionSel('FUERTE');
              setTipoTrabajoSel('DICTAMEN');
            }}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              tipoTrabajoSel === 'DICTAMEN'
                ? 'bg-purple-50 border-purple-400 shadow-xs'
                : 'bg-slate-50 border-slate-200/80 hover:bg-purple-50/40'
            }`}
          >
            <span className="text-[10px] font-bold text-purple-900 uppercase block">Dictámenes</span>
            <span className="text-2xl font-extrabold text-purple-950 mt-0.5 block">{metricasKPI.dictamenes}</span>
            <span className="text-[9px] text-purple-700 font-semibold">No Utilidad</span>
          </div>

          {/* Bajas de Equipo */}
          <div
            onClick={() => {
              setParticipacionSel('FUERTE');
              setTipoTrabajoSel('BAJA');
            }}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              tipoTrabajoSel === 'BAJA'
                ? 'bg-rose-50 border-rose-400 shadow-xs'
                : 'bg-slate-50 border-slate-200/80 hover:bg-rose-50/40'
            }`}
          >
            <span className="text-[10px] font-bold text-rose-900 uppercase block">Bajas</span>
            <span className="text-2xl font-extrabold text-rose-950 mt-0.5 block">{metricasKPI.bajas}</span>
            <span className="text-[9px] text-rose-700 font-semibold">Desincorporación</span>
          </div>
        </div>

        {/* Multi-Filter Combined Bar */}
        <div className="bg-slate-50/90 border border-slate-200/90 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              Filtros Combinados: Técnico + Estado + Tipo de Trabajo + Periodo
            </h4>
            <button
              onClick={resetFiltros}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Restablecer Filtros
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* 1. Nivel de Participación */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Participación / Rol:</label>
              <select
                value={participacionSel}
                onChange={(e) => setParticipacionSel(e.target.value as NivelParticipacionFiltro)}
                className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="FUERTE">⭐ Participación Fuerte (Atendió / Recibió)</option>
                <option value="RESPUESTA">💬 Respuestas Activas (Remitente)</option>
                <option value="SOLO_DESTINATARIO">📥 Solo Recibió Solicitud (Destinatario)</option>
                <option value="SOLO_CC">📋 Solo en Copia (CC / CCO)</option>
                <option value="TODOS_INCLUYENDO_CC">🔍 Todos (Incluyendo Copias CC)</option>
              </select>
            </div>

            {/* 2. Estado Canónico */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Estado del Ticket:</label>
              <select
                value={estadoSel}
                onChange={(e) => setEstadoSel(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {listaEstados.map((st) => (
                  <option key={st} value={st}>
                    {st === 'TODOS'
                      ? 'TODOS LOS ESTADOS'
                      : st === 'ABIERTOS / PENDIENTES'
                      ? '⏳ ABIERTOS / PENDIENTES'
                      : st === 'CERRADOS / RESUELTOS'
                      ? '✅ CERRADOS / RESUELTOS'
                      : st === 'EN_ESPERA'
                      ? '⏸️ EN ESPERA'
                      : st === 'CANCELADOS'
                      ? '❌ CANCELADOS / RECHAZADOS'
                      : st}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Tipo de Trabajo */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Tipo de Trabajo:</label>
              <select
                value={tipoTrabajoSel}
                onChange={(e) => setTipoTrabajoSel(e.target.value as TipoTrabajoFiltro)}
                className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="TODOS">TODOS LOS TIPOS</option>
                <option value="DICTAMEN">📄 Dictamen de No Utilidad</option>
                <option value="BAJA">🗑️ Baja de Equipo</option>
                <option value="AMBOS">⚖️ Ambos (Dictamen + Baja)</option>
                <option value="DICTAMEN_O_BAJA">🔍 Dictamen o Baja</option>
                <option value="ESTANDAR">📋 Servicio Estándar</option>
              </select>
            </div>

            {/* 4. Periodo */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Periodo (Mes/Año):</label>
              <select
                value={periodoSel}
                onChange={(e) => setPeriodoSel(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {listaPeriodos.map((p) => (
                  <option key={p} value={p}>
                    {p === 'TODOS' ? 'TODOS LOS PERIODOS' : `Periodo: ${p}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Categoría */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Categoría:</label>
              <select
                value={catSel}
                onChange={(e) => {
                  setCatSel(e.target.value);
                  setArtSel('TODAS');
                }}
                className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {listaCategorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Artículo */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Artículo:</label>
              <select
                value={artSel}
                onChange={(e) => setArtSel(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {listaArticulos.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Module Bento Grid (Donut + Article Bar Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Pie Chart */}
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-indigo-600" />
            Resumen de Carga por Categoría ({ticketsFiltrados.length} tickets)
          </h3>

          {categoryChartData.length > 0 ? (
            <div className="h-60 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {categoryChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#1e293b',
                      fontSize: '12px',
                      fontWeight: '600',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    itemStyle={{ color: '#1e293b' }}
                    labelStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                    formatter={(val: any) => [`${val} tickets`, 'Cantidad']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 w-full flex flex-col items-center justify-center p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-2">
              <PieIcon className="w-8 h-8 text-slate-400" />
              <p className="text-xs font-semibold text-slate-600">
                Datos insuficientes para graficar con los filtros actuales
              </p>
              <p className="text-[11px] text-slate-400">
                Ajusta los filtros combinados para visualizar la distribución por categoría.
              </p>
            </div>
          )}
        </div>

        {/* Stacked Horizontal Bar Chart */}
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-600" />
              Distribución de Estatus por Artículo
            </h3>

            <button
              onClick={() => setShowPctTable(!showPctTable)}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100 cursor-pointer"
            >
              <span>{showPctTable ? 'Ocultar' : 'Ver'} Detalle %</span>
              {showPctTable ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {articleStatusChartData.length > 0 ? (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={articleStatusChartData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                >
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                  <YAxis type="category" dataKey="articulo" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} width={120} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#1e293b',
                      fontSize: '12px',
                      fontWeight: '600',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    itemStyle={{ color: '#1e293b' }}
                    labelStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="Pendientes" stackId="a" fill="#d97706" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Cerrados" stackId="a" fill="#059669" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 w-full flex flex-col items-center justify-center p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-2">
              <BarChart2 className="w-8 h-8 text-slate-400" />
              <p className="text-xs font-semibold text-slate-600">
                Datos insuficientes para graficar con los filtros actuales
              </p>
              <p className="text-[11px] text-slate-400">
                Ajusta los filtros de catálogo o de estado para visualizar la distribución por artículo.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Percentage Detail Table Expander */}
      {showPctTable && articleStatusChartData.length > 0 && (
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs text-xs space-y-3">
          <h4 className="font-bold text-slate-900">Detalle Porcentual de Cumplimiento por Artículo</h4>
          <div className="overflow-x-auto rounded-xl border border-slate-200 pr-2 pb-2">
            <table className="w-full text-left text-slate-700">
              <thead className="bg-slate-100 border-b-2 border-slate-300 text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-3.5 py-2.5">Artículo</th>
                  <th className="px-3.5 py-2.5 text-right">Pendientes %</th>
                  <th className="px-3.5 py-2.5 text-right">Cerrados %</th>
                  <th className="px-3.5 py-2.5 text-right">Total Tickets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {articleStatusChartData.map((row) => {
                  const total = row.Pendientes + row.Cerrados;
                  const pctP = total > 0 ? ((row.Pendientes / total) * 100).toFixed(1) : '0';
                  const pctC = total > 0 ? ((row.Cerrados / total) * 100).toFixed(1) : '0';
                  return (
                    <tr key={row.articulo}>
                      <td className="px-3.5 py-2.5 font-semibold text-slate-900">{row.articulo}</td>
                      <td className="px-3.5 py-2.5 text-amber-700 font-bold text-right">{pctP}%</td>
                      <td className="px-3.5 py-2.5 text-emerald-700 font-bold text-right">{pctC}%</td>
                      <td className="px-3.5 py-2.5 font-bold text-right">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ticket List Table Bento Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs space-y-2 p-6 hover:shadow-md transition-shadow duration-300">
        <div className="pb-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-xs">
              Listado de tickets filtrados: <span className="text-indigo-600 font-extrabold ml-1">{techInfo.nombre}</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Mostrando {ticketsFiltrados.length} tickets que cumplen con la combinación de filtros seleccionada.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 self-start sm:self-auto">
            {ticketsFiltrados.length} registros
          </span>
        </div>

        <div className="overflow-x-auto max-h-[550px] overflow-y-auto rounded-xl border border-slate-200 relative pr-2 pb-2">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="sticky top-0 bg-slate-100 border-b-2 border-slate-300 z-10 shadow-xs text-slate-700 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3 text-right">Folio</th>
                <th className="px-4 py-3 text-right">Fecha</th>
                <th className="px-4 py-3">Participación / Rol</th>
                <th className="px-4 py-3">Tipo de Trabajo</th>
                <th className="px-4 py-3">Artículo / Asunto</th>
                <th className="px-4 py-3">Solicitante</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {ticketsFiltrados.map((item) => {
                const { ticket, perfil, clasificacion, estadoInfo } = item;
                return (
                  <tr
                    key={ticket.id}
                    onClick={() => onSelectTicket(ticket)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-bold text-indigo-600 text-right">#{ticket.id}</td>
                    <td className="px-4 py-3 text-slate-500 font-medium whitespace-nowrap text-[11px] text-right">
                      {ticket.fechaCreacion || 'No registrada'}
                    </td>
                    <td className="px-4 py-3">
                      {perfil?.esRemitente ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Respondió / Remitente
                        </span>
                      ) : item.esSoloDestinatario ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          Destinatario Directo
                        </span>
                      ) : item.esSoloCC ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Solo en Copia (CC)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                          Participante
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {clasificacion.esAmbos ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200">
                          Dictamen + Baja
                        </span>
                      ) : clasificacion.esDictamenNoUtilidad ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                          Dictamen
                        </span>
                      ) : clasificacion.esBajaEquipo ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                          Baja Equipo
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">Estándar</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 max-w-[220px] truncate">
                      {ticket.articulo || ticket.asunto || 'Sin especificar'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{ticket.solicitante}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          estadoInfo.esCerrado
                            ? 'bg-emerald-100 text-emerald-800'
                            : estadoInfo.esCancelado
                            ? 'bg-rose-100 text-rose-800'
                            : estadoInfo.esEnEspera
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {ticket.estado}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {ticketsFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 italic">
                    No se encontraron tickets con la combinación de filtros seleccionada para este técnico.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
