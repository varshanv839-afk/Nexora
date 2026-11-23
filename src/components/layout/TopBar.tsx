import React, { useMemo, useState } from 'react';
import { Bell, ChevronRight, Coins, Menu, Search, X } from 'lucide-react';
import { useResearch } from '../../context/ResearchContext';
import { NavPage } from '../../types/research';

const PAGE_LABELS: Record<NavPage, string> = {
  dashboard: 'Dashboard',
  'new-research': 'New Research',
  workspace: 'Live Autonomous Workspace',
  'my-research': 'My Research',
  'research-library': 'Research Library & Source Intelligence',
  'evidence-ledger': 'Claim–Evidence Ledger',
  'contradiction-radar': 'Contradiction Radar',
  'research-gaps': 'Research Gap Detector',
  'research-trail': 'Research Trail',
  'knowledge-map': 'Knowledge Map',
  'document-crossref': 'Document Cross-Reference',
  'research-memory': 'Research Memory',
  'report-viewer': 'Report Viewer',
  settings: 'Settings',
};

export const TopBar: React.FC<{ onOpenMobileNav: () => void }> = ({ onOpenMobileNav }) => {
  const {
    activePage,
    setActivePage,
    activeProject,
    projects,
    setActiveProjectId,
    notifications,
    markAllNotificationsRead,
    markNotificationRead,
    credits,
    isSimulating,
  } = useResearch();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { projects: [], claims: [], sources: [], contradictions: [] };

    return {
      projects: projects.filter((p) => p.topic.toLowerCase().includes(q)).slice(0, 3),
      claims: (activeProject?.claims || []).filter((c) => c.claim.toLowerCase().includes(q)).slice(0, 4),
      sources: (activeProject?.sources || [])
        .filter((s) => s.title.toLowerCase().includes(q) || s.publisher.toLowerCase().includes(q))
        .slice(0, 4),
      contradictions: (activeProject?.contradictions || [])
        .filter((x) => x.topic.toLowerCase().includes(q) || x.differenceSummary.toLowerCase().includes(q))
        .slice(0, 3),
    };
  }, [searchQuery, projects, activeProject]);

  return (
    <header className="no-print h-14 border-b border-slate-800/80 bg-[#080D1A]/95 backdrop-blur px-4 lg:px-6 flex items-center justify-between gap-4 shrink-0 z-30 relative">
      {/* Left: Mobile Trigger & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileNav}
          aria-label="Open menu"
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
        >
          <Menu className="h-5 w-5" />
        </button>
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs sm:text-sm min-w-0">
          <button
            onClick={() => setActivePage('dashboard')}
            className="text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            Workspace
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-slate-600 shrink-0" />
          <span className="text-slate-400 truncate max-w-[140px] sm:max-w-[220px] hidden sm:inline">
            {activeProject?.topic || 'Ready to Research'}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-600 shrink-0 hidden sm:inline" />
          <span className="font-medium text-slate-100 whitespace-nowrap truncate">
            {PAGE_LABELS[activePage]}
          </span>
        </nav>
      </div>

      {/* Right: Global Search, Credits, Notifications, Profile */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-[#0E1526] text-xs text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors whitespace-nowrap shrink-0"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Search claims, sources, projects...</span>
          <span className="md:hidden">Search</span>
        </button>

        <div
          title="Research session allocation"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-[#0E1526] text-xs font-mono tabular-nums text-slate-200 whitespace-nowrap shrink-0"
        >
          <Coins className="h-3.5 w-3.5 text-cyan-400" />
          <span>{credits}</span>
          <span className="text-slate-500 font-sans">credits</span>
        </div>

        {isSimulating && (
          <button
            onClick={() => setActivePage('workspace')}
            className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-xs font-medium text-cyan-300 whitespace-nowrap shrink-0"
          >
            Agents Active
          </button>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            aria-label="Notifications"
            className="relative p-2 rounded-lg border border-slate-800 bg-[#0E1526] text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-violet-600 text-[10px] font-mono text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-800 bg-[#0D1323] shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-100">Research Notifications</span>
                <button
                  onClick={markAllNotificationsRead}
                  className="text-xs text-violet-400 hover:text-violet-300"
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/70">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      markNotificationRead(n.id);
                      if (n.targetPage) setActivePage(n.targetPage);
                      setNotifOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-800/40 transition-colors ${
                      n.read ? 'opacity-70' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-100">{n.title}</span>
                      <span className="text-[11px] font-mono text-slate-500 shrink-0">{n.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{n.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <button
          onClick={() => setActivePage('settings')}
          title="Researcher Profile & Settings"
          className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600/80 to-blue-600/80 border border-violet-400/30 flex items-center justify-center text-xs font-semibold text-white shrink-0"
        >
          AR
        </button>
      </div>

      {/* Global Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center pt-20 px-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-[#0D1323] shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across projects, claims, sources, or contradictions..."
                className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
              <button
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                className="p-1 text-slate-400 hover:text-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-4 space-y-4">
              {!searchQuery.trim() ? (
                <div className="text-xs text-slate-400 py-4 text-center">
                  Try searching for <span className="text-slate-200 font-medium">"tuberculosis"</span>,{' '}
                  <span className="text-slate-200 font-medium">"DPDP"</span>,{' '}
                  <span className="text-slate-200 font-medium">"radiologist"</span>, or{' '}
                  <span className="text-slate-200 font-medium">"ABDM"</span>.
                </div>
              ) : (
                <>
                  {searchResults.projects.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-medium text-slate-500">Projects</div>
                      {searchResults.projects.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setActiveProjectId(p.id);
                            setActivePage('workspace');
                            setSearchOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/60 text-xs text-slate-200"
                        >
                          {p.topic}
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.claims.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-medium text-slate-500">Claims</div>
                      {searchResults.claims.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setActivePage('evidence-ledger');
                            setSearchOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/60 text-xs text-slate-200"
                        >
                          <span className="font-mono text-violet-400 mr-2">{c.id}</span>
                          {c.claim}
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.sources.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-medium text-slate-500">Sources</div>
                      {searchResults.sources.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            setActivePage('research-library');
                            setSearchOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/60 text-xs text-slate-200"
                        >
                          <span className="font-mono text-cyan-400 mr-2">{s.id}</span>
                          {s.title} <span className="text-slate-500">· {s.publisher}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.contradictions.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-medium text-slate-500">Contradictions</div>
                      {searchResults.contradictions.map((x) => (
                        <button
                          key={x.id}
                          onClick={() => {
                            setActivePage('contradiction-radar');
                            setSearchOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/60 text-xs text-slate-200"
                        >
                          {x.topic}
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.projects.length === 0 &&
                    searchResults.claims.length === 0 &&
                    searchResults.sources.length === 0 &&
                    searchResults.contradictions.length === 0 && (
                      <div className="text-xs text-slate-400 text-center py-6">
                        No matching records found for "{searchQuery}".
                      </div>
                    )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
