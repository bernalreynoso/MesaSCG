import React, { useRef } from 'react';
import {
  ShieldCheck,
  Upload,
  FileSpreadsheet,
  Settings,
  Sparkles,
  Download,
  Loader2,
} from 'lucide-react';
import { parseFile, exportToCSV } from '../utils/fileParser';
import { Ticket, ColumnMapping } from '../types';

interface HeaderProps {
  tickets: Ticket[];
  fileName: string | null;
  isLoading?: boolean;
  onLoadingChange?: (loading: boolean) => void;
  onTicketsLoaded: (
    tickets: Ticket[],
    columns: string[],
    mapping: ColumnMapping,
    fileName: string,
    rawRows?: Record<string, any>[]
  ) => void;
  onOpenColumnMapper: () => void;
  onLoadDemoData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  tickets,
  fileName,
  isLoading = false,
  onLoadingChange,
  onTicketsLoaded,
  onOpenColumnMapper,
  onLoadDemoData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (onLoadingChange) onLoadingChange(true);
      // Brief delay to allow React to paint the loading backdrop overlay
      await new Promise((resolve) => setTimeout(resolve, 50));
      const result = await parseFile(file);
      onTicketsLoaded(result.tickets, result.columns, result.mapping, result.fileName, result.rawRows);
    } catch (err: any) {
      alert(err.message || 'Error al procesar el archivo.');
    } finally {
      if (onLoadingChange) onLoadingChange(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportAll = () => {
    if (!tickets.length) return;
    const exportData = tickets.map((t) => ({
      ID: t.id,
      Estado: t.estado,
      Fecha: t.fechaCreacion,
      Técnico: t.tecnicoAsignado,
      Categoría: t.categoria,
      Subcategoría: t.subcategoria,
      Artículo: t.articulo,
      Tipo: t.tipoSolicitud,
      Solicitante: t.solicitante,
      Correo_Destinatario: t.correoDestinatario || '',
    }));
    exportToCSV(`Mesa_de_Ayuda_SCG_${new Date().toISOString().slice(0, 10)}.csv`, exportData);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 text-slate-800 px-4 lg:px-8 py-3.5 shadow-xs">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-sm">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-slate-900 tracking-tight">
                Mesa de Ayuda <span className="text-indigo-600 font-extrabold">SCG</span>
              </h1>
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                ServiceDesk Plus
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Secretaría de la Contraloría General — Sistema de Gestión y Control Operativo
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* File Name Status Pill */}
          {fileName ? (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs text-slate-700 shadow-xs">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold max-w-[180px] truncate" title={fileName}>
                {fileName}
              </span>
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold text-[10px] whitespace-nowrap">
                {tickets.length} tickets
              </span>
            </div>
          ) : (
            <button
              onClick={onLoadDemoData}
              className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
              Cargar Reporte de Ejemplo
            </button>
          )}

          {/* Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv"
            className="hidden"
            disabled={isLoading}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : (
              <Upload className="w-3.5 h-3.5 shrink-0" />
            )}
            {isLoading ? 'Procesando Excel...' : 'Sustituir Reporte (.xlsx / .csv)'}
          </button>

          {/* Column Mapping Button */}
          {tickets.length > 0 && (
            <button
              onClick={onOpenColumnMapper}
              title="Ajustar Mapeo de Columnas"
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-all shadow-xs cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* Export Button */}
          {tickets.length > 0 && (
            <button
              onClick={handleExportAll}
              title="Exportar Todo a CSV"
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-indigo-600" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
