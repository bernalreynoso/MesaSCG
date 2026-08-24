import React, { useState, useMemo } from 'react';
import {
  Users,
  Filter,
  PieChart as PieIcon,
  BarChart2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Building2,
  GraduationCap,
  Layers,
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
import {
  evaluarEstado,
  esTicketAbiertoOperativo,
  esTicketCerrado,
  esTicketCancelado,
  esTicketEnEspera,
} from '../utils/statusClassifier';
import { determinarAreaTicket } from '../utils/areaClassifier';
import { determinarAtribucionOperativa } from '../utils/operationalAttributionEngine';

interface DashboardInterinstitucionalProps {
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

export const DashboardInterinstitucional: React.FC<DashboardInterinstitucionalProps> = ({
  tickets,
  onSelectTicket,
  onLoadDemoData,
}) => {
  const { tecnicosInterinstitucionalActivos, tecnicosActivos } = useTecnicosCatalogo();

  // Lista de técnicos activos de la Subdirección Interinstitucional
  const tecnicosDisponibles = useMemo(() => {
    if (tecnicosInterinstitucionalActivos.length > 0) {
      return tecnicosInterinstitucionalActivos;
    }
    return tecnicosActivos.filter((t) => t.area === 'Interinstitucional');
  }, [tecnicosInterinstitucionalActivos, tecnicosActivos]);

  const [selectedTechName, setSelectedTechName] = useState<string>(() => {
    return tecnicosDisponibles[0]?.nombre || 'Dora Mercedes Montaño';
  });

  const techInfo = useMemo(() => {
    const found = tecnicosDisponibles.find((t) => t.nombre === selectedTechName);
    return (
      found || {
        nombre: selectedTechName,
        correoPrincipal: 'interinstitucional@scg.cdmx.gob.mx',
        area: 'Interinstitucional',
      }
    );
  }, [tecnicosDisponibles, selectedTechName]);

  // Estados de filtros
  const [filterTipoSolicitud, setFilterTipoSolicitud] = useState<string>('TODOS');
  const [filterEstado, setFilterEstado] = useState<string>('TODOS');
  const [filterNivel, setFilterNivel] = useState<NivelParticipacionFiltro>('TODOS_INCLUYENDO_CC');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<'id' | 'fechaCreacion' | 'estado' | 'tipo'>('fechaCreacion');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // 1. Filtrar los tickets del universo Interinstitucional o del técnico seleccionado
  const ticketsAreaInterinstitucional = useMemo(() => {
    return tickets.filter((t) => {
      const area = determinarAreaTicket(t);
      return area === 'Interinstitucional';
    });
  }, [tickets]);

  // Evaluar participaciones y atribuciones de los tickets para el técnico seleccionado
  const ticketsEvaluadosTecnico = useMemo(() => {
    return tickets.map((t) => {
      const perfil = obtenerPerfilTecnicoEnTicket(t, techInfo.nombre);
      const estadoInfo = evaluarEstado(t.estado);
      const area = determinarAreaTicket(t);
      const atribucion = determinarAtribucionOperativa(t);
      const techNorm = normalizarTexto(techInfo.nombre);
      const esResponsable = atribucion.nombresResponsables.some((n) => {
        const norm = normalizarTexto(n);
        return norm === techNorm || norm.includes(techNorm) || techNorm.includes(norm);
      });

      return {
        ticket: t,
        perfil,
        estadoInfo,
        area,
        atribucion,
        esResponsable,
      };
    });
  }, [tickets, techInfo.nombre]);

  // Lista de todos los tipos de solicitud disponibles en el área Interinstitucional
  const tiposSolicitudDisponibles = useMemo(() => {
    const setTipos = new Set<string>();
    ticketsAreaInterinstitucional.forEach((t) => {
      if (t.tipoSolicitud) setTipos.add(t.tipoSolicitud);
    });
    return Array.from(setTipos).sort();
  }, [ticketsAreaInterinstitucional]);

  // Tickets asociados al técnico según atribución operativa o evidencia directa
  const ticketsDelTecnico = useMemo(() => {
    return ticketsEvaluadosTecnico.filter((item) => {
      if (item.esResponsable || item.perfil.tieneEvidenciaFuerte || item.perfil.esParticipante) return true;
      return false;
    });
  }, [ticketsEvaluadosTecnico]);

  // Métricas y KPIs
  const metricas = useMemo(() => {
    let totalGeneral = ticketsDelTecnico.length;
    let cerrados = 0;
    let abiertos = 0;
    let enEspera = 0;
    let cancelados = 0;
    let totalCapacitacion = 0;
    let totalOtrosTipos = 0;

    const porTipoMap = new Map<string, number>();

    ticketsDelTecnico.forEach(({ ticket, estadoInfo }) => {
      if (esTicketCerrado(ticket.estado)) cerrados++;
      else if (esTicketCancelado(ticket.estado)) cancelados++;
      else if (esTicketEnEspera(ticket.estado)) enEspera++;
      else if (esTicketAbiertoOperativo(ticket.estado)) abiertos++;

      const tipo = ticket.tipoSolicitud || 'No especificado';
      porTipoMap.set(tipo, (porTipoMap.get(tipo) || 0) + 1);

      if (tipo.toLowerCase().includes('capacita')) {
        totalCapacitacion++;
      } else {
        totalOtrosTipos++;
      }
    });

    const dataPorTipo = Array.from(porTipoMap.entries()).map(([name, value]) => ({
      name,
      value,
    })).sort((a, b) => b.value - a.value);

    const tasaResolucion = totalGeneral > 0 ? Math.round((cerrados / totalGeneral) * 100) : 0;

    return {
      totalGeneral,
      cerrados,
      abiertos,
      enEspera,
      cancelados,
      totalCapacitacion,
      totalOtrosTipos,
      tasaResolucion,
      dataPorTipo,
    };
  }, [ticketsDelTecnico]);

  // Filtrado final de la tabla
  const ticketsFiltrados = useMemo(() => {
    return ticketsDelTecnico
      .filter(({ ticket, perfil, estadoInfo }) => {
        // Filtro de tipo de solicitud
        if (filterTipoSolicitud !== 'TODOS') {
          if (filterTipoSolicitud === 'CAPACITACION') {
            if (!String(ticket.tipoSolicitud || '').toLowerCase().includes('capacita')) return false;
          } else if (filterTipoSolicitud === 'OTROS') {
            if (String(ticket.tipoSolicitud || '').toLowerCase().includes('capacita')) return false;
          } else if (ticket.tipoSolicitud !== filterTipoSolicitud) {
            return false;
          }
        }

        // Filtro de estado
        if (filterEstado !== 'TODOS') {
          if (filterEstado === 'ABIERTOS' && !estadoInfo.esAbiertoOperativo) return false;
          if (filterEstado === 'CERRADOS' && !estadoInfo.esCerrado) return false;
          if (filterEstado === 'EN_ESPERA' && !estadoInfo.esEnEspera) return false;
          if (filterEstado === 'CANCELADOS' && !estadoInfo.esCancelado) return false;
        }

        // Filtro de nivel de participación
        if (filterNivel === 'FUERTE' && !perfil.tieneEvidenciaFuerte) return false;
        if (filterNivel === 'RESPUESTA' && !perfil.esRemitenteRespuesta) return false;
        if (filterNivel === 'SOLO_DESTINATARIO' && !perfil.esDestinatarioAsignado) return false;
        if (filterNivel === 'SOLO_CC' && !perfil.esCopiadoSoloCC) return false;

        // Búsqueda
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const matchesId = ticket.id.toLowerCase().includes(q);
          const matchesSol = (ticket.solicitante || '').toLowerCase().includes(q);
          const matchesArt = (ticket.articulo || '').toLowerCase().includes(q);
          const matchesAsunto = (ticket.asunto || '').toLowerCase().includes(q);
          const matchesTipo = (ticket.tipoSolicitud || '').toLowerCase().includes(q);

          if (!matchesId && !matchesSol && !matchesArt && !matchesAsunto && !matchesTipo) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a.ticket.fechaCreacion || '';
        let valB: any = b.ticket.fechaCreacion || '';

        if (sortField === 'id') {
          valA = Number(a.ticket.id) || a.ticket.id;
          valB = Number(b.ticket.id) || b.ticket.id;
        } else if (sortField === 'estado') {
          valA = a.ticket.estado || '';
          valB = b.ticket.estado || '';
        } else if (sortField === 'tipo') {
          valA = a.ticket.tipoSolicitud || '';
          valB = b.ticket.tipoSolicitud || '';
        }

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [
    ticketsDelTecnico,
    filterTipoSolicitud,
    filterEstado,
    filterNivel,
    searchTerm,
    sortField,
    sortAsc,
  ]);

  const COLORS_TIPO = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  const handleSort = (field: 'id' | 'fechaCreacion' | 'estado' | 'tipo') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleResetFilters = () => {
    setFilterTipoSolicitud('TODOS');
    setFilterEstado('TODOS');
    setFilterNivel('TODOS_INCLUYENDO_CC');
    setSearchTerm('');
  };

  if (tickets.length === 0) {
    return <EmptyState onImportDemo={onLoadDemoData} />;
  }

  return (
    <div id="control-tecnicos-interinstitucional" className="space-y-6 animate-fade-in text-slate-800">
      {/* Header Bento Card */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 mt-0.5 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">
                  Control de Técnicos — Subdirección Interinstitucional
                </h2>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                  ÁREA: INTERINSTITUCIONAL
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Monitoreo operativo de tickets de la Subdirección Interinstitucional (incluye Capacitación y demás tipos de solicitud).
              </p>
            </div>
          </div>

          {/* Selector de Técnico */}
          <div className="flex items-center gap-3">
            <label htmlFor="select-tecnico-interinstitucional" className="text-xs font-bold text-slate-700 whitespace-nowrap">
              Técnico / Responsable:
            </label>
            <select
              id="select-tecnico-interinstitucional"
              value={selectedTechName}
              onChange={(e) => setSelectedTechName(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 p-2.5 font-semibold shadow-2xs"
            >
              {tecnicosDisponibles.map((tec) => (
                <option key={tec.id || tec.nombre} value={tec.nombre}>
                  {tec.nombre} ({tec.correoPrincipal})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div id="kpi-total-interinstitucional" className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">Total Asignados</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metricas.totalGeneral}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">Tickets vinculados</div>
        </div>

        <div id="kpi-capacitacion-interinstitucional" className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">Capacitación</span>
            <GraduationCap className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-600">{metricas.totalCapacitacion}</div>
          <div className="text-[11px] text-indigo-600 font-bold mt-0.5">Tipo: Capacitación</div>
        </div>

        <div id="kpi-otros-interinstitucional" className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">Otros Tipos</span>
            <BookOpen className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-black text-cyan-700">{metricas.totalOtrosTipos}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">Otras solicitudes</div>
        </div>

        <div id="kpi-cerrados-interinstitucional" className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">Cerrados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{metricas.cerrados}</div>
          <div className="text-[11px] text-emerald-600 font-bold mt-0.5">{metricas.tasaResolucion}% resolución</div>
        </div>

        <div id="kpi-abiertos-interinstitucional" className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">Abiertos / Trámite</span>
            <AlertCircle className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-sky-700">{metricas.abiertos}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">Pendientes de atención</div>
        </div>

        <div id="kpi-espera-interinstitucional" className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">En Espera / Canc.</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-700">{metricas.enEspera + metricas.cancelados}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">En pausa o cancelados</div>
        </div>
      </div>

      {/* Gráficas Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribución por Tipo de Solicitud */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Distribución por Tipo de Solicitud</h3>
              <p className="text-xs text-slate-500">Separación entre Capacitación y demás tipos en Interinstitucional</p>
            </div>
            <BarChart2 className="w-4 h-4 text-slate-400" />
          </div>
          {metricas.dataPorTipo.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-slate-400">
              Sin datos de tipo de solicitud
            </div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricas.dataPorTipo} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} width={130} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 6, 6, 0]}>
                    {metricas.dataPorTipo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_TIPO[index % COLORS_TIPO.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Resumen Operativo de la Subdirección */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Reglas de Negocio Interinstitucional</h3>
                <p className="text-xs text-slate-500">Subdirección y Catálogos Operativos</p>
              </div>
              <GraduationCap className="w-4 h-4 text-indigo-600" />
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 mt-2">
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">Subdirección Oficial:</strong> Interinstitucional es el área ejecutiva formal. Capacitación es un tipo de solicitud dependiente de esta subdirección.
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">Responsable Operativa:</strong> Dora Mercedes Montaño es la responsable primaria asignada a los requerimientos de la Subdirección Interinstitucional.
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">Independencia Operativa:</strong> Las solicitudes de Interinstitucional no se mezclan con las cargas de Soporte ni Informática.
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Técnico Seleccionado: <strong className="text-slate-800">{techInfo.nombre}</strong></span>
            <span className="font-bold text-indigo-600">{techInfo.correoPrincipal}</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Búsqueda rápida */}
          <div className="relative flex-1">
            <input
              id="search-input-interinstitucional"
              type="text"
              placeholder="Buscar por folio, solicitante, artículo, asunto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
            />
          </div>

          {/* Filtros Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro Tipo de Solicitud */}
            <select
              id="filter-tipo-solicitud-interinstitucional"
              value={filterTipoSolicitud}
              onChange={(e) => setFilterTipoSolicitud(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2 font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="TODOS">Todos los Tipos de Solicitud</option>
              <option value="CAPACITACION">Solo Tipo: CAPACITACIÓN</option>
              <option value="OTROS">Solo Otros Tipos (No Capacitación)</option>
              {tiposSolicitudDisponibles.map((tipo) => (
                <option key={tipo} value={tipo}>
                  Tipo: {tipo}
                </option>
              ))}
            </select>

            {/* Filtro Estado */}
            <select
              id="filter-estado-interinstitucional"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2 font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="ABIERTOS">Solo Abiertos</option>
              <option value="CERRADOS">Solo Cerrados</option>
              <option value="EN_ESPERA">Solo En Espera</option>
              <option value="CANCELADOS">Solo Cancelados</option>
            </select>

            {/* Filtro Nivel de Participación */}
            <select
              id="filter-nivel-interinstitucional"
              value={filterNivel}
              onChange={(e) => setFilterNivel(e.target.value as NivelParticipacionFiltro)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2 font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="TODOS_INCLUYENDO_CC">Toda Evidencia</option>
              <option value="FUERTE">Solo Evidencia Fuerte</option>
              <option value="RESPUESTA">Solo con Respuestas</option>
              <option value="SOLO_CC">Solo en Copia (CC)</option>
            </select>

            <button
              id="btn-reset-filters-interinstitucional"
              onClick={handleResetFilters}
              title="Restablecer filtros"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Resumen del conteo de resultados */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            Mostrando <strong>{ticketsFiltrados.length}</strong> de <strong>{ticketsDelTecnico.length}</strong> tickets vinculados a {techInfo.nombre}
          </span>
          {filterTipoSolicitud !== 'TODOS' && (
            <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              Filtro Activo: {filterTipoSolicitud}
            </span>
          )}
        </div>
      </div>

      {/* Tabla de Tickets */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th
                  onClick={() => handleSort('id')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Folio
                    {sortField === 'id' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('fechaCreacion')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Fecha
                    {sortField === 'fechaCreacion' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('tipo')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Tipo de Solicitud
                    {sortField === 'tipo' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="py-3 px-4">Artículo / Asunto</th>
                <th className="py-3 px-4">Solicitante</th>
                <th
                  onClick={() => handleSort('estado')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Estado
                    {sortField === 'estado' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="py-3 px-4">Evidencia / Rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ticketsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No se encontraron tickets con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                ticketsFiltrados.map(({ ticket, perfil, estadoInfo, esResponsable }) => {
                  const esCapacitacion = String(ticket.tipoSolicitud || '').toLowerCase().includes('capacita');

                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => onSelectTicket(ticket)}
                      className="hover:bg-indigo-50/30 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-bold text-indigo-700">#{ticket.id}</td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {ticket.fechaCreacion?.split(' ')[0] || 'Sin fecha'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            esCapacitacion
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                          }`}
                        >
                          {ticket.tipoSolicitud || 'No especificado'}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate font-medium text-slate-900" title={ticket.articulo || ticket.asunto}>
                        {ticket.articulo || ticket.asunto || 'Sin asunto'}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={ticket.solicitante}>
                        {ticket.solicitante}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {esResponsable && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                              Responsable Operativo
                            </span>
                          )}
                          {perfil.esRemitenteRespuesta && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                              Respondió
                            </span>
                          )}
                          {perfil.esCopiadoSoloCC && !perfil.tieneEvidenciaFuerte && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                              Solo CC
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
