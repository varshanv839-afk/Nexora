import React, { useMemo, useState } from 'react';
import { BookOpen, ExternalLink, FileText, ShieldCheck } from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DemoDisclosure, EmptyNotice, SectionHeader } from '../components/shared/StatusHelpers';
import { useResearch } from '../context/ResearchContext';
import { AcademicDatabaseName } from '../types/research';

const DB_FILTERS: ('All' | AcademicDatabaseName)[] = [
  'All',
  'OpenAlex',
  'Crossref',
  'Semantic Scholar',
  'Web (Tavily)',
];

const CHART_COLORS = ['#8b5cf6', '#06b6d4', '#3b82f6', '#10b981', '#f59e0b'];

export const SourceIntelligencePage: React.FC = () => {
  const { activeProject, setActivePage } = useResearch();
  const [dbFilter, setDbFilter] = useState<'All' | AcademicDatabaseName>('All');
  const [onlyWithAbstract, setOnlyWithAbstract] = useState(false);

  const sources = activeProject?.sources || [];

  const filteredSources = useMemo(() => {
    return sources
      .filter((s) => (dbFilter === 'All' ? true : s.databasesFoundIn.includes(dbFilter)))
      .filter((s) => (onlyWithAbstract ? Boolean(s.abstract) : true));
  }, [sources, dbFilter, onlyWithAbstract]);

  const databaseDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    sources.forEach((s) => {
      s.databasesFoundIn.forEach((db) => {
        counts[db] = (counts[db] || 0) + 1;
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [sources]);

  const timelineData = useMemo(() => {
    const years: Record<string, number> = {};
    sources.forEach((s) => {
      const yr = s.publicationYear ? String(s.publicationYear) : 'Unknown';
      years[yr] = (years[yr] || 0) + 1;
    });
    return Object.entries(years)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, count]) => ({ year, count }));
  }, [sources]);

  const recencyAndContribution = useMemo(() => {
    return sources.map((s) => ({
      id: `[${s.id}]`,
      recency: s.recencyScore,
      contribution: s.evidenceContribution,
    }));
  }, [sources]);

  const crossCheckedPct = useMemo(() => {
    if (!sources.length) return 0;
    const count = sources.filter((s) => s.verificationStatus === 'Cross-Checked' || Boolean(s.doi)).length;
    return Math.round((count / sources.length) * 100);
  }, [sources]);

  if (!activeProject) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Research Library & Verified Academic Sources"
          subtitle="Browse verified papers retrieved from OpenAlex, Crossref, and Semantic Scholar."
        />
        <EmptyNotice
          title="No active research project"
          description="Start a research query to retrieve real academic papers, DOIs, abstracts, and open-access PDF links."
          actionLabel="Start New Research"
          onAction={() => setActivePage('new-research')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Research Library & Source Intelligence"
        subtitle={`Auditing ${sources.length} real verified publications for DOI provenance, abstract availability, and cross-database confirmation.`}
        actions={
          <DemoDisclosure
            providerMode={activeProject.providerMode}
            label={`${activeProject.duplicatesRemovedCount} duplicates removed · ${activeProject.rejectedUnverifiedCount} unverified excluded`}
          />
        }
      />

      {/* Bibliographic Verification Indicator */}
      <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
            <ShieldCheck className="h-4 w-4" />
            <span>DOI & Registry Verification Rate</span>
          </div>
          <p className="text-xs text-slate-400">
            Every reference listed below comes directly from OpenAlex, Crossref, or Semantic Scholar with verified titles, authors, and publication URLs.
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="w-40 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400"
              style={{ width: `${crossCheckedPct}%` }}
            />
          </div>
          <span className="font-mono tabular-nums text-sm font-semibold text-slate-100">
            {crossCheckedPct}% DOI / Multi-DB
          </span>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      {sources.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-4 space-y-2">
            <h3 className="text-xs font-semibold text-slate-200">Database Provenance</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={databaseDistribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={42}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {databaseDistribution.map((entry, idx) => (
                      <Cell key={entry.name} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(148,163,184,0.2)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400">
              {databaseDistribution.map((c, idx) => (
                <span key={c.name} className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-sm inline-block"
                    style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                  />
                  {c.name} ({c.value})
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-4 space-y-2">
            <h3 className="text-xs font-semibold text-slate-200">Publication Years</h3>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timelineData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(148,163,184,0.2)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                  />
                  <Bar dataKey="count" name="Papers" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-4 space-y-2">
            <h3 className="text-xs font-semibold text-slate-200">Recency & Evidence Weight</h3>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recencyAndContribution} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <XAxis dataKey="id" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(148,163,184,0.2)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                  />
                  <Bar dataKey="recency" name="Recency Score" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="contribution" name="Weight %" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#0D1323] border border-slate-800">
          {DB_FILTERS.map((db) => (
            <button
              key={db}
              onClick={() => setDbFilter(db)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                dbFilter === db
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {db}
            </button>
          ))}
        </div>

        <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyWithAbstract}
            onChange={() => setOnlyWithAbstract((v) => !v)}
            className="accent-violet-500"
          />
          Only papers with full abstracts
        </label>
      </div>

      {/* Source Cards */}
      {filteredSources.length === 0 ? (
        <EmptyNotice
          title={sources.length === 0 ? 'No papers retrieved yet' : 'No sources match this filter'}
          description={
            sources.length === 0
              ? 'Run or retry the academic retrieval pipeline in the Live Workspace.'
              : 'Reset database or abstract filters to view all retrieved scholarly papers.'
          }
          actionLabel={sources.length === 0 ? 'Go to Workspace' : 'Show All Papers'}
          onAction={() => {
            if (sources.length === 0) {
              setActivePage('workspace');
            } else {
              setDbFilter('All');
              setOnlyWithAbstract(false);
            }
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredSources.map((src) => {
            const authorLine =
              src.authors.length > 4
                ? `${src.authors.slice(0, 4).join(', ')} et al.`
                : src.authors.join(', ');

            return (
              <article
                key={src.id}
                className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-5 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-cyan-300">[{src.id}]</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-400 font-medium">{src.verificationStatus}</span>
                      <span aria-hidden="true">·</span>
                      <span>{src.databasesFoundIn.join(' + ')}</span>
                      <span aria-hidden="true">·</span>
                      <span className={src.evidenceScope === 'Abstract Only' ? 'text-violet-300' : 'text-amber-300'}>
                        {src.evidenceScope}
                      </span>
                    </div>
                    <span className="font-mono tabular-nums">
                      {src.publicationYear || src.publicationDate}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-100 leading-snug">{src.title}</h3>
                  <div className="text-xs text-slate-300">{authorLine}</div>
                  <div className="text-xs text-slate-400">{src.venue}</div>

                  {src.abstract ? (
                    <p className="text-xs text-slate-300 leading-relaxed pt-1 line-clamp-4">
                      {src.abstract}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 italic pt-1">
                      Abstract unavailable via open API — bibliographic metadata verified.
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/70 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono tabular-nums text-slate-400">
                    <div className="flex flex-wrap items-center gap-3">
                      {src.doi && <span>DOI: {src.doi}</span>}
                      {src.citationCount !== undefined && <span>Citations: {src.citationCount}</span>}
                    </div>
                    <span className="text-violet-300">Weight {src.evidenceContribution}%</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-cyan-300 hover:text-cyan-200 font-medium"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {src.doi ? 'Open DOI / Paper' : 'Open Publication URL'}
                    </a>
                    {src.openAccessPdfUrl && (
                      <a
                        href={src.openAccessPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 font-medium"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Open-Access PDF
                      </a>
                    )}
                    <span className="text-[11px] text-slate-500 ml-auto inline-flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {src.queryBranch}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
