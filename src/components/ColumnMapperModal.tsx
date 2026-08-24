import React, { useState } from 'react';
import { X, Check, RefreshCw } from 'lucide-react';
import { ColumnMapping } from '../types';

interface ColumnMapperModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableColumns: string[];
  currentMapping: ColumnMapping;
  onSaveMapping: (newMapping: ColumnMapping) => void;
}

export const ColumnMapperModal: React.FC<ColumnMapperModalProps> = ({
  isOpen,
  onClose,
  availableColumns,
  currentMapping,
  onSaveMapping,
}) => {
  const [mapping, setMapping] = useState<ColumnMapping>(currentMapping);

  if (!isOpen) return null;

  const mappingLabels: { key: keyof ColumnMapping; label: string; req: boolean; category?: string }[] = [
    { key: 'col_id', label: 'ID / Folio Ticket (ID Original)', req: true, category: 'Identificación y Estado' },
    { key: 'col_estado', label: 'Estado / Estatus', req: true, category: 'Identificación y Estado' },
    { key: 'col_fecha', label: 'Fecha de Creación', req: true, category: 'Identificación y Estado' },
    { key: 'col_tecnico', label: 'Técnico Asignado (Buzón SDP)', req: false, category: 'Identificación y Estado' },
    { key: 'col_categoria', label: 'Categoría', req: true, category: 'Catálogo de Servicio' },
    { key: 'col_subcategoria', label: 'Subcategoría', req: false, category: 'Catálogo de Servicio' },
    { key: 'col_articulo', label: 'Artículo / Elemento', req: true, category: 'Catálogo de Servicio' },
    { key: 'col_tipo', label: 'Tipo de Solicitud', req: true, category: 'Catálogo de Servicio' },
    { key: 'col_solicitante', label: 'Nombre del Solicitante', req: false, category: 'Personas y Buzones' },
    { key: 'col_correo_dest', label: 'Correo Destinatario Conversación', req: false, category: 'Personas y Buzones' },
    { key: 'col_destinatario', label: 'Destinatario (Para)', req: false, category: 'Personas y Buzones' },
    { key: 'col_remitente_correo', label: 'Correo del Remitente (De)', req: false, category: 'Personas y Buzones' },
    { key: 'col_remitente_nombre', label: 'Nombre del Remitente', req: false, category: 'Personas y Buzones' },
    { key: 'col_cc', label: 'En Copia (CC)', req: false, category: 'Personas y Buzones' },
    { key: 'col_cco', label: 'En Copia Oculta (CCO)', req: false, category: 'Personas y Buzones' },
    { key: 'col_participantes', label: 'Participantes del Equipo', req: false, category: 'Personas y Buzones' },
    { key: 'col_mesa_ayuda', label: 'Participantes Mesa de Ayuda', req: false, category: 'Personas y Buzones' },
    { key: 'col_asunto', label: 'Asunto de la Solicitud / Conversación', req: false, category: 'Contenido y Trazabilidad' },
    { key: 'col_descripcion', label: 'Descripción / Detalle de Solicitud', req: false, category: 'Contenido y Trazabilidad' },
    { key: 'col_resolucion', label: 'Resolución / Solución de Cierre', req: false, category: 'Contenido y Trazabilidad' },
    { key: 'col_fecha_conversacion', label: 'Fecha de la Conversación / Mensaje', req: false, category: 'Contenido y Trazabilidad' },
    { key: 'col_cuerpo_conversacion', label: 'Cuerpo / Contenido de Conversación', req: false, category: 'Contenido y Trazabilidad' },
  ];

  const handleSelectChange = (key: keyof ColumnMapping, value: string) => {
    setMapping((prev) => ({
      ...prev,
      [key]: value === '' ? null : value,
    }));
  };

  const handleSave = () => {
    onSaveMapping(mapping);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-lg text-slate-100">
              ⚙️ Configuración de Columnas del Reporte
            </h3>
            <p className="text-xs text-slate-400">
              Verifica y asocia cada campo de ServiceDesk Plus con las columnas del archivo cargado.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 my-4 space-y-3 pr-2">
          {mappingLabels.map(({ key, label, req }) => (
            <div
              key={key}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-800/50 border border-slate-800"
            >
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span>{label}</span>
                {req && <span className="text-rose-400">*</span>}
              </label>
              <select
                value={mapping[key] || ''}
                onChange={(e) => handleSelectChange(key, e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:border-teal-500 focus:outline-none w-full sm:w-64"
              >
                <option value="">-- No asignado / Auto --</option>
                {availableColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs px-4 py-2 rounded-xl transition-all shadow-md"
          >
            <Check className="w-4 h-4" />
            Guardar y Mapear
          </button>
        </div>
      </div>
    </div>
  );
};
