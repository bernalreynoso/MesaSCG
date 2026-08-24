import React, { useState, useMemo } from 'react';
import { Filter, Download, Info, Search, SlidersHorizontal } from 'lucide-react';
import { Ticket } from '../types';
import { exportToCSV } from '../utils/fileParser';
import { EmptyState } from './EmptyState';

interface AuditoriaCatalogoProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onLoadDemoData?: () => void;
}

export const AuditoriaCatalogo: React.FC<AuditoriaCatalogoProps> = ({
  tickets,
  onSelectTicket,
  onLoadDemoData,
}) => {
  const [tipoSel, setTipoSel] = useState<string>('TODAS');
  const [catSel, setCatSel] = useState<string>('TODAS');
  const [subSel, setSubSel] = useState<string>('TODAS');
  const [artSel, setArtSel] = useState<string>('TODAS');
  const [estSel, setEstSel] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 1. Cascaded filtering
  // Step 1: Filter by Tipo
  const dfTipos = useMemo(() => {
    if (tipoSel === 'TODAS') return tickets;
    return tickets.filter((t) => t.tipoSolicitud === tipoSel);
  }, [tickets, tipoSel]);

  // Step 2: Filter by Categoria
  const dfCat = useMemo(() => {
    if (catSel === 'TODAS') return dfTipos;
    return dfTipos.filter((t) => t.categoria === catSel);
  }, [dfTipos, catSel]);

  // Step 3: Filter by Subcategoria
  const dfSub = useMemo(() => {
    if (subSel === 'TODAS') return dfCat;
    return dfCat.filter((t) => t.subcategoria === subSel);
  }, [dfCat, subSel]);

  // Step 4: Filter by Articulo
  const dfArt = useMemo(() => {
    if (artSel === 'TODAS') return dfSub;
    return dfSub.filter((t) => t.articulo === artSel);
  }, [dfSub, artSel]);

  // Step 5: Filter by Estado
  const dfFinal = useMemo(() => {
    let res = dfArt;
    if (estSel !== 'TODOS') {
      res = res.filter((t) => t.estado === estSel);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      res = res.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.solicitante.toLowerCase().includes(q) ||
          t.tecnicoAsignado.toLowerCase().includes(q)
      );
    }
    return res;
  }, [dfArt, estSel, searchTerm]);

  // Option lists sorted
  const listaTipos = useMemo(() => {
    const setT = new Set(tickets.map((t) => t.tipoSolicitud).filter(Boolean));
    return ['TODAS', ...Array.from(setT).sort()];
  }, [tickets]);

  const listaCategorias = useMemo(() => {
    const setC = new Set(dfTipos.map((t) => t.categoria).filter(Boolean));
    return ['TODAS', ...Array.from(setC).sort()];
  }, [dfTipos]);

  const listaSubcategorias = useMemo(() => {
    const setS = new Set(dfCat.map((t) => t.subcategoria).filter(Boolean));
    return ['TODAS', ...Array.from(setS).sort()];
  }, [dfCat]);

  const listaArticulos = useMemo(() => {
    const setA = new Set(dfSub.map((t) => t.articulo).filter(Boolean));
    return ['TODAS', ...Array.from(setA).sort()];
  }, [dfSub]);

  const listaEstados = useMemo(() => {
    const setE = new Set(dfArt.map((t) => t.estado).filter(Boolean));
    return ['TODOS', ...Array.from(setE).sort()];
  }, [dfArt]);

  const resetFilters = () => {
    setTipoSel('TODAS');
    setCatSel('TODAS');
    setSubSel('TODAS');
    setArtSel('TODAS');
    setEstSel('TODOS');
    setSearchTerm('');
  };

  const handleExport = () => {
    const data = dfFinal.map((t) => ({
      ID: t.id,
      Tipo: t.tipoSolicitud,
      Categoría: t.categoria,
      Subcategoría: t.subcategoria,
      Artículo: t.articulo,
      Técnico: t.tecnicoAsignado,
      Estado: t.estado,
    }));
    exportToCSV(`Auditoria_Catalogo_${new Date().toISOString().slice(0, 10)}.csv`, data);
  };

  if (tickets.length === 0) {
    return (
      <EmptyState
        title="No hay tickets para Auditoría de Catálogo"
        description="Por favor, carga un reporte Excel de ServiceDesk Plus para visualizar la cascada de niveles de catálogo."
        onLoadDemoData={onLoadDemoData}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bento Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 mt-0.5 shrink-0">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Auditoría de Catálogo de Servicio y Estados
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Selecciona la jerarquía de tu catálogo de ServiceDesk Plus y filtra por estado de las solicitudes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl border border-slate-200 transition-all shadow-xs cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Restablecer Filtros
          </button>
          <button
            onClick={handleExport}
            disabled={!dfFinal.length}
            className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Filtrados
          </button>
        </div>
      </div>

      {/* 5-Level Cascaded Controls Bento Card */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-indigo-600" />
          Filtros en Cascada
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Tipo */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700">
              1. Tipo de Solicitud:
            </label>
            <select
              value={tipoSel}
              onChange={(e) => {
                setTipoSel(e.target.value);
                setCatSel('TODAS');
                setSubSel('TODAS');
                setArtSel('TODAS');
                setEstSel('TODOS');
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            >
              {listaTipos.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Categoria */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700">
              2. Categoría:
            </label>
            <select
              value={catSel}
              onChange={(e) => {
                setCatSel(e.target.value);
                setSubSel('TODAS');
                setArtSel('TODAS');
                setEstSel('TODOS');
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            >
              {listaCategorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Subcategoria */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700">
              3. Subcategoría:
            </label>
            <select
              value={subSel}
              onChange={(e) => {
                setSubSel(e.target.value);
                setArtSel('TODAS');
                setEstSel('TODOS');
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            >
              {listaSubcategorias.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Articulo */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700">
              4. Artículo:
            </label>
            <select
              value={artSel}
              onChange={(e) => {
                setArtSel(e.target.value);
                setEstSel('TODOS');
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            >
              {listaArticulos.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Estado */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700">
              5. Estado del Ticket:
            </label>
            <select
              value={estSel}
              onChange={(e) => setEstSel(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            >
              {listaEstados.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Info Results Counter Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/70 border border-indigo-100 p-4 rounded-xl text-xs text-indigo-900 shadow-xs">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            Se encontraron <strong className="text-indigo-950 font-extrabold text-sm">{dfFinal.length}</strong> tickets
            únicos con los criterios seleccionados.
          </span>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por ID/usuario..."
            className="w-full bg-white border border-indigo-200 text-slate-800 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Filtered Data Table Bento Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs p-6 hover:shadow-md transition-shadow duration-300">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto rounded-xl border border-slate-200 relative">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="sticky top-0 bg-slate-100 z-10 shadow-xs text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">ID Original</th>
                <th className="px-4 py-3">Tipo Solicitud</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Subcategoría</th>
                <th className="px-4 py-3">Artículo</th>
                <th className="px-4 py-3">Técnico Asignado</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {dfFinal.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => onSelectTicket(t)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-bold text-indigo-600">#{t.id}</td>
                  <td className="px-4 py-3 font-medium">{t.tipoSolicitud}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{t.categoria}</td>
                  <td className="px-4 py-3 text-slate-500">{t.subcategoria}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{t.articulo}</td>
                  <td className="px-4 py-3">{t.tecnicoAsignado}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        /cerrado|resuelto/i.test(t.estado)
                          ? 'bg-emerald-100 text-emerald-800'
                          : /pendiente|espera/i.test(t.estado)
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {t.estado}
                    </span>
                  </td>
                </tr>
              ))}

              {dfFinal.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 italic">
                    No se encontraron tickets con la combinación de filtros seleccionada.
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
