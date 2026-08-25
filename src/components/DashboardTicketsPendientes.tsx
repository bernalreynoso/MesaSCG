import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  AlertTriangle,
  User,
  Filter,
  Search,
  Building2,
  Monitor,
  Wrench,
  Inbox,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  BarChart2,
  Calendar,
  RotateCcw,
  Layers,
  ArrowUpDown,
  Flame,
  CheckCircle2,
  HelpCircle,
  Users,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { Ticket } from '../types';
import { useTecnicosCatalogo } from '../utils/technicianCatalogStore';
import { EmptyState } from './EmptyState';
import { determinarAtribucionOperativa } from '../utils/operationalAttributionEngine';
import { determinarAreaDeTicket, AreaOperativa } from '../utils/areaClassifier';
import { clasificarTipoTrabajo } from '../utils/workTypeClassifier';
import {
  evaluarEstado,
  esTicketAbiertoOperativo,
  esTicketEnEspera,
  esTicketPendiente,
  EvaluacionEstadoTicket,
} from '../utils/statusClassifier';
import { calculateBusinessDays, isTicketOverdue } from '../utils/businessDays';
import { normalizarTexto } from '../utils/technicianDetector';

interface DashboardTicketsPendientesProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onLoadDemoData?: () => void;
}

type FiltroEstadoOperativo =
  | 'TODOS_ABIERTOS'
  | 'TODOS_ARCHIVO'
  | 'PENDIENTES'
  | 'ABIERTOS_OPEN'
  | 'EN_ESPERA'
  | 'VENCIDOS_SLA'
  | 'CERRADOS_CONCLUIDOS';

type OrdenColumna = 'dias' | 'fecha' | 'folio' | 'tecnico' | 'area';

const COLORES_AREAS: Record<AreaOperativa, { bg: string; text: string; border: string; bar: string }> = {
  Soporte: {
    bg: 'bg-indigo-50 text-indigo-700',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    bar: '#6366f1',
  },
  Informática: {
    bg: 'bg-blue-50 text-blue-700',
    text: 'text-blue-700',
    border: 'border-blue-200',
    bar: '#3b82f6',
  },
  Interinstitucional: {
    bg: 'bg-emerald-50 text-emerald-700',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    bar: '#10b981',
  },
};

const COLORES_GRAFICAS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

export const DashboardTicketsPendientes: React.FC<DashboardTicketsPendientesProps> = ({
  tickets,
  onSelectTicket,
  onLoadDemoData,
}) => {
  const { tecnicosActivos } = useTecnicosCatalogo();

  // Estados de Filtros
  const [areaFiltro, setAreaFiltro] = useState<'TODAS' | AreaOperativa>('TODAS');
  const [estadoSubFiltro, setEstadoSubFiltro] = useState<FiltroEstadoOperativo>('TODOS_ABIERTOS');
  const [tecnicoFiltro, setTecnicoFiltro] = useState<string>('TODOS');
  const [tipoTrabajoFiltro, setTipoTrabajoFiltro] = useState<'TODOS' | 'DICTAMEN' | 'ESTANDAR' | 'CAPACITACION'>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [orden, setOrden] = useState<OrdenColumna>('dias');
  const [ordenAsc, setOrdenAsc] = useState<boolean>(false);
  const [mostrarGraficas, setMostrarGraficas] = useState<boolean>(true);

  // Paginación
  const [paginaActual, setPaginaActual] = useState<number>(1);
  const ELEMENTOS_POR_PAGINA = 50;

  // Reset de página al cambiar filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [areaFiltro, estadoSubFiltro, tecnicoFiltro, tipoTrabajoFiltro, searchTerm, orden, ordenAsc]);

  // 1. Evaluación centralizada de todos los tickets del dataset y asignaciones
  const todosTicketsEvaluados = useMemo(() => {
    const list: Array<{
      ticket: Ticket;
      area: AreaOperativa;
      responsablePrincipal: string;
      todosResponsables: string[];
      esSinAsignar: boolean;
      evalEstado: EvaluacionEstadoTicket;
      esAbiertoOperativo: boolean;
      esCerrado: boolean;
      esVencido: boolean;
      diasHabiles: number;
      clasifTrabajo: ReturnType<typeof clasificarTipoTrabajo>;
      buzonSDP: string;
    }> = [];

    tickets.forEach((t) => {
      const evalEstado = evaluarEstado(t.estado);
      const esAbierto = esTicketAbiertoOperativo(t.estado);
      const atribucion = determinarAtribucionOperativa(t);
      const area = (atribucion.areaOperativa as AreaOperativa) || determinarAreaDeTicket(t);
      const clasifTrabajo = clasificarTipoTrabajo(t);
      const diasHabiles = calculateBusinessDays(t.fechaCreacion);
      const esVencido = esAbierto && isTicketOverdue(t.fechaCreacion, t.estado, 5);

      const nombresResp = atribucion.responsablesOperativos.map((r) => r.nombre);
      const responsablePrincipal = nombresResp[0] || t.tecnicoAsignado || 'Sin Asignar';
      const esSinAsignar = atribucion.responsablesOperativos.length === 0;

      list.push({
        ticket: t,
        area,
        responsablePrincipal,
        todosResponsables: nombresResp,
        esSinAsignar,
        evalEstado,
        esAbiertoOperativo: esAbierto,
        esCerrado: !esAbierto,
        esVencido,
        diasHabiles,
        clasifTrabajo,
        buzonSDP: t.tecnicoAsignado || 'Sin Buzón',
      });
    });

    return list;
  }, [tickets]);

  // Lista de todos los técnicos con tickets para el dropdown
  const tecnicosConCarga = useMemo(() => {
    const mapTecnicos = new Map<string, number>();
    todosTicketsEvaluados.forEach((item) => {
      // Si estamos en filtro solo abiertos, contar abiertos
      if (estadoSubFiltro !== 'TODOS_ARCHIVO' && estadoSubFiltro !== 'CERRADOS_CONCLUIDOS' && !item.esAbiertoOperativo) {
        return;
      }
      if (item.esSinAsignar) {
        mapTecnicos.set('SIN_ASIGNAR', (mapTecnicos.get('SIN_ASIGNAR') || 0) + 1);
      } else {
        item.todosResponsables.forEach((nombre) => {
          mapTecnicos.set(nombre, (mapTecnicos.get(nombre) || 0) + 1);
        });
      }
    });

    return Array.from(mapTecnicos.entries())
      .map(([nombre, count]) => ({ nombre, count }))
      .sort((a, b) => {
        if (a.nombre === 'SIN_ASIGNAR') return -1;
        if (b.nombre === 'SIN_ASIGNAR') return 1;
        return b.count - a.count;
      });
  }, [todosTicketsEvaluados, estadoSubFiltro]);

  // 2. Filtrado interactivo
  const ticketsFiltrados = useMemo(() => {
    return todosTicketsEvaluados.filter((item) => {
      const { ticket, area, responsablePrincipal, todosResponsables, esSinAsignar, evalEstado, esAbiertoOperativo, esCerrado, esVencido, clasifTrabajo } = item;

      // Filtro de Sub-Estado Operativo
      if (estadoSubFiltro === 'TODOS_ABIERTOS') {
        if (!esAbiertoOperativo) return false;
      } else if (estadoSubFiltro === 'PENDIENTES') {
        if (!esAbiertoOperativo) return false;
        if (evalEstado.estadoCanonico !== 'PENDIENTE' && !evalEstado.estadoNormalizado.includes('pendiente') && !evalEstado.estadoNormalizado.includes('proceso') && !evalEstado.estadoNormalizado.includes('atencion')) {
          return false;
        }
      } else if (estadoSubFiltro === 'ABIERTOS_OPEN') {
        if (!esAbiertoOperativo) return false;
        const norm = evalEstado.estadoNormalizado;
        const esOpen = norm.includes('abierto') || norm.includes('open') || norm.includes('nuevo') || norm.includes('assigned') || norm.includes('asignado');
        if (!esOpen) return false;
      } else if (estadoSubFiltro === 'EN_ESPERA') {
        if (!esAbiertoOperativo) return false;
        if (!evalEstado.esEnEspera && !evalEstado.estadoNormalizado.includes('espera') && !evalEstado.estadoNormalizado.includes('hold')) {
          return false;
        }
      } else if (estadoSubFiltro === 'VENCIDOS_SLA') {
        if (!esAbiertoOperativo || !esVencido) return false;
      } else if (estadoSubFiltro === 'CERRADOS_CONCLUIDOS') {
        if (!esCerrado) return false;
      }
      // Si es TODOS_ARCHIVO, deja pasar tanto abiertos como cerrados

      // Filtro de Área
      if (areaFiltro !== 'TODAS' && area !== areaFiltro) {
        return false;
      }

      // Filtro por Técnico Asignado
      if (tecnicoFiltro !== 'TODOS') {
        if (tecnicoFiltro === 'SIN_ASIGNAR') {
          if (!esSinAsignar) return false;
        } else {
          const tecNorm = normalizarTexto(tecnicoFiltro);
          const coincide = todosResponsables.some((r) => normalizarTexto(r).includes(tecNorm) || tecNorm.includes(normalizarTexto(r))) ||
            normalizarTexto(ticket.tecnicoAsignado).includes(tecNorm);
          if (!coincide) return false;
        }
      }

      // Filtro por Tipo de Trabajo
      if (tipoTrabajoFiltro === 'DICTAMEN') {
        if (!clasifTrabajo.esDictamenNoUtilidad) return false;
      } else if (tipoTrabajoFiltro === 'ESTANDAR') {
        if (clasifTrabajo.esDictamenNoUtilidad) return false;
      } else if (tipoTrabajoFiltro === 'CAPACITACION') {
        const tipoSol = normalizarTexto(ticket.tipoSolicitud);
        if (!tipoSol.includes('capacita') && !normalizarTexto(ticket.categoria).includes('capacita')) return false;
      }

      // Filtro de Búsqueda de Texto
      if (searchTerm.trim()) {
        const term = normalizarTexto(searchTerm);
        const match =
          normalizarTexto(ticket.id).includes(term) ||
          normalizarTexto(ticket.asunto).includes(term) ||
          normalizarTexto(ticket.solicitante).includes(term) ||
          normalizarTexto(ticket.articulo).includes(term) ||
          normalizarTexto(ticket.categoria).includes(term) ||
          normalizarTexto(ticket.estado).includes(term) ||
          normalizarTexto(responsablePrincipal).includes(term) ||
          normalizarTexto(ticket.tecnicoAsignado).includes(term);

        if (!match) return false;
      }

      return true;
    });
  }, [
    todosTicketsEvaluados,
    areaFiltro,
    estadoSubFiltro,
    tecnicoFiltro,
    tipoTrabajoFiltro,
    searchTerm,
  ]);

  // 3. Ordenamiento
  const ticketsOrdenados = useMemo(() => {
    const copy = [...ticketsFiltrados];
    copy.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (orden === 'dias') {
        valA = a.diasHabiles;
        valB = b.diasHabiles;
      } else if (orden === 'fecha') {
        valA = new Date(a.ticket.fechaCreacion || 0).getTime();
        valB = new Date(b.ticket.fechaCreacion || 0).getTime();
      } else if (orden === 'folio') {
        valA = parseInt(a.ticket.id, 10) || a.ticket.id;
        valB = parseInt(b.ticket.id, 10) || b.ticket.id;
      } else if (orden === 'tecnico') {
        valA = a.responsablePrincipal.toLowerCase();
        valB = b.responsablePrincipal.toLowerCase();
      } else if (orden === 'area') {
        valA = a.area.toLowerCase();
        valB = b.area.toLowerCase();
      }

      if (valA < valB) return ordenAsc ? -1 : 1;
      if (valA > valB) return ordenAsc ? 1 : -1;
      return 0;
    });
    return copy;
  }, [ticketsFiltrados, orden, ordenAsc]);

  // Paginación
  const totalPaginas = Math.max(1, Math.ceil(ticketsOrdenados.length / ELEMENTOS_POR_PAGINA));
  const ticketsPagina = useMemo(() => {
    const inicio = (paginaActual - 1) * ELEMENTOS_POR_PAGINA;
    return ticketsOrdenados.slice(inicio, inicio + ELEMENTOS_POR_PAGINA);
  }, [ticketsOrdenados, paginaActual]);

  // Estadísticas y Métricas Clave Consolidadas
  const metricas = useMemo(() => {
    const totalReporte = todosTicketsEvaluados.length;
    let totalAbiertos = 0;
    let soporte = 0;
    let informatica = 0;
    let interinstitucional = 0;
    let pendientesPuros = 0;
    let abiertosOpen = 0;
    let enEspera = 0;
    let vencidosSLA = 0;
    let sinAsignar = 0;
    let dictamenes = 0;
    let cerrados = 0;

    todosTicketsEvaluados.forEach((item) => {
      if (item.esAbiertoOperativo) {
        totalAbiertos++;

        if (item.area === 'Soporte') soporte++;
        else if (item.area === 'Informática') informatica++;
        else if (item.area === 'Interinstitucional') interinstitucional++;

        if (item.evalEstado.esEnEspera || item.evalEstado.estadoNormalizado.includes('espera') || item.evalEstado.estadoNormalizado.includes('hold')) {
          enEspera++;
        } else if (item.evalEstado.estadoNormalizado.includes('abierto') || item.evalEstado.estadoNormalizado.includes('open') || item.evalEstado.estadoNormalizado.includes('nuevo')) {
          abiertosOpen++;
        } else {
          pendientesPuros++;
        }

        if (item.esVencido) vencidosSLA++;
        if (item.esSinAsignar) sinAsignar++;
        if (item.clasifTrabajo.esDictamenNoUtilidad) dictamenes++;
      } else {
        cerrados++;
      }
    });

    return {
      totalReporte,
      totalAbiertos,
      soporte,
      informatica,
      interinstitucional,
      pendientesPuros,
      abiertosOpen,
      enEspera,
      vencidosSLA,
      sinAsignar,
      dictamenes,
      cerrados,
    };
  }, [todosTicketsEvaluados]);

  // Gráfica: Distribución por Técnico Top 10
  const chartTecnicosData = useMemo(() => {
    const map = new Map<string, { total: number; vencidos: number; area: string }>();

    ticketsFiltrados.forEach((item) => {
      const nombre = item.responsablePrincipal;
      const actual = map.get(nombre) || { total: 0, vencidos: 0, area: item.area };
      actual.total++;
      if (item.esVencido) actual.vencidos++;
      map.set(nombre, actual);
    });

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name: name.length > 20 ? `${name.substring(0, 18)}...` : name,
        fullName: name,
        total: data.total,
        vencidos: data.vencidos,
        area: data.area,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
  }, [ticketsFiltrados]);

  // Gráfica: Distribución por Área
  const chartAreaData = useMemo(() => {
    const counts = { Soporte: 0, Informática: 0, Interinstitucional: 0 };
    ticketsFiltrados.forEach((item) => {
      if (counts[item.area] !== undefined) {
        counts[item.area]++;
      }
    });

    return [
      { name: 'Soporte', value: counts.Soporte, color: '#6366f1' },
      { name: 'Informática', value: counts.Informática, color: '#3b82f6' },
      { name: 'Interinstitucional', value: counts.Interinstitucional, color: '#10b981' },
    ].filter((d) => d.value > 0);
  }, [ticketsFiltrados]);

  // Exportar a CSV
  const handleExportCSV = () => {
    if (ticketsOrdenados.length === 0) return;

    const headers = [
      'Folio',
      'Area Operativa',
      'Tecnico Responsable',
      'Estado SDP',
      'Dias Habiles Transcurridos',
      'SLA Vencido (>5 dias)',
      'Solicitante',
      'Asunto / Articulo',
      'Categoria',
      'Subcategoria',
      'Tipo Solicitud',
      'Dictamen No Utilidad',
      'Fecha Creacion',
    ];

    const rows = ticketsOrdenados.map((item) => {
      const t = item.ticket;
      return [
        `"${t.id}"`,
        `"${item.area}"`,
        `"${item.responsablePrincipal}"`,
        `"${t.estado}"`,
        item.diasHabiles,
        item.esVencido ? 'SI' : 'NO',
        `"${(t.solicitante || '').replace(/"/g, '""')}"`,
        `"${(t.articulo || t.asunto || '').replace(/"/g, '""')}"`,
        `"${(t.categoria || '').replace(/"/g, '""')}"`,
        `"${(t.subcategoria || '').replace(/"/g, '""')}"`,
        `"${(t.tipoSolicitud || '').replace(/"/g, '""')}"`,
        item.clasifTrabajo.esDictamenNoUtilidad ? 'SI' : 'NO',
        `"${t.fechaCreacion || ''}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Tickets_Pendientes_Asignados_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOrdenar = (col: OrdenColumna) => {
    if (orden === col) {
      setOrdenAsc(!ordenAsc);
    } else {
      setOrden(col);
      setOrdenAsc(false);
    }
  };

  const limpiarFiltros = () => {
    setAreaFiltro('TODAS');
    setEstadoSubFiltro('TODOS_ABIERTOS');
    setTecnicoFiltro('TODOS');
    setTipoTrabajoFiltro('TODOS');
    setSearchTerm('');
    setOrden('dias');
    setOrdenAsc(false);
  };

  if (tickets.length === 0) {
    return <EmptyState onLoadDemoData={onLoadDemoData} />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header del Módulo */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-extrabold uppercase tracking-wider border border-amber-500/30 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 animate-spin-slow" />
                Control Central de Pendientes
              </span>
              <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-200 rounded-full text-xs font-semibold border border-indigo-400/20">
                Todas las Áreas
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Tickets Pendientes y Asignaciones Globales
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
              Monitoreo unificado de tickets con estado <strong className="text-amber-300 font-semibold">Pendiente, Abierto, Open y En Espera de Información</strong>, cruzando el técnico responsable asignado y su área operativa en tiempo real.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => setMostrarGraficas(!mostrarGraficas)}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              {mostrarGraficas ? 'Ocultar Gráficas' : 'Ver Gráficas'}
            </button>
            <button
              onClick={handleExportCSV}
              disabled={ticketsFiltrados.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Exportar CSV ({ticketsFiltrados.length})
            </button>
          </div>
        </div>
      </div>

      {/* Banner de Diagnóstico del Reporte Cargado */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0 mt-0.5 sm:mt-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-800">
                  Total en archivo procesado: <span className="text-indigo-600 font-extrabold">{metricas.totalReporte} tickets únicos</span>
                </span>
                <span className="text-[11px] text-slate-400">•</span>
                <span className="text-xs text-amber-700 font-semibold">
                  {metricas.totalAbiertos} pendientes/abiertos
                </span>
                <span className="text-[11px] text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-medium">
                  {metricas.cerrados} cerrados en SDP
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                SDP exportó 677 filas por el desglose de correos y participantes, consolidadas a 171 folios únicos. Por defecto se muestran los <strong>135 tickets operativos activos</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setEstadoSubFiltro('TODOS_ABIERTOS')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                estadoSubFiltro === 'TODOS_ABIERTOS'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Solo Pendientes ({metricas.totalAbiertos})
            </button>
            <button
              onClick={() => setEstadoSubFiltro('TODOS_ARCHIVO')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                estadoSubFiltro === 'TODOS_ARCHIVO'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Ver Todos ({metricas.totalReporte})
            </button>
            <button
              onClick={() => setEstadoSubFiltro('CERRADOS_CONCLUIDOS')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                estadoSubFiltro === 'CERRADOS_CONCLUIDOS'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Cerrados ({metricas.cerrados})
            </button>
          </div>
        </div>
      </div>

      {/* KPI Bento Grid Principal */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Abiertos Operativos */}
        <div
          onClick={() => setEstadoSubFiltro('TODOS_ABIERTOS')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
            estadoSubFiltro === 'TODOS_ABIERTOS'
              ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-md'
              : 'border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-bold">Total Pendientes</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metricas.totalAbiertos}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
            <span>Todas las áreas</span>
          </div>
        </div>

        {/* Pendientes / En Proceso */}
        <div
          onClick={() => setEstadoSubFiltro('PENDIENTES')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
            estadoSubFiltro === 'PENDIENTES'
              ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
              : 'border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 text-xs mb-1">
            <span className="font-bold">Pendientes</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700">{metricas.pendientesPuros}</div>
          <div className="text-[11px] text-amber-800 mt-1 font-medium">
            En atención activa
          </div>
        </div>

        {/* Abiertos / Open */}
        <div
          onClick={() => setEstadoSubFiltro('ABIERTOS_OPEN')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
            estadoSubFiltro === 'ABIERTOS_OPEN'
              ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-md'
              : 'border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-sky-700 text-xs mb-1">
            <span className="font-bold">Abiertos / Open</span>
            <Inbox className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-sky-700">{metricas.abiertosOpen}</div>
          <div className="text-[11px] text-sky-800 mt-1 font-medium">
            Nuevos y asignados
          </div>
        </div>

        {/* En Espera de Información */}
        <div
          onClick={() => setEstadoSubFiltro('EN_ESPERA')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
            estadoSubFiltro === 'EN_ESPERA'
              ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-md'
              : 'border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-purple-700 text-xs mb-1">
            <span className="font-bold">En Espera</span>
            <HelpCircle className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700">{metricas.enEspera}</div>
          <div className="text-[11px] text-purple-800 mt-1 font-medium">
            En espera de info
          </div>
        </div>

        {/* Vencidos SLA (> 5 días) */}
        <div
          onClick={() => setEstadoSubFiltro('VENCIDOS_SLA')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
            estadoSubFiltro === 'VENCIDOS_SLA'
              ? 'border-rose-500 ring-2 ring-rose-500/20 shadow-md bg-rose-50/20'
              : 'border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 text-xs mb-1">
            <span className="font-bold">Vencidos &gt; 5 Días</span>
            <Flame className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700">{metricas.vencidosSLA}</div>
          <div className="text-[11px] text-rose-800 mt-1 font-medium">
            Alerta SLA operativa
          </div>
        </div>

        {/* Cerrados en SDP / Concluidos */}
        <div
          onClick={() => setEstadoSubFiltro(estadoSubFiltro === 'CERRADOS_CONCLUIDOS' ? 'TODOS_ABIERTOS' : 'CERRADOS_CONCLUIDOS')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
            estadoSubFiltro === 'CERRADOS_CONCLUIDOS'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md bg-emerald-50/20'
              : 'border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 text-xs mb-1">
            <span className="font-bold">Cerrados en SDP</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{metricas.cerrados}</div>
          <div className="text-[11px] text-emerald-800 mt-1 font-medium">
            Estado &quot;Closed&quot;
          </div>
        </div>
      </div>

      {/* Gráficas Resumen de Distribución (Colapsables) */}
      {mostrarGraficas && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Gráfica de Barras: Carga por Técnico */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Carga de Tickets Pendientes por Técnico
                </h3>
                <p className="text-xs text-slate-500">
                  Top técnicos con mayor volumen de tickets pendientes en la consulta actual.
                </p>
              </div>
            </div>

            {chartTecnicosData.length > 0 ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartTecnicosData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                      width={140}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                      formatter={(val: any, name: any, item: any) => [
                        `${val} tickets (${item.payload.vencidos} vencidos >5d)`,
                        `Técnico: ${item.payload.fullName}`,
                      ]}
                    />
                    <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                      {chartTecnicosData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.area === 'Soporte'
                              ? '#6366f1'
                              : entry.area === 'Informática'
                              ? '#3b82f6'
                              : '#10b981'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 font-medium">
                No hay datos disponibles para graficar con los filtros actuales
              </div>
            )}
          </div>

          {/* Gráfica de Pastel: Distribución por Área */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Distribución por Área Operativa
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Proporción de tickets pendientes según la subdirección / área.
              </p>

              {chartAreaData.length > 0 ? (
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartAreaData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                      >
                        {chartAreaData.map((entry, index) => (
                          <Cell key={`pie-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#e2e8f0',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(val: any) => [`${val} tickets`, 'Pendientes']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-44 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                  Sin datos
                </div>
              )}
            </div>

            {/* Leyenda de Áreas */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs p-1.5 bg-indigo-50/60 rounded-lg">
                <span className="font-semibold text-indigo-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  Soporte Técnico
                </span>
                <span className="font-bold text-indigo-900">{metricas.soporte}</span>
              </div>
              <div className="flex items-center justify-between text-xs p-1.5 bg-blue-50/60 rounded-lg">
                <span className="font-semibold text-blue-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  Informática / Sistemas
                </span>
                <span className="font-bold text-blue-900">{metricas.informatica}</span>
              </div>
              <div className="flex items-center justify-between text-xs p-1.5 bg-emerald-50/60 rounded-lg">
                <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  Interinstitucional
                </span>
                <span className="font-bold text-emerald-900">{metricas.interinstitucional}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Filtros Combinables */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Filtros de Búsqueda y Segmentación</h3>
          </div>
          <button
            onClick={limpiarFiltros}
            className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-semibold cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpiar Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Búsqueda en texto */}
          <div className="lg:col-span-1">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Buscar Ticket / Solicitante
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="ID, Asunto, Solicitante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Filtro por Área */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Área Operativa
            </label>
            <select
              value={areaFiltro}
              onChange={(e) => setAreaFiltro(e.target.value as any)}
              className="w-full py-2 px-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-medium text-slate-800"
            >
              <option value="TODAS">🏢 Todas las Áreas</option>
              <option value="Soporte">🔧 Soporte Técnico</option>
              <option value="Informática">💻 Informática / Desarrollo</option>
              <option value="Interinstitucional">🏛️ Interinstitucional</option>
            </select>
          </div>

          {/* Filtro por Estado Específico */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Estado Operativo
            </label>
            <select
              value={estadoSubFiltro}
              onChange={(e) => setEstadoSubFiltro(e.target.value as any)}
              className="w-full py-2 px-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-medium text-slate-800"
            >
              <option value="TODOS_ABIERTOS">📋 Solo Pendientes / Abiertos ({metricas.totalAbiertos})</option>
              <option value="TODOS_ARCHIVO">📁 Todos los del Archivo ({metricas.totalReporte})</option>
              <option value="PENDIENTES">⏳ Solo Pendientes / En Proceso ({metricas.pendientesPuros})</option>
              <option value="ABIERTOS_OPEN">📬 Solo Abiertos / Open / Nuevos ({metricas.abiertosOpen})</option>
              <option value="EN_ESPERA">⏸️ Solo En Espera de Información ({metricas.enEspera})</option>
              <option value="VENCIDOS_SLA">🔥 Solo Vencidos SLA (&gt;5 días) ({metricas.vencidosSLA})</option>
              <option value="CERRADOS_CONCLUIDOS">✅ Solo Cerrados en SDP ({metricas.cerrados})</option>
            </select>
          </div>

          {/* Filtro por Técnico */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Técnico Asignado
            </label>
            <select
              value={tecnicoFiltro}
              onChange={(e) => setTecnicoFiltro(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-medium text-slate-800"
            >
              <option value="TODOS">👥 Todos los Técnicos ({tecnicosConCarga.length})</option>
              <option value="SIN_ASIGNAR">⚠️ Sin Asignar / Sin Técnico ({metricas.sinAsignar})</option>
              <optgroup label="Técnicos con Tickets Pendientes">
                {tecnicosConCarga
                  .filter((t) => t.nombre !== 'SIN_ASIGNAR')
                  .map((t) => (
                    <option key={t.nombre} value={t.nombre}>
                      {t.nombre} ({t.count} pendientes)
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Filtro secundario: Tipo de trabajo */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tipo de Trabajo:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'TODOS', label: 'Todos' },
              { id: 'DICTAMEN', label: 'Dictamen de No Utilidad' },
              { id: 'CAPACITACION', label: 'Capacitaciones' },
              { id: 'ESTANDAR', label: 'Servicio Estándar' },
            ].map((tipo) => (
              <button
                key={tipo.id}
                onClick={() => setTipoTrabajoFiltro(tipo.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  tipoTrabajoFiltro === tipo.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {tipo.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla Principal de Tickets Pendientes y Asignaciones */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
        {/* Cabecera de la tabla */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Listado de Tickets Pendientes y Técnicos Asignados
            </h3>
            <p className="text-xs text-slate-500">
              Mostrando <strong className="text-slate-900 font-semibold">{ticketsOrdenados.length}</strong> tickets con estado operativo abierto.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Ordenar por:</span>
            <button
              onClick={() => handleOrdenar('dias')}
              className={`px-2.5 py-1 rounded-lg font-semibold border flex items-center gap-1 cursor-pointer transition-colors ${
                orden === 'dias'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Antigüedad / Días {orden === 'dias' && (ordenAsc ? '↑' : '↓')}
            </button>
            <button
              onClick={() => handleOrdenar('folio')}
              className={`px-2.5 py-1 rounded-lg font-semibold border flex items-center gap-1 cursor-pointer transition-colors ${
                orden === 'folio'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Folio {orden === 'folio' && (ordenAsc ? '↑' : '↓')}
            </button>
            <button
              onClick={() => handleOrdenar('tecnico')}
              className={`px-2.5 py-1 rounded-lg font-semibold border flex items-center gap-1 cursor-pointer transition-colors ${
                orden === 'tecnico'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Técnico {orden === 'tecnico' && (ordenAsc ? '↑' : '↓')}
            </button>
          </div>
        </div>

        {/* Tabla responsive */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-3 px-3.5 whitespace-nowrap">Folio (#ID)</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Técnico Asignado / Responsable</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Área</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Estado SDP</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Antigüedad (Días Hábiles)</th>
                <th className="py-3 px-3.5">Asunto / Solicitud</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Solicitante</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Fecha Creación</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {ticketsPagina.length > 0 ? (
                ticketsPagina.map((item) => {
                  const { ticket, area, responsablePrincipal, esSinAsignar, evalEstado, esVencido, diasHabiles, clasifTrabajo, buzonSDP } = item;
                  const coloresArea = COLORES_AREAS[area] || COLORES_AREAS.Soporte;

                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => onSelectTicket(ticket)}
                      className="hover:bg-indigo-50/30 cursor-pointer transition-colors group"
                    >
                      {/* Folio */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 group-hover:border-indigo-300">
                          #{ticket.id}
                        </span>
                      </td>

                      {/* Técnico Asignado */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                              esSinAsignar
                                ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                : coloresArea.bg + ' border ' + coloresArea.border
                            }`}
                          >
                            {esSinAsignar ? '!' : responsablePrincipal.charAt(0)}
                          </div>
                          <div>
                            <span
                              className={`font-bold block ${
                                esSinAsignar ? 'text-orange-900' : 'text-slate-900'
                              }`}
                            >
                              {responsablePrincipal}
                            </span>
                            {buzonSDP && buzonSDP !== responsablePrincipal && (
                              <span className="text-[10px] text-slate-500 font-medium block">
                                Buzón SDP: {buzonSDP}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Área */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${coloresArea.bg} ${coloresArea.border}`}>
                          {area}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                            item.esCerrado
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : evalEstado.esEnEspera
                              ? 'bg-purple-100 text-purple-800 border-purple-200'
                              : evalEstado.estadoNormalizado.includes('abierto') || evalEstado.estadoNormalizado.includes('open')
                              ? 'bg-sky-100 text-sky-800 border-sky-200'
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}
                        >
                          {ticket.estado}
                        </span>
                      </td>

                      {/* Antigüedad / Días Hábiles */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded ${
                              esVencido
                                ? 'bg-rose-100 text-rose-800 border border-rose-200 font-black'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {diasHabiles} {diasHabiles === 1 ? 'día hábil' : 'días hábiles'}
                          </span>
                          {esVencido && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-600 text-white animate-pulse">
                              &gt; 5d Vencido
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Asunto / Solicitud */}
                      <td className="py-3 px-3.5 max-w-xs">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-900 line-clamp-1 group-hover:text-indigo-900" title={ticket.asunto || ticket.articulo}>
                            {ticket.articulo || ticket.asunto || 'Sin Asunto'}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                            <span className="truncate max-w-[150px]">{ticket.categoria || 'Sin Categoría'}</span>
                            {clasifTrabajo.esDictamenNoUtilidad && (
                              <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 font-extrabold text-[9px] rounded">
                                Dictamen
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Solicitante */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-medium text-slate-800 block truncate max-w-[140px]" title={ticket.solicitante}>
                          {ticket.solicitante || 'No registrado'}
                        </span>
                      </td>

                      {/* Fecha Creación */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {ticket.fechaCreacion || 'No registrada'}
                      </td>

                      {/* Acción */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTicket(ticket);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-indigo-600 text-slate-700 hover:text-white border border-slate-200 hover:border-indigo-600 rounded-lg text-[11px] font-bold transition-all shadow-2xs"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      <p className="font-bold text-slate-700 text-sm">
                        No se encontraron tickets pendientes con los filtros aplicados
                      </p>
                      <p className="text-xs text-slate-500">
                        Intenta ajustar los criterios de búsqueda o limpiar los filtros.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 font-medium">
              Página <strong className="text-slate-900">{paginaActual}</strong> de <strong className="text-slate-900">{totalPaginas}</strong> ({ticketsOrdenados.length} tickets pendientes filtrados)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPaginaActual((prev) => Math.max(1, prev - 1))}
                disabled={paginaActual === 1}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPaginaActual((prev) => Math.min(totalPaginas, prev + 1))}
                disabled={paginaActual === totalPaginas}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
