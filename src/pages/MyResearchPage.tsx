import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Edit3,
  FileText,
  LayoutGrid,
  List,
  PlusCircle,
  Search,
  Trash2,
} from 'lucide-react';
import { DemoDisclosure, EmptyNotice, SectionHeader } from '../components/shared/StatusHelpers';
import { useResearch } from '../context/ResearchContext';
import { ResearchMode } from '../types/research';

export const MyResearchPage: React.FC = () => {
  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    setActivePage,
    renameProject,
    duplicateProject,
    deleteProject,
    backendCapabilities,
  } = useResearch();

  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | ResearchMode>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'score' | 'sources'>('newest');
  const [viewMode, setViewMode] = useState<'cards' | 'rows'>('cards');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects
      .filter((p) => (modeFilter === 'all' ? true : p.mode === modeFilter))
      .filter((p) => !q || p.topic.toLowerCase().includes(q) || p.objective.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sortBy === 'score') return b.qualityScore.overall - a.qualityScore.overall;
        if (sortBy === 'sources') return b.sources.length - a.sources.length;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [projects, search, modeFilter, sortBy]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="My Research Projects"
        subtitle="Manage your autonomous research library, compare quality scores, duplicate templates, or open generated reports."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <DemoDisclosure providerMode={backendCapabilities.mode} />
            <button
              onClick={() => setActivePage('new-research')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-medium text-white transition-colors"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              New Research
            </button>
          </div>
        }
      />

      {/* Search, Filter, Sort, View Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full rounded-lg border border-slate-800 bg-[#0D1323] pl-8 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0D1323] border border-slate-800">
            {(['all', 'quick', 'standard', 'deep'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModeFilter(m)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize ${
                  modeFilter === m ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'score' | 'sources')}
            aria-label="Sort projects"
            className="rounded-lg border border-slate-800 bg-[#0D1323] px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="newest">Sort: Most Recent</option>
            <option value="score">Sort: Highest Quality Score</option>
            <option value="sources">Sort: Most Sources</option>
          </select>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0D1323] border border-slate-800">
            <button
              onClick={() => setViewMode('cards')}
              aria-label="Card view"
              className={`p-1.5 rounded ${viewMode === 'cards' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('rows')}
              aria-label="Row view"
              className={`p-1.5 rounded ${viewMode === 'rows' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyNotice
          title="No matching research projects"
          description="Try clearing your search filter or launch a new autonomous research investigation."
          actionLabel="Create New Research"
          onAction={() => setActivePage('new-research')}
        />
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((proj) => {
            const isActive = proj.id === activeProjectId;
            const isEditing = editingId === proj.id;
            return (
              <article
                key={proj.id}
                className={`rounded-xl border p-5 flex flex-col justify-between gap-4 bg-[#0D1323] ${
                  isActive ? 'border-violet-500/50' : 'border-slate-800/80'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="capitalize font-medium text-cyan-300">{proj.mode} research</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{proj.createdAt.slice(0, 10)}</span>
                      <span aria-hidden="true">·</span>
                      <span className={proj.status === 'Completed' ? 'text-emerald-400' : 'text-amber-400'}>
                        {proj.status}
                      </span>
                    </div>
                    <span className="font-mono tabular-nums text-slate-200 font-semibold">
                      Score {proj.qualityScore.overall}/100
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="flex-1 rounded border border-violet-500/60 bg-[#070B14] px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          renameProject(proj.id, editingTitle);
                          setEditingId(null);
                        }}
                        className="p-1.5 rounded bg-violet-600 text-white"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <h2 className="text-base font-semibold text-slate-50 leading-snug">{proj.topic}</h2>
                  )}

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {proj.reportSections[1]?.content || proj.objective}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-mono tabular-nums text-slate-400">
                    {proj.sources.length} papers · {proj.claims.length} claims
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => {
                        setActiveProjectId(proj.id);
                        setActivePage('report-viewer');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-medium text-white"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Open Report
                    </button>
                    <button
                      onClick={() => {
                        setActiveProjectId(proj.id);
                        setActivePage('workspace');
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-xs text-slate-200"
                    >
                      Workspace
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(proj.id);
                        setEditingTitle(proj.topic);
                      }}
                      title="Rename"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => duplicateProject(proj.id)}
                      title="Duplicate"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteProject(proj.id)}
                      title="Delete"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0A0F1D] text-slate-400">
                  <th className="py-3 px-4">Project Topic</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4 text-right">Sources</th>
                  <th className="py-3 px-4 text-right">Quality</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filtered.map((proj) => (
                  <tr key={proj.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-medium text-slate-100 max-w-sm truncate">{proj.topic}</td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-400">{proj.createdAt.slice(0, 10)}</td>
                    <td className="py-3 px-4 capitalize text-cyan-300">{proj.mode}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">{proj.sources.length}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">{proj.qualityScore.overall}/100</td>
                    <td className="py-3 px-4 text-emerald-400">{proj.status}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => {
                          setActiveProjectId(proj.id);
                          setActivePage('report-viewer');
                        }}
                        className="text-violet-400 hover:text-violet-300 font-medium"
                      >
                        Report
                      </button>
                      <button
                        onClick={() => duplicateProject(proj.id)}
                        className="text-slate-400 hover:text-slate-200"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => deleteProject(proj.id)}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
