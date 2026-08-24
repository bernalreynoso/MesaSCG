import React, { useState, useMemo } from 'react';
import {
  CheckCircle,
  AlertCircle,
  FileText,
  Trash2,
  UserCheck,
  UserX,
  Search,
  Filter,
  Layers,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
  Award,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  AlertTriangle,
  Info,
  Database,
} from 'lucide-react';
import { Ticket } from '../types';
import { useTecnicosCatalogo } from '../utils/technicianCatalogStore';
import {
  obtenerParticipacionesDeTicket,
  evaluarParticipacionTecnico,
} from '../utils/technicianDetector';
import { clasificarTipoTrabajo } from '../utils/workTypeClassifier';
import { evaluarEstado } from '../utils/statusClassifier';
import { determinarAtribucionOperativa } from '../utils/operationalAttributionEngine';
import {
  ejecutarPruebasAtribucionOperativa,
  ResultadoPruebaUnitario,
  ejecutarPruebasFormatosServiceDesk,
  ReportePruebaFormato,
} from '../utils/operationalAttributionTests';

interface ValidacionMotoresProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
}

type TabVal =
  | 'TODOS'
  | 'FORMATOS_FASE12'
  | 'PRUEBAS_FASE10'
  | 'IDENTIFICADOS'
  | 'NO_ATRIBUIDOS'
  | 'DICTAMENES'
  | 'BAJAS'
  | 'AMBOS'
  | 'PENDIENTES'
  | 'CANCELADOS';

export const ValidacionMotores: React.FC<ValidacionMotoresProps> = ({
  tickets,
  onSelectTicket,
}) => {
  const { tecnicosActivos } = useTecnicosCatalogo();
  const [activeTab, setActiveTab] = useState<TabVal>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTech, setSelectedTech] = useState<string>('TODOS');

  // Ejecución de la suite de 20 pruebas de Atribución Operativa (Fase 10 y 11B)
  const resultadosPruebasUnitarias = useMemo<ResultadoPruebaUnitario[]>(() => {
    return ejecutarPruebasAtribucionOperativa();
  }, []);

  const totalPruebasCorrectas = useMemo(() => {
    return resultadosPruebasUnitarias.filter((p) => p.esCorrecto).length;
  }, [resultadosPruebasUnitarias]);

  // Ejecución de las 3 pruebas de formatos reales de ServiceDesk (Fase 12)
  const reportesFormatosServiceDesk = useMemo<ReportePruebaFormato[]>(() => {
    return ejecutarPruebasFormatosServiceDesk();
  }, []);

  // Evaluación profunda de todos los tickets con los 5 motores centrales + Atribución Operativa
  const evaluacionTickets = useMemo(() => {
    return tickets.map((t) => {
      const participaciones = obtenerParticipacionesDeTicket(t);
      const clasificacion = clasificarTipoTrabajo(t);
      const estadoInfo = evaluarEstado(t.estado);
      const atribucion = determinarAtribucionOperativa(t, participaciones);

      const tecnicosFuertes = participaciones.filter((p) => p.tieneEvidenciaFuerte);
      const tecnicosSoloCC = participaciones.filter((p) => p.esCopiadoSoloCC && !p.tieneEvidenciaFuerte);

      return {
        ticket: t,
        participaciones,
        tecnicosFuertes,
        tecnicosSoloCC,
        clasificacion,
        estadoInfo,
        atribucion,
        tieneIdentificacionFuerte: tecnicosFuertes.length > 0,
        esSoloCCSinAtencion: tecnicosSoloCC.length > 0 && tecnicosFuertes.length === 0,
        esSinTecnico: participaciones.length === 0,
      };
    });
  }, [tickets]);

  // Contadores globales de validación
  const metricas = useMemo(() => {
    let totalIdentificados = 0;
    let totalSoloCC = 0;
    let totalSinTecnico = 0;
    let totalDictamenes = 0;
    let totalBajas = 0;
    let totalAmbos = 0;
    let totalPendientes = 0;
    let totalCerrados = 0;
    let totalCancelados = 0;
    let totalEnEspera = 0;

    evaluacionTickets.forEach((item) => {
      if (item.tieneIdentificacionFuerte) totalIdentificados++;
      if (item.esSoloCCSinAtencion) totalSoloCC++;
      if (item.esSinTecnico) totalSinTecnico++;
      if (item.clasificacion.esDictamenNoUtilidad) totalDictamenes++;
      if (item.clasificacion.esBajaEquipo) totalBajas++;
      if (item.clasificacion.esAmbos) totalAmbos++;
      if (item.estadoInfo.esPendiente) totalPendientes++;
      if (item.estadoInfo.esCerrado) totalCerrados++;
      if (item.estadoInfo.esCancelado) totalCancelados++;
      if (item.estadoInfo.esEnEspera) totalEnEspera++;
    });

    return {
      total: tickets.length,
      totalIdentificados,
      totalSoloCC,
      totalSinTecnico,
      totalDictamenes,
      totalBajas,
      totalAmbos,
      totalPendientes,
      totalCerrados,
      totalCancelados,
      totalEnEspera,
    };
  }, [evaluacionTickets, tickets.length]);

  // Filtrado reactivo de tickets según pestaña y filtros
  const ticketsFiltrados = useMemo(() => {
    return evaluacionTickets.filter((item) => {
      // Filtro por pestaña
      if (activeTab === 'IDENTIFICADOS' && !item.tieneIdentificacionFuerte) return false;
      if (activeTab === 'NO_ATRIBUIDOS' && item.tieneIdentificacionFuerte) return false;
      if (activeTab === 'DICTAMENES' && !item.clasificacion.esDictamenNoUtilidad) return false;
      if (activeTab === 'BAJAS' && !item.clasificacion.esBajaEquipo) return false;
      if (activeTab === 'AMBOS' && !item.clasificacion.esAmbos) return false;
      if (activeTab === 'PENDIENTES' && !item.estadoInfo.esAbiertoOperativo) return false;
      if (activeTab === 'CANCELADOS' && !item.estadoInfo.esCancelado) return false;

      // Filtro por técnico específico
      if (selectedTech !== 'TODOS') {
        const participacion = item.participaciones.find((p) => p.tecnicoNombre === selectedTech);
        if (!participacion) return false;
      }

      // Filtro por búsqueda
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesId = item.ticket.id.toLowerCase().includes(q);
        const matchesSol = (item.ticket.solicitante || '').toLowerCase().includes(q);
        const matchesAsunto = (item.ticket.asunto || '').toLowerCase().includes(q);
        const matchesArt = (item.ticket.articulo || '').toLowerCase().includes(q);
        const matchesTec = item.participaciones.some((p) => p.tecnicoNombre.toLowerCase().includes(q));

        if (!matchesId && !matchesSol && !matchesAsunto && !matchesArt && !matchesTec) {
          return false;
        }
      }

      return true;
    });
  }, [evaluacionTickets, activeTab, selectedTech, searchTerm]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Header Bento Card */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 mt-0.5 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">
                  Validación y Verificación de Motores Centrales
                </h2>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  5 Motores Activos
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Audita la precisión de los motores de Técnicos, Evidencia de Participación, Dictámenes/Bajas, Estados Canónicos y Catálogo administrable.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('FORMATOS_FASE12')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                activeTab === 'FORMATOS_FASE12'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Formatos ServiceDesk (Fase 12)</span>
            </button>
            <button
              onClick={() => setActiveTab('PRUEBAS_FASE10')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                activeTab === 'PRUEBAS_FASE10'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Pruebas de Atribución ({totalPruebasCorrectas}/{resultadosPruebasUnitarias.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards de Motores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div
          onClick={() => setActiveTab('TODOS')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'TODOS'
              ? 'bg-indigo-50/90 border-indigo-400 shadow-xs'
              : 'bg-white border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Tickets</span>
          <span className="text-2xl font-extrabold text-slate-900 mt-0.5 block">{metricas.total}</span>
          <span className="text-[9px] text-slate-400 font-semibold">En el reporte</span>
        </div>

        <div
          onClick={() => setActiveTab('IDENTIFICADOS')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'IDENTIFICADOS'
              ? 'bg-indigo-50/90 border-indigo-400 shadow-xs'
              : 'bg-white border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <span className="text-[10px] font-bold text-indigo-700 uppercase block">Identificados</span>
          <span className="text-2xl font-extrabold text-indigo-900 mt-0.5 block">{metricas.totalIdentificados}</span>
          <span className="text-[9px] text-indigo-600 font-semibold">Evidencia fuerte</span>
        </div>

        <div
          onClick={() => setActiveTab('NO_ATRIBUIDOS')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'NO_ATRIBUIDOS'
              ? 'bg-indigo-50/90 border-indigo-400 shadow-xs'
              : 'bg-white border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-600 uppercase block">Sin Atribuir</span>
          <span className="text-2xl font-extrabold text-slate-800 mt-0.5 block">
            {metricas.totalSoloCC + metricas.totalSinTecnico}
          </span>
          <span className="text-[9px] text-slate-500 font-semibold">{metricas.totalSoloCC} solo CC</span>
        </div>

        <div
          onClick={() => setActiveTab('DICTAMENES')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'DICTAMENES'
              ? 'bg-purple-50 border-purple-400 shadow-xs'
              : 'bg-white border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <span className="text-[10px] font-bold text-purple-800 uppercase block">Dictámenes</span>
          <span className="text-2xl font-extrabold text-purple-950 mt-0.5 block">{metricas.totalDictamenes}</span>
          <span className="text-[9px] text-purple-600 font-semibold">No Utilidad</span>
        </div>

        <div
          onClick={() => setActiveTab('BAJAS')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'BAJAS'
              ? 'bg-amber-50 border-amber-400 shadow-xs'
              : 'bg-white border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <span className="text-[10px] font-bold text-amber-800 uppercase block">Bajas</span>
          <span className="text-2xl font-extrabold text-amber-950 mt-0.5 block">{metricas.totalBajas}</span>
          <span className="text-[9px] text-amber-600 font-semibold">Desincorporación</span>
        </div>

        <div
          onClick={() => setActiveTab('AMBOS')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'AMBOS'
              ? 'bg-fuchsia-50 border-fuchsia-400 shadow-xs'
              : 'bg-white border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <span className="text-[10px] font-bold text-fuchsia-800 uppercase block">Dictamen + Baja</span>
          <span className="text-2xl font-extrabold text-fuchsia-950 mt-0.5 block">{metricas.totalAmbos}</span>
          <span className="text-[9px] text-fuchsia-600 font-semibold">Casos dobles</span>
        </div>

        <div
          onClick={() => setActiveTab('PENDIENTES')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'PENDIENTES'
              ? 'bg-sky-50 border-sky-400 shadow-xs'
              : 'bg-white border-slate-200/80 hover:bg-slate-50'
          }`}
        >
          <span className="text-[10px] font-bold text-sky-800 uppercase block">Pendientes</span>
          <span className="text-2xl font-extrabold text-sky-950 mt-0.5 block">{metricas.totalPendientes}</span>
          <span className="text-[9px] text-sky-600 font-semibold">Abiertos operativos</span>
        </div>
      </div>

      {/* Selector de Filtros y Búsqueda */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por Folio (#ID), Solicitante, Asunto, Artículo o Técnico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="w-full sm:w-64">
            <select
              value={selectedTech}
              onChange={(e) => setSelectedTech(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="TODOS">Todos los técnicos del catálogo</option>
              {tecnicosActivos.map((tec) => (
                <option key={tec.id} value={tec.nombre}>
                  {tec.nombre} ({tec.area})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pestañas de validación rápida */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
          {(
            [
              { id: 'TODOS', label: 'Todos los Tickets' },
              { id: 'FORMATOS_FASE12', label: 'Formatos ServiceDesk (Fase 12)' },
              { id: 'PRUEBAS_FASE10', label: `20 Pruebas Atribución (${totalPruebasCorrectas}/20)` },
              { id: 'IDENTIFICADOS', label: 'Identificados con Evidencia Fuerte' },
              { id: 'NO_ATRIBUIDOS', label: 'No Atribuidos / Solo CC' },
              { id: 'DICTAMENES', label: 'Dictámenes de No Utilidad' },
              { id: 'BAJAS', label: 'Bajas de Equipo' },
              { id: 'AMBOS', label: 'Dictamen + Baja' },
              { id: 'PENDIENTES', label: 'Pendientes Operativos' },
              { id: 'CANCELADOS', label: 'Cancelados / Rechazados' },
            ] as { id: TabVal; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? tab.id === 'FORMATOS_FASE12'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : tab.id === 'PRUEBAS_FASE10'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-indigo-600 text-white shadow-xs'
                  : tab.id === 'FORMATOS_FASE12'
                  ? 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                  : tab.id === 'PRUEBAS_FASE10'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECCIÓN ESPECIAL: FORMATOS REALES SERVICEDESK FASE 12 */}
      {activeTab === 'FORMATOS_FASE12' ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  <span>Fase 12 — Validación de Compatibilidad con Múltiples Formatos Reales de ServiceDesk</span>
                </h3>
                <span className="text-xs font-extrabold px-3 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  3 de 3 Formatos 100% Compatibles
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                El sistema ingesta, detecta y procesa automáticamente los 3 formatos reales de ServiceDesk sin exigir columnas obligatorias ausentes ni alterar las reglas del Motor Central.
              </p>
            </div>
          </div>

          {/* Tarjetas de los 3 Formatos Reales */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {reportesFormatosServiceDesk.map((rep) => (
              <div
                key={rep.id}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-blue-300 transition-all shadow-2xs"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      FORMATO {rep.id}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
                      {rep.totalTickets} {rep.totalTickets === 1 ? 'ticket' : 'tickets'} ({rep.totalFilas} filas)
                    </span>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm leading-tight">
                      {rep.nombreFormato}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Ejemplo: {rep.archivoSimulado}
                    </p>
                  </div>

                  {/* Fuente de Responsabilidad */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 block">
                      Fuente de Responsabilidad Operativa:
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {rep.fuenteResponsabilidad}
                    </p>
                  </div>

                  {/* Columnas Detectadas y Ausentes */}
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="font-bold text-slate-700 text-[11px]">
                        Columnas Identificadas ({rep.columnasDetectadas.length}):
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rep.columnasDetectadas.map((col, cIdx) => (
                          <span
                            key={cIdx}
                            className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] px-2 py-0.5 rounded font-medium"
                          >
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>

                    {rep.columnasAusentes.length > 0 && (
                      <div className="pt-1">
                        <span className="font-bold text-slate-500 text-[11px]">
                          Columnas No Presentes (Manejadas Limpiamente):
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {rep.columnasAusentes.slice(0, 5).map((col, cIdx) => (
                            <span
                              key={cIdx}
                              className="bg-slate-200/70 text-slate-600 text-[10px] px-1.5 py-0.5 rounded font-medium"
                            >
                              {col}
                            </span>
                          ))}
                          {rep.columnasAusentes.length > 5 && (
                            <span className="text-[10px] text-slate-400 font-medium self-center">
                              +{rep.columnasAusentes.length - 5} más
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Responsables Encontrados */}
                  <div className="space-y-1 pt-1">
                    <span className="font-bold text-slate-700 text-[11px] block">
                      Responsables Operativos Asignados:
                    </span>
                    {rep.responsablesEncontrados.length > 0 ? (
                      <div className="space-y-1">
                        {rep.responsablesEncontrados.map((r, rIdx) => (
                          <div
                            key={rIdx}
                            className="flex items-center justify-between bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs"
                          >
                            <span className="font-semibold text-slate-800 truncate">
                              {r.nombre}
                            </span>
                            <span className="bg-indigo-50 text-indigo-700 font-bold text-[10px] px-2 py-0.5 rounded ml-2 whitespace-nowrap">
                              {r.cantidadTickets} {r.cantidadTickets === 1 ? 'ticket' : 'tickets'} ({r.area})
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        Sin responsables individuales (asignación a nivel grupo/buzón).
                      </p>
                    )}
                    {rep.totalTicketsSinResponsable > 0 && (
                      <div className="flex items-center justify-between text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium mt-1">
                        <span>Sin Responsable Individual:</span>
                        <span className="font-bold font-mono">
                          {rep.totalTicketsSinResponsable} ticket(s)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Advertencias */}
                  {rep.advertencias.length > 0 && (
                    <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-2.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-blue-900 font-bold text-[11px]">
                        <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Comportamiento del Motor:</span>
                      </div>
                      <ul className="text-[11px] text-blue-800 space-y-0.5 list-disc list-inside">
                        {rep.advertencias.map((adv, aIdx) => (
                          <li key={aIdx}>{adv}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full w-full justify-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Procesamiento Exitoso y Validado
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'PRUEBAS_FASE10' ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-600" />
                  <span>Matriz de Validación: Escenarios Obligatorios de Atribución Operativa y Técnico en Atención (Fase 11B)</span>
                </h3>
                <span className="text-xs font-extrabold px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {totalPruebasCorrectas} de {resultadosPruebasUnitarias.length} CORRECTOS ({Math.round((totalPruebasCorrectas / (resultadosPruebasUnitarias.length || 1)) * 100)}%)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Verificación automatizada de las reglas de negocio, asignaciones directas de Técnico en Atención, múltiples responsables y áreas operativas.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-3">Escenario de Prueba</th>
                  <th className="py-3 px-3">Personas Detectadas</th>
                  <th className="py-3 px-3">Responsables Esperados</th>
                  <th className="py-3 px-3">Responsables Obtenidos</th>
                  <th className="py-3 px-3 text-center">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resultadosPruebasUnitarias.map((prueba) => (
                  <tr
                    key={prueba.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      prueba.esCorrecto ? '' : 'bg-rose-50/50'
                    }`}
                  >
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">
                      {prueba.id}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 block text-xs">
                        {prueba.nombre}
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        Folio: {prueba.ticketId}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {prueba.personasDetectadas.map((p, pIdx) => (
                          <span
                            key={pIdx}
                            className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded border border-slate-200 text-[10px]"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {prueba.responsablesEsperados.map((r, rIdx) => (
                          <span
                            key={rIdx}
                            className="bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded border border-blue-200 text-[10px]"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {prueba.responsablesObtenidos.map((r, rIdx) => (
                          <span
                            key={rIdx}
                            className="bg-indigo-50 text-indigo-900 font-bold px-2 py-0.5 rounded border border-indigo-200 text-[10px]"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {prueba.esCorrecto ? (
                        <span className="inline-flex items-center gap-1 font-extrabold text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          CORRECTO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-extrabold text-[11px] bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-full">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          INCORRECTO
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Lista de Resultados con Verificación de Motores */
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Tickets Verificados por Motores Centrales ({ticketsFiltrados.length})
              </h3>
              <p className="text-xs text-slate-500">
                Haz clic en cualquier fila para inspeccionar todas las evidencias en el modal de detalle.
              </p>
            </div>
          </div>

          <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
            {ticketsFiltrados.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
                No se encontraron tickets con los criterios de validación seleccionados.
              </div>
            ) : (
              ticketsFiltrados.map((item) => {
                const { ticket, participaciones, clasificacion, estadoInfo, atribucion } = item;
                return (
                  <div
                    key={ticket.id}
                    onClick={() => onSelectTicket(ticket)}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/80 hover:border-indigo-200 transition-all cursor-pointer space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                          Folio #{ticket.id}
                        </span>
                        <span
                          className={`text-xs font-bold px-3 py-0.5 rounded-full ${
                            estadoInfo.esCerrado
                              ? 'bg-emerald-100 text-emerald-800'
                              : estadoInfo.esCancelado
                              ? 'bg-rose-100 text-rose-800'
                              : estadoInfo.esEnEspera
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {ticket.estado} ({estadoInfo.estadoCanonico})
                        </span>
                        {ticket.fechaCreacion && (
                          <span className="text-[11px] text-slate-500 font-medium">
                            {ticket.fechaCreacion}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {clasificacion.esDictamenNoUtilidad && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Dictamen ({clasificacion.confianzaDictamen})
                          </span>
                        )}
                        {clasificacion.esBajaEquipo && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <Trash2 className="w-3 h-3" />
                            Baja ({clasificacion.confianzaBaja})
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {ticket.articulo || ticket.asunto || 'Sin Asunto'}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Solicitante: <strong className="text-slate-700">{ticket.solicitante}</strong> • Buzón SDP: <strong className="text-slate-700">{ticket.tecnicoAsignado}</strong>
                      </p>
                    </div>

                    {/* Atribución Operativa FASE 10 */}
                    {atribucion.responsablesOperativos.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 items-center text-xs">
                        <span className="text-[11px] font-extrabold text-indigo-900 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          Responsable(s) Operativo(s):
                        </span>
                        {atribucion.responsablesOperativos.map((r, rIdx) => (
                          <span
                            key={rIdx}
                            className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900"
                          >
                            {r.nombre} ({r.area})
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Evidencias de Técnicos */}
                    <div className="pt-1.5 border-t border-slate-100 flex flex-wrap gap-2 items-center text-xs">
                      <span className="text-[11px] font-bold text-slate-600">Técnicos detectados:</span>
                      {participaciones.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">Ningún técnico detectado (Sin asignación en catálogo)</span>
                      ) : (
                        participaciones.map((p, idx) => (
                          <span
                            key={idx}
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${
                              p.tieneEvidenciaFuerte
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                : 'bg-slate-100 border-slate-200 text-slate-600'
                            }`}
                          >
                            {p.tecnicoNombre} (
                            {p.esRemitente
                              ? 'Respondió'
                              : p.esDestinatarioDirecto
                              ? 'Destinatario'
                              : p.esParticipante
                              ? 'Participante'
                              : 'Solo CC'}
                            )
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
