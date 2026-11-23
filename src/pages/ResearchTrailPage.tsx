import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  RotateCcw,
} from 'lucide-react';
import { DemoDisclosure, EmptyNotice, SectionHeader } from '../components/shared/StatusHelpers';
import { useResearch } from '../context/ResearchContext';
import { exportResearchTrailJSON } from '../services/researchService';

export const ResearchTrailPage: React.FC = () => {
  const { activeProject, replaySimulation, setActivePage } = useResearch();
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!activeProject?.trail.length) {
      setExpandedIds([]);
      return;
    }
    const defaults = [
      activeProject.trail[0]?.id,
      activeProject.trail[Math.floor(activeProject.trail.length / 2)]?.id,
      activeProject.trail[activeProject.trail.length - 1]?.id,
    ].filter((id): id is string => Boolean(id));
    setExpandedIds(Array.from(new Set(defaults)));
  }, [activeProject?.id, activeProject?.trail.length]);

  if (!activeProject) {
    return (
      <EmptyNotice
        title="No active research trail"
        description="Start a research investigation to view the step-by-step provenance trail across Planner, Discovery, Evidence, Verification, Gaps, Synthesis, and Report agents."
        actionLabel="Start New Research"
        onAction={() => setActivePage('new-research')}
      />
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const expandAll = () => setExpandedIds(activeProject.trail.map((t) => t.id));
  const collapseAll = () => setExpandedIds([]);

  return (
    <div className="space-y-6 max-w-5xl">
      <SectionHeader
        title="Research Trail & Agent Decision Provenance"
        subtitle={`Complete ${activeProject.trail.length}-stage audit trail explaining how AI agents decomposed, retrieved, verified, reconciled, and synthesized "${activeProject.topic}".`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <DemoDisclosure providerMode={activeProject.providerMode} />
            <button
              onClick={() => replaySimulation(activeProject.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-medium text-white transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Re-run Pipeline
            </button>
            <button
              onClick={() => exportResearchTrailJSON(activeProject)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-700 bg-[#0D1323] hover:border-slate-600 text-xs font-medium text-slate-200 transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-cyan-400" />
              Export Research Trail
            </button>
          </div>
        }
      />

      {activeProject.trail.length === 0 ? (
        <EmptyNotice
          title="Research trail pending"
          description="Agent decision stages are being recorded as the multi-agent pipeline executes."
          actionLabel="View Live Workspace"
          onAction={() => setActivePage('workspace')}
        />
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono tabular-nums">
              {activeProject.trail.filter((t) => t.completed).length} of {activeProject.trail.length} steps completed
            </span>
            <div className="flex items-center gap-3">
              <button onClick={expandAll} className="text-cyan-300 hover:text-cyan-200">
                Expand all
              </button>
              <span aria-hidden="true" className="text-slate-700">|</span>
              <button onClick={collapseAll} className="text-slate-400 hover:text-slate-200">
                Collapse all
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            {activeProject.trail.map((step) => {
              const isOpen = expandedIds.includes(step.id);
              return (
                <div
                  key={step.id}
                  className="rounded-xl border border-slate-800/80 bg-[#0D1323] overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpand(step.id)}
                    className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="font-mono text-xs tabular-nums text-slate-500 w-6 shrink-0">
                        {String(step.stepNumber).padStart(2, '0')}
                      </span>
                      {step.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-slate-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-100 truncate">
                          {step.title}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                          <span className="text-violet-300">{step.agent}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{step.timestamp}</span>
                        </div>
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-800/70 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <div className="font-medium text-slate-400">Input</div>
                        <p className="text-slate-200 leading-relaxed">{step.input}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium text-slate-400">Action Taken</div>
                        <p className="text-slate-200 leading-relaxed">{step.action}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium text-cyan-300">Output Produced</div>
                        <p className="text-slate-200 leading-relaxed">{step.output}</p>
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium text-violet-300">Reason for Decision</div>
                        <p className="text-slate-300 leading-relaxed">{step.reasonForDecision}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
