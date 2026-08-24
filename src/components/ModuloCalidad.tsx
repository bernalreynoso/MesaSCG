import React, { useMemo, useState } from 'react';
import {
  ShieldAlert,
  AlertOctagon,
  Clock,
  Filter,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  BarChart2,
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
import { Ticket, AuditError } from '../types';
import { BUZONES_PERMITIDOS, TECNICOS_SOPORTE_PROHIBIDOS_SISTEMAS } from '../data/catalogs';
import { EmptyState } from './EmptyState';
import { exportToCSV } from '../utils/fileParser';

interface ModuloCalidadProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onLoadDemoData?: () => void;
}

export const ModuloCalidad: React.FC<ModuloCalidadProps> = ({
  tickets,
  onSelectTicket,
  onLoadDemoData,
}) => {
  const [filterTech, setFilterTech] = useState<string>('TODOS');

  // 1. Audit Rules Engine Execution
  const auditErrors: AuditError[] = useMemo(() => {
    const results: AuditError[] = [];

    tickets.forEach((t) => {
      const motivos: string[] = [];
      const cat = String(t.categoria || '').toUpperCase().trim();
      const subcat = String(t.subcategoria || '').toUpperCase().trim();
      const art = String(t.articulo || '').toUpperCase().trim();
      const tec = String(t.tecnicoAsignado || '').toUpperCase().trim();
      const sol = String(t.solicitante || '').toLowerCase().trim();

      // Regla de Solicitante Inválido
      if (
        !sol ||
        sol === 'nan' ||
        sol === 'none' ||
        sol.includes('administrador') ||
        sol.includes('system')
      ) {
        motivos.push('Ticket creado sin usuario final válido');
      }

      // Regla de Categorías / Subcategorías en Blanco
      if (
        !subcat ||
        subcat === 'NAN' ||
        subcat === 'SIN SUBCATEGORÍA' ||
        subcat === 'NONE' ||
        subcat === 'POR DEFINIR'
      ) {
        motivos.push('Subcategoría vacía o por definir');
      }

      // Rule 1: Missing classification
      if (
        !cat ||
        cat === 'NAN' ||
        cat === 'SIN CATEGORÍA' ||
        cat === 'NONE' ||
        cat === 'POR DEFINIR' ||
        !art ||
        art === 'NAN' ||
        art === 'SIN ARTÍCULO' ||
        art === 'NONE' ||
        art === 'POR DEFINIR'
      ) {
        motivos.push('Falta Clasificar Categoría / Artículo');
      }

      // Rule 2: Unassigned or invalid mailbox
      if (
        !tec ||
        tec === 'NAN' ||
        tec === 'NONE' ||
        tec === 'SIN ASIGNAR' ||
        tec === 'NO ASIGNADO'
      ) {
        motivos.push('Ticket sin Asignación de Área');
      } else {
        const isOfficialBuzon = BUZONES_PERMITIDOS.some((b) => tec.includes(b));
        if (!isOfficialBuzon) {
          motivos.push(
            `Asignación Inválida (Aparece: '${t.tecnicoAsignado}', debe ser solo Buzón Oficial)`
          );
        }

        // Rule 3: Support Techs assigned to SISTEMAS
        if (cat.includes('SISTEMAS')) {
          const isForbiddenSupportTech = TECNICOS_SOPORTE_PROHIBIDOS_SISTEMAS.some(
            (nombre) => tec.includes(nombre)
          );
          if (isForbiddenSupportTech) {
            motivos.push(
              `Técnico de Soporte (${t.tecnicoAsignado}) tiene asignado un ticket de la categoría SISTEMAS`
            );
          }
        }
      }

      // Rule 4: Software in Hardware
      if (
        cat.includes('EQUIPOS') &&
        ['OFFICE', 'PDF', 'ANTIVIRUS', 'CORREO', 'SISTEMA', 'LICENCIA'].some((x) =>
          art.includes(x)
        )
      ) {
        motivos.push('Artículo de Software asignado a Categoría de Hardware (Equipos)');
      }

      // Rule 5: Non-network item in Redes
      if (
        cat.includes('REDES') &&
        ['MOUSE', 'MONITOR', 'TECLADO', 'PAQUETERÍA', 'OFFICE'].some((x) =>
          art.includes(x)
        )
      ) {
        motivos.push('Artículo ajeno asignado a la Categoría de Redes');
      }

      if (motivos.length > 0) {
        results.push({
          ticket: t,
          motivo: motivos.join(' | '),
        });
      }
    });

    return results;
  }, [tickets]);

  // Handler to export failed audit tickets to CSV
  const handleExportAuditCSV = () => {
    if (auditErrors.length === 0) return;
    const exportRows = auditErrors.map((err) => ({
      'ID Ticket': err.ticket.id,
      'Solicitante': err.ticket.solicitante || 'Sin Solicitante',
      'Técnico / Asignación': err.ticket.tecnicoAsignado || 'Sin Asignar',
      'Categoría': err.ticket.categoria || 'Sin Categoría',
      'Subcategoría': err.ticket.subcategoria || 'Sin Subcategoría',
      'Artículo': err.ticket.articulo || 'Sin Artículo',
      'Estado': err.ticket.estado || 'Sin Estado',
      'Fecha Creación': err.ticket.fechaCreacion || '',
      'Motivo del Desvío': err.motivo,
    }));
    exportToCSV(`Auditoria_Desvios_Calidad_${new Date().toISOString().slice(0, 10)}.csv`, exportRows);
  };

  // Unique list of assigned techs with errors
  const techErrorOptions = useMemo(() => {
    const setT = new Set(auditErrors.map((e) => e.ticket.tecnicoAsignado).filter(Boolean));
    return ['TODOS', ...Array.from(setT).sort()];
  }, [auditErrors]);

  const filteredErrors = useMemo(() => {
    if (filterTech === 'TODOS') return auditErrors;
    return auditErrors.filter((e) => e.ticket.tecnicoAsignado === filterTech);
  }, [auditErrors, filterTech]);

  // 2. Dead Time Status Breakdown
  const statusSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    tickets.forEach((t) => {
      const st = t.estado || 'Sin Estado';
      counts[st] = (counts[st] || 0) + 1;
    });

    return Object.entries(counts).map(([estado, cantidad]) => {
      const isDeadTime = /espera|insumo|usuario|detenido|hold/i.test(estado);
      return {
        estado,
        cantidad,
        tipoTiempo: isDeadTime
          ? '⏳ Tiempo Muerto (Espera Externa / Insumos)'
          : '⚙️ En Gestión Operativa',
        isDeadTime,
      };
    });
  }, [tickets]);

  // Frozen Tickets list
  const frozenTickets = useMemo(() => {
    return tickets.filter((t) => /espera|insumo|usuario|detenido|hold/i.test(t.estado));
  }, [tickets]);

  if (tickets.length === 0) {
    return (
      <EmptyState
        title="No hay tickets en la Auditoría de Calidad"
        description="Carga un reporte Excel de ServiceDesk Plus para auditar la calidad de los registros y detectar incongruencias de asignación."
        onLoadDemoData={onLoadDemoData}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Title Bento Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs hover:shadow-md transition-shadow duration-300">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 mt-0.5 shrink-0">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Auditoría de Calidad y Control Operativo
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Detecta incongruencias en catalogación y asignaciones fuera de la norma operativa de la SCG.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-xs">
            {auditErrors.length} desvíos detectados
          </span>

          <button
            onClick={handleExportAuditCSV}
            disabled={auditErrors.length === 0}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Exportar desvíos a CSV"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Auditoría CSV</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: QUALITY RULE ENGINE AUDIT BENTO CARD */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs space-y-4 hover:shadow-md transition-shadow duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
              Alertas de Llenado y Asignación Errónea
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Mapeo contra buzones oficiales y reglas de compatibilidad de catálogo.
            </p>
          </div>

          {auditErrors.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600 font-bold">Filtrar por técnico:</label>
              <select
                value={filterTech}
                onChange={(e) => setFilterTech(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                {techErrorOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {filteredErrors.length > 0 ? (
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto rounded-xl border border-slate-200 relative pr-2 pb-2">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="sticky top-0 bg-slate-100 border-b-2 border-slate-300 z-10 shadow-xs text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3 text-right">ID</th>
                  <th className="px-4 py-3">Asignación</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Artículo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 min-w-[250px]">Motivo del Desvío</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredErrors.map((err) => (
                  <tr
                    key={err.ticket.id}
                    onClick={() => onSelectTicket(err.ticket)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-bold text-amber-600 text-right">#{err.ticket.id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {err.ticket.tecnicoAsignado || 'Sin Asignar'}
                    </td>
                    <td className="px-4 py-3">{err.ticket.categoria}</td>
                    <td className="px-4 py-3">{err.ticket.articulo}</td>
                    <td className="px-4 py-3 font-medium">{err.ticket.estado}</td>
                    <td className="px-4 py-3 text-rose-800 font-semibold bg-rose-50/70 min-w-[250px]">
                      {err.motivo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 bg-emerald-50/60 rounded-xl border border-emerald-100 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mb-2" />
            <p className="text-xs font-bold text-emerald-800">
              Excelente control operativo. Todos los tickets cumplen perfectamente las reglas y están en los buzones correctos.
            </p>
          </div>
        )}
      </div>

      {/* SECTION 2: DEAD TIME & STATUS BOTTLENECKS BENTO CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Bar Chart Bento Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Monitoreo de Estados y Tiempos Muertos
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Identifica cuántas solicitudes están frenadas por factores externos (espera de insumos, usuario ausente, etc.).
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={statusSummary}
                margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
              >
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                <YAxis
                  type="category"
                  dataKey="estado"
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                  width={140}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#1e293b',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  itemStyle={{ color: '#1e293b' }}
                  labelStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                  formatter={(value: any, _, props: any) => [
                    `${value} tickets`,
                    props.payload.tipoTiempo,
                  ]}
                />
                <Bar dataKey="cantidad" radius={[0, 6, 6, 0]}>
                  {statusSummary.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isDeadTime ? '#e11d48' : '#4f46e5'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Corporate White Bento Card for Frozen / Held Tickets */}
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs hover:shadow-md transition-shadow duration-300 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                Tickets Retenidos ({frozenTickets.length})
              </h4>
              <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2.5 py-0.5 rounded-full border border-rose-200">
                Factor Externo
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Causas externas ajenas al técnico de soporte.
            </p>

            <div className="overflow-y-auto max-h-60 space-y-2 pr-2 pb-2">
              {frozenTickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelectTicket(t)}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/30 cursor-pointer transition-all text-xs"
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-indigo-600">#{t.id}</span>
                    <span className="text-rose-700 text-[10px] bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                      {t.estado}
                    </span>
                  </div>
                  <p className="text-slate-800 mt-1 truncate font-medium">{t.articulo}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Solicitante: {t.solicitante}
                  </p>
                </div>
              ))}

              {frozenTickets.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-6">
                  Sin tickets congelados en esta extracción.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
