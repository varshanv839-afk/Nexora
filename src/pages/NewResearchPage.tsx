import React, { useMemo, useState } from 'react';
import { Check, Database, Play, RefreshCw, X } from 'lucide-react';
import { DemoDisclosure, SectionHeader } from '../components/shared/StatusHelpers';
import { useResearch } from '../context/ResearchContext';
import {
  ReportLength,
  ResearchDomain,
  ResearchMode,
  SourcePreference,
} from '../types/research';

const ALL_DOMAINS: ResearchDomain[] = [
  'Technology',
  'Healthcare',
  'Business',
  'Environment',
  'Science',
  'Education',
  'General',
];

const ALL_SOURCE_PREFS: SourcePreference[] = [
  'Academic papers',
  'Government reports',
  'News',
  'Industry publications',
  'Trusted websites',
];

export const NewResearchPage: React.FC = () => {
  const {
    startNewResearch,
    settings,
    draftTopic,
    memoryItems,
    toggleReuseMemory,
    rejectMemory,
    refreshMemoryItem,
    setActivePage,
  } = useResearch();

  const [topic, setTopic] = useState(draftTopic || 'Impact of Artificial Intelligence on Healthcare in India');
  const [objective, setObjective] = useState(
    'Analyze clinical diagnostic accuracy, rural accessibility, hospital TCO economics, ABDM infrastructure readiness, and DPDP privacy compliance.'
  );
  const [customInstructions, setCustomInstructions] = useState(
    'Contrast Tier-1 metro hospital outcomes with Tier-3 and rural Primary Health Center pilots.'
  );
  const [mode, setMode] = useState<ResearchMode>(settings.defaultMode);
  const [reportLength, setReportLength] = useState<ReportLength>(settings.defaultLength);
  const [domains, setDomains] = useState<ResearchDomain[]>(['Healthcare', 'Technology', 'Business']);
  const [sourcePrefs, setSourcePrefs] = useState<SourcePreference[]>([
    'Academic papers',
    'Government reports',
    'Industry publications',
    'News',
  ]);
  const [minSources, setMinSources] = useState<number>(10);
  const [includeOpposingViewpoints, setIncludeOpposingViewpoints] = useState(true);
  const [prioritizeRecentSources, setPrioritizeRecentSources] = useState(true);
  const [enableAutonomousFollowUp, setEnableAutonomousFollowUp] = useState(true);
  const [enableContradictionAnalysis, setEnableContradictionAnalysis] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const toggleDomain = (d: ResearchDomain) => {
    setDomains((prev) => (prev.includes(d) ? (prev.length > 1 ? prev.filter((x) => x !== d) : prev) : [...prev, d]));
  };

  const toggleSourcePref = (s: SourcePreference) => {
    setSourcePrefs((prev) =>
      prev.includes(s) ? (prev.length > 1 ? prev.filter((x) => x !== s) : prev) : [...prev, s]
    );
  };

  // Research Memory match detection
  const relevantMemory = useMemo(() => {
    const words = topic
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);
    return memoryItems.filter(
      (m) =>
        !m.rejected &&
        (words.some((w) => m.topic.toLowerCase().includes(w) || m.finding.toLowerCase().includes(w)) ||
          domains.some((d) => m.relatedTopics.some((rt) => rt.toLowerCase().includes(d.toLowerCase()))))
    );
  }, [topic, domains, memoryItems]);

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setFormError('Research topic cannot be empty.');
      return;
    }
    setFormError(null);
    setLaunching(true);
    await startNewResearch({
      topic,
      objective,
      customInstructions,
      mode,
      reportLength,
      domains,
      sourcePreferences: sourcePrefs,
      minSources,
      includeOpposingViewpoints,
      prioritizeRecentSources,
      enableAutonomousFollowUp,
      enableContradictionAnalysis,
    });
    setLaunching(false);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <SectionHeader
        title="Configure Autonomous Research"
        subtitle="Define your investigation scope, evidence preferences, and agent depth before launching the 7-agent scholarly research pipeline."
        actions={<DemoDisclosure />}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <form onSubmit={handleLaunch} noValidate className="xl:col-span-8 space-y-6 rounded-xl border border-slate-800/80 bg-[#0D1323] p-6">
          {/* Primary Topic & Objective */}
          <div className="space-y-4">
            <div>
              <label htmlFor="rf-topic" className="block text-xs font-medium text-slate-300 mb-1.5">
                Research Topic
              </label>
              <input
                id="rf-topic"
                type="text"
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="e.g., Impact of Artificial Intelligence on Healthcare in India"
                className={`w-full rounded-lg border bg-[#070B14] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none ${
                  formError ? 'border-rose-500/70' : 'border-slate-700/80 focus:border-violet-500'
                }`}
              />
              {formError && <p className="text-xs text-rose-400 mt-1.5">{formError}</p>}
            </div>

            <div>
              <label htmlFor="rf-objective" className="block text-xs font-medium text-slate-300 mb-1.5">
                Research Objective
              </label>
              <textarea
                id="rf-objective"
                rows={3}
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="What specific questions or decisions should this investigation inform?"
                className="w-full rounded-lg border border-slate-700/80 bg-[#070B14] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="rf-instructions" className="block text-xs font-medium text-slate-300 mb-1.5">
                Custom Instructions (Optional)
              </label>
              <textarea
                id="rf-instructions"
                rows={2}
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Specify geographic focus, cohorts to prioritize, or methodologies to compare..."
                className="w-full rounded-lg border border-slate-700/80 bg-[#070B14] px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Mode & Report Length */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-slate-800/80">
            <div>
              <div className="text-xs font-medium text-slate-300 mb-2">Research Depth</div>
              <div className="space-y-2">
                {(
                  [
                    { id: 'quick', label: 'Quick Scan', desc: 'Fast overview · limited sources · key insights' },
                    { id: 'standard', label: 'Standard Research', desc: 'Balanced coverage · multi-source verification' },
                    { id: 'deep', label: 'Deep Research', desc: 'More branches · contradiction radar · gap Round 2' },
                  ] as const
                ).map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setMode(item.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-lg border transition-colors ${
                      mode === item.id
                        ? 'border-violet-500/60 bg-violet-500/10 text-slate-100'
                        : 'border-slate-800 bg-[#070B14] text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-100">{item.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-300 mb-2">Report Length</div>
              <div className="space-y-2">
                {(
                  [
                    { id: 'brief', label: 'Brief', desc: 'Executive bullets & core evidence summary' },
                    { id: 'standard', label: 'Standard', desc: 'Full structured briefing with key conflicts' },
                    { id: 'comprehensive', label: 'Comprehensive', desc: '13-section report with full audit & gaps' },
                  ] as const
                ).map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setReportLength(item.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-lg border transition-colors ${
                      reportLength === item.id
                        ? 'border-cyan-500/60 bg-cyan-500/10 text-slate-100'
                        : 'border-slate-800 bg-[#070B14] text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-100">{item.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Domain Selection */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
            <div className="text-xs font-medium text-slate-300">Research Domains</div>
            <div className="flex flex-wrap gap-2">
              {ALL_DOMAINS.map((d) => {
                const selected = domains.includes(d);
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() => toggleDomain(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      selected
                        ? 'border-violet-500/60 bg-violet-500/15 text-violet-200'
                        : 'border-slate-800 bg-[#070B14] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Source Preferences */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
            <div className="text-xs font-medium text-slate-300">Source Preferences</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {ALL_SOURCE_PREFS.map((pref) => {
                const checked = sourcePrefs.includes(pref);
                return (
                  <label
                    key={pref}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                      checked
                        ? 'border-cyan-500/40 bg-cyan-500/10 text-slate-100'
                        : 'border-slate-800 bg-[#070B14] text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSourcePref(pref)}
                      className="accent-violet-500 h-3.5 w-3.5"
                    />
                    <span>{pref}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Advanced Options */}
          <div className="pt-4 border-t border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-slate-300">Advanced Agent Controls</div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <label htmlFor="min-sources">Minimum sources:</label>
                <input
                  id="min-sources"
                  type="number"
                  min={4}
                  max={25}
                  value={minSources}
                  onChange={(e) => setMinSources(Number(e.target.value) || 8)}
                  className="w-16 rounded-md border border-slate-700 bg-[#070B14] px-2 py-1 text-center font-mono tabular-nums text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                {
                  label: 'Include opposing viewpoints',
                  checked: includeOpposingViewpoints,
                  toggle: () => setIncludeOpposingViewpoints((v) => !v),
                },
                {
                  label: 'Prioritize recent sources (2024–2026)',
                  checked: prioritizeRecentSources,
                  toggle: () => setPrioritizeRecentSources((v) => !v),
                },
                {
                  label: 'Enable autonomous follow-up research',
                  checked: enableAutonomousFollowUp,
                  toggle: () => setEnableAutonomousFollowUp((v) => !v),
                },
                {
                  label: 'Enable contradiction analysis',
                  checked: enableContradictionAnalysis,
                  toggle: () => setEnableContradictionAnalysis((v) => !v),
                },
              ].map((opt) => (
                <label
                  key={opt.label}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-800 bg-[#070B14] cursor-pointer text-xs text-slate-300"
                >
                  <input
                    type="checkbox"
                    checked={opt.checked}
                    onChange={opt.toggle}
                    className="accent-violet-500 h-3.5 w-3.5"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setActivePage('dashboard')}
              className="px-4 py-2.5 rounded-lg border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={launching}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-sm font-medium transition-colors"
            >
              <Play className="h-4 w-4" />
              {launching ? 'Launching Agents...' : 'Launch Autonomous Research'}
            </button>
          </div>
        </form>

        {/* Right Sidebar: Relevant Previous Research Memory Panel */}
        <aside className="xl:col-span-4 rounded-xl border border-slate-800/80 bg-[#0D1323] p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-cyan-300">
                <Database className="h-3.5 w-3.5" />
                <span>Research Memory</span>
              </div>
              <h2 className="text-base font-semibold text-slate-100 mt-1">
                Relevant previous research found.
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Reuse validated findings or refresh outdated records before launching.
              </p>
            </div>
          </div>

          {relevantMemory.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 border-t border-slate-800/70">
              No prior memory matches current topic keywords.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/70">
              {relevantMemory.map((mem) => (
                <div key={mem.id} className="py-3.5 first:pt-1 last:pb-0 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-mono tabular-nums text-slate-400">
                      Verified {mem.lastVerifiedDate}
                    </span>
                    {mem.isOutdated && (
                      <span className="text-amber-400 font-medium">Older finding · Needs refresh</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">{mem.finding}</p>
                  <div className="text-[11px] text-slate-500">
                    Sources: {mem.sourceTitles.join(', ')}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => toggleReuseMemory(mem.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                        mem.reusedInCurrent
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Check className="h-3 w-3" />
                      {mem.reusedInCurrent ? 'Reusing' : 'Reuse Finding'}
                    </button>
                    {mem.isOutdated && (
                      <button
                        type="button"
                        onClick={() => refreshMemoryItem(mem.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Refresh
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActivePage('research-memory')}
                      className="text-[11px] text-cyan-300 hover:text-cyan-200"
                    >
                      Inspect
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectMemory(mem.id)}
                      className="inline-flex items-center gap-0.5 text-[11px] text-slate-500 hover:text-rose-400 ml-auto"
                    >
                      <X className="h-3 w-3" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
