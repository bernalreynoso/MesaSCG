import React, { useState } from 'react';
import {
  Users,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Search,
  Mail,
  Building2,
  Tag,
  Check,
  X,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { TecnicoRegistro } from '../types';
import {
  useTecnicosCatalogo,
  guardarTecnico,
  toggleEstadoTecnico,
  restablecerCatalogoDefault,
} from '../utils/technicianCatalogStore';

export const AdministracionTecnicos: React.FC = () => {
  const { tecnicos } = useTecnicosCatalogo();
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroArea, setFiltroArea] = useState<string>('TODAS');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');

  // Estado del modal de creación / edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTecnico, setEditingTecnico] = useState<TecnicoRegistro | null>(null);

  // Form fields
  const [formNombre, setFormNombre] = useState('');
  const [formCorreoPrincipal, setFormCorreoPrincipal] = useState('');
  const [formCorreosAlt, setFormCorreosAlt] = useState('');
  const [formAlias, setFormAlias] = useState('');
  const [formArea, setFormArea] = useState<'Soporte' | 'Informática' | 'Interinstitucional' | string>('Soporte');
  const [formAreaCustom, setFormAreaCustom] = useState('');
  const [formActivo, setFormActivo] = useState(true);
  const [formFiltroDesarrollo, setFormFiltroDesarrollo] = useState(false);
  const [formError, setFormError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  const abrirModalNuevo = () => {
    setEditingTecnico(null);
    setFormNombre('');
    setFormCorreoPrincipal('');
    setFormCorreosAlt('');
    setFormAlias('');
    setFormArea('Soporte');
    setFormAreaCustom('');
    setFormActivo(true);
    setFormFiltroDesarrollo(false);
    setFormError('');
    setIsModalOpen(true);
  };

  const abrirModalEditar = (tec: TecnicoRegistro) => {
    setEditingTecnico(tec);
    setFormNombre(tec.nombre);
    setFormCorreoPrincipal(tec.correoPrincipal);
    setFormCorreosAlt((tec.correosAlternativos || []).join(', '));
    setFormAlias((tec.alias || []).join(', '));
    if (tec.area === 'Soporte' || tec.area === 'Informática' || tec.area === 'Interinstitucional') {
      setFormArea(tec.area);
      setFormAreaCustom('');
    } else {
      setFormArea('Otra');
      setFormAreaCustom(tec.area);
    }
    setFormActivo(tec.activo);
    setFormFiltroDesarrollo(!!tec.filtroDesarrollo);
    setFormError('');
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setIsModalOpen(false);
    setEditingTecnico(null);
    setFormError('');
  };

  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const nombre = formNombre.trim();
    const correo = formCorreoPrincipal.trim().toLowerCase();

    if (!nombre) {
      setFormError('El nombre del técnico es obligatorio.');
      return;
    }
    if (!correo || !correo.includes('@')) {
      setFormError('Introduce un correo electrónico principal válido.');
      return;
    }

    const areaFinal = formArea === 'Otra' ? (formAreaCustom.trim() || 'General') : formArea;

    const altEmails = formCorreosAlt
      .split(/[,;\n]+/)
      .map((c) => c.trim().toLowerCase())
      .filter((c) => c.length > 0 && c.includes('@'));

    const aliasList = formAlias
      .split(/[,;\n]+/)
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    const tecnicoAguardar: TecnicoRegistro = {
      id: editingTecnico ? editingTecnico.id : `tec-${Date.now()}`,
      nombre,
      correoPrincipal: correo,
      correosAlternativos: altEmails,
      alias: aliasList,
      area: areaFinal,
      activo: formActivo,
      filtroDesarrollo: formFiltroDesarrollo,
    };

    guardarTecnico(tecnicoAguardar);
    cerrarModal();
    setMensajeExito(
      editingTecnico
        ? `Técnico "${nombre}" actualizado correctamente.`
        : `Técnico "${nombre}" agregado al catálogo.`
    );
    setTimeout(() => setMensajeExito(''), 4000);
  };

  const handleToggleEstado = (id: string, nombre: string, estadoActual: boolean) => {
    toggleEstadoTecnico(id);
    setMensajeExito(
      `Técnico "${nombre}" ${estadoActual ? 'desactivado' : 'activado'}.`
    );
    setTimeout(() => setMensajeExito(''), 3000);
  };

  const handleRestablecer = () => {
    if (
      window.confirm(
        '¿Deseas restablecer el catálogo de técnicos al listado predeterminado de la SCG? Se conservarán los técnicos base originales.'
      )
    ) {
      restablecerCatalogoDefault();
      setMensajeExito('Catálogo restablecido al listado predeterminado.');
      setTimeout(() => setMensajeExito(''), 4000);
    }
  };

  // Filtrado de la lista en pantalla
  const tecnicosFiltrados = tecnicos.filter((t) => {
    const matchSearch =
      searchTerm === '' ||
      t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.correoPrincipal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.correosAlternativos || []).some((c) => c.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.alias || []).some((a) => a.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchArea =
      filtroArea === 'TODAS' ||
      t.area.toLowerCase().includes(filtroArea.toLowerCase());

    const matchEstado =
      filtroEstado === 'TODOS' ||
      (filtroEstado === 'ACTIVOS' && t.activo) ||
      (filtroEstado === 'INACTIVOS' && !t.activo);

    return matchSearch && matchArea && matchEstado;
  });

  const totalActivos = tecnicos.filter((t) => t.activo).length;
  const totalInactivos = tecnicos.filter((t) => !t.activo).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bento Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs hover:shadow-md transition-shadow duration-300">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 mt-0.5 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                Catálogo Administrable de Técnicos
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">
                {tecnicos.length} registrados
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Administra el personal de Soporte e Informática. Los cambios se reflejan inmediatamente en los filtros y en el motor de detección sin alterar tickets históricos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleRestablecer}
            className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
            title="Restablecer al listado original"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Restablecer</span>
          </button>

          <button
            onClick={abrirModalNuevo}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar técnico</span>
          </button>
        </div>
      </div>

      {/* Banner de Éxito Temporal */}
      {mensajeExito && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{mensajeExito}</span>
          </div>
          <button
            onClick={() => setMensajeExito('')}
            className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics & Filter Bar */}
      <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs space-y-4">
        {/* Metric Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Técnicos</span>
            <span className="text-base font-extrabold text-slate-800">{tecnicos.length}</span>
          </div>
          <div className="bg-emerald-50/70 border border-emerald-200/80 p-3 rounded-xl flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Activos para consultas
            </span>
            <span className="text-base font-extrabold text-emerald-800">{totalActivos}</span>
          </div>
          <div className="bg-slate-100/70 border border-slate-200/80 p-3 rounded-xl flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              Inactivos (Solo histórico)
            </span>
            <span className="text-base font-extrabold text-slate-600">{totalInactivos}</span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          {/* Search by name/email */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, correo o alias..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* Filter Area */}
          <div>
            <select
              value={filtroArea}
              onChange={(e) => setFiltroArea(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            >
              <option value="TODAS">Todas las áreas</option>
              <option value="Soporte">Área: Soporte</option>
              <option value="Informática">Área: Informática</option>
              <option value="Interinstitucional">Área: Interinstitucional</option>
            </select>
          </div>

          {/* Filter Status */}
          <div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVOS">Solo Activos</option>
              <option value="INACTIVOS">Solo Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Technicians Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/90 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Técnico</th>
                <th className="px-5 py-3.5">Correo(s) Electrónico(s)</th>
                <th className="px-5 py-3.5">Área</th>
                <th className="px-5 py-3.5">Alias / Identificadores</th>
                <th className="px-5 py-3.5 text-center">Estado</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {tecnicosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold">No se encontraron técnicos con los filtros seleccionados.</p>
                  </td>
                </tr>
              ) : (
                tecnicosFiltrados.map((tec) => (
                  <tr
                    key={tec.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      !tec.activo ? 'bg-slate-50/40 opacity-75' : ''
                    }`}
                  >
                    {/* Nombre */}
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900 text-sm">
                        {tec.nombre}
                      </div>
                      {tec.filtroDesarrollo && (
                        <span className="inline-block mt-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                          Línea de Desarrollo
                        </span>
                      )}
                    </td>

                    {/* Correos */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-slate-800 font-mono text-[11px] font-semibold">
                        <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>{tec.correoPrincipal}</span>
                      </div>
                      {tec.correosAlternativos && tec.correosAlternativos.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {tec.correosAlternativos.map((c, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Área */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                          tec.area.toLowerCase().includes('soporte')
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : tec.area.toLowerCase().includes('informa')
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <Building2 className="w-3 h-3" />
                        {tec.area}
                      </span>
                    </td>

                    {/* Alias */}
                    <td className="px-5 py-4">
                      {tec.alias && tec.alias.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {tec.alias.map((a, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-0.5 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                            >
                              <Tag className="w-2.5 h-2.5 text-slate-400" />
                              {a}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Sin alias</span>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => handleToggleEstado(tec.id, tec.nombre, tec.activo)}
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border cursor-pointer transition-all ${
                          tec.activo
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Haz clic para activar o desactivar"
                      >
                        {tec.activo ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Activo</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-slate-400" />
                            <span>Inactivo</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Acciones */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => abrirModalEditar(tec)}
                          className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg border border-indigo-200 transition-all cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

                        <button
                          onClick={() => handleToggleEstado(tec.id, tec.nombre, tec.activo)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            tec.activo
                              ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                          }`}
                          title={tec.activo ? 'Desactivar técnico' : 'Activar técnico'}
                        >
                          {tec.activo ? (
                            <ToggleRight className="w-4 h-4" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Agregar / Editar Técnico */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  {editingTecnico ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingTecnico ? 'Editar Técnico' : 'Agregar Nuevo Técnico'}
                </h3>
              </div>
              <button
                onClick={cerrarModal}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleGuardar} className="p-6 space-y-4">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Nombre */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre Completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Ej. Juan Pérez López"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              {/* Correo Principal */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Correo Electrónico Principal <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formCorreoPrincipal}
                  onChange={(e) => setFormCorreoPrincipal(e.target.value)}
                  placeholder="Ej. jperezl@scg.cdmx.gob.mx"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              {/* Correos Alternativos */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Correos Alternativos (Opcionales, separados por coma)
                </label>
                <input
                  type="text"
                  value={formCorreosAlt}
                  onChange={(e) => setFormCorreosAlt(e.target.value)}
                  placeholder="Ej. jperez@scg.cdmx.gob.mx, juan.perez@scg.cdmx.gob.mx"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Permite reconocer al técnico si envía o recibe correos desde cuentas secundarias.
                </span>
              </div>

              {/* Nombres / Alias Alternativos */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombres o Alias Alternativos (Opcionales, separados por coma)
                </label>
                <input
                  type="text"
                  value={formAlias}
                  onChange={(e) => setFormAlias(e.target.value)}
                  placeholder="Ej. juan perez, jperezl, juan perez l."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Usado por el motor para detectar cuando el nombre viene abreviado en conversaciones o participantes.
                </span>
              </div>

              {/* Área */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Área Operativa
                  </label>
                  <select
                    value={formArea}
                    onChange={(e) => setFormArea(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  >
                    <option value="Soporte">Soporte</option>
                    <option value="Informática">Informática</option>
                    <option value="Interinstitucional">Interinstitucional</option>
                    <option value="Otra">Otra área...</option>
                  </select>
                </div>

                {formArea === 'Otra' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nombre del Área
                    </label>
                    <input
                      type="text"
                      value={formAreaCustom}
                      onChange={(e) => setFormAreaCustom(e.target.value)}
                      placeholder="Ej. Telecomunicaciones"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Checkboxes de Configuración */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActivo}
                    onChange={(e) => setFormActivo(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Técnico Activo (visible en selectores y consultas actuales)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formFiltroDesarrollo}
                    onChange={(e) => setFormFiltroDesarrollo(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-600 font-medium">
                    Habilitar filtro por línea de Desarrollo/Soporte (Para técnicos con asignaciones cruzadas)
                  </span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingTecnico ? 'Guardar Cambios' : 'Registrar Técnico'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
