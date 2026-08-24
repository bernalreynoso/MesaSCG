import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  ShieldAlert,
  UserCheck,
  Laptop,
  Building2,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { ViewType } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onSelectView: (view: ViewType) => void;
  counts: {
    total: number;
    overdue: number;
    unassigned: number;
    qualityErrors: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  counts,
}) => {
  const menuItems = [
    {
      id: 'dashboard_general' as ViewType,
      label: 'Dashboard General',
      icon: LayoutDashboard,
      badge: counts.total ? `${counts.total}` : undefined,
      badgeColor: 'bg-indigo-100 text-indigo-800 font-bold',
    },
    {
      id: 'auditoria_catalogo' as ViewType,
      label: 'Auditoría de Catálogo',
      icon: Boxes,
      badge: undefined,
      badgeColor: '',
    },
    {
      id: 'calidad_tiempos' as ViewType,
      label: 'Calidad y Tiempos Muertos',
      icon: ShieldAlert,
      badge: counts.qualityErrors > 0 ? `${counts.qualityErrors}` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 border border-amber-200 font-bold',
    },
    {
      id: 'control_soporte' as ViewType,
      label: 'Control de Técnicos (Soporte)',
      icon: UserCheck,
      badge: undefined,
      badgeColor: '',
    },
    {
      id: 'control_informatica' as ViewType,
      label: 'Control de Técnicos (Informática)',
      icon: Laptop,
      badge: undefined,
      badgeColor: '',
    },
    {
      id: 'control_interinstitucional' as ViewType,
      label: 'Control de Técnicos (Interinstitucional)',
      icon: Building2,
      badge: undefined,
      badgeColor: '',
    },
    {
      id: 'catalogo_tecnicos' as ViewType,
      label: 'Catálogo de Técnicos',
      icon: Users,
      badge: undefined,
      badgeColor: '',
    },
    {
      id: 'validacion_motores' as ViewType,
      label: 'Validación de Motores',
      icon: ShieldCheck,
      badge: '5 Motores',
      badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold',
    },
  ];

  return (
    <aside className="bg-white border-b border-slate-200/80 lg:border-b-0 lg:border-r text-slate-700 w-full lg:w-72 shrink-0 p-4 lg:p-6 flex flex-col justify-between space-y-6">
      <div>
        <div className="hidden lg:block px-3 pb-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
          Módulos del Sistema
        </div>
        <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-1.5 pb-2 lg:pb-0 scrollbar-none">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`flex items-center justify-between whitespace-nowrap lg:whitespace-normal px-3.5 py-3 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50/90 text-indigo-900 font-bold shadow-xs border-l-4 border-indigo-600 lg:pl-2.5'
                    : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900 border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-indigo-600'
                        : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`ml-2 px-2.5 py-0.5 text-[10px] rounded-full ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bento Sidebar Bottom Status Card */}
      <div className="hidden lg:block bg-slate-900 rounded-2xl p-5 text-white shadow-lg mt-auto border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
        <p className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Estatus Operativo</span>
          <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded border border-emerald-500/30">ONLINE</span>
        </p>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></div>
          <span className="text-xs font-bold text-slate-100">Motor SDP Conectado</span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between border-t border-slate-800 pt-2.5">
          <span>Soporte & IT</span>
          <span className="text-indigo-400 font-semibold">v2.4 SCG</span>
        </div>
      </div>
    </aside>
  );
};
