import React from 'react';
import {
  X,
  Calendar,
  User,
  Tag,
  Mail,
  AlertCircle,
  Clock,
  CheckCircle,
  FileText,
  MessageSquare,
  ArrowRight,
  Send,
  Inbox,
  Users,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { Ticket } from '../types';
import { calculateBusinessDays } from '../utils/businessDays';
import {
  obtenerParticipacionesDeTicket,
  resolverNombreYCorreo,
} from '../utils/technicianDetector';
import { clasificarTipoTrabajo } from '../utils/workTypeClassifier';
import { evaluarEstado } from '../utils/statusClassifier';
import { determinarAtribucionOperativa } from '../utils/operationalAttributionEngine';

interface TicketDetailModalProps {
  ticket: Ticket | null;
  onClose: () => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ ticket, onClose }) => {
  if (!ticket) return null;

  const bDays = calculateBusinessDays(ticket.fechaCreacion);
  const estadoInfo = evaluarEstado(ticket.estado);
  const isPending = estadoInfo.esAbiertoOperativo;
  const participacionesTecnicos = obtenerParticipacionesDeTicket(ticket);
  const clasificacion = clasificarTipoTrabajo(ticket);
  const atribucion = determinarAtribucionOperativa(ticket, participacionesTecnicos);

  // Helper para interpretar la acción humana de una fila de conversación
  const interpretarAccionConversacion = (conv: any, idx: number) => {
    const remitenteInfo = resolverNombreYCorreo(conv.remitenteCorreo, conv.remitenteNombre);
    const destInfo = resolverNombreYCorreo(conv.destinatarioCorreo, null);

    let accion = 'Envió comunicación';
    let accionColor = 'bg-slate-100 text-slate-800 border-slate-200';

    if (idx === 0 && !remitenteInfo.esTecnico) {
      accion = 'Solicitó / Envió solicitud inicial';
      accionColor = 'bg-indigo-50 text-indigo-800 border-indigo-200';
    } else if (remitenteInfo.esTecnico) {
      accion = 'Respondió la solicitud';
      accionColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    } else if (conv.destinatarioCorreo && destInfo.esTecnico) {
      accion = 'Turnó / Envió a técnico';
      accionColor = 'bg-blue-50 text-blue-800 border-blue-200';
    }

    return { remitenteInfo, destInfo, accion, accionColor };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-[2rem] max-w-2xl w-full p-6 shadow-2xl text-slate-900 max-h-[90vh] overflow-y-auto">
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                Folio #{ticket.id}
              </span>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
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
            </div>
            <h3 className="font-bold text-lg text-slate-900 mt-2.5">
              {ticket.articulo || 'Sin Artículo Especificado'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-5">
          {/* Antigüedad Warning */}
          {isPending && bDays >= 5 && (
            <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>
                <strong>Alerta de Rezago:</strong> Este ticket tiene{' '}
                <strong>{bDays} días hábiles</strong> sin resolverse. Considerar incluir en la plantilla de cierre.
              </span>
            </div>
          )}

          {/* Resumen Administrativo (Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-bold">Tipo de Solicitud</span>
              </div>
              <p className="font-bold text-slate-900">{ticket.tipoSolicitud || 'No especificado'}</p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-bold">Fecha de Creación</span>
              </div>
              <p className="font-bold text-slate-900">
                {ticket.fechaCreacion || 'No registrada'}
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-bold">Solicitante</span>
              </div>
              <p className="font-bold text-slate-900">{ticket.solicitante}</p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-bold">Buzón Asignado (ServiceDesk)</span>
              </div>
              <p className="font-bold text-slate-900">{ticket.tecnicoAsignado}</p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-bold">Técnico en Atención</span>
              </div>
              <p className="font-bold text-slate-900">{ticket.tecnicoAtencion || 'No asignado / Sin dato'}</p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-bold">Categoría</span>
              </div>
              <p className="font-bold text-slate-900">{ticket.categoria}</p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-bold">Subcategoría</span>
              </div>
              <p className="font-bold text-slate-900">{ticket.subcategoria}</p>
            </div>
          </div>

          {/* Clasificación de Tipo de Trabajo (Dictamen de No Utilidad) */}
          <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-200/80 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Clasificación de Tipo de Trabajo</span>
              </h4>
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                  clasificacion.esDictamenNoUtilidad
                    ? 'bg-purple-100 text-purple-900 border border-purple-200'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {clasificacion.esDictamenNoUtilidad
                  ? 'DICTAMEN DE NO UTILIDAD'
                  : 'SERVICIO ESTÁNDAR'}
              </span>
            </div>

            <div
              className={`p-3.5 rounded-xl border ${
                clasificacion.esDictamenNoUtilidad
                  ? 'bg-white border-purple-200 text-purple-950 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold flex items-center gap-1.5 text-xs text-slate-900">
                  <FileText className="w-3.5 h-3.5 text-purple-600" />
                  Estado del Dictamen
                </span>
                {clasificacion.esDictamenNoUtilidad && (
                  <span className="text-[10px] font-extrabold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                    CONFIANZA: {clasificacion.confianzaDictamen}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {clasificacion.esDictamenNoUtilidad
                  ? clasificacion.resultadoDictamen.justificacionPrincipal
                  : 'Este ticket no corresponde a un dictamen de no utilidad ni baja de equipo de cómputo.'}
              </p>
            </div>
          </div>

          {/* RESPONSABILIDAD OPERATIVA (FASE 10) */}
          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-200 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Responsabilidad Operativa ({atribucion.responsablesOperativos.length})</span>
              </h4>
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                Área: {atribucion.areaOperativa}
              </span>
            </div>

            {atribucion.responsablesOperativos.length === 0 ? (
              <div className="p-3 bg-white rounded-xl border border-indigo-100 text-slate-500 text-xs">
                Sin responsable operativo asignado por reglas de negocio.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {atribucion.responsablesOperativos.map((resp, rIdx) => (
                  <div
                    key={rIdx}
                    className="p-3 bg-white rounded-xl border border-indigo-200 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-slate-900 text-xs">
                          {resp.nombre}
                        </span>
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          RESPONSABLE
                        </span>
                      </div>
                      <span className="text-[10px] text-indigo-700 font-semibold block">
                        {resp.reglaAplicada}
                      </span>
                    </div>
                    {resp.sustitutoDe && (
                      <span className="text-[10px] text-amber-700 font-medium mt-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Sustituye a {resp.sustitutoDe} (histórico)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {atribucion.participantesHistoricos.length > 0 && (
              <div className="pt-2 border-t border-indigo-100">
                <span className="text-[10px] font-bold text-slate-500 block uppercase mb-1">
                  Participantes Históricos Registrados:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {atribucion.participantesHistoricos.map((ph, phIdx) => (
                    <span
                      key={phIdx}
                      className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
                    >
                      {ph}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* TÉCNICOS QUE INTERVINIERON (Humanizado) */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Técnicos que Intervinieron ({participacionesTecnicos.length})</span>
              </h4>
              <span className="text-[10px] text-slate-500 font-semibold">Atribución Operativa</span>
            </div>

            {participacionesTecnicos.length === 0 ? (
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                No se detectó intervención directa de técnicos registrados en el catálogo para este ticket.
              </div>
            ) : (
              <div className="space-y-2.5">
                {participacionesTecnicos.map((part, pIdx) => {
                  const techIdentity = resolverNombreYCorreo(null, part.tecnicoNombre);
                  return (
                    <div
                      key={pIdx}
                      className={`p-3.5 rounded-xl border text-xs bg-white ${
                        part.categoriaPrincipal === 'ATENDIO'
                          ? 'border-emerald-200 shadow-xs'
                          : part.categoriaPrincipal === 'RECIBIO'
                          ? 'border-blue-200'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            {part.tecnicoNombre}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {techIdentity.correo || 'correo no registrado'}
                          </div>
                        </div>

                        <span
                          className={`self-start sm:self-center text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                            part.categoriaPrincipal === 'ATENDIO'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : part.categoriaPrincipal === 'RECIBIO'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : part.categoriaPrincipal === 'PARTICIPO'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {part.etiquetaRolHumano}
                        </span>
                      </div>

                      {/* Lista de Acciones Administrativas Detectadas */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
                          Acciones realizadas en este ticket:
                        </span>
                        {part.accionesHumanas.map((acc, aIdx) => (
                          <div
                            key={aIdx}
                            className="flex items-start gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-200/60"
                          >
                            <span className="font-bold text-indigo-900 shrink-0">
                              • {acc.etiquetaHumana}:
                            </span>
                            <span className="text-slate-700">{acc.descripcion}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Asunto, Descripción y Resolución del Ticket */}
          {(ticket.asunto || ticket.descripcion || ticket.resolucion) && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs space-y-3">
              {ticket.asunto && (
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Asunto:</span>
                  <p className="font-medium text-slate-900">{ticket.asunto}</p>
                </div>
              )}
              {ticket.descripcion && (
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Descripción de la Solicitud:</span>
                  <p className="text-slate-800 whitespace-pre-line bg-white p-3 rounded-xl border border-slate-200">
                    {ticket.descripcion}
                  </p>
                </div>
              )}
              {ticket.resolucion && (
                <div>
                  <span className="font-bold text-emerald-700 block mb-0.5">Resolución / Cierre:</span>
                  <p className="text-emerald-950 bg-emerald-50/80 p-3 rounded-xl border border-emerald-200">
                    {ticket.resolucion}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* HISTORIAL Y LÍNEA DE TIEMPO DE CONVERSACIONES (Humanizado) */}
          {ticket.conversaciones && ticket.conversaciones.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Línea de Tiempo y Conversaciones ({ticket.conversaciones.length})</span>
                </h4>
                <span className="text-[11px] font-semibold text-slate-500">
                  {ticket.conversaciones.length === 1 ? '1 comunicación' : `${ticket.conversaciones.length} comunicaciones`}
                </span>
              </div>

              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                {ticket.conversaciones.map((conv, idx) => {
                  const { remitenteInfo, destInfo, accion, accionColor } =
                    interpretarAccionConversacion(conv, idx);

                  return (
                    <div
                      key={idx}
                      className="relative pl-8 space-y-2 group"
                    >
                      {/* Nodo de la línea de tiempo */}
                      <div className="absolute left-2 top-3 w-3.5 h-3.5 rounded-full border-2 border-white bg-indigo-600 shadow-xs"></div>

                      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs text-xs space-y-2.5">
                        {/* Cabecera del mensaje */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${accionColor}`}>
                              {accion}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Paso #{idx + 1}
                            </span>
                          </div>
                          <span className="text-slate-500 font-medium text-[11px] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {conv.fecha || 'Fecha no registrada'}
                          </span>
                        </div>

                        {/* Remitente y Destinatario Claros (Nombre + Correo) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                          <div>
                            <span className="text-slate-500 font-bold block mb-0.5">De:</span>
                            <div className="font-semibold text-slate-900">
                              {remitenteInfo.nombre}
                            </div>
                            {remitenteInfo.correo && (
                              <div className="text-slate-500 text-[10px] font-mono">
                                {remitenteInfo.correo}
                              </div>
                            )}
                          </div>

                          <div>
                            <span className="text-slate-500 font-bold block mb-0.5">Para:</span>
                            <div className="font-semibold text-slate-900">
                              {destInfo.nombre}
                            </div>
                            {destInfo.correo && (
                              <div className="text-slate-500 text-[10px] font-mono">
                                {destInfo.correo}
                              </div>
                            )}
                          </div>

                          {conv.cc && (
                            <div className="col-span-full pt-1 border-t border-slate-200/50">
                              <span className="text-slate-500 font-bold">Copia (CC): </span>
                              <span className="text-slate-700 font-mono text-[10px]">{conv.cc}</span>
                            </div>
                          )}
                        </div>

                        {/* Asunto de la comunicación */}
                        {conv.asunto && (
                          <div className="text-xs">
                            <span className="text-slate-500 font-medium">Asunto: </span>
                            <span className="font-bold text-slate-900">{conv.asunto}</span>
                          </div>
                        )}

                        {/* Mensaje / Contenido */}
                        {(conv.cuerpo || conv.descripcion) && (
                          <div className="text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-200/70 text-slate-800 whitespace-pre-line leading-relaxed">
                            {conv.cuerpo || conv.descripcion}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Cerrar Detalle
          </button>
        </div>
      </div>
    </div>
  );
};

