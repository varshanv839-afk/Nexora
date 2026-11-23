import React, { useRef, useState } from 'react';
import { FileCheck2, FileDiff, FileUp, GitCompare } from 'lucide-react';
import { DemoDisclosure, EmptyNotice, SectionHeader } from '../components/shared/StatusHelpers';
import { useResearch } from '../context/ResearchContext';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4);
}

export const DocumentCrossRefPage: React.FC = () => {
  const { documentResult, setDocumentResult, activeProject, setActivePage } = useResearch();
  const [compared, setCompared] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toUpperCase();
    if (ext !== 'TXT' && ext !== 'MD') {
      setUploadError(
        `Client-side binary extraction is not enabled for .${ext || 'unknown'} files. Please upload a plain text (.txt) or Markdown (.md) document so claims are extracted strictly from actual text without fabrication.`
      );
      return;
    }

    setUploadError(null);
    setUploading(true);
    setCompared(false);

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '').trim();
      const sentences = text
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 24)
        .slice(0, 6);

      const sources = activeProject?.sources || [];
      const claims = activeProject?.claims || [];

      const webComparisons = sentences.map((sentence) => {
        const sTokens = new Set(tokenize(sentence));
        let bestMatch = '';
        let bestScore = 0;

        for (const claim of claims) {
          const cTokens = tokenize(`${claim.claim} ${claim.evidenceSummary}`);
          const overlap = cTokens.filter((w) => sTokens.has(w)).length;
          if (overlap > bestScore) {
            bestScore = overlap;
            bestMatch = `${claim.claim} (${claim.status}, confidence ${claim.confidence}%)`;
          }
        }

        if (bestScore === 0) {
          for (const src of sources) {
            const cTokens = tokenize(`${src.title} ${src.abstract}`);
            const overlap = cTokens.filter((w) => sTokens.has(w)).length;
            if (overlap > bestScore) {
              bestScore = overlap;
              bestMatch = `Matched retrieved paper "${src.title}" (${src.publicationYear ?? 'n.d.'}${src.doi ? `, DOI: ${src.doi}` : ''}): ${src.keyExcerpt}`;
            }
          }
        }

        const status: 'Confirmed' | 'Conflict Detected' | 'Novel Insight' =
          bestScore >= 2 ? 'Confirmed' : 'Novel Insight';

        return {
          documentClaim: sentence,
          webFinding:
            bestMatch ||
            'No matching abstract or claim found in the active project’s retrieved papers.',
          analysis:
            bestScore >= 2
              ? `Lexical keyword match (${bestScore} shared terms) against retrieved literature in the active project.`
              : 'Statement was not directly corroborated by retrieved abstracts in the active investigation.',
          status,
        };
      });

      const numberMatches = text.match(/\b\d+(?:\.\d+)?%/g) || [];

      setDocumentResult({
        id: `doc-${Date.now()}`,
        fileName: file.name,
        fileType: 'TXT',
        uploadedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        summary: text.slice(0, 320) + (text.length > 320 ? '...' : ''),
        extractedClaims: sentences.map((s, idx) => ({
          id: `uc-${idx + 1}`,
          text: s,
          alignment:
            webComparisons[idx]?.status === 'Confirmed'
              ? 'Aligned'
              : 'Missing in Web Research',
        })),
        extractedStatistics: [
          {
            label: 'Document Word Count',
            value: String(text ? text.split(/\s+/).length : 0),
            sourceContext: file.name,
          },
          {
            label: 'Sentences Extracted',
            value: String(sentences.length),
            sourceContext: file.name,
          },
          ...(numberMatches.length
            ? [
                {
                  label: 'Percentages Mentioned',
                  value: numberMatches.slice(0, 4).join(', '),
                  sourceContext: 'Extracted verbatim from text',
                },
              ]
            : []),
        ],
        importantReferences: Array.from(
          new Set(
            sources
              .filter((s) =>
                sentences.some((sent) =>
                  tokenize(sent).some((tok) => s.title.toLowerCase().includes(tok))
                )
              )
              .map((s) => `${s.title} (${s.publicationYear ?? 'n.d.'})${s.doi ? ` · DOI ${s.doi}` : ''}`)
          )
        ),
        missingInformation: [
          ...(activeProject
            ? activeProject.gaps.slice(0, 3).map((g) => `Active project gap: ${g.suggestedQuestion}`)
            : ['Run a live academic research topic first to cross-reference against retrieved peer-reviewed papers.']),
        ],
        webComparisons,
      });
      setUploading(false);
      setCompared(true);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Document Cross-Reference"
        subtitle="Upload a plain-text or Markdown draft (.txt, .md) to extract sentences verbatim and compare them against retrieved papers in your active project."
        actions={<DemoDisclosure providerMode={activeProject?.providerMode || 'live'} />}
      />

      {/* Upload & Action Bar */}
      <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 shrink-0">
            <FileCheck2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-100">
              {documentResult ? documentResult.fileName : 'No document uploaded yet'}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {documentResult
                ? `Format: ${documentResult.fileType} · Processed ${documentResult.uploadedAt}`
                : 'Supported formats: .TXT, .MD · Cross-referenced against active retrieved literature'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-700 bg-[#080D1A] hover:border-slate-600 text-xs font-medium text-slate-200 transition-colors"
          >
            <FileUp className="h-3.5 w-3.5 text-cyan-400" />
            {uploading ? 'Extracting Text...' : 'Upload .TXT / .MD'}
          </button>
          {documentResult && (
            <button
              onClick={() => setCompared(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-medium text-white transition-colors"
            >
              <GitCompare className="h-3.5 w-3.5" />
              Compare with Research
            </button>
          )}
        </div>
      </div>

      {uploadError && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          {uploadError}
        </div>
      )}

      {!documentResult ? (
        <EmptyNotice
          title="Upload a draft or research note to cross-reference"
          description={
            activeProject
              ? `Your uploaded text will be compared sentence-by-sentence against the ${activeProject.sources.length} verified papers retrieved for "${activeProject.topic}".`
              : 'Upload a .txt or .md file above, and start a research investigation to compare your draft against real OpenAlex, Crossref, and Semantic Scholar literature.'
          }
          actionLabel={activeProject ? 'Choose .TXT / .MD File' : 'Start Research First'}
          onAction={() => {
            if (activeProject) {
              fileInputRef.current?.click();
            } else {
              setActivePage('new-research');
            }
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
          {/* Column 1: MY DOCUMENT */}
          <section className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-5 space-y-4">
            <div className="pb-3 border-b border-slate-800/80 flex items-center justify-between">
              <h2 className="text-xs font-semibold tracking-wider text-violet-300">MY DOCUMENT</h2>
              <span className="text-[11px] font-mono text-slate-500">{documentResult.fileType}</span>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-medium text-slate-200">Document Excerpt</div>
              <p className="text-xs text-slate-400 leading-relaxed">{documentResult.summary}</p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-200">Extracted Sentences</div>
              {documentResult.extractedClaims.length === 0 ? (
                <p className="text-xs text-slate-500">No full sentences (&gt;24 chars) found in file.</p>
              ) : (
                <div className="space-y-2">
                  {documentResult.extractedClaims.map((c) => (
                    <div key={c.id} className="rounded-lg border border-slate-800 bg-[#080D1A] p-3 text-xs text-slate-200 leading-relaxed">
                      {c.text}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/70">
              <div className="text-xs font-medium text-slate-200">Document Metrics</div>
              <div className="divide-y divide-slate-800/70">
                {documentResult.extractedStatistics.map((st) => (
                  <div key={st.label} className="py-2 flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400">{st.label}</span>
                    <span className="font-mono tabular-nums font-semibold text-cyan-300">{st.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Column 2: ACADEMIC LITERATURE */}
          <section className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-5 space-y-4">
            <div className="pb-3 border-b border-slate-800/80 flex items-center justify-between">
              <h2 className="text-xs font-semibold tracking-wider text-cyan-300">RETRIEVED LITERATURE</h2>
              <span className="text-[11px] font-mono text-slate-500">
                {activeProject?.sources.length ?? 0} Papers
              </span>
            </div>

            {!compared ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Click "Compare with Research" to align document statements with retrieved abstracts.
              </div>
            ) : (
              <div className="space-y-3">
                {documentResult.webComparisons.map((comp, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-800 bg-[#080D1A] p-3.5 space-y-2">
                    <div className="text-[11px] font-mono text-slate-400">EVIDENCE CHECK #{idx + 1}</div>
                    <p className="text-xs text-slate-200 leading-relaxed">{comp.webFinding}</p>
                  </div>
                ))}

                {documentResult.importantReferences.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/70 space-y-1.5">
                    <div className="text-xs font-medium text-slate-200">Matching Retrieved Papers</div>
                    {documentResult.importantReferences.map((ref) => (
                      <div key={ref} className="text-xs text-slate-400">• {ref}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Column 3: ANALYSIS */}
          <section className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-5 space-y-4">
            <div className="pb-3 border-b border-slate-800/80 flex items-center justify-between">
              <h2 className="text-xs font-semibold tracking-wider text-emerald-300">ALIGNMENT ANALYSIS</h2>
              <FileDiff className="h-4 w-4 text-slate-400" />
            </div>

            {!compared ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Awaiting cross-reference execution.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2.5">
                  {documentResult.webComparisons.map((comp, idx) => {
                    const statusColor =
                      comp.status === 'Conflict Detected'
                        ? 'text-rose-400'
                        : comp.status === 'Confirmed'
                        ? 'text-emerald-400'
                        : 'text-amber-300';
                    return (
                      <div key={idx} className="rounded-lg border border-slate-800 bg-[#080D1A] p-3.5 space-y-1.5">
                        <div className={`text-xs font-semibold ${statusColor}`}>{comp.status}</div>
                        <p className="text-xs text-slate-300 leading-relaxed">{comp.analysis}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-800/70 space-y-1.5">
                  <div className="text-xs font-medium text-amber-300">Gaps Noted in Active Project</div>
                  {documentResult.missingInformation.map((miss) => (
                    <div key={miss} className="text-xs text-slate-400 leading-relaxed">• {miss}</div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
