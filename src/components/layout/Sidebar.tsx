import React from 'react';
import {
  Activity,
  BookOpen,
  Compass,
  Cpu,
  Database,
  FileDiff,
  FileText,
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  Radar,
  Scale,
  Settings,
} from 'lucide-react';
import { useResearch } from '../../context/ResearchContext';
import { NavPage } from '../../types/research';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: NavPage;
  label: string;
  icon: React.FC<{ className?: string }>;
  badge?: string | number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const { activePage, setActivePage, activeProject, isSimulating } = useResearch();

  const primaryNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new-research', label: 'New Research', icon: PlusCircle },
    { id: 'my-research', label: 'My Research', icon: FolderKanban },
    { id: 'research-library', label: 'Research Library', icon: BookOpen },
    { id: 'evidence-ledger', label: 'Evidence Ledger', icon: Scale, badge: activeProject?.claims.length ?? 0 },
    { id: 'contradiction-radar', label: 'Contradiction Radar', icon: Radar, badge: activeProject?.contradictions.length ?? 0 },
    {
      id: 'research-gaps',
      label: 'Research Gaps',
      icon: Compass,
      badge: activeProject?.gaps.filter((g) => g.coverageStatus !== 'Well explored').length ?? 0,
    },
    { id: 'research-trail', label: 'Research Trail', icon: GitBranch },
  ];

  const workspaceTools: NavItem[] = [
    { id: 'workspace', label: 'Live Workspace', icon: Activity },
    { id: 'report-viewer', label: 'Report Viewer', icon: FileText },
    { id: 'knowledge-map', label: 'Knowledge Map', icon: Network },
    { id: 'document-crossref', label: 'Doc Cross-Ref', icon: FileDiff },
    { id: 'research-memory', label: 'Research Memory', icon: Database },
  ];

  const handleSelect = (id: NavPage) => {
    setActivePage(id);
    onCloseMobile();
  };

  const renderNavButton = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = activePage === item.id;
    return (
      <button
        key={item.id}
        onClick={() => handleSelect(item.id)}
        title={collapsed ? item.label : undefined}
        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap ${
          isActive
            ? 'bg-violet-500/15 text-slate-50 border border-violet-500/30'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent'
        }`}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-violet-400' : 'text-slate-400'}`} />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </span>
        {!collapsed && item.badge !== undefined && (
          <span className="font-mono text-[11px] tabular-nums text-slate-500">{item.badge}</span>
        )}
      </button>
    );
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside
        className={`no-print fixed lg:static inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800/80 bg-[#0A0F1D] transition-all duration-200 ${
          collapsed ? 'w-[68px]' : 'w-[248px]'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-14 flex items-center justify-between px-3.5 border-b border-slate-800/80 shrink-0">
          <button
            onClick={() => handleSelect('dashboard')}
            className="flex items-center gap-2.5 text-left min-w-0"
          >
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shrink-0">
              <Cpu className="h-4 w-4 text-white" />
            </div>
            {!collapsed && (
              <span className="font-semibold tracking-tight text-slate-50 text-sm whitespace-nowrap truncate">
                ResearchFlow AI
              </span>
            )}
          </button>
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:inline-flex p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5">
          <div className="space-y-1">
            {!collapsed && (
              <div className="px-3 pb-1 text-[11px] font-medium text-slate-500">Navigation</div>
            )}
            {primaryNav.map(renderNavButton)}
          </div>

          <div className="pt-2 border-t border-slate-800/70 space-y-1">
            {!collapsed && (
              <div className="px-3 pb-1 text-[11px] font-medium text-slate-500">Investigation Views</div>
            )}
            {workspaceTools.map(renderNavButton)}
          </div>
        </div>

        {/* Bottom Workspace Footer */}
        <div className="p-2.5 border-t border-slate-800/80 space-y-1.5 shrink-0">
          <button
            onClick={() => handleSelect('settings')}
            title={collapsed ? 'Settings' : undefined}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap ${
              activePage === 'settings'
                ? 'bg-violet-500/15 text-slate-50 border border-violet-500/30'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </button>

          {!collapsed && (
            <div className="px-3 py-2 rounded-lg bg-[#0F1629] border border-slate-800/80 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-200 truncate">Alex Rivera</span>
                <span className="font-mono text-[10px] text-emerald-400">
                  {isSimulating ? 'Running' : 'Live APIs'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {activeProject?.topic || 'No active investigation'}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
