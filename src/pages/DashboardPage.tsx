import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Clock,
  FileText,
  FolderKanban,
  Layers,
  Play,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { QualityScoreCard } from '../components/shared/QualityScoreCard';
import { DemoDisclosure } from '../components/shared/StatusHelpers';
import { useResearch } from '../context/ResearchContext';
import { ReportLength, ResearchMode } from '../types/research';

const EXAMPLE_TOPICS = [
  'Impact of AI on healthcare in India',
  'Future of renewable energy',
  'Cybersecurity trends',
  'AI in education',
  'Global semiconductor competition',
];

const SUGGESTED_RESEARCH_QUESTIONS = [
  { topic: 'Clinical AI validation in emerging healthcare systems', tag: 'Health AI' },
  { topic: 'Grid-scale sodium-ion versus lithium iron phosphate battery storage', tag: 'Energy' },
  { topic: 'Post-quantum cryptography migration and lattice standards', tag: 'Security' },
  { topic: 'Large language model tutoring efficacy in STEM education', tag: 'EdTech' },
];

export const DashboardPage: React.FC = () => {
  const {
    projects,
    activeProject,
    setActiveProjectId,
    setActivePage,
    startNewResearch,
    settings,
    setDraftTopic,
    backendCapabilities,
  } = useResearch();

  const [prompt, setPrompt] = useState('');
  const [topicError, setTopicError] = useState<string | null>(null);
  const [mode, setMode] = useState<ResearchMode>(settings.defaultMode);
  const [reportLength, setReportLength] = useState<ReportLength>(settings.defaultLength);

  const totalSources = projects.reduce((acc, p) => acc + p.sources.length, 0);
  const totalReports = projects.filter((p) => p.status === 'Completed').length;
  const totalHoursSaved = projects.reduce((acc, p) => acc + p.researchHoursSaved, 0);
  const chartData = projects
    .slice(0, 7)
    .reverse()
    .map((p, idx) => ({
      day: p.topic.length > 14 ? `${p.topic.slice(0, 14)}…` : p.topic || `Run ${idx + 1}`,
      sources: p.sources.length,
      claims: p.claims.length,
    }));

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = prompt.trim();
    if (!cleaned) {
      setTopicError('Please enter a research topic or click one of the example topics below.');
      return;
    }
    setTopicError(null);
    await startNewResearch({
      topic: cleaned,
      objective: `Conduct a ${mode} multi-agent investigation into "${cleaned}" with balanced primary evidence, contradiction detection, and gap analysis.`,
      customInstructions: '',
      mode,
      reportLength,
      domains: ['Technology', 'Healthcare', 'Business'],
      sourcePreferences: ['Academic papers', 'Government reports', 'Industry publications', 'News'],
      minSources: mode === 'deep' ? 10 : mode === 'standard' ? 8 : 5,
      includeOpposingViewpoints: true,
      prioritizeRecentSources: true,
      enableAutonomousFollowUp: mode !== 'quick',
      enableContradictionAnalysis: true,
    });
  };

  return (
    <div className="space-y-8">
      {/* Hero Research Launch Surface */}
      <section className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <DemoDisclosure providerMode={backendCapabilities.mode} />
          <button
            onClick={() => {
              setDraftTopic(prompt);
              setActivePage('new-research');
            }}
            className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
          >
            Open advanced setup →
          </button>
        </div>

        <div className="max-w-3xl space-y-2 mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-50 text-balance">
            Your AI research team, ready to investigate.
          </h1>
          <p className="text-sm sm:text-base text-slate-400">
            From complex questions to evidence-backed insights.
          </p>
        </div>

        <form onSubmit={handleStart} className="space-y-4">
          <div className={`rounded-xl border bg-[#070B14] p-3 transition-colors ${
            topicError ? 'border-rose-500/70' : 'border-slate-700/80 focus-within:border-violet-500/70'
          }`}>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (topicError) setTopicError(null);
              }}
              placeholder="What do you want to discover today?"
              className="w-full resize-none bg-transparent text-sm sm:text-base text-slate-100 placeholder:text-slate-500 focus:outline-none px-1.5 py-1"
            />
            {topicError && (
              <p className="px-1.5 pb-1 text-xs text-rose-400">{topicError}</p>
            )}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 mt-2 border-t border-slate-800/80">
              <div className="flex flex-wrap items-center gap-3">
                {/* Research Depth */}
                <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0D1323] border border-slate-800">
                  {(
                    [
                      { id: 'quick', label: 'Quick Scan' },
                      { id: 'standard', label: 'Standard Research' },
                      { id: 'deep', label: 'Deep Research' },
                    ] as const
                  ).map((opt) => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setMode(opt.id)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        mode === opt.id
                          ? 'bg-violet-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Report Length */}
                <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0D1323] border border-slate-800">
                  {(
                    [
                      { id: 'brief', label: 'Brief' },
                      { id: 'standard', label: 'Standard' },
                      { id: 'comprehensive', label: 'Comprehensive' },
                    ] as const
                  ).map((opt) => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setReportLength(opt.id)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        reportLength === opt.id
                          ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                          : 'text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                <Play className="h-4 w-4" />
                Start Research
              </button>
            </div>
          </div>

          {/* Example Topics */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 mr-1">Example topics:</span>
            {EXAMPLE_TOPICS.map((topic) => (
              <button
                type="button"
                key={topic}
                onClick={() => setPrompt(topic)}
                className="px-2.5 py-1 rounded-md border border-slate-800 bg-[#0A0F1D] text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
              >
                {topic}
              </button>
            ))}
          </div>
        </form>
      </section>

      {/* KPI Metrics Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Research Projects',
            value: projects.length,
            sub: 'Persisted in workspace',
            icon: FolderKanban,
          },
          {
            label: 'Verified Papers Analyzed',
            value: totalSources,
            sub: 'OpenAlex · Crossref · Semantic Scholar',
            icon: BookOpen,
          },
          {
            label: 'Reports Generated',
            value: totalReports,
            sub: '13-section structured briefs',
            icon: FileText,
          },
          {
            label: 'Research Hours Saved',
            value: `${totalHoursSaved.toFixed(1)} hrs`,
            sub: 'Estimated manual equivalent',
            icon: Clock,
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-5 flex items-start justify-between gap-3"
            >
              <div>
                <div className="text-xs text-slate-400">{kpi.label}</div>
                <div className="text-2xl font-semibold font-mono tabular-nums text-slate-50 mt-1.5">
                  {kpi.value}
                </div>
                <div className="text-xs text-slate-500 mt-1">{kpi.sub}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-800/50 text-cyan-400">
                <Icon className="h-4 w-4" />
              </div>
            </div>
          );
        })}
      </section>

      {/* Main Analytics & Active Investigation Split */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Research Activity Timeline + Recent Projects */}
        <div className="xl:col-span-7 space-y-6">
          <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-100">Investigation Yield Overview</h2>
                <p className="text-xs text-slate-400">
                  Verified papers retrieved vs. claims evaluated across your workspace runs
                </p>
              </div>
              <TrendingUp className="h-4 w-4 text-cyan-400" />
            </div>

            {chartData.length === 0 ? (
              <div className="h-56 w-full rounded-lg border border-dashed border-slate-800 flex flex-col items-center justify-center px-6 text-center space-y-1.5">
                <p className="text-xs font-medium text-slate-300">No investigation telemetry recorded yet</p>
                <p className="text-xs text-slate-500 max-w-md">
                  Launch a topic above to track verified paper counts and evidence-backed claims retrieved from OpenAlex, Crossref, and Semantic Scholar.
                </p>
              </div>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradClaims" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradSources" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid rgba(148,163,184,0.2)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                    />
                    <Area type="monotone" dataKey="claims" name="Claims Evaluated" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradClaims)" />
                    <Area type="monotone" dataKey="sources" name="Verified Papers" stroke="#06b6d4" strokeWidth={2} fill="url(#gradSources)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-100">Recent Projects & History</h2>
              <button
                onClick={() => setActivePage('my-research')}
                className="text-xs font-medium text-violet-400 hover:text-violet-300"
              >
                View all projects →
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No research runs yet. Enter any topic above and click <span className="text-violet-300 font-medium">Start Research</span> to query OpenAlex, Crossref, and Semantic Scholar live.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/70">
                {projects.slice(0, 4).map((proj) => (
                  <div
                    key={proj.id}
                    className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <button
                        onClick={() => {
                          setActiveProjectId(proj.id);
                          setActivePage('workspace');
                        }}
                        className="text-sm font-medium text-slate-100 hover:text-violet-300 text-left transition-colors truncate block max-w-full"
                      >
                        {proj.topic}
                      </button>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span className="capitalize">{proj.mode} research</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{proj.sources.length} papers</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">Score {proj.qualityScore.overall}/100</span>
                        <span aria-hidden="true">·</span>
                        <span className={proj.status === 'Completed' ? 'text-emerald-400' : 'text-amber-400'}>
                          {proj.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setActiveProjectId(proj.id);
                          setActivePage('workspace');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                      >
                        Workspace
                      </button>
                      <button
                        onClick={() => {
                          setActiveProjectId(proj.id);
                          setActivePage('report-viewer');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 transition-colors"
                      >
                        Report
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-5 space-y-6">
          {activeProject ? (
            <QualityScoreCard quality={activeProject.qualityScore} compact />
          ) : (
            <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-5 space-y-2">
              <div className="text-xs font-mono text-cyan-300">READY FOR LIVE RETRIEVAL</div>
              <h3 className="text-base font-semibold text-slate-100">Evidence Quality Overview</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Start a research topic to compute coverage, DOI cross-verification, recency, and abstract completeness scores directly from real retrieved literature.
              </p>
            </div>
          )}

          <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-100">Suggested Research Prompts</h2>
              <Layers className="h-4 w-4 text-violet-400" />
            </div>

            <div className="divide-y divide-slate-800/70">
              {SUGGESTED_RESEARCH_QUESTIONS.map((item) => (
                <button
                  key={item.topic}
                  onClick={() => setPrompt(item.topic)}
                  className="w-full py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-left group"
                >
                  <span className="text-xs sm:text-sm text-slate-300 group-hover:text-white transition-colors">
                    {item.topic}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500 shrink-0">
                    {item.tag}
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 text-violet-400 transition-opacity" />
                  </span>
                </button>
              ))}
            </div>

            {activeProject && (
              <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between">
                <span className="text-xs text-slate-400 truncate max-w-[65%]">Active: {activeProject.topic}</span>
                <button
                  onClick={() => setActivePage('evidence-ledger')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-cyan-300 hover:text-cyan-200 shrink-0"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Inspect Ledger
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
