import React, { useState } from 'react';
import { CheckCircle2, GitCompare, Search } from 'lucide-react';
import {
  DemoDisclosure,
  EmptyNotice,
  SectionHeader,
  SeverityText,
} from '../components/shared/StatusHelpers';
import { useResearch } from '../context/ResearchContext';
import { ContradictionSeverity } from '../types/research';

export const ContradictionRadarPage: React.FC = () => {
  const { activeProject, investigateContradiction, setActivePage } = useResearch();
  const [severityFilter, setSeverityFilter] = useState<'All' | ContradictionSeverity>('All');

  if (!activeProject) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Contradiction Radar"
          subtitle="Surface genuine conflicting findings or methodological tensions across retrieved scholarly abstracts."
        />
        <EmptyNotice
          title="No active research project"
          description="Launch a scholarly research run to screen retrieved abstracts for conflicting results or methodological limitations."
          actionLabel="Start New Research"
          onAction={() => setActivePage('new-research')}
        />
      </div>
    );
  }

  const items = activeProject.contradictions.filter((c) =>
    severityFilter === 'All' ? true : c.severity === severityFilter
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Contradiction Radar"
        subtitle="Surfacing where verified scholarly abstracts report opposing outcomes, sample caveats, or methodological limitations."
        actions={<DemoDisclosure providerMode={activeProject.providerMode} />}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0D1323] border border-slate-800">
          {(['All', 'Significant', 'Moderate', 'Minor'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                severityFilter === sev
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-400 font-mono tabular-nums">
          Showing {items.length} of {activeProject.contradictions.length} conflicts
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyNotice
          title={
            activeProject.contradictions.length === 0
              ? 'No inter-abstract contradictions detected'
              : 'No contradictions at this severity level'
          }
          description={
            activeProject.contradictions.length === 0
              ? 'Verification Agent did not detect direct opposing outcomes among the retrieved abstracts, or abstracts were limited.'
              : 'Select All severities to inspect all conflicting findings.'
          }
          actionLabel={activeProject.contradictions.length === 0 ? 'Inspect Sources' : 'Show All Contradictions'}
          onAction={() => {
            if (activeProject.contradictions.length === 0) {
              setActivePage('research-library');
            } else {
              setSeverityFilter('All');
            }
          }}
        />
      ) : (
        <div className="space-y-5">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-5 lg:p-6 space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/70">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 text-xs text-slate-400">
                    <span className="font-mono text-violet-300">{item.id}</span>
                    <span aria-hidden="true">·</span>
                    <SeverityText severity={item.severity} />
                    {item.investigated && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Follow-Up Query Dispatched
                        </span>
                      </>
                    )}
                  </div>
                  <h2 className="text-base sm:text-lg font-semibold text-slate-50">{item.topic}</h2>
                </div>

                <button
                  onClick={() => investigateContradiction(item.id)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
                >
                  <Search className="h-3.5 w-3.5" />
                  {item.investigated ? 'Re-run Investigation' : 'Investigate Disagreement'}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-800 bg-[#080D1A] p-4 space-y-2">
                  <div className="text-[11px] font-mono text-cyan-300">POSITION A · [{item.sourceAId}]</div>
                  <p className="text-sm text-slate-100 leading-relaxed">{item.claimA}</p>
                  <div className="text-xs text-slate-400 pt-1">Paper: {item.sourceA}</div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-[#080D1A] p-4 space-y-2">
                  <div className="text-[11px] font-mono text-amber-300">POSITION B · [{item.sourceBId}]</div>
                  <p className="text-sm text-slate-100 leading-relaxed">{item.claimB}</p>
                  <div className="text-xs text-slate-400 pt-1">Paper: {item.sourceB}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800/70 text-xs">
                <div className="space-y-1">
                  <div className="font-medium text-slate-200 flex items-center gap-1.5">
                    <GitCompare className="h-3.5 w-3.5 text-violet-400" />
                    Difference in Conclusions
                  </div>
                  <p className="text-slate-400 leading-relaxed">{item.differenceSummary}</p>
                </div>

                <div className="space-y-1">
                  <div className="font-medium text-slate-200">Possible Methodological Cause</div>
                  <p className="text-slate-400 leading-relaxed">{item.whyTheyDisagree}</p>
                </div>

                <div className="space-y-1">
                  <div className="font-medium text-slate-200">Comparison Scope</div>
                  <p className="text-slate-400 leading-relaxed">{item.contextAndMethodology}</p>
                </div>
              </div>

              {item.investigationNote && (
                <div className="text-xs text-cyan-300 pt-2 border-t border-slate-800/70">
                  Agent Note: {item.investigationNote}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
