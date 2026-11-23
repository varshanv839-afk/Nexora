import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileDown,
  FileText,
  MessageSquarePlus,
  RefreshCw,
  Share2,
  X,
} from 'lucide-react';
import { QualityScoreCard } from '../components/shared/QualityScoreCard';
import { DemoDisclosure, EmptyNotice, SectionHeader } from '../components/shared/StatusHelpers';
import { useResearch } from '../context/ResearchContext';
import { exportPDF, exportReportMarkdown } from '../services/researchService';
import { ResearchSource } from '../types/research';

export const ReportViewerPage: React.FC = () => {
  const {
    activeProject,
    updateReportSection,
    regenerateReportSection,
    addReportComment,
    setActivePage,
  } = useResearch();

  const [activeSectionId, setActiveSectionId] = useState<string>(
    activeProject?.reportSections[1]?.id || activeProject?.reportSections[0]?.id || ''
  );
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedCitationSource, setSelectedCitationSource] = useState<ResearchSource | null>(null);

  if (!activeProject) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Report Viewer"
          subtitle="Read, verify inline academic citations, edit, and export structured research reports."
        />
        <EmptyNotice
          title="No generated report available"
          description="Launch a new research run to retrieve verified papers and compile a 13-section citation-linked briefing."
          actionLabel="Start New Research"
          onAction={() => setActivePage('new-research')}
        />
      </div>
    );
  }

  if (activeProject.reportSections.length === 0) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title={activeProject.topic}
          subtitle="Report compilation pending or awaiting academic retrieval."
        />
        <EmptyNotice
          title="Report sections are not ready yet"
          description="Monitor live agent retrieval and verification in the Live Workspace, or re-run the pipeline."
          actionLabel="Open Live Workspace"
          onAction={() => setActivePage('workspace')}
        />
      </div>
    );
  }

  const handleCopyReport = async () => {
    const fullText = [
      activeProject.topic,
      ...activeProject.reportSections.map((s) => `${s.number}. ${s.title}\n\n${s.content}`),
    ].join('\n\n');
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignored in restricted clipboard contexts
    }
  };

  /**
   * Renders clickable inline citations ([1], [2], [1, 2], or [S1]) and clickable https:// URLs in References.
   */
  const renderTextWithCitations = (text: string) => {
    const tokens = text.split(/(\[(?:S?\d+(?:\s*,\s*S?\d+)*)\]|https?:\/\/[^\s)\]]+)/g);
    return tokens.map((part, idx) => {
      const citeMatch = part.match(/^\[(S?\d+(?:\s*,\s*S?\d+)*)\]$/);
      if (citeMatch) {
        const ids = citeMatch[1].split(',').map((s) => s.trim().replace(/^S/, ''));
        return (
          <span key={idx} className="inline-flex items-center gap-0.5 mx-0.5">
            {ids.map((sid, cIdx) => {
              const src =
                activeProject.sources.find((s) => s.id === sid) ||
                activeProject.sources.find((s) => s.id === `S${sid}`);
              if (!src) {
                return <React.Fragment key={`${sid}-${cIdx}`}>[{sid}]</React.Fragment>;
              }
              return (
                <button
                  key={`${sid}-${cIdx}`}
                  type="button"
                  onClick={() => setSelectedCitationSource(src)}
                  title={`${src.title} (${src.venue}, ${src.publicationYear || 'n.d.'})`}
                  className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/30 transition-colors"
                >
                  [{src.id}]
                </button>
              );
            })}
          </span>
        );
      }

      if (/^https?:\/\//.test(part)) {
        return (
          <a
            key={idx}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2 break-all"
          >
            {part}
          </a>
        );
      }

      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    const el = document.getElementById(`report-${sectionId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title={activeProject.topic}
        subtitle={`13-Section Verified Research Report · ${activeProject.sources.length} Real Papers · Quality Score ${activeProject.qualityScore.overall}/100`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DemoDisclosure providerMode={activeProject.providerMode} />
            <button
              onClick={handleCopyReport}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 bg-[#0D1323] text-xs font-medium text-slate-200 hover:border-slate-600"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={() => exportReportMarkdown(activeProject)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 bg-[#0D1323] text-xs font-medium text-slate-200 hover:border-slate-600"
            >
              <FileDown className="h-3.5 w-3.5 text-cyan-400" />
              Export Markdown
            </button>
            <button
              onClick={() => exportPDF(activeProject)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 bg-[#0D1323] text-xs font-medium text-slate-200 hover:border-slate-600"
            >
              <Download className="h-3.5 w-3.5 text-violet-400" />
              Export Report File
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-medium text-white"
            >
              <Download className="h-3.5 w-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 bg-[#0D1323] text-xs font-medium text-slate-200 hover:border-slate-600"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="no-print lg:col-span-3 lg:sticky lg:top-4 rounded-xl border border-slate-800/80 bg-[#0D1323] p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-300 pb-2 border-b border-slate-800/80">
            Table of Contents
          </div>
          <nav className="space-y-1 max-h-[70vh] overflow-y-auto">
            {activeProject.reportSections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => scrollToSection(sec.id)}
                className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center gap-2 transition-colors ${
                  activeSectionId === sec.id
                    ? 'bg-violet-500/15 text-violet-200 font-medium'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                }`}
              >
                <span className="font-mono text-[11px] text-slate-500 shrink-0">{sec.number}</span>
                <span className="truncate">{sec.title}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="lg:col-span-9 space-y-6">
          <QualityScoreCard quality={activeProject.qualityScore} />

          <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] divide-y divide-slate-800/70">
            {activeProject.reportSections.map((sec) => {
              const isEditing = editingSectionId === sec.id;
              const secComments = activeProject.reportComments.filter((c) => c.sectionId === sec.id);

              return (
                <section key={sec.id} id={`report-${sec.id}`} className="p-6 lg:p-8 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-slate-50">
                      <span className="font-mono text-sm text-violet-400 mr-2.5">{sec.number}.</span>
                      {sec.title}
                    </h2>

                    <div className="no-print flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingSectionId(sec.id);
                          setEditDraft(sec.content);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-800 text-xs text-slate-300 hover:text-white"
                      >
                        <Edit3 className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => regenerateReportSection(sec.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-800 text-xs text-cyan-300 hover:border-cyan-500/40"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Regenerate
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2.5">
                      <textarea
                        rows={7}
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        className="w-full rounded-lg border border-violet-500/60 bg-[#070B14] p-3.5 text-sm text-slate-100 leading-relaxed focus:outline-none"
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setEditingSectionId(null)}
                          className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            updateReportSection(sec.id, editDraft);
                            setEditingSectionId(null);
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-violet-600 text-xs font-medium text-white"
                        >
                          Save Section
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-300 leading-7 whitespace-pre-line max-w-[75ch]">
                      {renderTextWithCitations(sec.content)}
                    </div>
                  )}

                  {secComments.length > 0 && (
                    <div className="pt-3 border-t border-slate-800/60 space-y-2">
                      {secComments.map((cm) => (
                        <div key={cm.id} className="rounded-lg bg-[#080D1A] border border-slate-800 p-3 text-xs">
                          <div className="flex items-center justify-between text-slate-400 mb-1">
                            <span className="font-medium text-slate-200">{cm.author}</span>
                            <span className="font-mono">{cm.createdAt}</span>
                          </div>
                          <p className="text-slate-300">{cm.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeSectionId === sec.id && (
                    <div className="no-print pt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder={`Add reviewer note to "${sec.title}"...`}
                        className="flex-1 rounded-lg border border-slate-800 bg-[#080D1A] px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          addReportComment(sec.id, commentText);
                          setCommentText('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-100"
                      >
                        <MessageSquarePlus className="h-3.5 w-3.5" />
                        Add Comment
                      </button>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </div>

      {/* Real Citation Inspector Modal */}
      {selectedCitationSource && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-800 bg-[#0D1323] p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-mono text-cyan-300">
                  [{selectedCitationSource.id}] · {selectedCitationSource.verificationStatus} ·{' '}
                  {selectedCitationSource.databasesFoundIn.join(' + ')}
                </div>
                <h3 className="text-base font-semibold text-slate-100 mt-1 leading-snug">
                  {selectedCitationSource.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCitationSource(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <div>
                <span className="text-slate-500">Authors:</span>{' '}
                {selectedCitationSource.authors.join(', ') || 'Authors unlisted'}
              </div>
              <div>
                <span className="text-slate-500">Venue & Year:</span> {selectedCitationSource.venue} ·{' '}
                {selectedCitationSource.publicationYear || selectedCitationSource.publicationDate}
              </div>
              {selectedCitationSource.doi && (
                <div className="font-mono text-slate-300">
                  <span className="text-slate-500 font-sans">DOI:</span> {selectedCitationSource.doi}
                </div>
              )}
            </div>

            <div className="rounded-lg bg-[#080D1A] border border-slate-800 p-3.5 space-y-1.5">
              <div className="text-[11px] font-mono text-violet-300">
                Evidence Scope: {selectedCitationSource.evidenceScope}
              </div>
              <p className="text-xs text-slate-200 leading-relaxed max-h-44 overflow-y-auto">
                {selectedCitationSource.abstract || selectedCitationSource.keyExcerpt}
              </p>
            </div>

            <div className="text-[11px] text-slate-400">
              {selectedCitationSource.verificationNotes}
              {selectedCitationSource.citationCount !== undefined &&
                ` · Citations: ${selectedCitationSource.citationCount}`}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800">
              <a
                href={selectedCitationSource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-medium text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {selectedCitationSource.doi ? 'Open DOI / Paper' : 'Open Publication URL'}
              </a>
              {selectedCitationSource.openAccessPdfUrl && (
                <a
                  href={selectedCitationSource.openAccessPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-medium text-emerald-200"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Open-Access PDF
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#0D1323] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-100">Share Verified Research Report</h3>
              <button onClick={() => setShareOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Copy a local reference link or export the report in Markdown / printable HTML format.
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={`${window.location.origin}/?report=${activeProject.id}`}
                className="flex-1 rounded-lg border border-slate-800 bg-[#070B14] px-3 py-2 text-xs font-mono text-slate-300"
              />
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`${window.location.origin}/?report=${activeProject.id}`);
                    setShareLinkCopied(true);
                    window.setTimeout(() => setShareLinkCopied(false), 1800);
                  } catch {
                    // ignore
                  }
                }}
                className="px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-medium text-white"
              >
                {shareLinkCopied ? 'Copied' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
