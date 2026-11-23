import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  ExternalLink,
  Flag,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import {
  DemoDisclosure,
  EmptyNotice,
  SectionHeader,
  VerificationStatusText,
} from '../components/shared/StatusHelpers';
import { useResearch } from '../context/ResearchContext';
import { ResearchClaim, VerificationStatus } from '../types/research';

const STATUS_FILTERS: ('All' | VerificationStatus)[] = [
  'All',
  'Supported',
  'Partially Supported',
  'Contradicted',
  'Unverified',
];

export const EvidenceLedgerPage: React.FC = () => {
  const {
    activeProject,
    toggleFlagClaim,
    requestClaimReinvestigation,
    setActivePage,
  } = useResearch();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | VerificationStatus>('All');
  const [sortDesc, setSortDesc] = useState(true);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  const claims = activeProject?.claims || [];
  const sources = activeProject?.sources || [];

  const selectedClaim: ResearchClaim | null = useMemo(
    () => claims.find((c) => c.id === selectedClaimId) || null,
    [claims, selectedClaimId]
  );

  const filteredClaims = useMemo(() => {
    const q = search.trim().toLowerCase();
    return claims
      .filter((c) => (statusFilter === 'All' ? true : c.status === statusFilter))
      .filter(
        (c) =>
          !q ||
          c.claim.toLowerCase().includes(q) ||
          c.evidenceSummary.toLowerCase().includes(q) ||
          c.subtopic.toLowerCase().includes(q)
      )
      .sort((a, b) => (sortDesc ? b.confidence - a.confidence : a.confidence - b.confidence));
  }, [claims, search, statusFilter, sortDesc]);

  const getSource = (sourceId: string) => sources.find((s) => s.id === sourceId);

  if (!activeProject) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Every claim. Every source. Every piece of evidence."
          subtitle="Verify claims extracted strictly from real retrieved scholarly abstracts."
        />
        <EmptyNotice
          title="No active research project"
          description="Start a new research run to extract and audit claims from real academic publications."
          actionLabel="Start New Research"
          onAction={() => setActivePage('new-research')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <SectionHeader
        title="Every claim. Every source. Every piece of evidence."
        subtitle={`Claim–Evidence Ledger for "${activeProject.topic}". Click any row to inspect verbatim abstract excerpts, DOI provenance, and verification notes.`}
        actions={<DemoDisclosure providerMode={activeProject.providerMode} />}
      />

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#0D1323] border border-slate-800">
          {STATUS_FILTERS.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-72">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search claims or subtopics..."
              className="w-full rounded-lg border border-slate-800 bg-[#0D1323] pl-8 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setSortDesc((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-800 bg-[#0D1323] text-xs font-medium text-slate-300 hover:text-white whitespace-nowrap"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-cyan-400" />
            Confidence ({sortDesc ? 'High → Low' : 'Low → High'})
          </button>
        </div>
      </div>

      {/* Claims Table */}
      {filteredClaims.length === 0 ? (
        <EmptyNotice
          title={claims.length === 0 ? 'No claims extracted yet' : 'No claims match your filters'}
          description={
            claims.length === 0
              ? 'Claims populate once Discovery & Evidence agents retrieve real abstracts.'
              : 'Clear the search input or switch verification status filters to view all audited claims.'
          }
          actionLabel={claims.length === 0 ? 'Open Workspace' : 'Reset Filters'}
          onAction={() => {
            if (claims.length === 0) {
              setActivePage('workspace');
            } else {
              setSearch('');
              setStatusFilter('All');
            }
          }}
        />
      ) : (
        <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 text-[11px] font-medium text-slate-400 bg-[#0A0F1D]">
                  <th className="py-3 px-4">Claim (Extracted from Abstract / Record)</th>
                  <th className="py-3 px-4 hidden md:table-cell">Evidence Provenance</th>
                  <th className="py-3 px-4">Paper IDs</th>
                  <th className="py-3 px-4 text-right">Confidence</th>
                  <th className="py-3 px-4">Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {filteredClaims.map((claim) => (
                  <tr
                    key={claim.id}
                    onClick={() => setSelectedClaimId(claim.id)}
                    className={`cursor-pointer transition-colors hover:bg-slate-800/40 ${
                      selectedClaimId === claim.id ? 'bg-violet-500/10' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 max-w-md">
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-[11px] text-slate-500 shrink-0 mt-0.5">{claim.id}</span>
                        <div>
                          <div className="font-medium text-slate-100 leading-relaxed">{claim.claim}</div>
                          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                            <span>{claim.subtopic}</span>
                            {claim.flagged && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-amber-400">Flagged for review</span>
                              </>
                            )}
                            {claim.reinvestigationRequested && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-cyan-300">Follow-up search queued</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-sm text-slate-300 leading-relaxed hidden md:table-cell">
                      {claim.evidenceSummary}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-cyan-300 whitespace-nowrap">
                      {claim.sourceIds.map((sid) => `[${sid}]`).join(', ')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-100 whitespace-nowrap">
                      {claim.confidence}%
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <VerificationStatusText status={claim.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Claim Detail Drawer */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
          <div className="w-full max-w-xl bg-[#0B1020] border-l border-slate-800 h-full overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-mono text-violet-300">{selectedClaim.id}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedClaim.subtopic}</span>
                  <span aria-hidden="true">·</span>
                  <VerificationStatusText status={selectedClaim.status} />
                </div>
                <h2 className="text-base font-semibold text-slate-50 leading-snug">
                  {selectedClaim.claim}
                </h2>
              </div>
              <button
                onClick={() => setSelectedClaimId(null)}
                aria-label="Close drawer"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => {
                  requestClaimReinvestigation(selectedClaim.id);
                  setActivePage('workspace');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-medium text-white transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Query More Studies
              </button>
              <button
                onClick={() => toggleFlagClaim(selectedClaim.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium transition-colors ${
                  selectedClaim.flagged
                    ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                    : 'border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <Flag className="h-3.5 w-3.5" />
                {selectedClaim.flagged ? 'Flagged' : 'Flag Claim'}
              </button>
              <button
                onClick={() => setActivePage('research-library')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-700 text-xs font-medium text-cyan-300 hover:border-cyan-500/40"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open Library
              </button>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-300">Confidence Assessment</span>
                <span className="font-mono tabular-nums font-semibold text-cyan-300">
                  {selectedClaim.confidence}%
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedClaim.confidenceExplanation}
              </p>
              <div className="text-xs text-slate-400">
                <span className="text-slate-300 font-medium">Verification Notes:</span>{' '}
                {selectedClaim.verificationNotes}
              </div>
              <div className="text-xs text-slate-400">
                <span className="text-slate-300 font-medium">Evaluated By:</span>{' '}
                {selectedClaim.evaluatedBy}
              </div>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-slate-800/80">
              <h3 className="text-xs font-semibold text-emerald-400">
                Supporting Abstract Excerpts ({selectedClaim.supportingExcerpts.length})
              </h3>
              {selectedClaim.supportingExcerpts.length === 0 ? (
                <p className="text-xs text-slate-500">No abstract excerpt returned by source API.</p>
              ) : (
                selectedClaim.supportingExcerpts.map((ex, i) => {
                  const src = getSource(ex.sourceId);
                  return (
                    <div key={i} className="rounded-lg border border-slate-800 bg-[#080D1A] p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-medium text-slate-200">
                          [{ex.sourceId}] {src?.venue || 'Scholarly Publication'}
                        </span>
                        <span className="font-mono tabular-nums">{ex.date}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">"{ex.excerpt}"</p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="space-y-2.5 pt-3 border-t border-slate-800/80">
              <h3 className="text-xs font-semibold text-rose-400">
                Caveats & Opposing Excerpts ({selectedClaim.opposingEvidence.length})
              </h3>
              {selectedClaim.opposingEvidence.length === 0 ? (
                <p className="text-xs text-slate-500">No opposing abstract excerpts recorded.</p>
              ) : (
                selectedClaim.opposingEvidence.map((ex, i) => {
                  const src = getSource(ex.sourceId);
                  return (
                    <div key={i} className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-medium text-rose-200">
                          [{ex.sourceId}] {src?.venue || 'Scholarly Publication'}
                        </span>
                        <span className="font-mono tabular-nums">{ex.date}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">"{ex.excerpt}"</p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-800/80">
              <h3 className="text-xs font-semibold text-slate-300">Linked Verified Papers</h3>
              <div className="divide-y divide-slate-800/70">
                {selectedClaim.sourceIds.map((sid, sIdx) => {
                  const src = getSource(sid);
                  if (!src) return null;
                  return (
                    <div key={`${sid}-${sIdx}`} className="py-2 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-200 truncate">
                          [{src.id}] {src.title}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {src.venue} · {src.publicationYear || src.publicationDate}
                        </div>
                      </div>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 shrink-0 text-[11px]"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open Paper
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
