import React, { useState, useMemo } from 'react';
import {
  Ticket as TicketIcon,
  Clock,
  AlertTriangle,
  Inbox,
  Search,
  CheckCircle,
  FileText,
  BarChart2,
  Calendar,
  XCircle,
  Users,
  ChevronDown,
  ChevronUp,
  Shield,
  Layers,
  GraduationCap,
  Building2,
  Monitor,
  Wrench,
  Filter,
  Briefcase,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Ticket } from '../types';
import { isTicketOverdue } from '../utils/businessDays';
import {
  evaluarEstado,
  esTicketAbiertoOperativo,
  esTicketCerrado,
} from '../utils/statusClassifier';
import { determinarAreaDeTicket, AreaOperativa } from '../utils/areaClassifier';
import { useTecnicosCatalogo } from '../utils/technicianCatalogStore';
import { clasificarTipoTrabajo } from '../utils/workTypeClassifier';
import { determinarAtribucionOperativa } from '../utils/operationalAttributionEngine';
import { normalizarTexto } from '../utils/technicianDetector';
import { EmptyState } from './EmptyState';

interface DashboardGeneralProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onLoadDemoData?: () => void;
  onNavigateToPendientes?: () => void;
}

// Helper parser for date strings
function parseTicketDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const str = dateStr.trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
    const parts = str.split(' ')[0].split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export const DashboardGeneral: React.FC<DashboardGeneralProps> = ({
  tickets,
  onSelectTicket,
  onLoadDemoData,
  onNavigateToPendientes,
}) => {
  const { tecnicos } = useTecnicosCatalogo();

  // Estados de filtros
  const [areaFiltro, setAreaFiltro] = useState<'TODAS' | AreaOperativa>('TODAS');
  const [tipoSolicitudFiltro, setTipoSolicitudFiltro] = useState<string>('TODOS');
  const [estadoFiltro, setEstadoFiltro] = useState<'TODOS' | 'ABIERTOS' | 'CERRADOS' | 'CANCELADOS' | 'EN_ESPERA'>('TODOS');
  const [tipoTrabajoFiltro, setTipoTrabajoFiltro] = useState<'TODOS' | 'DICTAMEN' | 'ESTANDAR'>('TODOS');
  const [tecnicoFiltro, setTecnicoFiltro] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Estados de expansión de acordeones por técnico
  const [expandedTecnicos, setExpandedTecnicos] = useState<Record<string, boolean>>({});

  const toggleTecnicoExpand = (tecNombre: string) => {
    setExpandedTecnicos((prev) => ({
      ...prev,
      [tecNombre]: !prev[tecNombre],
    }));
  };

  // Lista única de tipos de solicitud para el dropdown
  const tiposSolicitudDisponibles = useMemo(() => {
    const setTipos = new Set<string>();
    tickets.forEach((t) => {
      if (t.tipoSolicitud && t.tipoSolicitud.trim()) {
        setTipos.add(t.tipoSolicitud.trim());
      }
    });
    // Garantizar que CAPACITACIÓN siempre esté en las opciones si existe
    return Array.from(setTipos).sort();
  }, [tickets]);

  // 1. Filtrado por fechas
  const dateFilteredTickets = useMemo(() => {
    if (!startDate && !endDate) return tickets;

    return tickets.filter((t) => {
      if (!t.fechaCreacion) return true;
      const d = parseTicketDate(t.fechaCreacion);
      if (!d) return true;

      const time = d.getTime();
      if (startDate) {
        const start = new Date(startDate).getTime();
        if (time < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (time > end.getTime()) return false;
      }
      return true;
    });
  }, [tickets, startDate, endDate]);

  // 2. Filtrado multidimensional (Área, Tipo Solicitud, Estado, Tipo de Trabajo, Técnico, Búsqueda)
  const filteredTickets = useMemo(() => {
    return dateFilteredTickets.filter((t) => {
      // Filtro de Área
      if (areaFiltro !== 'TODAS') {
        const areaTicket = determinarAreaDeTicket(t);
        if (areaTicket !== areaFiltro) return false;
      }

      // Filtro de Tipo de Solicitud (ej. CAPACITACIÓN)
      if (tipoSolicitudFiltro !== 'TODOS') {
        const tipoTicket = (t.tipoSolicitud || '').toUpperCase().trim();
        const tipoBuscado = tipoSolicitudFiltro.toUpperCase().trim();
        if (tipoBuscado === 'CAPACITACIÓN' || tipoBuscado === 'CAPACITACION') {
          const matchCap =
            tipoTicket.includes('CAPACITA') ||
            (t.categoria || '').toUpperCase().includes('CAPACITA') ||
            (t.articulo || '').toUpperCase().includes('CAPACITA') ||
            (t.asunto || '').toUpperCase().includes('CAPACITA');
          if (!matchCap) return false;
        } else {
          if (tipoTicket !== tipoBuscado && !tipoTicket.includes(tipoBuscado)) return false;
        }
      }

      // Filtro de Estado
      if (estadoFiltro !== 'TODOS') {
        const est = evaluarEstado(t.estado);
        if (estadoFiltro === 'ABIERTOS' && !est.esAbiertoOperativo) return false;
        if (estadoFiltro === 'CERRADOS' && !est.esCerrado) return false;
        if (estadoFiltro === 'CANCELADOS' && !est.esCancelado) return false;
        if (estadoFiltro === 'EN_ESPERA' && !est.esEnEspera) return false;
      }

      // Filtro de Tipo de Trabajo
      if (tipoTrabajoFiltro !== 'TODOS') {
        const clasif = clasificarTipoTrabajo(t);
        if (tipoTrabajoFiltro === 'DICTAMEN' && !clasif.esDictamenNoUtilidad) return false;
        if (tipoTrabajoFiltro === 'ESTANDAR' && clasif.esDictamenNoUtilidad) return false;
      }

      // Filtro de Técnico (Usa Atribución Operativa Central)
      if (tecnicoFiltro !== 'TODOS') {
        const atribucion = determinarAtribucionOperativa(t);
        const tecBuscarNorm = normalizarTexto(tecnicoFiltro);
        const coincide = atribucion.nombresResponsables.some(
          (nom) => normalizarTexto(nom).includes(tecBuscarNorm) || tecBuscarNorm.includes(normalizarTexto(nom))
        );
        if (!coincide) return false;
      }

      // Filtro de Búsqueda
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const atribucion = determinarAtribucionOperativa(t);
        const nombresResp = atribucion.nombresResponsables.join(' ').toLowerCase();
        const match =
          t.id.toLowerCase().includes(q) ||
          (t.solicitante || '').toLowerCase().includes(q) ||
          (t.categoria || '').toLowerCase().includes(q) ||
          (t.articulo || '').toLowerCase().includes(q) ||
          (t.asunto || '').toLowerCase().includes(q) ||
          (t.estado || '').toLowerCase().includes(q) ||
          (t.tecnicoAsignado || '').toLowerCase().includes(q) ||
          (t.tipoSolicitud || '').toLowerCase().includes(q) ||
          nombresResp.includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [dateFilteredTickets, areaFiltro, tipoSolicitudFiltro, estadoFiltro, tipoTrabajoFiltro, tecnicoFiltro, searchTerm]);

  // 3. Cálculos de KPIs consolidados
  const totalTickets = filteredTickets.length;
  const ticketsAbiertos = useMemo(
    () => filteredTickets.filter((t) => esTicketAbiertoOperativo(t.estado)),
    [filteredTickets]
  );
  const ticketsCerrados = useMemo(
    () => filteredTickets.filter((t) => esTicketCerrado(t.estado)),
    [filteredTickets]
  );
  const ticketsOverdue = useMemo(
    () => filteredTickets.filter((t) => isTicketOverdue(t.fechaCreacion, t.estado, 5)),
    [filteredTickets]
  );
  const ticketsDictamen = useMemo(
    () => filteredTickets.filter((t) => clasificarTipoTrabajo(t).esDictamenNoUtilidad),
    [filteredTickets]
  );
  const ticketsUnassigned = useMemo(() => {
    return filteredTickets.filter((t) => {
      const atribucion = determinarAtribucionOperativa(t);
      return atribucion.responsablesOperativos.length === 0;
    });
  }, [filteredTickets]);

  const completionRate = useMemo(() => {
    if (totalTickets === 0) return 0;
    return Math.round((ticketsCerrados.length / totalTickets) * 100);
  }, [ticketsCerrados.length, totalTickets]);

  // 4. Agrupación por Área y Desglose por Técnico con Motor de Atribución Operativa
  const resumenPorArea = useMemo(() => {
    const areas: Record<
      AreaOperativa,
      {
        nombre: AreaOperativa;
        icono: any;
        color: string;
        bgBadge: string;
        tickets: Ticket[];
        abiertos: Ticket[];
        dictamenes: Ticket[];
        capacitaciones: Ticket[];
        otrosTipos: Ticket[];
        tecnicosMap: Record<string, Ticket[]>;
        sinAsignar: Ticket[];
      }
    > = {
      Soporte: {
        nombre: 'Soporte',
        icono: Wrench,
        color: 'text-indigo-600 border-indigo-200 bg-indigo-50/50',
        bgBadge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        tickets: [],
        abiertos: [],
        dictamenes: [],
        capacitaciones: [],
        otrosTipos: [],
        tecnicosMap: {},
        sinAsignar: [],
      },
      Informática: {
        nombre: 'Informática',
        icono: Monitor,
        color: 'text-blue-600 border-blue-200 bg-blue-50/50',
        bgBadge: 'bg-blue-100 text-blue-800 border-blue-200',
        tickets: [],
        abiertos: [],
        dictamenes: [],
        capacitaciones: [],
        otrosTipos: [],
        tecnicosMap: {},
        sinAsignar: [],
      },
      Interinstitucional: {
        nombre: 'Interinstitucional',
        icono: Building2,
        color: 'text-emerald-600 border-emerald-200 bg-emerald-50/50',
        bgBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        tickets: [],
        abiertos: [],
        dictamenes: [],
        capacitaciones: [],
        otrosTipos: [],
        tecnicosMap: {},
        sinAsignar: [],
      },
    };

    // Distribuir tickets utilizando el Motor Central de Atribución Operativa
    dateFilteredTickets.forEach((ticket) => {
      const atribucion = determinarAtribucionOperativa(ticket);
      const area = (atribucion.areaOperativa as AreaOperativa) || determinarAreaDeTicket(ticket);
      const targetArea = areas[area] || areas['Soporte'];

      targetArea.tickets.push(ticket);

      if (esTicketAbiertoOperativo(ticket.estado)) {
        targetArea.abiertos.push(ticket);
      }

      if (clasificarTipoTrabajo(ticket).esDictamenNoUtilidad) {
        targetArea.dictamenes.push(ticket);
      }

      // Clasificación de Tipo de Solicitud dentro del área
      const tipoSol = (ticket.tipoSolicitud || '').toUpperCase();
      const esCapacitacion =
        tipoSol.includes('CAPACITA') ||
        (ticket.categoria || '').toUpperCase().includes('CAPACITA') ||
        (ticket.articulo || '').toUpperCase().includes('CAPACITA');

      if (esCapacitacion) {
        targetArea.capacitaciones.push(ticket);
      } else {
        targetArea.otrosTipos.push(ticket);
      }

      // Asignación a técnicos según el Motor de Atribución Operativa (Soporta múltiples responsables)
      if (atribucion.responsablesOperativos.length === 0) {
        targetArea.sinAsignar.push(ticket);
      } else {
        atribucion.responsablesOperativos.forEach((resp) => {
          const tecNombre = resp.nombre;
          if (!targetArea.tecnicosMap[tecNombre]) {
            targetArea.tecnicosMap[tecNombre] = [];
          }
          targetArea.tecnicosMap[tecNombre].push(ticket);
        });
      }
    });

    return areas;
  }, [dateFilteredTickets]);

  // Lista de áreas a renderizar según el filtro
  const areasParaMostrar: AreaOperativa[] = useMemo(() => {
    if (areaFiltro === 'TODAS') {
      return ['Soporte', 'Informática', 'Interinstitucional'];
    }
    return [areaFiltro];
  }, [areaFiltro]);

  // Chart Data: Categorías
  const categoryChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTickets.forEach((t) => {
      const cat = t.categoria || 'Sin Categoría';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, total]) => ({
        name: name.length > 22 ? `${name.substring(0, 20)}...` : name,
        fullName: name,
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [filteredTickets]);

  const COLORS = [
    '#4f46e5',
    '#0284c7',
    '#7c3aed',
    '#059669',
    '#d97706',
    '#db2777',
    '#0891b2',
    '#6366f1',
  ];

  if (tickets.length === 0) {
    return (
      <EmptyState
        title="No hay tickets en la Vista General Operativa"
        description="Actualmente no existen tickets cargados. Carga un reporte Excel de ServiceDesk Plus o inicia con el reporte de ejemplo."
        onLoadDemoData={onLoadDemoData}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabecera & Panel de Filtros para Dirección */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 mt-0.5 shrink-0">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Vista General Operativa (Dirección)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Monitoreo ejecutivo integral de carga, estado y distribución por áreas: Soporte, Informática e Interinstitucional.
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-600 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 font-semibold self-start sm:self-auto shrink-0 flex items-center gap-2">
            <span>Fecha de referencia:</span>
            <strong className="text-indigo-600 font-extrabold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              2026-07-23
            </strong>
          </div>
        </div>

        {/* Barra de Filtros Multidimensionales */}
        <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>Filtros Operativos:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {/* Filtro de Área */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Área Operativa:
              </label>
              <select
                value={areaFiltro}
                onChange={(e) => setAreaFiltro(e.target.value as any)}
                className="w-full bg-white border border-slate-200 text-slate-800 font-semibold rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="TODAS">Todas las Áreas</option>
                <option value="Soporte">Soporte Técnico</option>
                <option value="Informática">Informática y Sistemas</option>
                <option value="Interinstitucional">Subdirección Interinstitucional</option>
              </select>
            </div>

            {/* Filtro de Tipo de Solicitud */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Tipo de Solicitud:
              </label>
              <select
                value={tipoSolicitudFiltro}
                onChange={(e) => setTipoSolicitudFiltro(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 font-semibold rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="TODOS">Todos los Tipos de Solicitud</option>
                <option value="CAPACITACIÓN">CAPACITACIÓN</option>
                {tiposSolicitudDisponibles
                  .filter((t) => !t.toUpperCase().includes('CAPACITA'))
                  .map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
              </select>
            </div>

            {/* Filtro de Estado */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Estado del Ticket:
              </label>
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value as any)}
                className="w-full bg-white border border-slate-200 text-slate-800 font-semibold rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="TODOS">Todos los Estados</option>
                <option value="ABIERTOS">Tickets Abiertos (Operativos)</option>
                <option value="CERRADOS">Cerrados / Resueltos</option>
                <option value="CANCELADOS">Cancelados</option>
                <option value="EN_ESPERA">En Espera</option>
              </select>
            </div>

            {/* Filtro de Tipo de Trabajo */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Tipo de Trabajo:
              </label>
              <select
                value={tipoTrabajoFiltro}
                onChange={(e) => setTipoTrabajoFiltro(e.target.value as any)}
                className="w-full bg-white border border-slate-200 text-slate-800 font-semibold rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="TODOS">Todos los Tipos</option>
                <option value="DICTAMEN">Dictamen de No Utilidad</option>
                <option value="ESTANDAR">Servicio Estándar</option>
              </select>
            </div>

            {/* Filtro de Técnico */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Técnico Asignado:
              </label>
              <select
                value={tecnicoFiltro}
                onChange={(e) => setTecnicoFiltro(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 font-semibold rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="TODOS">Todos los Técnicos</option>
                {tecnicos.map((tec) => (
                  <option key={tec.id} value={tec.nombre}>
                    {tec.nombre} ({tec.area})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rango de Fechas y Búsqueda */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/60 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 font-medium">Desde:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-slate-800 font-semibold focus:outline-none bg-transparent cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                <span className="text-slate-400 font-medium">Hasta:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-slate-800 font-semibold focus:outline-none bg-transparent cursor-pointer"
                />
              </div>

              {(startDate || endDate || areaFiltro !== 'TODAS' || tipoSolicitudFiltro !== 'TODOS' || estadoFiltro !== 'TODOS' || tipoTrabajoFiltro !== 'TODOS' || tecnicoFiltro !== 'TODOS') && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setAreaFiltro('TODAS');
                    setTipoSolicitudFiltro('TODOS');
                    setEstadoFiltro('TODOS');
                    setTipoTrabajoFiltro('TODOS');
                    setTecnicoFiltro('TODOS');
                  }}
                  className="flex items-center gap-1 text-slate-600 hover:text-slate-900 bg-slate-200 hover:bg-slate-300 font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Restablecer Filtros
                </button>
              )}
            </div>

            <span className="text-[11px] font-bold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 ml-auto">
              {filteredTickets.length} de {tickets.length} tickets filtrados
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards de Dirección */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Únicos */}
        <div className="bg-white border border-slate-200/80 border-l-4 border-l-indigo-600 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Tickets
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {totalTickets}
            </h3>
            <p className="text-[10px] text-indigo-600 mt-1 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 inline-block"></span>
              En consulta actual
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <TicketIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Tickets Abiertos */}
        <div
          onClick={() => {
            if (onNavigateToPendientes) {
              onNavigateToPendientes();
            } else {
              setEstadoFiltro(estadoFiltro === 'ABIERTOS' ? 'TODOS' : 'ABIERTOS');
            }
          }}
          className="bg-white border border-slate-200/80 border-l-4 border-l-amber-500 p-4 rounded-2xl shadow-xs flex items-center justify-between cursor-pointer hover:border-amber-400 transition-all hover:shadow-md group"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                Tickets Abiertos
              </p>
              <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded group-hover:bg-amber-200 transition-colors">
                Ver Global →
              </span>
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {ticketsAbiertos.length}
            </h3>
            <p className="text-[10px] text-amber-600 mt-1 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse"></span>
              En atención activa (Clic para ver todos)
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 group-hover:bg-amber-100 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0 transition-colors">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Dictámenes de No Utilidad */}
        <div className="bg-white border border-slate-200/80 border-l-4 border-l-purple-600 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
              Dictámenes No Utilidad
            </p>
            <h3 className="text-2xl font-extrabold text-purple-700 mt-0.5">
              {ticketsDictamen.length}
            </h3>
            <p className="text-[10px] text-purple-600 mt-1 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-600 inline-block"></span>
              Requieren dictamen
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Rezagados */}
        <div className="bg-white border border-slate-200/80 border-l-4 border-l-rose-600 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
              Rezagados (≥ 5 Días)
            </p>
            <h3 className="text-2xl font-extrabold text-rose-600 mt-0.5">
              {ticketsOverdue.length}
            </h3>
            <p className="text-[10px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 inline-block"></span>
              Para plantilla de cierre
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Cumplimiento */}
        <div className="bg-white border border-slate-200/80 border-l-4 border-l-emerald-600 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="w-full pr-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                % Cumplimiento
              </p>
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded border bg-emerald-50 border-emerald-200 text-emerald-700">
                {completionRate}%
              </span>
            </div>
            <h3 className="text-2xl font-extrabold text-emerald-700 mt-0.5">
              {completionRate}%
            </h3>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(completionRate, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 font-medium truncate">
              {ticketsCerrados.length} de {totalTickets} resueltos
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl border border-emerald-100 bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Buscador Rápido de Tickets */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscador por Folio ID, solicitante, categoría, artículo, asunto o técnico..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-11 pr-4 py-2.5 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600 hover:text-slate-900 bg-slate-200 px-2 py-1 rounded-lg font-medium cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* RESUMEN EJECUTIVO POR ÁREA Y DESGLOSE POR TÉCNICO (Carga Operativa) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Carga Operativa y Desglose de Tickets por Área</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Haz clic en cualquier técnico para desplegar los tickets que tiene asignados o en atención.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {areasParaMostrar.map((areaKey) => {
            const areaData = resumenPorArea[areaKey];
            const IconoArea = areaData.icono;
            const tecnicosEnArea: [string, Ticket[]][] = Object.entries(areaData.tecnicosMap);

            return (
              <div
                key={areaKey}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4"
              >
                {/* Cabecera del Área */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border ${areaData.color}`}>
                      <IconoArea className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-bold text-slate-900">
                          {areaData.nombre === 'Interinstitucional'
                            ? 'Subdirección Interinstitucional'
                            : `Área de ${areaData.nombre}`}
                        </h4>
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${areaData.bgBadge}`}>
                          {areaData.tickets.length} tickets en total
                        </span>
                        {areaKey === 'Interinstitucional' && (
                          <>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Capacitación: {areaData.capacitaciones.length}
                            </span>
                            {areaData.otrosTipos.length > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                                Otros Tipos: {areaData.otrosTipos.length}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {areaData.abiertos.length} abiertos • {areaData.dictamenes.length} dictámenes requeridos
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold flex-wrap">
                    <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg">
                      Abiertos: {areaData.abiertos.length}
                    </span>
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg">
                      Resueltos: {areaData.tickets.length - areaData.abiertos.length}
                    </span>
                  </div>
                </div>

                {/* Lista de Técnicos del Área con Acordeón de Tickets */}
                {tecnicosEnArea.length === 0 && areaData.sinAsignar.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                    No se encontraron tickets registrados para el área de {areaData.nombre} con los filtros actuales.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {tecnicosEnArea.map(([tecNombre, ticketsDeTecnico]) => {
                      const isExpanded = !!expandedTecnicos[`${areaKey}_${tecNombre}`];
                      const abiertosTec = ticketsDeTecnico.filter((t) => esTicketAbiertoOperativo(t.estado));
                      const dictamenesTec = ticketsDeTecnico.filter((t) => clasificarTipoTrabajo(t).esDictamenNoUtilidad);
                      
                      const tecEnCatalogo = tecnicos.find(
                        (t) =>
                          t.nombre.toLowerCase().trim() === tecNombre.toLowerCase().trim() ||
                          (t.alias && t.alias.some((a) => a.toLowerCase().trim() === tecNombre.toLowerCase().trim()))
                      );
                      const esBuzonInterinstitucional =
                        tecNombre.toLowerCase().includes('interinstitucional') ||
                        tecNombre.toLowerCase().includes('capacita');
                      const esTecnicoFueraDeArea =
                        tecEnCatalogo &&
                        tecEnCatalogo.area &&
                        tecEnCatalogo.area.toLowerCase() !== areaKey.toLowerCase();

                      return (
                        <div
                          key={tecNombre}
                          className="bg-slate-50/70 border border-slate-200/80 rounded-xl overflow-hidden text-xs transition-all"
                        >
                          {/* Fila del Técnico (Click to expand) */}
                          <div
                            onClick={() => toggleTecnicoExpand(`${areaKey}_${tecNombre}`)}
                            className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-100/80 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                                {tecNombre.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900 text-sm block">
                                    {tecNombre}
                                  </span>
                                  {esTecnicoFueraDeArea && (
                                    <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">
                                      Técnico de {tecEnCatalogo.area} (Técnico fuera del área)
                                    </span>
                                  )}
                                  {esBuzonInterinstitucional && (
                                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                                      Buzón Interinstitucional
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-500">
                                  {ticketsDeTecnico.length} tickets asignados ({abiertosTec.length} abiertos)
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-center">
                              <span className="text-[10px] font-bold bg-white text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
                                Total: {ticketsDeTecnico.length}
                              </span>
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md border border-amber-200">
                                Abiertos: {abiertosTec.length}
                              </span>
                              {dictamenesTec.length > 0 && (
                                <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2.5 py-1 rounded-md border border-purple-200">
                                  Dictámenes: {dictamenesTec.length}
                                </span>
                              )}
                              <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Despliegue de Tickets del Técnico */}
                          {isExpanded && (
                            <div className="p-3.5 bg-white border-t border-slate-200/80 space-y-2">
                              <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between pb-1">
                                <span>Listado de Solicitudes ({ticketsDeTecnico.length}):</span>
                                <span className="text-[10px] text-indigo-600">Haz clic en cualquier ticket para ver su detalle completo</span>
                              </div>

                              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                                {ticketsDeTecnico.map((t) => {
                                  const est = evaluarEstado(t.estado);
                                  const clasif = clasificarTipoTrabajo(t);

                                  return (
                                    <div
                                      key={t.id}
                                      onClick={() => onSelectTicket(t)}
                                      className="p-3 hover:bg-indigo-50/40 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors"
                                    >
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px] border border-indigo-100">
                                            #{t.id}
                                          </span>
                                          <span className="font-semibold text-slate-900">
                                            {t.articulo || t.asunto || 'Sin Asunto'}
                                          </span>
                                          {clasif.esDictamenNoUtilidad && (
                                            <span className="text-[9px] font-extrabold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                                              Dictamen
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                                          <span>Solicitante: <strong>{t.solicitante}</strong></span>
                                          <span>•</span>
                                          <span>Fecha: {t.fechaCreacion || 'No registrada'}</span>
                                          {t.tecnicoAsignado && (
                                            <>
                                              <span>•</span>
                                              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-slate-200">
                                                Buzón ServiceDesk: <strong>{t.tecnicoAsignado}</strong>
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 self-start sm:self-center">
                                        <span
                                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                            est.esCerrado
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : est.esCancelado
                                              ? 'bg-rose-100 text-rose-800'
                                              : est.esEnEspera
                                              ? 'bg-amber-100 text-amber-800'
                                              : 'bg-sky-100 text-sky-800'
                                          }`}
                                        >
                                          {t.estado}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Tickets sin Responsable Operativo en esta área */}
                    {areaData.sinAsignar.length > 0 && (
                      <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl overflow-hidden text-xs">
                        <div
                          onClick={() => toggleTecnicoExpand(`${areaKey}_sin_asignar`)}
                          className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-amber-100/50 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <Inbox className="w-5 h-5 text-amber-600 shrink-0" />
                            <div>
                              <span className="font-bold text-amber-950 text-xs block">
                                Sin Responsable Operativo Identificado ({areaData.sinAsignar.length} tickets)
                              </span>
                              <span className="text-[11px] text-amber-800">
                                Solicitudes capturadas en el área {areaData.nombre} donde no se identificó intervención técnica específica.
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold bg-white text-amber-900 px-2.5 py-1 rounded-md border border-amber-200">
                              Total: {areaData.sinAsignar.length}
                            </span>
                            <button className="p-1 text-amber-700 hover:text-amber-900 rounded">
                              {expandedTecnicos[`${areaKey}_sin_asignar`] ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {expandedTecnicos[`${areaKey}_sin_asignar`] && (
                          <div className="p-3.5 bg-white border-t border-amber-200 space-y-2">
                            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                              {areaData.sinAsignar.map((t) => {
                                const est = evaluarEstado(t.estado);
                                const clasif = clasificarTipoTrabajo(t);
                                return (
                                  <div
                                    key={t.id}
                                    onClick={() => onSelectTicket(t)}
                                    className="p-3 hover:bg-amber-50/40 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors"
                                  >
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-[11px] border border-amber-200">
                                          #{t.id}
                                        </span>
                                        <span className="font-semibold text-slate-900">
                                          {t.articulo || t.asunto || 'Sin Asunto'}
                                        </span>
                                        {clasif.esDictamenNoUtilidad && (
                                          <span className="text-[9px] font-extrabold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                                            Dictamen
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                                        <span>Solicitante: <strong>{t.solicitante}</strong></span>
                                        <span>•</span>
                                        <span>Fecha: {t.fechaCreacion || 'No registrada'}</span>
                                        {t.tecnicoAsignado && (
                                          <>
                                            <span>•</span>
                                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                                              Buzón SDP: {t.tecnicoAsignado}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-start sm:self-center">
                                      <span
                                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                          est.esCerrado
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : est.esCancelado
                                            ? 'bg-rose-100 text-rose-800'
                                            : est.esEnEspera
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-sky-100 text-sky-800'
                                        }`}
                                      >
                                        {t.estado}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Gráficas y Distribución por Categoría */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs">
          <h3 className="font-bold text-slate-900 text-base mb-1 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-600" />
            Volumen por Categoría de Solicitud
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Demanda operativa según los filtros seleccionados.
          </p>

          {categoryChartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={categoryChartData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                >
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                    width={150}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      color: '#1e293b',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(value: any) => [`${value} tickets`, 'Volumen']}
                  />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                    {categoryChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 w-full flex flex-col items-center justify-center p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-2">
              <BarChart2 className="w-8 h-8 text-slate-400" />
              <p className="text-xs font-semibold text-slate-600">
                Sin datos suficientes para graficar con los filtros actuales
              </p>
            </div>
          )}
        </div>

        {/* Resumen Porcentual de Categorías */}
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              Distribución Porcentual
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Porcentaje relativo de cada categoría en la consulta.
            </p>

            <div className="overflow-y-auto max-h-56 pr-2 pb-2 space-y-2">
              {categoryChartData.map((item, idx) => {
                const pct =
                  filteredTickets.length > 0
                    ? ((item.total / filteredTickets.length) * 100).toFixed(1)
                    : '0';
                return (
                  <div
                    key={item.fullName}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="font-medium text-slate-700 truncate max-w-[140px]" title={item.fullName}>
                        {item.fullName}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-900">{item.total}</span>
                      <span className="text-indigo-600 text-[10px] ml-1">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
