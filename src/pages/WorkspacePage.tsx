import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  Brain,
  Check,
  CheckCircle2,
  ChevronRight,
  Compass,
  Database,
  Edit3,
  FileText,
  GitBranch,
  Layers,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import { AgentStatusLabel, DemoDisclosure, EmptyNotice, SectionHeader } from '../components/shared/StatusHelpers';
import { useResearch } from '../context/ResearchContext';
import { AgentId } from '../types/research';

const AGENT_ICONS: Record<AgentId, React.FC<{ className?: string }>> = {
  planner: Brain,
  discovery: Search,
  evidence: BookOpenCheck,
  verification: ShieldCheck,
  gaps: Compass,
  synthesis: Sparkles,
  report: FileText,
};

const AGENT_ORDER: AgentId[] = [
  'planner',
  'discovery',
  'evidence',
  'verification',
  'gaps',
  'synthesis',
  'report',
];

export const WorkspacePage: React.FC = () => {
  const {
    activeProject,
    isSimulating,
    wasInterruptedOnRefresh,
    replaySimulation,
    pauseSimulation,
    resumeOrRetryProject,
    setActivePage,
    addExpandedQuery,
    updateExpandedQuery,
    removeExpandedQuery,
    rerunExpandedQuery,
  } = useResearch();

  const [newQueryText, setNewQueryText] = useState('');
  const [newQueryBranch, setNewQueryBranch] = useState('Custom Investigation');
  const [editingQueryId, setEditingQueryId] = useState<string | null>(null);
  const [editingQueryText, setEditingQueryText] = useState('');
  const [showTopicTree, setShowTopicTree] = useState(true);

  const abstractCoveragePct = useMemo(() => {
    if (!activeProject || !activeProject.sources.length) return 0;
    const withAbs = activeProject.sources.filter((s) => Boolean(s.abstract)).length;
    return Math.round((withAbs / activeProject.sources.length) * 100);
  }, [activeProject]);

  const evidenceCoverageAvg = useMemo(() => {
    if (!activeProject || !activeProject.gaps.length) return 0;
    return Math.round(
      activeProject.gaps.reduce((acc, g) => acc + g.coveragePercent, 0) / activeProject.gaps.length
    );
  }, [activeProject]);

  if (!activeProject) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Live Autonomous Workspace"
          subtitle="Monitor the 7-agent academic retrieval, DOI verification, gap detection, and report compilation pipeline."
        />
        <EmptyNotice
          title="No active research investigation"
          description="Start a new research run to watch Planner, Discovery, Evidence, Verification, Gap Detection, Synthesis, and Report agents query OpenAlex, Crossref, and Semantic Scholar live."
          actionLabel="Start New Research"
          onAction={() => setActivePage('new-research')}
        />
      </div>
    );
  }

  const gapCount = activeProject.gaps.filter((g) => g.coverageStatus !== 'Well explored').length;

  const handleAddQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQueryText.trim()) return;
    addExpandedQuery(newQueryText, newQueryBranch);
    setNewQueryText('');
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title={activeProject.topic}
        subtitle={activeProject.objective}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DemoDisclosure
              providerMode={activeProject.providerMode}
              label={`Real Academic Retrieval · Iteration ${activeProject.iterationRound}/${activeProject.maxIterations}`}
            />
            {isSimulating ? (
              <button
                onClick={pauseSimulation}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs font-medium text-amber-200 hover:bg-amber-500/20"
              >
                <Pause className="h-3.5 w-3.5" />
                Pause
              </button>
            ) : (
              <button
                onClick={() => replaySimulation(activeProject.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 bg-[#0D1323] text-xs font-medium text-slate-200 hover:border-slate-600"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Re-run Academic Search
              </button>
            )}
            <button
              onClick={() => setActivePage('report-viewer')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-medium text-white transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              Open Report
            </button>
          </div>
        }
      />

      {/* Recoverable Error Banner */}
      {activeProject.status === 'Error' && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-rose-100">Academic Database Retrieval Error</div>
              <p className="text-xs text-rose-200/80 mt-0.5">
                {activeProject.lastError || 'Upstream academic databases failed to return records. No fabricated data was inserted.'}
              </p>
            </div>
          </div>
          <button
            onClick={resumeOrRetryProject}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry Search
          </button>
        </div>
      )}

      {wasInterruptedOnRefresh && isSimulating && (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-200">
          Browser refresh detected mid-run — restored project state and resumed live academic retrieval.
        </div>
      )}

      {/* Database Retrieval & Verification Integrity Strip */}
      <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
            <Database className="h-4 w-4 text-cyan-400" />
            <span>Academic Registries</span>
          </div>
          {activeProject.databaseStatuses.length === 0 ? (
            <span className="text-xs text-slate-400">Querying OpenAlex, Crossref, and Semantic Scholar...</span>
          ) : (
            <div className="flex flex-wrap items-center gap-4 text-xs">
              {activeProject.databaseStatuses.map((db) => (
                <div key={db.database} className="flex items-center gap-1.5" title={db.error || 'Healthy'}>
                  {db.status === 'ok' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  ) : db.status === 'degraded' ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                  )}
                  <span className="font-medium text-slate-200">{db.database}</span>
                  <span className="font-mono tabular-nums text-slate-400">
                    {db.retrievedCount} raw · {db.latencyMs}ms
                  </span>
                  {db.error && (
                    <span className="text-[11px] text-amber-300 truncate max-w-[180px]">({db.error})</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums text-slate-400 shrink-0">
          <span>Verified: <strong className="text-emerald-300">{activeProject.sources.length}</strong></span>
          <span>Duplicates Removed: <strong className="text-cyan-300">{activeProject.duplicatesRemovedCount}</strong></span>
          <span>Unverified Excluded: <strong className="text-amber-300">{activeProject.rejectedUnverifiedCount}</strong></span>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-3.5">
          <div className="text-[11px] text-slate-400">Research Iteration</div>
          <div className="text-lg font-semibold font-mono tabular-nums text-slate-50 mt-0.5">
            {activeProject.iterationRound} <span className="text-xs text-slate-500">/ {activeProject.maxIterations} max</span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-3.5">
          <div className="text-[11px] text-slate-400">Quality Score</div>
          <div className="text-lg font-semibold font-mono tabular-nums text-violet-300 mt-0.5">
            {activeProject.qualityScore.overall} / 100
          </div>
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-3.5">
          <div className="text-[11px] text-slate-400">Abstract Availability</div>
          <div className="text-lg font-semibold font-mono tabular-nums text-cyan-300 mt-0.5">
            {abstractCoveragePct}%
          </div>
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-3.5">
          <div className="text-[11px] text-slate-400">Branch Coverage</div>
          <div className="text-lg font-semibold font-mono tabular-nums text-emerald-300 mt-0.5">
            {evidenceCoverageAvg}%
          </div>
        </div>
        <button
          onClick={() => setActivePage('contradiction-radar')}
          className="text-left rounded-xl border border-slate-800/80 hover:border-rose-500/40 bg-[#0D1323] p-3.5 transition-colors"
        >
          <div className="text-[11px] text-slate-400">Conflict Alerts</div>
          <div className="text-lg font-semibold font-mono tabular-nums text-rose-300 mt-0.5">
            {activeProject.contradictions.length} found
          </div>
        </button>
        <button
          onClick={() => setActivePage('research-gaps')}
          className="text-left rounded-xl border border-slate-800/80 hover:border-amber-500/40 bg-[#0D1323] p-3.5 transition-colors"
        >
          <div className="text-[11px] text-slate-400">Research Gaps</div>
          <div className="text-lg font-semibold font-mono tabular-nums text-amber-300 mt-0.5">
            {gapCount} open
          </div>
        </button>
      </div>

      {/* Overall Execution Progress */}
      <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-200">
            7-Agent Scholarly Research Pipeline ({activeProject.mode.toUpperCase()} Mode)
          </span>
          <span className="font-mono text-xs tabular-nums text-cyan-300">
            {activeProject.simulationProgress}% complete
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400 transition-all duration-300"
            style={{ width: `${activeProject.simulationProgress}%` }}
          />
        </div>
        {activeProject.reasonForAdditionalResearch && (
          <div className="pt-2 border-t border-slate-800/70 flex items-start gap-2.5 text-xs">
            <Sparkles className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-200">Autonomous Follow-Up Triggered: </span>
              <span className="text-slate-300">{activeProject.reasonForAdditionalResearch}</span>
            </div>
          </div>
        )}
      </div>

      {/* 7 AI Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {AGENT_ORDER.map((agentId, index) => {
          const agent = activeProject.agents[agentId];
          if (!agent) return null;
          const Icon = AGENT_ICONS[agentId];
          const isWorking =
            agent.status === 'Planning' ||
            agent.status === 'Searching' ||
            agent.status === 'Analyzing' ||
            agent.status === 'Needs more research';

          return (
            <div
              key={agent.id}
              className={`rounded-xl border p-4 flex flex-col justify-between transition-all bg-[#0D1323] ${
                agent.status === 'Failed'
                  ? 'border-rose-500/60'
                  : isWorking
                  ? 'border-cyan-500/60 shadow-[0_0_24px_rgba(6,182,212,0.12)]'
                  : agent.status === 'Completed'
                  ? 'border-slate-800/90'
                  : 'border-slate-800/60 opacity-85'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center border ${
                        agent.status === 'Failed'
                          ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                          : isWorking
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                          : agent.status === 'Completed'
                          ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-mono text-slate-500">0{index + 1}. Agent</div>
                      <h3 className="text-sm font-semibold text-slate-100">{agent.name}</h3>
                    </div>
                  </div>
                  <AgentStatusLabel status={agent.status} />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{agent.roleTitle}</span>
                    <span className="font-mono tabular-nums text-slate-200">{agent.completionPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        agent.status === 'Failed'
                          ? 'bg-rose-500'
                          : agent.status === 'Completed'
                          ? 'bg-emerald-500'
                          : 'bg-cyan-400'
                      }`}
                      style={{ width: `${agent.completionPercent}%` }}
                    />
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed min-h-[36px]">
                  {agent.currentActivity}
                </p>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800/70 text-center">
                  <div>
                    <div className="text-[10px] text-slate-500">Tasks</div>
                    <div className="text-xs font-mono tabular-nums font-semibold text-slate-100 mt-0.5">
                      {agent.tasksCompleted}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Papers</div>
                    <div className="text-xs font-mono tabular-nums font-semibold text-slate-100 mt-0.5">
                      {agent.sourcesProcessed}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Time</div>
                    <div className="text-xs font-mono tabular-nums font-semibold text-slate-100 mt-0.5">
                      {(agent.executionTimeMs / 1000).toFixed(1)}s
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-1 max-h-24 overflow-y-auto">
                {agent.logs.length === 0 ? (
                  <div className="text-[11px] text-slate-500">Awaiting upstream handoff...</div>
                ) : (
                  agent.logs.slice(-3).map((line, i) => (
                    <div key={i} className="text-[11px] font-mono text-slate-400 leading-snug">
                      {line}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Parallel Branches + Handoffs */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-6 rounded-xl border border-slate-800/80 bg-[#0D1323] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-100">Scholarly Query Branches</h2>
              <p className="text-xs text-slate-400">
                Subquestions queried against OpenAlex, Crossref, and Semantic Scholar.
              </p>
            </div>
            <Layers className="h-4 w-4 text-cyan-400" />
          </div>

          {activeProject.parallelBranches.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              Branches populate when Planner Agent finishes decomposing subquestions.
            </div>
          ) : (
            <div className="space-y-3">
              {activeProject.parallelBranches.map((br) => (
                <div key={br.id} className="rounded-lg border border-slate-800 bg-[#080D1A] p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-slate-100">{br.name}</span>
                    <span
                      className={`font-mono text-[11px] ${
                        br.status === 'Completed'
                          ? 'text-emerald-400'
                          : br.status === 'Failed'
                          ? 'text-rose-400'
                          : br.status === 'Retrying'
                          ? 'text-amber-300'
                          : br.status === 'Running'
                          ? 'text-cyan-300'
                          : 'text-slate-500'
                      }`}
                    >
                      {br.status} · {br.progress}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        br.status === 'Failed'
                          ? 'bg-rose-500'
                          : br.status === 'Retrying'
                          ? 'bg-amber-400'
                          : br.status === 'Completed'
                          ? 'bg-emerald-500'
                          : 'bg-cyan-400'
                      }`}
                      style={{ width: `${br.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate max-w-[65%]">{br.subquestion}</span>
                    <span className="font-mono tabular-nums shrink-0">
                      {br.sourcesCollected} papers · {br.findingsCount} abstracts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="xl:col-span-6 rounded-xl border border-slate-800/80 bg-[#0D1323] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Agent Handoffs & Autonomous Decisions
              </h2>
              <p className="text-xs text-slate-400">
                Inter-agent state transfers and bounded follow-up decisions.
              </p>
            </div>
            <Sparkles className="h-4 w-4 text-violet-400" />
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {activeProject.autonomousDecisions.map((dec) => (
              <div key={dec.id} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-amber-300">
                    Autonomous Decision · Iter {dec.iteration}/{activeProject.maxIterations}
                  </span>
                  <span className="font-mono text-slate-400">{dec.timestamp}</span>
                </div>
                <div className="text-xs font-medium text-slate-100">{dec.decision}</div>
                <p className="text-xs text-slate-400 leading-relaxed">{dec.reason}</p>
              </div>
            ))}

            {activeProject.agentHandoffs.map((ho) => (
              <div key={ho.id} className="rounded-lg border border-slate-800 bg-[#080D1A] p-3 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1.5 font-medium text-cyan-300">
                    {ho.fromAgent}
                    <ArrowRight className="h-3 w-3 text-slate-500" />
                    {ho.toAgent}
                  </span>
                  <span className="font-mono text-slate-500">{ho.timestamp}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{ho.summary}</p>
                <div className="text-[11px] font-mono text-violet-300">{ho.payloadLabel}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Shared Findings + Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 rounded-xl border border-slate-800/80 bg-[#0D1323] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-100">Extracted Abstract Findings</h2>
            <span className="text-xs font-mono text-slate-500">
              {activeProject.sharedFindings.length} items
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/70">
            {activeProject.sharedFindings.length === 0 ? (
              <div className="py-6 text-xs text-slate-500 text-center">
                Abstract excerpts and verified paper records stream here during Discovery & Evidence extraction.
              </div>
            ) : (
              activeProject.sharedFindings.map((sf) => (
                <div key={sf.id} className="py-3 first:pt-0 last:pb-0 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-cyan-300">{sf.branchName}</span>
                    <span className="font-mono text-slate-500">
                      {sf.sourceId ? `[${sf.sourceId}] · ` : ''}
                      {sf.timestamp}
                    </span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">{sf.text}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-6 rounded-xl border border-slate-800/80 bg-[#0D1323] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-100">Live Agent Activity Log</h2>
            <span className="text-xs font-mono text-slate-500">{activeProject.activityLog.length} events</span>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/70">
            {activeProject.activityLog.map((entry) => (
              <div key={entry.id} className="py-2.5 flex items-start gap-3 text-xs">
                <span className="font-mono tabular-nums text-slate-500 shrink-0">{entry.timestamp}</span>
                <span className="font-mono uppercase text-[11px] text-violet-300 w-24 shrink-0">
                  {entry.agent}
                </span>
                <span
                  className={
                    entry.type === 'warning'
                      ? 'text-amber-300'
                      : entry.type === 'success'
                      ? 'text-emerald-300'
                      : entry.type === 'action'
                      ? 'text-cyan-300'
                      : 'text-slate-300'
                  }
                >
                  {entry.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Query Expansion & Topic Tree */}
      <section className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Scholarly Query Expansion & Topic Tree
            </h2>
            <p className="text-xs text-slate-400">
              Add, edit, or execute targeted queries directly against OpenAlex, Crossref, and Semantic Scholar.
            </p>
          </div>
          <button
            onClick={() => setShowTopicTree((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-medium text-slate-300 hover:text-white self-start"
          >
            <GitBranch className="h-3.5 w-3.5 text-violet-400" />
            {showTopicTree ? 'Hide Topic Tree' : 'Show Topic Tree'}
          </button>
        </div>

        <form onSubmit={handleAddQuery} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newQueryBranch}
            onChange={(e) => setNewQueryBranch(e.target.value)}
            placeholder="Branch name"
            className="sm:w-48 rounded-lg border border-slate-800 bg-[#070B14] px-3 py-2 text-xs text-slate-200 focus:border-violet-500 focus:outline-none"
          />
          <input
            type="text"
            value={newQueryText}
            onChange={(e) => setNewQueryText(e.target.value)}
            placeholder="Add new academic query..."
            className="flex-1 rounded-lg border border-slate-800 bg-[#070B14] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Query
          </button>
        </form>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {activeProject.expandedQueries.map((q) => {
            const isEditing = editingQueryId === q.id;
            return (
              <div
                key={q.id}
                className="rounded-lg border border-slate-800/80 bg-[#080D1A] p-3 flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-medium text-violet-300">{q.branch}</span>
                  <span className="font-mono tabular-nums text-slate-400">
                    {q.status} · {q.sourcesFound} papers
                  </span>
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingQueryText}
                      onChange={(e) => setEditingQueryText(e.target.value)}
                      className="flex-1 rounded border border-violet-500/60 bg-[#0D1323] px-2.5 py-1 text-xs text-slate-100 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        updateExpandedQuery(q.id, editingQueryText);
                        setEditingQueryId(null);
                      }}
                      className="p-1.5 rounded bg-violet-600 text-white"
                      aria-label="Save query"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-200 font-mono leading-relaxed">{q.query}</p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <span className="text-[11px] text-slate-500 truncate max-w-[65%]">{q.subquestion}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setEditingQueryId(q.id);
                        setEditingQueryText(q.query);
                      }}
                      title="Edit query"
                      className="p-1 text-slate-400 hover:text-slate-100"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => rerunExpandedQuery(q.id)}
                      title="Query databases"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-cyan-300"
                    >
                      <Play className="h-2.5 w-2.5" />
                      Run
                    </button>
                    <button
                      onClick={() => removeExpandedQuery(q.id)}
                      title="Remove query"
                      className="p-1 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {showTopicTree && (
          <div className="pt-4 border-t border-slate-800/80">
            <div className="text-xs font-medium text-slate-400 mb-3">
              Topic Decomposition Hierarchy
            </div>
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
              <div className="lg:w-64 shrink-0 rounded-lg border border-violet-500/40 bg-violet-500/10 p-3.5">
                <div className="text-[11px] font-mono text-violet-300">ROOT QUESTION</div>
                <div className="text-xs font-semibold text-slate-100 mt-1">{activeProject.topic}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-600 hidden lg:block shrink-0" />
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {activeProject.expandedQueries.map((q) => (
                  <div key={q.id} className="rounded-lg border border-slate-800 bg-[#080D1A] p-2.5">
                    <div className="text-xs font-medium text-cyan-300 truncate">{q.branch}</div>
                    <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{q.subquestion}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
