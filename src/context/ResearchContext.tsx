import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  createDefaultAgents,
  EMPTY_QUALITY_BREAKDOWN,
  INITIAL_MEMORY_ITEMS,
  INITIAL_NOTIFICATIONS,
  INITIAL_SETTINGS,
} from '../data/demoData';
import { runAutonomousPipeline } from '../services/agentOrchestrator';
import {
  buildClaimsFromRealSources,
  buildGapsFromRealCoverage,
  buildKnowledgeGraphFromRealData,
  buildQualityBreakdown,
  buildRealReportSections,
  createResearch,
  detectRealContradictions,
} from '../services/researchService';
import {
  BackendCapabilities,
  checkBackendCapabilities,
  searchAcademicDatabases,
} from '../services/searchProvider';
import {
  AgentId,
  DocumentCrossRefResult,
  NavPage,
  NotificationItem,
  ResearchConfig,
  ResearchMemoryItem,
  ResearchProject,
  ResearchSource,
  WorkspaceSettings,
} from '../types/research';

const STORAGE_KEY = 'researchflow_ai_workspace_v3';

const ALL_AGENT_IDS: AgentId[] = [
  'planner',
  'discovery',
  'evidence',
  'verification',
  'gaps',
  'synthesis',
  'report',
];

interface ResearchContextValue {
  activePage: NavPage;
  setActivePage: (page: NavPage) => void;
  projects: ResearchProject[];
  activeProjectId: string;
  activeProject: ResearchProject | null;
  setActiveProjectId: (id: string) => void;
  backendCapabilities: BackendCapabilities;
  isSimulating: boolean;
  wasInterruptedOnRefresh: boolean;
  startNewResearch: (config: ResearchConfig) => Promise<void>;
  replaySimulation: (projectId?: string) => void;
  pauseSimulation: () => void;
  resumeOrRetryProject: () => void;
  investigateContradiction: (contradictionId: string) => void;
  investigateResearchGaps: (gapId?: string) => void;
  requestClaimReinvestigation: (claimId: string) => void;
  toggleFlagClaim: (claimId: string) => void;
  addExpandedQuery: (queryText: string, branch?: string) => void;
  updateExpandedQuery: (queryId: string, queryText: string) => void;
  removeExpandedQuery: (queryId: string) => void;
  rerunExpandedQuery: (queryId: string) => void;
  updateReportSection: (sectionId: string, newContent: string) => void;
  regenerateReportSection: (sectionId: string) => void;
  addReportComment: (sectionId: string, text: string) => void;
  renameProject: (projectId: string, newTopic: string) => void;
  duplicateProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;
  documentResult: DocumentCrossRefResult | null;
  setDocumentResult: React.Dispatch<React.SetStateAction<DocumentCrossRefResult | null>>;
  memoryItems: ResearchMemoryItem[];
  toggleReuseMemory: (memoryId: string) => void;
  rejectMemory: (memoryId: string) => void;
  refreshMemoryItem: (memoryId: string) => void;
  notifications: NotificationItem[];
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  credits: number;
  settings: WorkspaceSettings;
  updateSettings: (partial: Partial<WorkspaceSettings>) => void;
  resetDemoWorkspace: () => void;
  draftTopic: string;
  setDraftTopic: (t: string) => void;
}

const ResearchContext = createContext<ResearchContextValue | null>(null);

function normalizeProject(raw: ResearchProject): ResearchProject {
  const defaultAgents = createDefaultAgents(raw.status === 'Completed');
  const agents = { ...defaultAgents };
  ALL_AGENT_IDS.forEach((id) => {
    if (raw.agents?.[id]) {
      agents[id] = {
        ...defaultAgents[id],
        ...raw.agents[id],
        completionPercent:
          typeof raw.agents[id].completionPercent === 'number'
            ? raw.agents[id].completionPercent
            : raw.agents[id].status === 'Completed'
            ? 100
            : 0,
      };
    }
  });

  return {
    ...raw,
    isSimulatedDemo: false,
    providerMode: 'live',
    databaseStatuses: Array.isArray(raw.databaseStatuses) ? raw.databaseStatuses : [],
    duplicatesRemovedCount: Number(raw.duplicatesRemovedCount || 0),
    rejectedUnverifiedCount: Number(raw.rejectedUnverifiedCount || 0),
    rejectionNotes: Array.isArray(raw.rejectionNotes) ? raw.rejectionNotes : [],
    maxIterations: raw.maxIterations || 3,
    parallelBranches: Array.isArray(raw.parallelBranches) ? raw.parallelBranches : [],
    agentHandoffs: Array.isArray(raw.agentHandoffs) ? raw.agentHandoffs : [],
    sharedFindings: Array.isArray(raw.sharedFindings) ? raw.sharedFindings : [],
    autonomousDecisions: Array.isArray(raw.autonomousDecisions) ? raw.autonomousDecisions : [],
    qualityScore: raw.qualityScore || EMPTY_QUALITY_BREAKDOWN,
    agents,
  };
}

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.projects)) {
      parsed.projects = parsed.projects
        .filter((p: ResearchProject) => !p.isSimulatedDemo)
        .map(normalizeProject);
    }
    return parsed;
  } catch {
    return null;
  }
}

export const ResearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const persisted = useMemo(() => loadPersistedState(), []);

  const [activePage, setActivePage] = useState<NavPage>(persisted?.activePage || 'dashboard');
  const [projects, setProjects] = useState<ResearchProject[]>(persisted?.projects || []);
  const [activeProjectId, setActiveProjectId] = useState<string>(
    persisted?.activeProjectId || persisted?.projects?.[0]?.id || ''
  );
  const [documentResult, setDocumentResult] = useState<DocumentCrossRefResult | null>(
    persisted?.documentResult || null
  );
  const [memoryItems, setMemoryItems] = useState<ResearchMemoryItem[]>(
    persisted?.memoryItems || INITIAL_MEMORY_ITEMS
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    persisted?.notifications || INITIAL_NOTIFICATIONS
  );
  const [credits, setCredits] = useState<number>(persisted?.credits ?? 420);
  const [settings, setSettings] = useState<WorkspaceSettings>(
    persisted?.settings || INITIAL_SETTINGS
  );
  const [draftTopic, setDraftTopic] = useState<string>('');
  const [backendCapabilities, setBackendCapabilities] = useState<BackendCapabilities>({
    ok: true,
    academicDatabases: ['OpenAlex', 'Crossref', 'Semantic Scholar'],
    liveSearchConfigured: false,
    geminiConfigured: false,
    mode: 'live',
  });

  const [isSimulating, setIsSimulating] = useState(false);
  const [wasInterruptedOnRefresh, setWasInterruptedOnRefresh] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) || projects[0] || null,
    [projects, activeProjectId]
  );

  // Query backend capabilities safely (no secrets exposed)
  useEffect(() => {
    checkBackendCapabilities().then(setBackendCapabilities);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          activePage,
          projects,
          activeProjectId,
          documentResult,
          memoryItems,
          notifications,
          credits,
          settings,
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [activePage, projects, activeProjectId, documentResult, memoryItems, notifications, credits, settings]);

  // Sync verified findings into Research Memory whenever a project completes
  useEffect(() => {
    const completedProjects = projects.filter((p) => p.status === 'Completed' && p.claims.length > 0 && p.sources.length > 0);
    if (completedProjects.length === 0) return;

    setMemoryItems((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const additions: ResearchMemoryItem[] = [];
      for (const proj of completedProjects) {
        const supported = proj.claims.filter((c) => c.status === 'Supported' || c.status === 'Partially Supported').slice(0, 2);
        supported.forEach((claim) => {
          const memId = `mem-${proj.id}-${claim.id}`;
          if (existingIds.has(memId)) return;
          const citedSources = proj.sources.filter((s) => claim.sourceIds.includes(s.id));
          if (citedSources.length === 0) return;
          additions.push({
            id: memId,
            projectId: proj.id,
            topic: proj.topic,
            finding: claim.claim,
            relatedTopics: [claim.subtopic, ...proj.domains].slice(0, 3),
            sourceTitles: citedSources.map((s) => `${s.title} (${s.publicationYear || 'n.d.'})`),
            lastVerifiedDate: proj.updatedAt.slice(0, 10),
            isOutdated: false,
            confidence: claim.confidence,
            reusedInCurrent: false,
            rejected: false,
          });
        });
      }
      return additions.length > 0 ? [...additions, ...prev] : prev;
    });
  }, [projects]);

  const stopPipeline = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsSimulating(false);
  }, []);

  useEffect(() => () => stopPipeline(), [stopPipeline]);

  const pushNotification = useCallback((title: string, description: string, targetPage?: NavPage) => {
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title,
        description,
        timestamp: new Date().toTimeString().slice(0, 5),
        read: false,
        targetPage,
      },
      ...prev.slice(0, 14),
    ]);
  }, []);

  const updateProjectById = useCallback(
    (projectId: string, updater: (prev: ResearchProject) => ResearchProject) => {
      setProjects((prev) => prev.map((p) => (p.id === projectId ? updater(p) : p)));
    },
    []
  );

  const launchOrchestrator = useCallback(
    async (projectSnapshot: ResearchProject) => {
      stopPipeline();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsSimulating(true);
      setWasInterruptedOnRefresh(false);

      await runAutonomousPipeline(
        projectSnapshot,
        {
          onUpdateProject: updateProjectById,
          onNotify: pushNotification,
        },
        {
          speed: settings.simulationSpeed,
          signal: controller.signal,
        }
      );

      if (!controller.signal.aborted) {
        setIsSimulating(false);
      }
    },
    [pushNotification, settings.simulationSpeed, stopPipeline, updateProjectById]
  );

  // Resume automatically if user refreshed mid-research
  useEffect(() => {
    const interrupted = projects.find((p) => p.status === 'Running');
    if (interrupted) {
      setWasInterruptedOnRefresh(true);
      setActiveProjectId(interrupted.id);
      const resetSnapshot: ResearchProject = {
        ...interrupted,
        status: 'Running',
        simulationProgress: 0,
        agents: createDefaultAgents(false),
        activityLog: [
          {
            id: `log-recover-${Date.now()}`,
            timestamp: new Date().toTimeString().slice(0, 8),
            agent: 'system',
            message: 'Browser refresh detected during active research. Re-launching live scholarly retrieval.',
            type: 'action',
          },
          ...interrupted.activityLog,
        ],
      };
      updateProjectById(interrupted.id, () => resetSnapshot);
      launchOrchestrator(resetSnapshot);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNewResearch = useCallback(
    async (config: ResearchConfig) => {
      if (!config.topic.trim()) return;
      const created = await createResearch(config);
      setProjects((prev) => [created, ...prev]);
      setActiveProjectId(created.id);
      setCredits((c) => Math.max(0, c - (config.mode === 'deep' ? 25 : config.mode === 'standard' ? 15 : 8)));
      setActivePage('workspace');
      launchOrchestrator(created);
    },
    [launchOrchestrator]
  );

  const replaySimulation = useCallback(
    (projectId?: string) => {
      const target = projects.find((p) => p.id === (projectId || activeProject?.id)) || activeProject;
      if (!target) return;
      setActiveProjectId(target.id);
      const resetProject: ResearchProject = {
        ...target,
        status: 'Running',
        lastError: null,
        simulationProgress: 0,
        iterationRound: 1,
        reasonForAdditionalResearch: undefined,
        sources: [],
        claims: [],
        contradictions: [],
        gaps: [],
        reportSections: [],
        databaseStatuses: [],
        duplicatesRemovedCount: 0,
        rejectedUnverifiedCount: 0,
        rejectionNotes: [],
        agents: createDefaultAgents(false),
        parallelBranches: target.expandedQueries.map((q, idx) => ({
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
        expandedQueries: target.expandedQueries.map((q) => ({ ...q, status: 'Queued', sourcesFound: 0 })),
        trail: target.trail.slice(0, 1),
        activityLog: [
          {
            id: `log-replay-${Date.now()}`,
            timestamp: new Date().toTimeString().slice(0, 8),
            agent: 'system',
            message: 'Re-running live scholarly retrieval across OpenAlex, Crossref, and Semantic Scholar.',
            type: 'info',
          },
        ],
      };
      updateProjectById(target.id, () => resetProject);
      setActivePage('workspace');
      launchOrchestrator(resetProject);
    },
    [activeProject, launchOrchestrator, projects, updateProjectById]
  );

  const pauseSimulation = useCallback(() => {
    if (!activeProject) return;
    stopPipeline();
    updateProjectById(activeProject.id, (p) => ({
      ...p,
      status: p.simulationProgress >= 100 ? 'Completed' : 'Needs Follow-up',
      activityLog: [
        {
          id: `log-pause-${Date.now()}`,
          timestamp: new Date().toTimeString().slice(0, 8),
          agent: 'system',
          message: 'Execution paused by user. Click Replay Pipeline to restart live retrieval.',
          type: 'warning',
        },
        ...p.activityLog,
      ],
    }));
  }, [activeProject, stopPipeline, updateProjectById]);

  const resumeOrRetryProject = useCallback(() => {
    if (!activeProject) return;
    replaySimulation(activeProject.id);
  }, [activeProject, replaySimulation]);

  /**
   * Executes a real follow-up academic database query against OpenAlex/Crossref/Semantic Scholar
   * and merges newly verified papers into the active project.
   */
  const triggerFollowUpTask = useCallback(
    async (label: string, queryText: string, branch: string, note: string) => {
      if (!activeProject) return;
      const projId = activeProject.id;
      const nowStr = new Date().toTimeString().slice(0, 8);

      updateProjectById(projId, (p) => {
        const nextRound = Math.min(p.maxIterations || 3, p.iterationRound + 1);
        const newQuery = {
          id: `q-followup-${Date.now()}`,
          query: queryText,
          branch,
          subquestion: label,
          status: 'Searching' as const,
          sourcesFound: 0,
        };
        const newBranch = {
          id: `br-fu-${Date.now()}`,
          name: branch,
          query: queryText,
          subquestion: label,
          status: 'Running' as const,
          progress: 35,
          sourcesCollected: 0,
          findingsCount: 0,
        };

        return {
          ...p,
          iterationRound: nextRound,
          reasonForAdditionalResearch: note,
          updatedAt: new Date().toISOString(),
          expandedQueries: [newQuery, ...p.expandedQueries],
          parallelBranches: [newBranch, ...p.parallelBranches],
          agents: {
            ...p.agents,
            discovery: {
              ...p.agents.discovery,
              status: 'Searching',
              completionPercent: 75,
              currentActivity: `Executing real follow-up query: "${queryText}"`,
            },
          },
          activityLog: [
            {
              id: `log-fu-${Date.now()}`,
              timestamp: nowStr,
              agent: 'discovery',
              message: `Launching real academic follow-up query: "${queryText}"`,
              type: 'action',
            },
            ...p.activityLog,
          ],
        };
      });

      const res = await searchAcademicDatabases([{ branch, query: queryText }], 4);
      const settleStr = new Date().toTimeString().slice(0, 8);

      updateProjectById(projId, (p) => {
        const seen = new Set<string>();
        const mergedRaw: ResearchSource[] = [];
        for (const s of [...p.sources, ...res.papers]) {
          const key = s.doi
            ? `doi:${s.doi.toLowerCase()}`
            : `title:${s.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          mergedRaw.push(s);
        }
        const totalWeight = mergedRaw.reduce((acc, s) => acc + (s.abstract ? 2 : 1), 0) || 1;
        const mergedSources = mergedRaw.map((s, idx) => ({
          ...s,
          id: String(idx + 1),
          evidenceContribution: Math.max(2, Math.round(((s.abstract ? 2 : 1) / totalWeight) * 100)),
        }));

        const claims = buildClaimsFromRealSources(mergedSources);
        const contradictions = p.config.enableContradictionAnalysis
          ? detectRealContradictions(mergedSources)
          : [];
        const gaps = buildGapsFromRealCoverage(p.topic, p.expandedQueries, mergedSources);
        const qualityScore = buildQualityBreakdown(mergedSources, claims, gaps, p.databaseStatuses);
        const graph = buildKnowledgeGraphFromRealData(p.topic, mergedSources, claims, contradictions, gaps);
        const reportSections = buildRealReportSections(
          p,
          mergedSources,
          claims,
          contradictions,
          gaps,
          p.databaseStatuses
        );

        return {
          ...p,
          sources: mergedSources,
          claims,
          contradictions,
          gaps,
          qualityScore,
          knowledgeNodes: graph.nodes,
          knowledgeEdges: graph.edges,
          reportSections,
          duplicatesRemovedCount: p.duplicatesRemovedCount + res.duplicatesRemoved,
          rejectedUnverifiedCount: p.rejectedUnverifiedCount + res.rejectedCount,
          expandedQueries: p.expandedQueries.map((q) =>
            q.status === 'Searching' ? { ...q, status: 'Completed', sourcesFound: res.papers.length } : q
          ),
          parallelBranches: p.parallelBranches.map((b) =>
            b.status === 'Running'
              ? {
                  ...b,
                  status: 'Completed',
                  progress: 100,
                  sourcesCollected: res.papers.length,
                  findingsCount: res.papers.filter((x) => Boolean(x.abstract)).length,
                }
              : b
          ),
          agents: {
            ...p.agents,
            discovery: {
              ...p.agents.discovery,
              status: 'Completed',
              completionPercent: 100,
              sourcesProcessed: mergedSources.length,
              currentActivity: `Merged ${res.papers.length} new verified candidates (Total: ${mergedSources.length})`,
            },
            verification: {
              ...p.agents.verification,
              status: 'Completed',
              completionPercent: 100,
              currentActivity: `Re-verified ${claims.length} claims across ${mergedSources.length} papers`,
            },
          },
          activityLog: [
            {
              id: `log-fu-done-${Date.now()}`,
              timestamp: settleStr,
              agent: 'verification',
              message: `Follow-up query "${label}" retrieved ${res.papers.length} candidates; corpus updated to ${mergedSources.length} verified papers.`,
              type: 'success',
            },
            ...p.activityLog,
          ],
        };
      });
    },
    [activeProject, updateProjectById]
  );

  const investigateContradiction = useCallback(
    (contradictionId: string) => {
      if (!activeProject) return;
      const target = activeProject.contradictions.find((c) => c.id === contradictionId);
      if (!target) return;
      updateProjectById(activeProject.id, (p) => ({
        ...p,
        contradictions: p.contradictions.map((c) =>
          c.id === contradictionId
            ? {
                ...c,
                investigated: true,
                investigationNote: 'Launched live follow-up academic query comparing methodology and cohort findings.',
              }
            : c
        ),
      }));
      triggerFollowUpTask(
        `Investigate disagreement: ${target.topic}`,
        `${activeProject.topic} ${target.topic} empirical comparison`,
        'Contradiction Reconciliation',
        `Reconciling tension between [${target.sourceAId}] and [${target.sourceBId}].`
      );
      pushNotification(
        'Contradiction Follow-Up Launched',
        `Querying academic registries for "${target.topic}".`,
        'workspace'
      );
      setActivePage('workspace');
    },
    [activeProject, pushNotification, triggerFollowUpTask, updateProjectById]
  );

  const investigateResearchGaps = useCallback(
    (gapId?: string) => {
      if (!activeProject) return;
      const targetGaps = gapId
        ? activeProject.gaps.filter((g) => g.id === gapId)
        : activeProject.gaps.filter((g) => g.coverageStatus !== 'Well explored');
      const label = targetGaps[0]?.subtopic || 'Open Research Gaps';

      updateProjectById(activeProject.id, (p) => ({
        ...p,
        gaps: p.gaps.map((g) =>
          (!gapId && g.coverageStatus !== 'Well explored') || g.id === gapId ? { ...g, investigated: true } : g
        ),
      }));

      triggerFollowUpTask(
        `Gap Round: ${label}`,
        targetGaps[0]?.suggestedQuestion || `${activeProject.topic} ${label}`,
        label,
        `Executing live follow-up academic query for sparse coverage area "${label}".`
      );
      pushNotification('Gap Investigation Launched', `Querying OpenAlex & Crossref for "${label}".`, 'workspace');
      setActivePage('workspace');
    },
    [activeProject, pushNotification, triggerFollowUpTask, updateProjectById]
  );

  const requestClaimReinvestigation = useCallback(
    (claimId: string) => {
      if (!activeProject) return;
      const claim = activeProject.claims.find((c) => c.id === claimId);
      if (!claim) return;
      updateProjectById(activeProject.id, (p) => ({
        ...p,
        claims: p.claims.map((c) =>
          c.id === claimId
            ? {
                ...c,
                reinvestigationRequested: true,
                verificationNotes: `${c.verificationNotes} · Follow-up query triggered at ${new Date().toTimeString().slice(0, 5)}.`,
              }
            : c
        ),
      }));
      triggerFollowUpTask(
        `Re-verify Claim ${claim.id}`,
        `${activeProject.topic} ${claim.subtopic} study`,
        claim.subtopic,
        `Querying registries for corroborating studies on claim ${claim.id}.`
      );
      pushNotification('Claim Re-investigation Launched', `Searching for additional studies on claim ${claim.id}.`, 'workspace');
    },
    [activeProject, pushNotification, triggerFollowUpTask, updateProjectById]
  );

  const toggleFlagClaim = useCallback(
    (claimId: string) => {
      if (!activeProject) return;
      updateProjectById(activeProject.id, (p) => ({
        ...p,
        claims: p.claims.map((c) => (c.id === claimId ? { ...c, flagged: !c.flagged } : c)),
      }));
    },
    [activeProject, updateProjectById]
  );

  const addExpandedQuery = useCallback(
    (queryText: string, branch = 'Custom Branch') => {
      if (!activeProject || !queryText.trim()) return;
      updateProjectById(activeProject.id, (p) => ({
        ...p,
        expandedQueries: [
          ...p.expandedQueries,
          {
            id: `q-custom-${Date.now()}`,
            query: queryText.trim(),
            branch,
            subquestion: `Custom academic query: ${queryText.trim()}`,
            status: 'Queued',
            sourcesFound: 0,
          },
        ],
      }));
    },
    [activeProject, updateProjectById]
  );

  const updateExpandedQuery = useCallback(
    (queryId: string, queryText: string) => {
      if (!activeProject) return;
      updateProjectById(activeProject.id, (p) => ({
        ...p,
        expandedQueries: p.expandedQueries.map((q) => (q.id === queryId ? { ...q, query: queryText } : q)),
      }));
    },
    [activeProject, updateProjectById]
  );

  const removeExpandedQuery = useCallback(
    (queryId: string) => {
      if (!activeProject) return;
      updateProjectById(activeProject.id, (p) => ({
        ...p,
        expandedQueries: p.expandedQueries.filter((q) => q.id !== queryId),
      }));
    },
    [activeProject, updateProjectById]
  );

  const rerunExpandedQuery = useCallback(
    (queryId: string) => {
      if (!activeProject) return;
      const target = activeProject.expandedQueries.find((q) => q.id === queryId);
      if (!target) return;
      triggerFollowUpTask(
        `Run Query: ${target.branch}`,
        target.query,
        target.branch,
        `Executed live scholarly search for query branch "${target.branch}".`
      );
    },
    [activeProject, triggerFollowUpTask]
  );

  const updateReportSection = useCallback(
    (sectionId: string, newContent: string) => {
      if (!activeProject) return;
      updateProjectById(activeProject.id, (p) => ({
        ...p,
        updatedAt: new Date().toISOString(),
        reportSections: p.reportSections.map((s) =>
          s.id === sectionId ? { ...s, content: newContent, lastUpdated: new Date().toISOString().slice(0, 10) } : s
        ),
      }));
    },
    [activeProject, updateProjectById]
  );

  const regenerateReportSection = useCallback(
    (sectionId: string) => {
      if (!activeProject) return;
      updateProjectById(activeProject.id, (p) => {
        const freshSections = buildRealReportSections(
          p,
          p.sources,
          p.claims,
          p.contradictions,
          p.gaps,
          p.databaseStatuses
        );
        const fresh = freshSections.find((s) => s.id === sectionId);
        if (!fresh) return p;
        return {
          ...p,
          reportSections: p.reportSections.map((s) => (s.id === sectionId ? fresh : s)),
        };
      });
    },
    [activeProject, updateProjectById]
  );

  const addReportComment = useCallback(
    (sectionId: string, text: string) => {
      if (!activeProject || !text.trim()) return;
      updateProjectById(activeProject.id, (p) => ({
        ...p,
        reportComments: [
          ...p.reportComments,
          {
            id: `rc-${Date.now()}`,
            sectionId,
            author: 'Research Reviewer',
            text: text.trim(),
            createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          },
        ],
      }));
    },
    [activeProject, updateProjectById]
  );

  const renameProject = useCallback((projectId: string, newTopic: string) => {
    if (!newTopic.trim()) return;
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, topic: newTopic.trim(), updatedAt: new Date().toISOString() } : p))
    );
  }, []);

  const duplicateProject = useCallback((projectId: string) => {
    setProjects((prev) => {
      const orig = prev.find((p) => p.id === projectId);
      if (!orig) return prev;
      const copy: ResearchProject = {
        ...orig,
        id: `proj-copy-${Date.now()}`,
        topic: `${orig.topic} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return [copy, ...prev];
    });
  }, []);

  const deleteProject = useCallback(
    (projectId: string) => {
      setProjects((prev) => {
        const filtered = prev.filter((p) => p.id !== projectId);
        if (activeProjectId === projectId) {
          setActiveProjectId(filtered[0]?.id || '');
        }
        return filtered;
      });
    },
    [activeProjectId]
  );

  const toggleReuseMemory = useCallback((memoryId: string) => {
    setMemoryItems((prev) =>
      prev.map((m) => (m.id === memoryId ? { ...m, reusedInCurrent: !m.reusedInCurrent, rejected: false } : m))
    );
  }, []);

  const rejectMemory = useCallback((memoryId: string) => {
    setMemoryItems((prev) =>
      prev.map((m) => (m.id === memoryId ? { ...m, rejected: true, reusedInCurrent: false } : m))
    );
  }, []);

  const refreshMemoryItem = useCallback((memoryId: string) => {
    setMemoryItems((prev) =>
      prev.map((m) =>
        m.id === memoryId
          ? {
              ...m,
              isOutdated: false,
              lastVerifiedDate: new Date().toISOString().slice(0, 10),
            }
          : m
      )
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const updateSettings = useCallback((partial: Partial<WorkspaceSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetDemoWorkspace = useCallback(() => {
    stopPipeline();
    localStorage.removeItem(STORAGE_KEY);
    setProjects([]);
    setActiveProjectId('');
    setDocumentResult(null);
    setMemoryItems(INITIAL_MEMORY_ITEMS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setCredits(420);
    setSettings(INITIAL_SETTINGS);
    setActivePage('dashboard');
  }, [stopPipeline]);

  const value: ResearchContextValue = {
    activePage,
    setActivePage,
    projects,
    activeProjectId,
    activeProject,
    setActiveProjectId,
    backendCapabilities,
    isSimulating,
    wasInterruptedOnRefresh,
    startNewResearch,
    replaySimulation,
    pauseSimulation,
    resumeOrRetryProject,
    investigateContradiction,
    investigateResearchGaps,
    requestClaimReinvestigation,
    toggleFlagClaim,
    addExpandedQuery,
    updateExpandedQuery,
    removeExpandedQuery,
    rerunExpandedQuery,
    updateReportSection,
    regenerateReportSection,
    addReportComment,
    renameProject,
    duplicateProject,
    deleteProject,
    documentResult,
    setDocumentResult,
    memoryItems,
    toggleReuseMemory,
    rejectMemory,
    refreshMemoryItem,
    notifications,
    markAllNotificationsRead,
    markNotificationRead,
    credits,
    settings,
    updateSettings,
    resetDemoWorkspace,
    draftTopic,
    setDraftTopic,
  };

  return <ResearchContext.Provider value={value}>{children}</ResearchContext.Provider>;
};

export function useResearch() {
  const ctx = useContext(ResearchContext);
  if (!ctx) throw new Error('useResearch must be used inside ResearchProvider');
  return ctx;
}
