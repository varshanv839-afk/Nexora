import React from 'react';
import { AlertTriangle, Check, Database, ExternalLink, RefreshCw, X } from 'lucide-react';
import { DemoDisclosure, EmptyNotice, SectionHeader } from '../components/shared/StatusHelpers';
import { useResearch } from '../context/ResearchContext';

export const ResearchMemoryPage: React.FC = () => {
  const {
    memoryItems,
    toggleReuseMemory,
    rejectMemory,
    refreshMemoryItem,
    setActivePage,
    backendCapabilities,
  } = useResearch();

  const activeItems = memoryItems.filter((m) => !m.rejected);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Research Memory"
        subtitle="Reusable findings and source lineages persisted from your completed investigations—always labeled with their exact verification date."
        actions={<DemoDisclosure providerMode={backendCapabilities.mode} />}
      />

      {memoryItems.length === 0 ? (
        <EmptyNotice
          title="No saved research memory yet"
          description="Complete a research run to store verified findings with publication dates and real paper citations for reuse across future investigations."
          actionLabel="Start New Research"
          onAction={() => setActivePage('new-research')}
        />
      ) : (
        <>
          {/* Active Memory Match Banner */}
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-cyan-300 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-slate-100">
                  Stored findings from completed runs ({activeItems.length} active records)
                </div>
                <p className="text-xs text-slate-400">
                  ResearchFlow always displays exact verification dates and marks records older than 60 days before reuse.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActivePage('new-research')}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 shrink-0"
            >
              Apply in New Research →
            </button>
          </div>

          {/* Memory Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {memoryItems.map((mem) => (
              <article
                key={mem.id}
                className={`rounded-xl border p-5 space-y-3 bg-[#0D1323] ${
                  mem.rejected
                    ? 'border-slate-800/50 opacity-50'
                    : mem.reusedInCurrent
                    ? 'border-emerald-500/50'
                    : 'border-slate-800/80'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-violet-300">{mem.topic}</span>
                  <span className="font-mono tabular-nums text-slate-400">
                    Verified: {mem.lastVerifiedDate}
                  </span>
                </div>

                {mem.isOutdated && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>Older verification date — refresh recommended before reuse</span>
                  </div>
                )}

                <p className="text-sm text-slate-100 leading-relaxed">{mem.finding}</p>

                <div className="text-xs text-slate-400 space-y-1">
                  <div>
                    <span className="text-slate-500">Sources:</span> {mem.sourceTitles.join(', ')}
                  </div>
                  <div>
                    <span className="text-slate-500">Subtopics:</span> {mem.relatedTopics.join(' · ')}
                  </div>
                  <div className="font-mono tabular-nums text-slate-400">
                    Confidence: {mem.confidence}%
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/70 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => toggleReuseMemory(mem.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      mem.reusedInCurrent
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'border-slate-700 text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {mem.reusedInCurrent ? 'Reusing in Active Project' : 'Reuse Finding'}
                  </button>

                  <button
                    onClick={() => setActivePage('research-library')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-cyan-300 hover:border-slate-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Inspect Sources
                  </button>

                  {mem.isOutdated && (
                    <button
                      onClick={() => refreshMemoryItem(mem.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/40 text-xs text-amber-300 hover:bg-amber-500/10"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Refresh Finding
                    </button>
                  )}

                  {!mem.rejected && (
                    <button
                      onClick={() => rejectMemory(mem.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-rose-400 ml-auto"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject Reuse
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
