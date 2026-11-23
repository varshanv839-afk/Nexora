import React from 'react';
import { RotateCcw } from 'lucide-react';
import { DemoDisclosure, SectionHeader } from '../components/shared/StatusHelpers';
import { useResearch } from '../context/ResearchContext';
import { ReportLength, ResearchMode } from '../types/research';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, resetDemoWorkspace, backendCapabilities } = useResearch();

  return (
    <div className="space-y-6 max-w-4xl">
      <SectionHeader
        title="Workspace Settings"
        subtitle="Configure default autonomous agent depths, execution pacing, academic database status, and local persistence."
        actions={<DemoDisclosure providerMode={backendCapabilities.mode} />}
      />

      <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-6 space-y-6">
        {/* Researcher Profile */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center font-semibold text-white">
              AR
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-100">Alex Rivera</div>
              <div className="text-xs text-slate-400">Lead Research Analyst · ResearchFlow AI Workspace</div>
            </div>
          </div>
          <span className="text-xs font-mono text-cyan-300">LocalStorage Persisted</span>
        </div>

        {/* Defaults */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="default-mode" className="block text-xs font-medium text-slate-300 mb-1.5">
              Default Research Depth
            </label>
            <select
              id="default-mode"
              value={settings.defaultMode}
              onChange={(e) => updateSettings({ defaultMode: e.target.value as ResearchMode })}
              className="w-full rounded-lg border border-slate-800 bg-[#070B14] px-3 py-2 text-xs text-slate-100 focus:outline-none"
            >
              <option value="quick">Quick Scan</option>
              <option value="standard">Standard Research</option>
              <option value="deep">Deep Research</option>
            </select>
          </div>

          <div>
            <label htmlFor="default-length" className="block text-xs font-medium text-slate-300 mb-1.5">
              Default Report Length
            </label>
            <select
              id="default-length"
              value={settings.defaultLength}
              onChange={(e) => updateSettings({ defaultLength: e.target.value as ReportLength })}
              className="w-full rounded-lg border border-slate-800 bg-[#070B14] px-3 py-2 text-xs text-slate-100 focus:outline-none"
            >
              <option value="brief">Brief</option>
              <option value="standard">Standard</option>
              <option value="comprehensive">Comprehensive</option>
            </select>
          </div>

          <div>
            <label htmlFor="sim-speed" className="block text-xs font-medium text-slate-300 mb-1.5">
              Pipeline Stage Pacing
            </label>
            <select
              id="sim-speed"
              value={settings.simulationSpeed}
              onChange={(e) => updateSettings({ simulationSpeed: e.target.value as 'normal' | 'fast' })}
              className="w-full rounded-lg border border-slate-800 bg-[#070B14] px-3 py-2 text-xs text-slate-100 focus:outline-none"
            >
              <option value="normal">Normal (Readable transition)</option>
              <option value="fast">Fast (Minimal transition delay)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Academic & Web Search Providers
            </label>
            <div className="rounded-lg border border-slate-800 bg-[#070B14] px-3 py-2 text-xs font-mono space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400">OpenAlex · Crossref · Semantic Scholar</span>
                <span className="text-slate-500">Live APIs</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className={backendCapabilities.liveSearchConfigured ? 'text-emerald-400' : 'text-slate-400'}>
                  {backendCapabilities.liveSearchConfigured
                    ? 'Tavily Web Proxy Active (/api/search)'
                    : 'Tavily Web Proxy: Not configured (optional)'}
                </span>
                <span className="text-slate-500">Server-only</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Academic papers are always retrieved live from scholarly registries. Optional <code className="text-slate-300">SEMANTIC_SCHOLAR_API_KEY</code> and <code className="text-slate-300">TAVILY_API_KEY</code> run server-side only.
            </p>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-4 border-t border-slate-800/80">
          {[
            {
              label: 'Automatically run Contradiction Radar during research execution',
              checked: settings.autoDetectContradictions,
              onChange: () => updateSettings({ autoDetectContradictions: !settings.autoDetectContradictions }),
            },
            {
              label: 'Trigger Iteration 2 Gap Investigation automatically when branches have fewer than 2 papers',
              checked: settings.autoInvestigateGaps,
              onChange: () => updateSettings({ autoInvestigateGaps: !settings.autoInvestigateGaps }),
            },
          ].map((item) => (
            <label key={item.label} className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={item.onChange}
                className="accent-violet-500 h-4 w-4"
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>

        {/* Reset */}
        <div className="pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-200">Clear Local Workspace Storage</div>
            <div className="text-xs text-slate-400">
              Remove all locally saved research projects, memory entries, notifications, and uploaded document cross-references.
            </div>
          </div>
          <button
            onClick={resetDemoWorkspace}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-medium text-rose-200 transition-colors shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear Workspace
          </button>
        </div>
      </div>
    </div>
  );
};
