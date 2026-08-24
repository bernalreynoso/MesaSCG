import React from 'react';
import { FolderX, Sparkles, Upload } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onLoadDemoData?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No hay tickets registrados",
  description = "Actualmente no existen registros de tickets cargados. Puedes sustituir el archivo con tu reporte Excel/CSV de ServiceDesk Plus o cargar un reporte de ejemplo.",
  onLoadDemoData,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 my-8 bg-white border border-slate-200/80 rounded-2xl shadow-xs text-center max-w-xl mx-auto space-y-4 hover:shadow-md transition-shadow duration-300 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0 shadow-xs">
        <FolderX className="w-8 h-8 text-indigo-600" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-medium">
          {description}
        </p>
      </div>
      {onLoadDemoData && (
        <div className="pt-2">
          <button
            onClick={onLoadDemoData}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Cargar Reporte de Ejemplo
          </button>
        </div>
      )}
    </div>
  );
};
