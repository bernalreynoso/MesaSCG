import React, { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardGeneral } from './components/DashboardGeneral';
import { AuditoriaCatalogo } from './components/AuditoriaCatalogo';
import { ModuloCalidad } from './components/ModuloCalidad';
import { DashboardSoporte } from './components/DashboardSoporte';
import { DashboardInformatica } from './components/DashboardInformatica';
import { DashboardInterinstitucional } from './components/DashboardInterinstitucional';
import { AdministracionTecnicos } from './components/AdministracionTecnicos';
import { ValidacionMotores } from './components/ValidacionMotores';
import { ColumnMapperModal } from './components/ColumnMapperModal';
import { TicketDetailModal } from './components/TicketDetailModal';

import { Ticket, ColumnMapping, ViewType } from './types';
import { MOCK_TICKETS } from './data/mockData';
import { autoDetectMapping, parseRowsToTickets } from './utils/columnMapper';
import { isTicketOverdue } from './utils/businessDays';
import { BUZONES_PERMITIDOS, TECNICOS_SOPORTE_PROHIBIDOS_SISTEMAS } from './data/catalogs';

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>(MOCK_TICKETS);
  const [fileName, setFileName] = useState<string | null>(
    'Reporte_Ejemplo_ServiceDesk.xlsx'
  );
  const [availableColumns, setAvailableColumns] = useState<string[]>([
    'ID Original',
    'Estado',
    'Fecha de Creación',
    'Técnico Asignado',
    'Categoría',
    'Subcategoría',
    'Artículo',
    'Tipo de Solicitud',
    'Nombre del Solicitante',
    'Correo Electrónico del Destinatario de la Conversación',
    'Participantes del Equipo',
    'Participantes de Mesa de Ayuda',
  ]);
  const [mapping, setMapping] = useState<ColumnMapping>(
    autoDetectMapping(availableColumns)
  );
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [currentView, setCurrentView] = useState<ViewType>('dashboard_general');
  const [isColumnMapperOpen, setIsColumnMapperOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Handle Loading uploaded tickets
  const handleTicketsLoaded = (
    newTickets: Ticket[],
    newColumns: string[],
    newMapping: ColumnMapping,
    newFileName: string,
    newRawRows?: Record<string, any>[]
  ) => {
    setTickets(newTickets);
    setAvailableColumns(newColumns);
    setMapping(newMapping);
    setFileName(newFileName);
    if (newRawRows) {
      setRawRows(newRawRows);
    }
  };

  // Handle Demo Data Reset
  const handleLoadDemoData = () => {
    setTickets(MOCK_TICKETS);
    setFileName('Reporte_Ejemplo_ServiceDesk.xlsx');
  };

  // Handle Saving Custom Column Mapping
  const handleSaveMapping = (newMapping: ColumnMapping) => {
    setMapping(newMapping);
    if (rawRows.length > 0) {
      const reParsed = parseRowsToTickets(rawRows, newMapping);
      setTickets(reParsed);
    }
  };

  // Compute Badge Counters
  const counts = useMemo(() => {
    const overdue = tickets.filter((t) => isTicketOverdue(t.fechaCreacion, t.estado, 5)).length;
    const unassigned = tickets.filter((t) => {
      const tec = String(t.tecnicoAsignado || '').toLowerCase().trim();
      return !tec || tec === 'sin asignar' || tec === 'no asignado' || tec === 'none' || tec === 'nan';
    }).length;

    let qualityErrors = 0;
    tickets.forEach((t) => {
      const cat = String(t.categoria || '').toUpperCase().trim();
      const art = String(t.articulo || '').toUpperCase().trim();
      const tec = String(t.tecnicoAsignado || '').toUpperCase().trim();

      if (
        !cat || cat === 'POR DEFINIR' || cat === 'SIN CATEGORÍA' ||
        !art || art === 'POR DEFINIR' || art === 'SIN ARTÍCULO'
      ) {
        qualityErrors++;
        return;
      }

      if (!tec || tec === 'SIN ASIGNAR' || tec === 'NO ASIGNADO') {
        qualityErrors++;
        return;
      }

      const isOfficial = BUZONES_PERMITIDOS.some((b) => tec.includes(b));
      if (!isOfficial) {
        qualityErrors++;
        return;
      }

      if (cat.includes('SISTEMAS')) {
        const isForbidden = TECNICOS_SOPORTE_PROHIBIDOS_SISTEMAS.some((n) => tec.includes(n));
        if (isForbidden) {
          qualityErrors++;
          return;
        }
      }

      if (cat.includes('EQUIPOS') && ['OFFICE', 'PDF', 'ANTIVIRUS', 'CORREO', 'SISTEMA', 'LICENCIA'].some((x) => art.includes(x))) {
        qualityErrors++;
        return;
      }

      if (cat.includes('REDES') && ['MOUSE', 'MONITOR', 'TECLADO', 'PAQUETERÍA', 'OFFICE'].some((x) => art.includes(x))) {
        qualityErrors++;
        return;
      }
    });

    return {
      total: tickets.length,
      overdue,
      unassigned,
      qualityErrors,
    };
  }, [tickets]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-indigo-500/20 selection:text-indigo-900 relative">
      {/* Processing Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white animate-fade-in">
          <div className="bg-slate-900/90 border border-slate-700/80 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center max-w-md space-y-3">
            <div className="p-4 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Procesando Reporte ServiceDesk Plus
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Analizando filas, deduplicando conversaciones por ticket y aplicando mapeo de catálogo... Por favor espera un momento.
            </p>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Header
        tickets={tickets}
        fileName={fileName}
        isLoading={isLoading}
        onLoadingChange={setIsLoading}
        onTicketsLoaded={handleTicketsLoaded}
        onOpenColumnMapper={() => setIsColumnMapperOpen(true)}
        onLoadDemoData={handleLoadDemoData}
      />

      {/* Main Container */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto flex flex-col lg:flex-row">
        {/* Navigation Sidebar */}
        <Sidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          counts={counts}
        />

        {/* Dynamic View Content */}
        <main className="flex-1 p-4 lg:p-8 min-w-0">
          {currentView === 'dashboard_general' && (
            <DashboardGeneral
              tickets={tickets}
              onSelectTicket={(t) => setSelectedTicket(t)}
              onLoadDemoData={handleLoadDemoData}
            />
          )}

          {currentView === 'auditoria_catalogo' && (
            <AuditoriaCatalogo
              tickets={tickets}
              onSelectTicket={(t) => setSelectedTicket(t)}
              onLoadDemoData={handleLoadDemoData}
            />
          )}

          {currentView === 'calidad_tiempos' && (
            <ModuloCalidad
              tickets={tickets}
              onSelectTicket={(t) => setSelectedTicket(t)}
              onLoadDemoData={handleLoadDemoData}
            />
          )}

          {currentView === 'control_soporte' && (
            <DashboardSoporte
              tickets={tickets}
              onSelectTicket={(t) => setSelectedTicket(t)}
              onLoadDemoData={handleLoadDemoData}
            />
          )}

          {currentView === 'control_informatica' && (
            <DashboardInformatica
              tickets={tickets}
              onSelectTicket={(t) => setSelectedTicket(t)}
              onLoadDemoData={handleLoadDemoData}
            />
          )}

          {currentView === 'control_interinstitucional' && (
            <DashboardInterinstitucional
              tickets={tickets}
              onSelectTicket={(t) => setSelectedTicket(t)}
              onLoadDemoData={handleLoadDemoData}
            />
          )}

          {currentView === 'catalogo_tecnicos' && (
            <AdministracionTecnicos />
          )}

          {currentView === 'validacion_motores' && (
            <ValidacionMotores
              tickets={tickets}
              onSelectTicket={(t) => setSelectedTicket(t)}
            />
          )}
        </main>
      </div>

      {/* Column Mapping Modal */}
      <ColumnMapperModal
        isOpen={isColumnMapperOpen}
        onClose={() => setIsColumnMapperOpen(false)}
        availableColumns={availableColumns}
        currentMapping={mapping}
        onSaveMapping={handleSaveMapping}
      />

      {/* Ticket Detail Modal */}
      <TicketDetailModal
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
      />
    </div>
  );
}
