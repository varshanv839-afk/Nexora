import { createDefaultAgents, EMPTY_QUALITY_BREAKDOWN } from '../data/demoData';
import {
  ContradictionItem,
  DatabaseStatus,
  ExpandedQuery,
  KnowledgeEdge,
  KnowledgeNode,
  QualityScoreBreakdown,
  ReportSection,
  ResearchClaim,
  ResearchConfig,
  ResearchGapItem,
  ResearchProject,
  ResearchSource,
  TrailStep,
} from '../types/research';

/**
 * Generates targeted academic search queries & subquestions from the user's topic.
 */
export function buildResearchQueries(config: ResearchConfig): ExpandedQuery[] {
  const t = config.topic.trim();
  const branches = [
    {
      branch: 'Systematic Reviews & Meta-Analyses',
      q: `${t} systematic review`,
      subquestion: `What do peer-reviewed systematic reviews establish regarding ${t}?`,
    },
    {
      branch: 'Empirical Outcomes & Clinical/Field Studies',
      q: `${t} empirical study evaluation`,
      subquestion: `What measurable outcomes and performance metrics are reported in field or clinical studies of ${t}?`,
    },
    {
      branch: 'Infrastructure, Implementation & Economics',
      q: `${t} implementation cost barriers`,
      subquestion: `What infrastructure, workflow, and economic barriers affect real-world adoption of ${t}?`,
    },
    {
      branch: 'Governance, Ethics & Limitations',
      q: `${t} policy ethics limitations challenges`,
      subquestion: `What regulatory, privacy, safety, or methodological limitations are documented for ${t}?`,
    },
  ];

  const limit = config.mode === 'quick' ? 2 : config.mode === 'standard' ? 3 : 4;
  return branches.slice(0, limit).map((b, i) => ({
    id: `q-${Date.now()}-${i + 1}`,
    query: b.q,
    branch: b.branch,
    subquestion: b.subquestion,
    status: 'Queued',
    sourcesFound: 0,
  }));
}

export async function createResearch(config: ResearchConfig): Promise<ResearchProject> {
  const id = `proj-${Date.now()}`;
  const now = new Date().toISOString();
  const plannedQueries = buildResearchQueries(config);

  return {
    id,
    topic: config.topic.trim(),
    objective:
      config.objective.trim() ||
      `Conduct ${config.mode} multi-agent literature investigation into "${config.topic.trim()}" using OpenAlex, Crossref, and Semantic Scholar.`,
    createdAt: now,
    updatedAt: now,
    status: 'Running',
    mode: config.mode,
    reportLength: config.reportLength,
    domains: config.domains.length ? config.domains : ['General'],
    config,
    isSimulatedDemo: false,
    providerMode: 'live',
    databaseStatuses: [],
    duplicatesRemovedCount: 0,
    rejectedUnverifiedCount: 0,
    rejectionNotes: [],
    simulationProgress: 0,
    iterationRound: 1,
    maxIterations: config.mode === 'quick' ? 1 : config.mode === 'standard' ? 2 : 3,
    reasonForAdditionalResearch: undefined,
    lastError: null,
    agents: createDefaultAgents(false),
    parallelBranches: plannedQueries.map((q, idx) => ({
      id: `br-${idx + 1}`,
      name: q.branch,
      query: q.query,
      subquestion: q.subquestion,
      status: 'Queued',
      progress: 0,
      sourcesCollected: 0,
      findingsCount: 0,
    })),
    agentHandoffs: [],
    sharedFindings: [],
    autonomousDecisions: [],
    expandedQueries: plannedQueries,
    sources: [],
    claims: [],
    contradictions: [],
    gaps: [],
    activityLog: [
      {
        id: `log-init-${Date.now()}`,
        timestamp: new Date().toTimeString().slice(0, 8),
        agent: 'system',
        message: `Initialized ${config.mode.toUpperCase()} scholarly research workflow for "${config.topic.trim()}".`,
        type: 'info',
      },
    ],
    trail: [
      {
        id: 't-1',
        stepNumber: 1,
        title: 'Research topic received',
        timestamp: now.slice(0, 16).replace('T', ' '),
        agent: 'Orchestrator',
        input: `Topic: "${config.topic.trim()}" (Mode: ${config.mode})`,
        action: 'Validated topic, depth configuration, and initialized 7-agent pipeline.',
        output: `Prepared ${plannedQueries.length} investigation branches for scholarly retrieval.`,
        reasonForDecision: 'Only real retrieved and DOI/metadata-verified scholarly records may enter the ledger.',
        completed: true,
      },
    ],
    knowledgeNodes: [],
    knowledgeEdges: [],
    reportSections: [],
    reportComments: [],
    qualityScore: EMPTY_QUALITY_BREAKDOWN,
    researchHoursSaved: 0,
  };
}

/**
 * Extracts informative sentences directly from a real paper's abstract.
 * Returns null if the source has no abstract (Metadata Only).
 */
export function extractAbstractSentences(abstract?: string): string[] {
  if (!abstract) return [];
  const cleaned = abstract.replace(/\s+/g, ' ').trim();
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 35 && s.length <= 420);

  // Prioritize sentences with quantitative findings, results, or conclusions
  const ranked = [...sentences].sort((a, b) => {
    const score = (s: string) => {
      let val = 0;
      if (/\d+%|\d+\.\d+|n\s*=|p\s*[<≤=]|CI|OR|RR/i.test(s)) val += 3;
      if (/found|demonstrated|showed|indicated|concluded|revealed|observed|associated|significant|limit|challenge|however|contrast/i.test(s)) val += 2;
      return val;
    };
    return score(b) - score(a);
  });

  return ranked.slice(0, 3);
}

/**
 * Builds verifiable ResearchClaim items grounded 100% in retrieved abstracts/sources.
 */
export function buildClaimsFromRealSources(sources: ResearchSource[]): ResearchClaim[] {
  const claims: ResearchClaim[] = [];
  const sourcesWithAbstracts = sources.filter((s) => Boolean(s.abstract));

  sourcesWithAbstracts.slice(0, 10).forEach((src, idx) => {
    const sentences = extractAbstractSentences(src.abstract);
    const primarySentence = sentences[0] || src.keyExcerpt;
    const caveatSentence = sentences.find((s) =>
      /\b(however|although|limited|limitation|challenge|risk|insufficient|conflict|bias|unclear|heterogen|gap|not)\b/i.test(
        s
      )
    );

    const hasCaveat = Boolean(caveatSentence && caveatSentence !== primarySentence);
    const crossChecked = src.verificationStatus === 'Cross-Checked';
    const baseConf = crossChecked ? 84 : 74;
    const confidence = hasCaveat ? Math.max(58, baseConf - 10) : Math.min(92, baseConf + (src.citationCount && src.citationCount > 10 ? 6 : 0));

    claims.push({
      id: `C${idx + 1}`,
      claim: primarySentence,
      evidenceSummary: `Extracted from ${src.evidenceScope} of [${src.id}] (${src.venue}, ${src.publicationYear || 'n.d.'}).`,
      supportingExcerpts: [
        {
          sourceId: src.id,
          excerpt: primarySentence,
          date: src.publicationDate,
        },
      ],
      opposingEvidence:
        hasCaveat && caveatSentence
          ? [
              {
                sourceId: src.id,
                excerpt: caveatSentence,
                date: src.publicationDate,
              },
            ]
          : [],
      sourceIds: [src.id],
      confidence,
      status: hasCaveat ? 'Partially Supported' : 'Supported',
      confidenceExplanation: `${src.verificationNotes} Evidence scope: ${src.evidenceScope} (full-text PDF not parsed in browser).`,
      verificationNotes: src.doi
        ? `DOI ${src.doi} verified. Databases: ${src.databasesFoundIn.join(', ')}.`
        : `Retrieved from ${src.databasesFoundIn.join(', ')} (no DOI assigned in record).`,
      evaluatedBy: 'Verification Agent',
      subtopic: src.queryBranch || 'Literature Findings',
    });
  });

  // Also explicitly log metadata-only sources as Unverified when no abstract was available
  sources
    .filter((s) => !s.abstract)
    .slice(0, 3)
    .forEach((src) => {
      claims.push({
        id: `C${claims.length + 1}`,
        claim: `Bibliographic record verified for "${src.title}", but no abstract was returned for automated claim extraction.`,
        evidenceSummary: `Metadata verified via ${src.databasesFoundIn.join(', ')}; abstract text unavailable via open API.`,
        supportingExcerpts: [],
        opposingEvidence: [],
        sourceIds: [src.id],
        confidence: 35,
        status: 'Unverified',
        confidenceExplanation:
          'Marked Unverified for empirical claims because only bibliographic metadata (title, authors, venue, DOI/URL) was returned without abstract text.',
        verificationNotes: `${src.verificationNotes} Full-text inspection required via publication URL.`,
        evaluatedBy: 'Verification Agent',
        subtopic: src.queryBranch || 'Metadata Only',
      });
    });

  return claims;
}

/**
 * Inspects real retrieved abstracts for genuine contrasting findings or limitations.
 * Never invents conflicts if retrieved abstracts do not contain contrasting signals.
 */
export function detectRealContradictions(sources: ResearchSource[]): ContradictionItem[] {
  const withAbs = sources.filter((s) => Boolean(s.abstract));
  if (withAbs.length < 2) return [];

  const positiveMatches = withAbs.filter((s) =>
    /\b(improv|effectiv|increas|benefit|accurac|sensitiv|reduc.*cost|success|outperform|promising)\b/i.test(
      s.abstract || ''
    )
  );
  const cautionaryMatches = withAbs.filter((s) =>
    /\b(limit|challenge|barrier|bias|fail|low\s+specific|disparit|risk|cost|heterogen|insufficient|lack|inconclusive)\b/i.test(
      s.abstract || ''
    )
  );

  const items: ContradictionItem[] = [];
  for (const pos of positiveMatches) {
    const neg = cautionaryMatches.find((c) => c.id !== pos.id);
    if (!neg) continue;
    if (items.some((it) => (it.sourceAId === pos.id && it.sourceBId === neg.id))) continue;

    const posSentence =
      extractAbstractSentences(pos.abstract).find((s) =>
        /\b(improv|effectiv|increas|benefit|accurac|sensitiv|success|outperform)\b/i.test(s)
      ) || pos.keyExcerpt;
    const negSentence =
      extractAbstractSentences(neg.abstract).find((s) =>
        /\b(limit|challenge|barrier|bias|fail|disparit|risk|cost|heterogen|insufficient|lack|inconclusive)\b/i.test(s)
      ) || neg.keyExcerpt;

    items.push({
      id: `X${items.length + 1}`,
      topic: `Observed Tension: ${pos.queryBranch} vs. Documented Constraints`,
      claimA: posSentence,
      sourceA: `${pos.authors[0] || 'Authors'} (${pos.publicationYear || 'n.d.'}), ${pos.venue}`,
      sourceAId: pos.id,
      claimB: negSentence,
      sourceB: `${neg.authors[0] || 'Authors'} (${neg.publicationYear || 'n.d.'}), ${neg.venue}`,
      sourceBId: neg.id,
      differenceSummary:
        'Source A highlights positive performance or utility in its abstract, while Source B highlights methodological barriers, disparities, or empirical limitations.',
      whyTheyDisagree:
        'Differences in study cohorts, evaluation metrics, deployment maturity, or scope between the two retrieved abstracts.',
      contextAndMethodology: `Abstract-level comparison between [${pos.id}] (${pos.databaseSource}) and [${neg.id}] (${neg.databaseSource}).`,
      severity: 'Moderate',
      investigated: false,
    });

    if (items.length >= 3) break;
  }

  return items;
}

/**
 * Computes real coverage gaps from how many verified abstracts & papers each branch retrieved.
 */
export function buildGapsFromRealCoverage(
  topic: string,
  queries: ExpandedQuery[],
  sources: ResearchSource[]
): ResearchGapItem[] {
  return queries.map((q, idx) => {
    const branchSources = sources.filter((s) => s.queryBranch === q.branch);
    const abstractCount = branchSources.filter((s) => Boolean(s.abstract)).length;
    const rawPct = Math.min(92, branchSources.length * 18 + abstractCount * 12);
    const coveragePercent = branchSources.length === 0 ? 0 : Math.max(18, rawPct);

    const coverageStatus =
      coveragePercent >= 75
        ? 'Well explored'
        : coveragePercent >= 50
        ? 'Partially explored'
        : coveragePercent > 0
        ? 'Under explored'
        : 'Missing';

    const missingAbstracts = branchSources.length - abstractCount;
    const whatsMissing =
      branchSources.length === 0
        ? `Zero verified papers retrieved for query "${q.query}". Try broadening search terms or checking database availability.`
        : missingAbstracts > 0
        ? `${missingAbstracts} of ${branchSources.length} papers returned metadata without abstracts; full-text methods & sample metrics require direct paper inspection.`
        : `Only ${abstractCount} abstract(s) reviewed in this branch; full-text tables, long-term replication, and subgroup breakdowns are not directly accessible from abstract APIs.`;

    return {
      id: `G${idx + 1}`,
      subtopic: q.branch,
      coverageStatus,
      coveragePercent,
      unansweredCount: coverageStatus === 'Well explored' ? 1 : coverageStatus === 'Partially explored' ? 2 : 3,
      whyItMatters: `Directly addresses subquestion: "${q.subquestion}"`,
      whatsMissing,
      suggestedQuestion: `${topic} ${q.branch.toLowerCase()} systematic empirical validation`,
      availableSourceIds: branchSources.map((s) => s.id),
      investigated: false,
    };
  });
}

export function buildQualityBreakdown(
  sources: ResearchSource[],
  claims: ResearchClaim[],
  gaps: ResearchGapItem[],
  dbStatuses: DatabaseStatus[]
): QualityScoreBreakdown {
  if (sources.length === 0) return EMPTY_QUALITY_BREAKDOWN;

  const avgCoverage = gaps.length
    ? Math.round(gaps.reduce((acc, g) => acc + g.coveragePercent, 0) / gaps.length)
    : 0;

  const verifiedClaimsCount = claims.filter((c) => c.status === 'Supported' || c.status === 'Partially Supported').length;
  const claimScore = claims.length ? Math.round((verifiedClaimsCount / claims.length) * 100) : 0;

  const crossCheckedCount = sources.filter((s) => s.verificationStatus === 'Cross-Checked' || s.doi).length;
  const okDbs = dbStatuses.filter((d) => d.status === 'ok' || d.status === 'degraded').length;
  const diversityScore = Math.min(100, Math.round((crossCheckedCount / sources.length) * 65 + okDbs * 12));

  const recencyScore = Math.round(sources.reduce((acc, s) => acc + s.recencyScore, 0) / sources.length);
  const abstractRate = Math.round(
    (sources.filter((s) => Boolean(s.abstract)).length / sources.length) * 100
  );

  const criteria = [
    {
      key: 'coverage',
      label: 'Evidence Coverage',
      weight: 25,
      score: avgCoverage,
      weightedContribution: Number(((avgCoverage * 25) / 100).toFixed(1)),
      explanation: `Retrieved ${sources.length} verified papers across ${gaps.length} investigation branches.`,
      recommendation: 'Use Research Gaps to run targeted follow-up queries on sparse branches.',
    },
    {
      key: 'verification',
      label: 'Claim Verification',
      weight: 25,
      score: claimScore,
      weightedContribution: Number(((claimScore * 25) / 100).toFixed(1)),
      explanation: `${verifiedClaimsCount} of ${claims.length} extracted claims backed by real retrieved abstracts.`,
      recommendation: 'Inspect Unverified (metadata-only) records via their DOI links.',
    },
    {
      key: 'diversity',
      label: 'Database Cross-Check',
      weight: 20,
      score: diversityScore,
      weightedContribution: Number(((diversityScore * 20) / 100).toFixed(1)),
      explanation: `${crossCheckedCount} of ${sources.length} papers carry verified DOIs or multi-database confirmation.`,
      recommendation: 'Cross-referencing across OpenAlex, Crossref, and Semantic Scholar minimizes single-index gaps.',
    },
    {
      key: 'recency',
      label: 'Source Recency',
      weight: 15,
      score: recencyScore,
      weightedContribution: Number(((recencyScore * 15) / 100).toFixed(1)),
      explanation: `Average publication recency index calculated from real publication years.`,
      recommendation: 'Verify recent preprints against peer-reviewed journal versions.',
    },
    {
      key: 'completeness',
      label: 'Abstract Completeness',
      weight: 15,
      score: abstractRate,
      weightedContribution: Number(((abstractRate * 15) / 100).toFixed(1)),
      explanation: `${abstractRate}% of retrieved papers provided open abstract text for verbatim extraction.`,
      recommendation: 'Follow open-access PDF or DOI URLs for full experimental methodology.',
    },
  ];

  const overall = Math.round(criteria.reduce((acc, c) => acc + c.weightedContribution, 0));
  return { overall, isSimulated: false, criteria };
}

export function buildKnowledgeGraphFromRealData(
  topic: string,
  sources: ResearchSource[],
  claims: ResearchClaim[],
  contradictions: ContradictionItem[],
  gaps: ResearchGapItem[]
): { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] } {
  const nodes: KnowledgeNode[] = [
    {
      id: 'kn-topic',
      label: topic.slice(0, 34) + (topic.length > 34 ? '...' : ''),
      type: 'topic',
      x: 500,
      y: 270,
      summary: `Central scholarly inquiry: ${topic}`,
      meta: `${sources.length} Verified Papers`,
    },
  ];
  const edges: KnowledgeEdge[] = [];

  gaps.slice(0, 4).forEach((g, idx) => {
    const coords = [
      { x: 240, y: 130 },
      { x: 760, y: 130 },
      { x: 240, y: 410 },
      { x: 760, y: 410 },
    ][idx];
    const subId = `kn-sub-${idx + 1}`;
    nodes.push({
      id: subId,
      label: g.subtopic.slice(0, 28),
      type: g.coveragePercent < 50 ? 'gap' : 'subtopic',
      x: coords.x,
      y: coords.y,
      summary: g.whatsMissing,
      meta: `${g.coverageStatus} · ${g.coveragePercent}%`,
      refId: g.id,
    });
    edges.push({ id: `ke-sub-${idx + 1}`, source: 'kn-topic', target: subId, relation: 'investigates' });
  });

  sources.slice(0, 4).forEach((s, idx) => {
    const coords = [
      { x: 100, y: 75 },
      { x: 900, y: 75 },
      { x: 100, y: 475 },
      { x: 900, y: 475 },
    ][idx];
    const srcNodeId = `kn-src-${s.id}`;
    nodes.push({
      id: srcNodeId,
      label: `[${s.id}] ${s.title.slice(0, 26)}...`,
      type: 'source',
      x: coords.x,
      y: coords.y,
      summary: `${s.authors.slice(0, 2).join(', ')} (${s.publicationYear || 'n.d.'}) — ${s.venue}`,
      meta: s.doi ? `DOI: ${s.doi}` : s.databaseSource,
      refId: s.id,
    });
    const parentSub = nodes.find((n) => n.id.startsWith('kn-sub-') && s.queryBranch.includes(n.label.slice(0, 12)))?.id || 'kn-topic';
    edges.push({ id: `ke-src-${s.id}`, source: parentSub, target: srcNodeId, relation: 'retrieved' });
  });

  claims.slice(0, 2).forEach((c, idx) => {
    const cid = `kn-claim-${c.id}`;
    nodes.push({
      id: cid,
      label: `${c.id}: ${c.claim.slice(0, 28)}...`,
      type: 'claim',
      x: idx === 0 ? 400 : 600,
      y: 80,
      summary: c.claim,
      meta: `${c.status} · ${c.confidence}%`,
      refId: c.id,
    });
    edges.push({ id: `ke-c-${c.id}`, source: 'kn-topic', target: cid, relation: 'evidences' });
  });

  contradictions.slice(0, 1).forEach((x) => {
    const xid = `kn-x-${x.id}`;
    nodes.push({
      id: xid,
      label: x.topic.slice(0, 28),
      type: 'contradiction',
      x: 500,
      y: 495,
      summary: x.differenceSummary,
      meta: `${x.severity} Tension`,
      refId: x.id,
    });
    edges.push({ id: `ke-x-${x.id}`, source: 'kn-topic', target: xid, relation: 'tension' });
  });

  return { nodes, edges };
}

export function formatPaperReferenceLine(src: ResearchSource): string {
  const authorText =
    src.authors.length > 3
      ? `${src.authors.slice(0, 3).join(', ')} et al.`
      : src.authors.join(', ') || 'Authors unlisted';
  const yearText = src.publicationYear ? String(src.publicationYear) : 'n.d.';
  const doiPart = src.doi ? ` DOI: https://doi.org/${src.doi}` : '';
  const urlPart = !src.doi && src.url ? ` URL: ${src.url}` : '';
  const oaPart = src.openAccessPdfUrl ? ` [Open-Access PDF: ${src.openAccessPdfUrl}]` : '';
  return `[${src.id}] ${authorText} (${yearText}). ${src.title}. ${src.venue}.${doiPart}${urlPart}${oaPart} (Verified via ${src.databasesFoundIn.join(', ')})`;
}

/**
 * Generates the 13-section evidence-backed report strictly from retrieved real sources.
 * Clearly distinguishes Evidence vs. Interpretation vs. Uncertainty.
 */
export function buildRealReportSections(
  project: ResearchProject,
  sources: ResearchSource[],
  claims: ResearchClaim[],
  contradictions: ContradictionItem[],
  gaps: ResearchGapItem[],
  dbStatuses: DatabaseStatus[]
): ReportSection[] {
  const today = new Date().toISOString().slice(0, 10);
  const t = project.topic;
  const withAbs = sources.filter((s) => Boolean(s.abstract));
  const crossChecked = sources.filter((s) => s.verificationStatus === 'Cross-Checked');
  const dbSummary = dbStatuses
    .map((d) => `${d.database}: ${d.status.toUpperCase()} (${d.retrievedCount} raw${d.error ? ` — ${d.error}` : ''})`)
    .join(' · ');

  const topCiteIds = sources.slice(0, 4).map((s) => `[${s.id}]`).join(', ');

  return [
    {
      id: 'sec-1',
      number: '01',
      title: 'Cover',
      content: `RESEARCHFLOW AI — VERIFIED SCHOLARLY RESEARCH BRIEFING\n\nTopic: ${t}\nObjective: ${project.objective}\nResearch Mode: ${project.mode.toUpperCase()} · Verified Papers: ${sources.length} (${crossChecked.length} Cross-Checked Across Multiple Registries)\nDeduplicated Duplicates Removed: ${project.duplicatesRemovedCount} · Unverified Records Excluded: ${project.rejectedUnverifiedCount}\nDatabase Query Telemetry: ${dbSummary || 'Pending'}\nDate Compiled: ${today}`,
      citationIds: [],
      lastUpdated: today,
    },
    {
      id: 'sec-2',
      number: '02',
      title: 'Executive Summary',
      content:
        sources.length === 0
          ? `No verified scholarly papers met inclusion criteria for "${t}". Inspect database statuses (${dbSummary}) and retry with broader academic keywords.`
          : `EVIDENCE SUMMARY:\nThis investigation queried OpenAlex, Crossref, and Semantic Scholar across ${project.expandedQueries.length} planned research branches, retrieving and verifying ${sources.length} real scholarly publications (${withAbs.length} with open abstracts; ${sources.length - withAbs.length} metadata-only) ${topCiteIds}.\n\n` +
            claims
              .slice(0, 4)
              .map((c) => `• [${c.sourceIds.join(', ')}] (${c.status}) ${c.claim}`)
              .join('\n') +
            `\n\nINTERPRETATION & SCOPE NOTE:\nAll empirical claims above are extracted verbatim from retrieved publication abstracts or registered bibliographic metadata. Full-text experimental tables behind paywalled PDFs were not fabricated or extrapolated.`,
      citationIds: sources.slice(0, 6).map((s) => s.id),
      lastUpdated: today,
    },
    {
      id: 'sec-3',
      number: '03',
      title: 'Research Question',
      content: `Primary Research Question: ${t}\n\nInvestigated Subquestions:\n${project.expandedQueries
        .map((q, idx) => `${idx + 1}. [${q.branch}] ${q.subquestion} (Query: "${q.query}")`)
        .join('\n')}`,
      citationIds: [],
      lastUpdated: today,
    },
    {
      id: 'sec-4',
      number: '04',
      title: 'Methodology',
      content:
        `Executed via ResearchFlow AI’s 7-agent architecture:\n` +
        `1. Planner Agent: Decomposed "${t}" into ${project.expandedQueries.length} investigation branches.\n` +
        `2. Discovery Agent: Queried live OpenAlex, Crossref, and Semantic Scholar APIs.\n` +
        `3. Evidence Agent: Extracted verbatim evidence sentences strictly from returned abstracts (explicitly labeling Abstract Only vs. Metadata Only).\n` +
        `4. Verification Agent: Deduplicated ${project.duplicatesRemovedCount} overlapping records, cross-checked DOIs against Crossref, and excluded ${project.rejectedUnverifiedCount} unverified candidates.\n` +
        `5. Gap Detection Agent: Audited branch coverage (${project.iterationRound} iteration round(s)).\n` +
        `6. Synthesis Agent & 7. Report Agent: Compiled conclusions strictly grounded in retrieved records.\n\n` +
        `Database Retrieval Results:\n${dbStatuses.map((d) => `• ${d.database}: ${d.status} — ${d.retrievedCount} candidates (${d.latencyMs}ms)${d.error ? ` [Note: ${d.error}]` : ''}`).join('\n')}`,
      citationIds: [],
      lastUpdated: today,
    },
    {
      id: 'sec-5',
      number: '05',
      title: 'Background',
      content:
        withAbs.length > 0
          ? `Retrieved peer-reviewed literature spanning ${Math.min(...sources.map((s) => s.publicationYear || 9999).filter((y) => y < 9999)) || 'recent years'}–${Math.max(...sources.map((s) => s.publicationYear || 0)) || 'present'} frames "${t}" across multiple empirical perspectives:\n\n` +
            withAbs
              .slice(0, 3)
              .map((s) => `In "${s.title}" (${s.venue}, ${s.publicationYear || 'n.d.'}) [${s.id}]: ${s.keyExcerpt}`)
              .join('\n\n')
          : `No open abstracts were available in the retrieved records to summarize background context without speculation. Review the verified bibliographic citations in Section 13.`,
      citationIds: withAbs.slice(0, 3).map((s) => s.id),
      lastUpdated: today,
    },
    {
      id: 'sec-6',
      number: '06',
      title: 'Key Findings',
      content:
        claims.length === 0
          ? 'No verifiable claims could be extracted from the current source batch.'
          : claims
              .map(
                (c, idx) =>
                  `${idx + 1}. [${c.sourceIds.join(', ')}] [${c.status} · ${c.confidence}%]\nEvidence: ${c.claim}\nProvenance: ${c.verificationNotes}`
              )
              .join('\n\n'),
      citationIds: sources.map((s) => s.id),
      lastUpdated: today,
    },
    {
      id: 'sec-7',
      number: '07',
      title: 'Evidence Analysis',
      content:
        `EVIDENCE AUDIT:\n` +
        `• Total Verified Papers: ${sources.length}\n` +
        `• Papers with Abstract Text (Abstract Only): ${withAbs.length}\n` +
        `• Metadata-Only Papers (No Abstract Returned): ${sources.length - withAbs.length}\n` +
        `• Cross-Checked Across Multiple Databases: ${crossChecked.length}\n` +
        `• Open-Access PDF Links Available: ${sources.filter((s) => Boolean(s.openAccessPdfUrl)).length}\n\n` +
        `INTERPRETATION:\nConfidence is highest where claims rest on abstracts retrieved and cross-verified by DOI across multiple registries. Metadata-only items are retained strictly in References and flagged as Unverified for empirical claims until the reader opens the full publication link.`,
      citationIds: sources.slice(0, 6).map((s) => s.id),
      lastUpdated: today,
    },
    {
      id: 'sec-8',
      number: '08',
      title: 'Conflicting Perspectives',
      content:
        contradictions.length === 0
          ? `No direct inter-abstract contradictions were detected among the ${withAbs.length} retrieved abstracts, or insufficient overlapping abstracts were available to surface methodological disagreements.`
          : contradictions
              .map(
                (c) =>
                  `• ${c.topic} (${c.severity})\n  Position A [${c.sourceAId}]: "${c.claimA}"\n  Position B [${c.sourceBId}]: "${c.claimB}"\n  Context: ${c.whyTheyDisagree}`
              )
              .join('\n\n'),
      citationIds: contradictions.flatMap((c) => [c.sourceAId, c.sourceBId]),
      lastUpdated: today,
    },
    {
      id: 'sec-9',
      number: '09',
      title: 'Research Gaps',
      content: gaps
        .map((g) => `• ${g.subtopic} (${g.coverageStatus} · ${g.coveragePercent}% coverage): ${g.whatsMissing}`)
        .join('\n\n'),
      citationIds: [],
      lastUpdated: today,
    },
    {
      id: 'sec-10',
      number: '10',
      title: 'Limitations',
      content:
        `1. Abstract-Only Retrieval Boundary: Academic search APIs (OpenAlex, Crossref, Semantic Scholar) provide bibliographic metadata and open abstracts rather than full paywalled manuscript PDFs.\n` +
        `2. Rate Limits & Indexing Coverage: ${dbStatuses.some((d) => d.status !== 'ok') ? `One or more databases returned partial/failed responses (${dbStatuses.filter((d) => d.status !== 'ok').map((d) => `${d.database}: ${d.error}`).join('; ')}).` : 'All queried academic databases responded normally.'}\n` +
        `3. Non-Fabrication Policy: Claims without abstract backing are marked Unverified rather than inferred.`,
      citationIds: [],
      lastUpdated: today,
    },
    {
      id: 'sec-11',
      number: '11',
      title: 'Future Opportunities',
      content:
        gaps
          .filter((g) => g.coverageStatus !== 'Well explored')
          .map((g) => `• Follow-Up Inquiry (${g.subtopic}): ${g.suggestedQuestion}`)
          .join('\n\n') ||
        `Inspect open-access PDFs linked in Section 13 to extract full experimental tables, effect sizes, and subgroup analyses.`,
      citationIds: sources.filter((s) => Boolean(s.openAccessPdfUrl)).slice(0, 4).map((s) => s.id),
      lastUpdated: today,
    },
    {
      id: 'sec-12',
      number: '12',
      title: 'Conclusion',
      content:
        sources.length === 0
          ? `Conclusive synthesis cannot be issued because zero verified papers were retrieved. Adjust query keywords and re-run Discovery.`
          : `EVIDENCE-BASED CONCLUSION:\nAcross ${sources.length} real, DOI/registry-verified publications retrieved for "${t}" ${topCiteIds}, the accessible abstract evidence supports targeted findings summarized in Section 06 while highlighting ${gaps.filter((g) => g.coverageStatus !== 'Well explored').length} under-explored branches.\n\nUNCERTAINTY DISCLOSURE:\nReaders should consult the direct DOI and Open-Access PDF links in Section 13 to verify full experimental protocols beyond abstract summaries.`,
      citationIds: sources.slice(0, 4).map((s) => s.id),
      lastUpdated: today,
    },
    {
      id: 'sec-13',
      number: '13',
      title: 'References',
      content:
        sources.length === 0
          ? 'No verified references retrieved.'
          : sources.map(formatPaperReferenceLine).join('\n\n'),
      citationIds: sources.map((s) => s.id),
      lastUpdated: today,
    },
  ];
}

export function exportReportMarkdown(project: ResearchProject): void {
  const md = [
    `# ${project.topic}`,
    `> **ResearchFlow AI Verified Academic Report** · Mode: ${project.mode} · Verified Papers: ${project.sources.length} · Quality Score: ${project.qualityScore.overall}/100`,
    '',
    ...project.reportSections.map((s) => `## ${s.number}. ${s.title}\n\n${s.content}`),
  ].join('\n\n');

  downloadTextFile(md, `${slugify(project.topic)}-report.md`, 'text/markdown;charset=utf-8');
}

export function exportResearchTrailJSON(project: ResearchProject): void {
  const payload = {
    projectId: project.id,
    topic: project.topic,
    providerMode: project.providerMode,
    databaseStatuses: project.databaseStatuses,
    duplicatesRemovedCount: project.duplicatesRemovedCount,
    rejectedUnverifiedCount: project.rejectedUnverifiedCount,
    exportedAt: new Date().toISOString(),
    trail: project.trail,
    activityLog: project.activityLog,
  };
  downloadTextFile(JSON.stringify(payload, null, 2), `${slugify(project.topic)}-research-trail.json`, 'application/json');
}

export function exportPDF(project: ResearchProject): void {
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(project.topic)} — ResearchFlow AI Report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0f172a; max-width: 820px; margin: 40px auto; padding: 0 24px; line-height: 1.65; }
  .banner { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 12px 16px; border-radius: 6px; font-size: 12px; color: #475569; margin-bottom: 24px; }
  h1 { font-size: 28px; margin-bottom: 8px; }
  h2 { font-size: 18px; margin-top: 28px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
  p { white-space: pre-line; font-size: 14px; color: #334155; }
</style>
</head>
<body>
  <div class="banner">VERIFIED SCHOLARLY RETRIEVAL EXPORT · ResearchFlow AI · ${project.sources.length} Verified Papers · Quality Score: ${project.qualityScore.overall}/100</div>
  <h1>${escapeHtml(project.topic)}</h1>
  ${project.reportSections
    .map((s) => `<h2>${escapeHtml(s.number)}. ${escapeHtml(s.title)}</h2><p>${escapeHtml(s.content)}</p>`)
    .join('\n')}
</body>
</html>`;
  downloadTextFile(html, `${slugify(project.topic)}-printable-report.html`, 'text/html;charset=utf-8');
}

function downloadTextFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function slugify(str: string): string {
  return (
    str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 48) || 'research-report'
  );
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildTrailStep(
  stepNumber: number,
  title: string,
  agent: string,
  input: string,
  action: string,
  output: string,
  reasonForDecision: string
): TrailStep {
  return {
    id: `t-${Date.now()}-${stepNumber}`,
    stepNumber,
    title,
    timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
    agent,
    input,
    action,
    output,
    reasonForDecision,
    completed: true,
  };
}
