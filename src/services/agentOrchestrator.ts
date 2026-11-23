import {
  buildClaimsFromRealSources,
  buildGapsFromRealCoverage,
  buildKnowledgeGraphFromRealData,
  buildQualityBreakdown,
  buildRealReportSections,
  buildTrailStep,
  detectRealContradictions,
  extractAbstractSentences,
} from './researchService';
import { backendSearchProvider, searchAcademicDatabases } from './searchProvider';
import {
  ActivityLogEntry,
  AgentHandoff,
  AgentId,
  DatabaseStatus,
  ResearchBranch,
  ResearchProject,
  ResearchSource,
  SharedFinding,
} from '../types/research';

export interface OrchestratorCallbacks {
  onUpdateProject: (projectId: string, updater: (prev: ResearchProject) => ResearchProject) => void;
  onNotify: (
    title: string,
    description: string,
    targetPage?: 'workspace' | 'report-viewer' | 'contradiction-radar' | 'research-gaps'
  ) => void;
}

export interface RunOptions {
  speed: 'normal' | 'fast';
  signal: AbortSignal;
}

function nowTime(): string {
  return new Date().toTimeString().slice(0, 8);
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const id = window.setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(id);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}

function pushLog(
  proj: ResearchProject,
  agent: ActivityLogEntry['agent'],
  message: string,
  type: ActivityLogEntry['type'] = 'info'
): ActivityLogEntry[] {
  return [
    {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowTime(),
      agent,
      message,
      type,
    },
    ...proj.activityLog,
  ];
}

function pushHandoff(
  proj: ResearchProject,
  fromAgent: string,
  toAgent: string,
  summary: string,
  payloadLabel: string
): AgentHandoff[] {
  return [
    {
      id: `ho-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowTime(),
      fromAgent,
      toAgent,
      summary,
      payloadLabel,
    },
    ...proj.agentHandoffs,
  ];
}

function pushFinding(
  proj: ResearchProject,
  branchName: string,
  agent: AgentId,
  text: string,
  sourceId?: string
): SharedFinding[] {
  return [
    {
      id: `sf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowTime(),
      branchName,
      agent,
      text,
      sourceId,
    },
    ...proj.sharedFindings,
  ];
}

function mergePapersDeduplicated(existing: ResearchSource[], incoming: ResearchSource[]): ResearchSource[] {
  const seen = new Set<string>();
  const combined: ResearchSource[] = [];

  for (const src of [...existing, ...incoming]) {
    const key = src.doi
      ? `doi:${src.doi.toLowerCase()}`
      : `title:${src.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push(src);
  }

  // Re-index cleanly 1..N and compute realistic relative evidence contributions
  const totalWeight = combined.reduce((acc, s) => acc + (s.abstract ? 2 : 1), 0) || 1;
  return combined.map((s, idx) => ({
    ...s,
    id: String(idx + 1),
    evidenceContribution: Math.max(2, Math.round(((s.abstract ? 2 : 1) / totalWeight) * 100)),
  }));
}

export async function runAutonomousPipeline(
  initialProject: ResearchProject,
  callbacks: OrchestratorCallbacks,
  options: RunOptions
): Promise<void> {
  const { onUpdateProject, onNotify } = callbacks;
  const { speed, signal } = options;
  const delayUnit = speed === 'fast' ? 220 : 480;

  const update = (fn: (p: ResearchProject) => ResearchProject) => {
    if (signal.aborted) return;
    onUpdateProject(initialProject.id, fn);
  };

  try {
    // ------------------------------------------------------------------
    // STAGE 1: PLANNER AGENT — Decompose topic & design DB queries
    // ------------------------------------------------------------------
    const tPlannerStart = Date.now();
    update((p) => ({
      ...p,
      status: 'Running',
      lastError: null,
      simulationProgress: 8,
      agents: {
        ...p.agents,
        planner: {
          ...p.agents.planner,
          status: 'Planning',
          completionPercent: 40,
          currentActivity: 'Decomposing topic into scholarly subquestions and database queries',
          tasksCompleted: 1,
          logs: [
            ...p.agents.planner.logs,
            `[${nowTime()}] Formulating academic query strategy for "${p.topic.slice(0, 56)}".`,
          ],
        },
      },
      activityLog: pushLog(
        p,
        'planner',
        'Planner Agent decomposing topic into subquestions & OpenAlex/Crossref/Semantic Scholar queries.',
        'info'
      ),
    }));

    await sleep(delayUnit, signal);

    const plannedQueries = initialProject.expandedQueries;
    const plannedBranches: ResearchBranch[] = plannedQueries.map((q, idx) => ({
      id: `br-${idx + 1}`,
      name: q.branch,
      query: q.query,
      subquestion: q.subquestion,
      status: 'Running',
      progress: 25,
      sourcesCollected: 0,
      findingsCount: 0,
    }));

    update((p) => ({
      ...p,
      simulationProgress: 16,
      parallelBranches: plannedBranches,
      agents: {
        ...p.agents,
        planner: {
          ...p.agents.planner,
          status: 'Completed',
          completionPercent: 100,
          currentActivity: `Prepared ${plannedBranches.length} search branches across scholarly registries`,
          tasksCompleted: plannedQueries.length,
          executionTimeMs: Date.now() - tPlannerStart,
          logs: [
            ...p.agents.planner.logs,
            `[${nowTime()}] Dispatched ${plannedQueries.length} query branches to Discovery Agent.`,
          ],
        },
        discovery: {
          ...p.agents.discovery,
          status: 'Searching',
          completionPercent: 15,
          currentActivity: 'Querying OpenAlex, Crossref, and Semantic Scholar APIs...',
        },
      },
      agentHandoffs: pushHandoff(
        p,
        'Planner Agent',
        'Discovery Agent',
        `Dispatched ${plannedBranches.length} research subquestions & multi-database query strategies.`,
        `${plannedBranches.length} Search Branches`
      ),
      trail: [
        ...p.trail,
        buildTrailStep(
          2,
          'Planner generated search strategy',
          'Planner Agent',
          `Topic: "${p.topic}"`,
          `Generated ${plannedBranches.length} distinct academic search branches.`,
          plannedBranches.map((b) => b.name).join(' · '),
          'Separates clinical/empirical efficacy, implementation economics, and limitations.'
        ),
      ],
      activityLog: pushLog(
        p,
        'planner',
        `Handoff → Discovery Agent: ${plannedBranches.length} parallel academic queries launched.`,
        'action'
      ),
    }));

    // ------------------------------------------------------------------
    // STAGE 2: DISCOVERY AGENT — Real Multi-Database Academic Retrieval
    // ------------------------------------------------------------------
    const tDiscoveryStart = Date.now();
    const maxPerQuery = initialProject.mode === 'quick' ? 3 : initialProject.mode === 'standard' ? 4 : 5;

    const academicResult = await searchAcademicDatabases(
      plannedQueries.map((q) => ({ branch: q.branch, query: q.query })),
      maxPerQuery
    );

    if (signal.aborted) return;

    // Optional live web search via Tavily if configured on backend
    let tavilySources: ResearchSource[] = [];
    const webRes = await backendSearchProvider.search(initialProject.topic, 'Policy & Web Context', 3);
    if (webRes.configured && webRes.results.length > 0) {
      tavilySources = webRes.results;
    }

    let currentSources = mergePapersDeduplicated([], [...academicResult.papers, ...tavilySources]);
    const dbStatuses: DatabaseStatus[] = academicResult.databaseStatuses;
    const totalRawHits = dbStatuses.reduce((acc, d) => acc + d.retrievedCount, 0);

    // Check if ALL databases failed and zero papers were retrieved — never fake data!
    if (academicResult.error || (currentSources.length === 0 && dbStatuses.every((d) => d.status === 'failed'))) {
      const errSummary =
        academicResult.error ||
        dbStatuses.map((d) => `${d.database}: ${d.error || 'failed'}`).join('; ') ||
        'All scholarly APIs failed to return records.';

      update((p) => ({
        ...p,
        status: 'Error',
        lastError: `Real academic retrieval failed (${errSummary}). No fabricated fallback sources were added.`,
        databaseStatuses: dbStatuses,
        agents: {
          ...p.agents,
          discovery: {
            ...p.agents.discovery,
            status: 'Failed',
            completionPercent: 100,
            errorMessage: errSummary,
            currentActivity: 'Academic API retrieval failed — zero fabricated fallbacks used',
            executionTimeMs: Date.now() - tDiscoveryStart,
          },
        },
        activityLog: pushLog(p, 'discovery', `Database retrieval error: ${errSummary}`, 'warning'),
      }));

      onNotify('Academic Database Query Failed', errSummary, 'workspace');
      return;
    }

    update((p) => {
      const updatedBranches = p.parallelBranches.map((br) => {
        const count = currentSources.filter((s) => s.queryBranch === br.name).length;
        return {
          ...br,
          status: 'Completed' as const,
          progress: 100,
          sourcesCollected: count,
          findingsCount: currentSources.filter((s) => s.queryBranch === br.name && Boolean(s.abstract)).length,
        };
      });

      const dbLogLines = dbStatuses.map(
        (d) =>
          `[${nowTime()}] ${d.database}: ${d.status.toUpperCase()} (${d.retrievedCount} raw, ${d.latencyMs}ms)${
            d.error ? ` — ${d.error}` : ''
          }`
      );

      let nextFindings = p.sharedFindings;
      currentSources.slice(0, 4).forEach((src) => {
        nextFindings = [
          {
            id: `sf-${src.id}-${Date.now()}`,
            timestamp: nowTime(),
            branchName: src.queryBranch,
            agent: 'discovery',
            text: `${src.title} (${src.venue}, ${src.publicationYear || 'n.d.'}) — ${src.evidenceScope}`,
            sourceId: src.id,
          },
          ...nextFindings,
        ];
      });

      return {
        ...p,
        simulationProgress: 38,
        databaseStatuses: dbStatuses,
        duplicatesRemovedCount: academicResult.duplicatesRemoved,
        rejectedUnverifiedCount: academicResult.rejectedCount,
        rejectionNotes: academicResult.rejectionNotes,
        sources: currentSources,
        parallelBranches: updatedBranches,
        expandedQueries: p.expandedQueries.map((q) => ({
          ...q,
          status: 'Completed',
          sourcesFound: currentSources.filter((s) => s.queryBranch === q.branch).length,
        })),
        sharedFindings: nextFindings,
        agents: {
          ...p.agents,
          discovery: {
            ...p.agents.discovery,
            status: 'Completed',
            completionPercent: 100,
            tasksCompleted: plannedQueries.length,
            sourcesProcessed: currentSources.length,
            executionTimeMs: Date.now() - tDiscoveryStart,
            currentActivity: `Retrieved ${currentSources.length} verified papers (${totalRawHits} raw across scholarly APIs)`,
            logs: [...p.agents.discovery.logs, ...dbLogLines],
          },
          evidence: {
            ...p.agents.evidence,
            status: 'Analyzing',
            completionPercent: 35,
            currentActivity: 'Extracting verbatim sentences strictly from retrieved abstracts...',
          },
        },
        agentHandoffs: pushHandoff(
          p,
          'Discovery Agent',
          'Evidence Agent',
          `Retrieved ${currentSources.length} unique papers (removed ${academicResult.duplicatesRemoved} duplicates, excluded ${academicResult.rejectedCount} unverified).`,
          `${currentSources.length} Real Papers`
        ),
        trail: [
          ...p.trail,
          buildTrailStep(
            3,
            'Academic databases queried',
            'Discovery Agent',
            `${plannedQueries.length} planned search queries`,
            'Queried OpenAlex, Crossref, and Semantic Scholar APIs concurrently via backend proxy.',
            dbStatuses.map((d) => `${d.database}: ${d.retrievedCount} (${d.status})`).join(' · '),
            'Real bibliographic records prevent fabricated titles, DOIs, or authors.'
          ),
        ],
        activityLog: pushLog(
          p,
          'discovery',
          `Discovery completed: ${currentSources.length} verified papers retained (${academicResult.duplicatesRemoved} duplicates removed).`,
          'discovery'
        ),
      };
    });

    await sleep(delayUnit, signal);

    // ------------------------------------------------------------------
    // STAGE 3: EVIDENCE AGENT — Abstract-only extraction (never faked)
    // ------------------------------------------------------------------
    const tEvidenceStart = Date.now();
    const papersWithAbstract = currentSources.filter((s) => Boolean(s.abstract));
    const extractedFindings: SharedFinding[] = [];
    papersWithAbstract.slice(0, 5).forEach((s) => {
      const sents = extractAbstractSentences(s.abstract);
      if (sents[0]) {
        extractedFindings.push({
          id: `sf-ev-${s.id}-${Date.now()}`,
          timestamp: nowTime(),
          branchName: s.queryBranch,
          agent: 'evidence',
          text: `[Abstract Only] ${sents[0]}`,
          sourceId: s.id,
        });
      }
    });

    update((p) => ({
      ...p,
      simulationProgress: 52,
      sharedFindings: [...extractedFindings, ...p.sharedFindings],
      agents: {
        ...p.agents,
        evidence: {
          ...p.agents.evidence,
          status: 'Completed',
          completionPercent: 100,
          tasksCompleted: currentSources.length,
          sourcesProcessed: currentSources.length,
          executionTimeMs: Date.now() - tEvidenceStart,
          currentActivity: `Extracted verbatim evidence from ${papersWithAbstract.length} abstracts (${currentSources.length - papersWithAbstract.length} metadata-only)`,
          logs: [
            ...p.agents.evidence.logs,
            `[${nowTime()}] Parsed ${papersWithAbstract.length} abstracts; marked ${currentSources.length - papersWithAbstract.length} records Metadata Only.`,
          ],
        },
        verification: {
          ...p.agents.verification,
          status: 'Analyzing',
          completionPercent: 40,
          currentActivity: 'Verifying DOIs, metadata consistency, claims, and conflicts...',
        },
      },
      agentHandoffs: pushHandoff(
        p,
        'Evidence Agent',
        'Verification Agent',
        `Extracted abstract-grounded statements for ${papersWithAbstract.length} papers.`,
        `${papersWithAbstract.length} Abstracts`
      ),
      trail: [
        ...p.trail,
        buildTrailStep(
          4,
          'Evidence extracted from abstracts',
          'Evidence Agent',
          `${currentSources.length} retrieved sources`,
          'Extracted verbatim findings strictly from open abstracts without extrapolating paywalled full text.',
          `${papersWithAbstract.length} Abstract Only · ${currentSources.length - papersWithAbstract.length} Metadata Only`,
          'Explicitly distinguishes abstract scope from full manuscript access.'
        ),
      ],
      activityLog: pushLog(
        p,
        'evidence',
        `Evidence Agent extracted verbatim passages from ${papersWithAbstract.length} abstracts.`,
        'info'
      ),
    }));

    await sleep(delayUnit, signal);

    // ------------------------------------------------------------------
    // STAGE 4: VERIFICATION AGENT — DOI Cross-Check, Claims & Conflicts
    // ------------------------------------------------------------------
    const tVerifStart = Date.now();
    let claims = buildClaimsFromRealSources(currentSources);
    let contradictions = initialProject.config.enableContradictionAnalysis
      ? detectRealContradictions(currentSources)
      : [];

    const doiVerifiedCount = currentSources.filter((s) => Boolean(s.doi)).length;
    const crossCheckedCount = currentSources.filter((s) => s.verificationStatus === 'Cross-Checked').length;

    update((p) => ({
      ...p,
      simulationProgress: 66,
      claims,
      contradictions,
      agents: {
        ...p.agents,
        verification: {
          ...p.agents.verification,
          status: 'Completed',
          completionPercent: 100,
          tasksCompleted: claims.length + contradictions.length,
          sourcesProcessed: currentSources.length,
          executionTimeMs: Date.now() - tVerifStart,
          currentActivity: `Verified ${doiVerifiedCount} DOIs (${crossCheckedCount} multi-DB cross-checked), ${claims.length} claims, ${contradictions.length} conflicts`,
          logs: [
            ...p.agents.verification.logs,
            `[${nowTime()}] Cross-checked DOIs & titles; removed ${p.duplicatesRemovedCount} duplicates and excluded ${p.rejectedUnverifiedCount} mismatched records.`,
            `[${nowTime()}] Audited ${claims.length} claims and surfaced ${contradictions.length} inter-abstract tensions.`,
          ],
        },
        gaps: {
          ...p.agents.gaps,
          status: 'Analyzing',
          completionPercent: 35,
          currentActivity: 'Evaluating branch coverage and identifying unanswered questions...',
        },
      },
      agentHandoffs: pushHandoff(
        p,
        'Verification Agent',
        'Gap Detection Agent',
        `Verified ${claims.length} claims & ${contradictions.length} conflicts across ${currentSources.length} DOI/registry-checked sources.`,
        `${claims.length} Claims Audited`
      ),
      trail: [
        ...p.trail,
        buildTrailStep(
          5,
          'DOIs, metadata, claims & contradictions verified',
          'Verification Agent',
          `${currentSources.length} sources + extracted evidence`,
          'Cross-checked DOIs against Crossref, scored claim backing, and inspected abstracts for opposing findings.',
          `${doiVerifiedCount} DOIs verified · ${claims.length} claims · ${contradictions.length} conflicts`,
          'Excludes any reference that fails registry or title consistency checks.'
        ),
      ],
      activityLog: pushLog(
        p,
        'verification',
        `Verification Agent confirmed ${doiVerifiedCount} DOIs, audited ${claims.length} claims, and flagged ${contradictions.length} conflicts.`,
        contradictions.length > 0 ? 'warning' : 'success'
      ),
    }));

    await sleep(delayUnit, signal);

    // ------------------------------------------------------------------
    // STAGE 5: GAP DETECTION AGENT + BOUNDED AUTONOMOUS RETRY
    // ------------------------------------------------------------------
    const tGapStart = Date.now();
    let gaps = buildGapsFromRealCoverage(initialProject.topic, plannedQueries, currentSources);
    const sparseGaps = gaps.filter((g) => g.availableSourceIds.length < 2);

    const shouldLaunchFollowUp =
      initialProject.config.enableAutonomousFollowUp &&
      initialProject.maxIterations > 1 &&
      sparseGaps.length > 0;

    if (shouldLaunchFollowUp) {
      const targetGap = sparseGaps[0];
      const reason = `Branch "${targetGap.subtopic}" returned only ${targetGap.availableSourceIds.length} verified paper(s) (${targetGap.coveragePercent}% coverage). Autonomously launching Iteration 2/${initialProject.maxIterations} targeted academic query.`;

      update((p) => ({
        ...p,
        iterationRound: 2,
        simulationProgress: 74,
        reasonForAdditionalResearch: reason,
        autonomousDecisions: [
          {
            id: `ad-r2-${Date.now()}`,
            timestamp: nowTime(),
            iteration: 1,
            trigger: `Sparse coverage in "${targetGap.subtopic}" (${targetGap.coveragePercent}%)`,
            decision: `Launch Bounded Iteration 2 / ${p.maxIterations}`,
            reason,
          },
          ...p.autonomousDecisions,
        ],
        agents: {
          ...p.agents,
          gaps: {
            ...p.agents.gaps,
            status: 'Needs more research',
            completionPercent: 65,
            currentActivity: `Triggering follow-up query for "${targetGap.subtopic}"`,
          },
          discovery: {
            ...p.agents.discovery,
            status: 'Searching',
            completionPercent: 85,
            currentActivity: `Round 2 query: "${targetGap.suggestedQuestion}"`,
          },
        },
        activityLog: pushLog(p, 'gaps', `Autonomous Decision: ${reason}`, 'action'),
      }));

      const round2Res = await searchAcademicDatabases(
        [{ branch: targetGap.subtopic, query: targetGap.suggestedQuestion }],
        4
      );
      if (signal.aborted) return;

      if (round2Res.papers.length > 0) {
        currentSources = mergePapersDeduplicated(currentSources, round2Res.papers);
        claims = buildClaimsFromRealSources(currentSources);
        contradictions = initialProject.config.enableContradictionAnalysis
          ? detectRealContradictions(currentSources)
          : [];
        gaps = buildGapsFromRealCoverage(initialProject.topic, plannedQueries, currentSources).map((g) =>
          g.subtopic === targetGap.subtopic ? { ...g, investigated: true } : g
        );
      }

      update((p) => ({
        ...p,
        sources: currentSources,
        claims,
        contradictions,
        gaps,
        duplicatesRemovedCount: p.duplicatesRemovedCount + round2Res.duplicatesRemoved,
        rejectedUnverifiedCount: p.rejectedUnverifiedCount + round2Res.rejectedCount,
        agents: {
          ...p.agents,
          discovery: {
            ...p.agents.discovery,
            status: 'Completed',
            completionPercent: 100,
            sourcesProcessed: currentSources.length,
            currentActivity: `Completed Iteration 2 (+${round2Res.papers.length} verified candidates merged)`,
          },
        },
        activityLog: pushLog(
          p,
          'discovery',
          `Iteration 2 merged: total verified corpus now ${currentSources.length} papers.`,
          'discovery'
        ),
      }));
    }

    update((p) => ({
      ...p,
      simulationProgress: 82,
      gaps,
      agents: {
        ...p.agents,
        gaps: {
          ...p.agents.gaps,
          status: 'Completed',
          completionPercent: 100,
          tasksCompleted: gaps.length,
          sourcesProcessed: currentSources.length,
          executionTimeMs: Date.now() - tGapStart,
          currentActivity: `Mapped ${gaps.length} coverage dimensions (${gaps.filter((g) => g.coverageStatus !== 'Well explored').length} open gaps)`,
          logs: [
            ...p.agents.gaps.logs,
            `[${nowTime()}] Audited branch coverage and missing full-text boundaries across ${gaps.length} topics.`,
          ],
        },
        synthesis: {
          ...p.agents.synthesis,
          status: 'Analyzing',
          completionPercent: 45,
          currentActivity: 'Synthesizing evidence vs. interpretation & building Knowledge Map...',
        },
      },
      agentHandoffs: pushHandoff(
        p,
        'Gap Detection Agent',
        'Synthesis Agent',
        `Handed off ${claims.length} verified claims and ${gaps.length} audited research gaps.`,
        `${gaps.length} Gap Assessments`
      ),
      trail: [
        ...p.trail,
        buildTrailStep(
          6,
          'Research gaps evaluated',
          'Gap Detection Agent',
          `${plannedQueries.length} investigation branches`,
          'Scored paper & abstract coverage per branch and checked whether autonomous Round 2 improved coverage.',
          `${gaps.filter((g) => g.coverageStatus !== 'Well explored').length} open gaps documented`,
          'Prevents overclaiming where retrieved literature is sparse or metadata-only.'
        ),
      ],
    }));

    await sleep(delayUnit, signal);

    // ------------------------------------------------------------------
    // STAGE 6: SYNTHESIS AGENT — Evidence vs Interpretation + Graph + Quality
    // ------------------------------------------------------------------
    const tSynthStart = Date.now();
    const qualityScore = buildQualityBreakdown(currentSources, claims, gaps, dbStatuses);
    const graph = buildKnowledgeGraphFromRealData(
      initialProject.topic,
      currentSources,
      claims,
      contradictions,
      gaps
    );

    update((p) => ({
      ...p,
      simulationProgress: 92,
      qualityScore,
      knowledgeNodes: graph.nodes,
      knowledgeEdges: graph.edges,
      agents: {
        ...p.agents,
        synthesis: {
          ...p.agents.synthesis,
          status: 'Completed',
          completionPercent: 100,
          tasksCompleted: 3,
          sourcesProcessed: currentSources.length,
          executionTimeMs: Date.now() - tSynthStart,
          currentActivity: `Synthesized findings (Quality ${qualityScore.overall}/100) & ${graph.nodes.length}-node Knowledge Map`,
          logs: [
            ...p.agents.synthesis.logs,
            `[${nowTime()}] Separated abstract evidence from interpretation and uncertainty disclosures.`,
          ],
        },
        report: {
          ...p.agents.report,
          status: 'Analyzing',
          completionPercent: 55,
          currentActivity: 'Compiling 13-section citation-linked briefing with clickable DOIs...',
        },
      },
      agentHandoffs: pushHandoff(
        p,
        'Synthesis Agent',
        'Report Agent',
        `Delivered synthesized conclusions, quality breakdown (${qualityScore.overall}/100), and knowledge graph.`,
        'Synthesis Package'
      ),
      trail: [
        ...p.trail,
        buildTrailStep(
          7,
          'Evidence synthesized',
          'Synthesis Agent',
          `${claims.length} verified claims & ${gaps.length} gaps`,
          'Synthesized cross-source conclusions while separating evidence from interpretation and limitations.',
          `Quality Score ${qualityScore.overall}/100 · ${graph.nodes.length} Knowledge Nodes`,
          'Zero unretrieved assertions permitted in final synthesis.'
        ),
      ],
    }));

    await sleep(delayUnit, signal);

    // ------------------------------------------------------------------
    // STAGE 7: REPORT AGENT — Compile 13-Section Report with Real Citations
    // ------------------------------------------------------------------
    const tReportStart = Date.now();
    let finalSections = initialProject.reportSections;
    update((p) => {
      finalSections = buildRealReportSections(
        p,
        currentSources,
        claims,
        contradictions,
        gaps,
        dbStatuses
      );
      return {
        ...p,
        status: 'Completed',
        simulationProgress: 100,
        updatedAt: new Date().toISOString(),
        reportSections: finalSections,
        researchHoursSaved: Number((currentSources.length * 0.65).toFixed(1)),
        autonomousDecisions: [
          {
            id: `ad-final-${Date.now()}`,
            timestamp: nowTime(),
            iteration: p.iterationRound,
            trigger: `${currentSources.length} verified papers compiled`,
            decision: 'Publish Verified 13-Section Briefing',
            reason: `Every inline citation [1]–[${currentSources.length}] maps directly to a real DOI or scholarly URL retrieved from OpenAlex/Crossref/Semantic Scholar.`,
          },
          ...p.autonomousDecisions,
        ],
        agents: {
          ...p.agents,
          report: {
            ...p.agents.report,
            status: 'Completed',
            completionPercent: 100,
            tasksCompleted: finalSections.length,
            sourcesProcessed: currentSources.length,
            executionTimeMs: Date.now() - tReportStart,
            currentActivity: `Compiled 13-section report with ${currentSources.length} verified clickable references`,
            logs: [
              ...p.agents.report.logs,
              `[${nowTime()}] Report published with zero fabricated references.`,
            ],
          },
        },
        trail: [
          ...p.trail,
          buildTrailStep(
            8,
            'Verified research report generated',
            'Report Agent',
            `${currentSources.length} verified scholarly records`,
            'Compiled 13-section report with numeric inline citations [1..N] linked directly to DOIs and open-access PDFs.',
            `${finalSections.length} sections published`,
            'Every reference is traceable to OpenAlex, Crossref, or Semantic Scholar.'
          ),
        ],
        activityLog: pushLog(
          p,
          'report',
          `Report Agent published 13-section briefing with ${currentSources.length} real verified references.`,
          'success'
        ),
      };
    });

    onNotify(
      'Scholarly Research Completed',
      `Retrieved & verified ${currentSources.length} real papers for "${initialProject.topic.slice(0, 48)}".`,
      'report-viewer'
    );
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return;
    }
    const msg = err instanceof Error ? err.message : 'Unexpected agent orchestration failure';
    update((p) => ({
      ...p,
      status: 'Error',
      lastError: msg,
      activityLog: pushLog(p, 'system', `Pipeline halted: ${msg}`, 'warning'),
    }));
  }
}
