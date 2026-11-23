import React, { useMemo, useState } from 'react';
import { Compass, ExternalLink, Play, Sparkles } from 'lucide-react';
import {
  CoverageStatusText,
  DemoDisclosure,
  EmptyNotice,
  SectionHeader,
} from '../components/shared/StatusHelpers';
import { useResearch } from '../context/ResearchContext';

export const ResearchGapsPage: React.FC = () => {
  const { activeProject, investigateResearchGaps, setActivePage } = useResearch();
  const [selectedGapId, setSelectedGapId] = useState<string>('');

  const gaps = activeProject?.gaps || [];
  const sources = activeProject?.sources || [];

  const avgCoverage = useMemo(() => {
    if (!gaps.length) return 0;
    return Math.round(gaps.reduce((acc, g) => acc + g.coveragePercent, 0) / gaps.length);
  }, [gaps]);

  const totalUnanswered = useMemo(
    () => gaps.reduce((acc, g) => acc + g.unansweredCount, 0),
    [gaps]
  );

  if (!activeProject) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Discover what retrieved research hasn't answered yet."
          subtitle="Identify sparse literature branches, missing abstracts, and unanswered questions."
        />
        <EmptyNotice
          title="No active research project"
          description="Launch a scholarly search to analyze literature coverage and detect missing evidence."
          actionLabel="Start New Research"
          onAction={() => setActivePage('new-research')}
        />
      </div>
    );
  }

  const nonExploredCount = gaps.filter((g) => g.coverageStatus !== 'Well explored').length;
  const selectedGap = gaps.find((g) => g.id === selectedGapId) || gaps[0];

  const getBarClass = (status: string) => {
    if (status === 'Well explored') return 'bg-emerald-500';
    if (status === 'Partially explored') return 'bg-cyan-400';
    if (status === 'Under explored') return 'bg-amber-400';
    return 'bg-rose-500';
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Discover what your research hasn't answered yet."
        subtitle={`Coverage matrix & blind-spot detector for "${activeProject.topic}". Click any branch to inspect missing evidence and run a live follow-up academic query.`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <DemoDisclosure providerMode={activeProject.providerMode} />
            <button
              onClick={() => investigateResearchGaps()}
              disabled={gaps.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-xs font-medium text-white transition-colors"
            >
              <Play className="h-3.5 w-3.5" />
              Investigate Research Gaps
            </button>
          </div>
        }
      />

      {/* Gap Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-4">
          <div className="text-xs text-slate-400">Overall Branch Coverage</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-50 mt-1">
            {avgCoverage}%
          </div>
          <div className="text-xs text-slate-500 mt-1">Across {gaps.length} planned branches</div>
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-4">
          <div className="text-xs text-slate-400">Unanswered Questions</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-amber-300 mt-1">
            {totalUnanswered}
          </div>
          <div className="text-xs text-slate-500 mt-1">Flagged for follow-up queries</div>
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-4">
          <div className="text-xs text-slate-400">Abstract Completeness</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-50 mt-1">
            {activeProject.qualityScore.criteria.find((c) => c.key === 'completeness')?.score ?? 0}%
          </div>
          <div className="text-xs text-slate-500 mt-1">Papers returning full abstracts</div>
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-4">
          <div className="text-xs text-slate-400">Under-Researched Branches</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-rose-300 mt-1">
            {nonExploredCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">Missing or partial coverage</div>
        </div>
      </div>

      {gaps.length === 0 ? (
        <EmptyNotice
          title="Gap audit pending"
          description="Coverage metrics will populate once the Gap Detection Agent completes its branch audit."
          actionLabel="Open Live Workspace"
          onAction={() => setActivePage('workspace')}
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-7 rounded-xl border border-slate-800/80 bg-[#0D1323] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-100">Research Coverage Matrix</h2>
              <span className="text-xs text-slate-400">Click an area to inspect</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {gaps.map((gap) => {
                const selected = selectedGap?.id === gap.id;
                return (
                  <button
                    key={gap.id}
                    onClick={() => setSelectedGapId(gap.id)}
                    className={`text-left rounded-lg border p-4 transition-colors space-y-2.5 ${
                      selected
                        ? 'border-violet-500/70 bg-violet-500/10'
                        : 'border-slate-800 bg-[#080D1A] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-100">{gap.subtopic}</span>
                      <span className="font-mono text-xs tabular-nums text-slate-300">
                        {gap.coveragePercent}%
                      </span>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getBarClass(gap.coverageStatus)}`}
                        style={{ width: `${gap.coveragePercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <CoverageStatusText status={gap.coverageStatus} />
                      <span className="text-slate-500 font-mono tabular-nums">
                        {gap.availableSourceIds.length} papers
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedGap && (
            <aside className="xl:col-span-5 rounded-xl border border-slate-800/80 bg-[#0D1323] p-5 space-y-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800/80">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Compass className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Gap Inspector</span>
                    <span aria-hidden="true">·</span>
                    <CoverageStatusText status={selectedGap.coverageStatus} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-50 mt-1">{selectedGap.subtopic}</h3>
                </div>
                <span className="font-mono text-lg tabular-nums font-semibold text-slate-200">
                  {selectedGap.coveragePercent}%
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="font-semibold text-slate-200 mb-1">Why This Gap Matters</div>
                  <p className="text-slate-400 leading-relaxed">{selectedGap.whyItMatters}</p>
                </div>

                <div>
                  <div className="font-semibold text-slate-200 mb-1">What Is Currently Missing</div>
                  <p className="text-slate-400 leading-relaxed">{selectedGap.whatsMissing}</p>
                </div>

                <div className="rounded-lg border border-slate-800 bg-[#080D1A] p-3.5 space-y-1">
                  <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Follow-Up Academic Query
                  </div>
                  <p className="text-slate-200 font-mono leading-relaxed">{selectedGap.suggestedQuestion}</p>
                </div>

                <div>
                  <div className="font-semibold text-slate-200 mb-1.5">
                    Retrieved Papers in Branch ({selectedGap.availableSourceIds.length})
                  </div>
                  <div className="space-y-1.5">
                    {selectedGap.availableSourceIds.length === 0 ? (
                      <div className="text-slate-500">None yet — launch gap investigation below.</div>
                    ) : (
                      selectedGap.availableSourceIds.map((sid) => {
                        const src = sources.find((s) => s.id === sid);
                        return (
                          <div key={sid} className="flex items-center justify-between gap-2 text-slate-400">
                            <span className="truncate">
                              <span className="font-mono text-violet-300 mr-1.5">[{sid}]</span>
                              {src ? `${src.title} (${src.publicationYear || 'n.d.'})` : sid}
                            </span>
                            {src && (
                              <a
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-300 hover:text-cyan-200 shrink-0"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => investigateResearchGaps(selectedGap.id)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-medium text-white transition-colors"
              >
                <Play className="h-3.5 w-3.5" />
                Run Real Query for "{selectedGap.subtopic}"
              </button>
            </aside>
          )}
        </div>
      )}
    </div>
  );
};
