export type NavPage =
  | 'dashboard'
  | 'new-research'
  | 'workspace'
  | 'my-research'
  | 'research-library'
  | 'evidence-ledger'
  | 'contradiction-radar'
  | 'research-gaps'
  | 'research-trail'
  | 'knowledge-map'
  | 'document-crossref'
  | 'research-memory'
  | 'report-viewer'
  | 'settings';

export type ResearchMode = 'quick' | 'standard' | 'deep';
export type ReportLength = 'brief' | 'standard' | 'comprehensive';

export type ResearchDomain =
  | 'Technology'
  | 'Healthcare'
  | 'Business'
  | 'Environment'
  | 'Science'
  | 'Education'
  | 'General';

export type SourcePreference =
  | 'Academic papers'
  | 'Government reports'
  | 'News'
  | 'Industry publications'
  | 'Trusted websites';

export type AgentId =
  | 'planner'
  | 'discovery'
  | 'evidence'
  | 'verification'
  | 'gaps'
  | 'synthesis'
  | 'report';

export type AgentStatus =
  | 'Idle'
  | 'Planning'
  | 'Searching'
  | 'Analyzing'
  | 'Waiting'
  | 'Completed'
  | 'Needs more research'
  | 'Failed';

export interface AgentState {
  id: AgentId;
  name: string;
  roleTitle: string;
  status: AgentStatus;
  completionPercent: number;
  currentActivity: string;
  tasksCompleted: number;
  sourcesProcessed: number;
  executionTimeMs: number;
  logs: string[];
  errorMessage?: string;
}

export interface ResearchBranch {
  id: string;
  name: string;
  query: string;
  subquestion: string;
  status: 'Queued' | 'Running' | 'Completed' | 'Failed' | 'Retrying';
  progress: number;
  sourcesCollected: number;
  findingsCount: number;
  errorMessage?: string;
}

export interface AgentHandoff {
  id: string;
  timestamp: string;
  fromAgent: string;
  toAgent: string;
  summary: string;
  payloadLabel: string;
}

export interface SharedFinding {
  id: string;
  timestamp: string;
  branchName: string;
  agent: AgentId;
  text: string;
  sourceId?: string;
}

export interface AutonomousDecision {
  id: string;
  timestamp: string;
  iteration: number;
  trigger: string;
  decision: string;
  reason: string;
}

export type AcademicDatabaseName = 'OpenAlex' | 'Crossref' | 'Semantic Scholar' | 'Web (Tavily)';

export interface DatabaseStatus {
  database: AcademicDatabaseName;
  status: 'ok' | 'degraded' | 'failed';
  retrievedCount: number;
  error?: string;
  latencyMs: number;
}

export type SourceCategory =
  | 'Academic research'
  | 'Government'
  | 'News'
  | 'Industry report'
  | 'Blog'
  | 'Dataset';

export interface ResearchSource {
  id: string;
  title: string;
  authors: string[];
  publicationYear?: number;
  venue: string;
  doi?: string;
  abstract?: string;
  openAccessPdfUrl?: string;
  citationCount?: number;
  databaseSource: AcademicDatabaseName;
  databasesFoundIn: AcademicDatabaseName[];
  verificationStatus: 'Verified' | 'Cross-Checked';
  verificationNotes: string;
  evidenceScope: 'Abstract Only' | 'Metadata Only' | 'Web Snippet';
  publisher: string;
  publicationDate: string;
  category: SourceCategory;
  relevanceScore: number; // 0-100
  recencyScore: number; // 0-100
  evidenceContribution: number; // percentage or weight
  url: string;
  isPrimary: boolean;
  keyExcerpt: string;
  queryBranch: string;
  isSimulatedDemo: boolean;
}

export type VerificationStatus =
  | 'Supported'
  | 'Partially Supported'
  | 'Contradicted'
  | 'Unverified';

export interface ResearchClaim {
  id: string;
  claim: string;
  evidenceSummary: string;
  supportingExcerpts: { sourceId: string; excerpt: string; date: string }[];
  opposingEvidence: { sourceId: string; excerpt: string; date: string }[];
  sourceIds: string[];
  confidence: number; // 0-100
  status: VerificationStatus;
  confidenceExplanation: string;
  verificationNotes: string;
  evaluatedBy: string;
  flagged?: boolean;
  reinvestigationRequested?: boolean;
  subtopic: string;
}

export type ContradictionSeverity = 'Minor' | 'Moderate' | 'Significant';

export interface ContradictionItem {
  id: string;
  topic: string;
  claimA: string;
  sourceA: string;
  sourceAId: string;
  claimB: string;
  sourceB: string;
  sourceBId: string;
  differenceSummary: string;
  whyTheyDisagree: string;
  contextAndMethodology: string;
  severity: ContradictionSeverity;
  investigated: boolean;
  investigationNote?: string;
}

export type CoverageStatus =
  | 'Well explored'
  | 'Partially explored'
  | 'Under explored'
  | 'Missing';

export interface ResearchGapItem {
  id: string;
  subtopic: string;
  coverageStatus: CoverageStatus;
  coveragePercent: number;
  unansweredCount: number;
  whyItMatters: string;
  whatsMissing: string;
  suggestedQuestion: string;
  availableSourceIds: string[];
  investigated: boolean;
}

export interface ExpandedQuery {
  id: string;
  query: string;
  branch: string;
  subquestion: string;
  status: 'Queued' | 'Searching' | 'Completed';
  sourcesFound: number;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  agent: AgentId | 'system';
  message: string;
  type: 'info' | 'discovery' | 'warning' | 'success' | 'action';
}

export interface TrailStep {
  id: string;
  stepNumber: number;
  title: string;
  timestamp: string;
  agent: string;
  input: string;
  action: string;
  output: string;
  reasonForDecision: string;
  completed: boolean;
}

export type KnowledgeNodeType =
  | 'topic'
  | 'subtopic'
  | 'claim'
  | 'source'
  | 'contradiction'
  | 'gap';

export interface KnowledgeNode {
  id: string;
  label: string;
  type: KnowledgeNodeType;
  x: number;
  y: number;
  summary: string;
  meta?: string;
  refId?: string;
}

export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
}

export interface ReportComment {
  id: string;
  sectionId: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface ReportSection {
  id: string;
  number: string;
  title: string;
  content: string;
  citationIds: string[];
  lastUpdated: string;
}

export interface QualityScoreBreakdown {
  overall: number;
  isSimulated: boolean;
  criteria: {
    key: string;
    label: string;
    weight: number;
    score: number;
    weightedContribution: number;
    explanation: string;
    recommendation: string;
  }[];
}

export interface ResearchConfig {
  topic: string;
  objective: string;
  customInstructions: string;
  mode: ResearchMode;
  reportLength: ReportLength;
  domains: ResearchDomain[];
  sourcePreferences: SourcePreference[];
  minSources: number;
  includeOpposingViewpoints: boolean;
  prioritizeRecentSources: boolean;
  enableAutonomousFollowUp: boolean;
  enableContradictionAnalysis: boolean;
}

export interface ResearchProject {
  id: string;
  topic: string;
  objective: string;
  createdAt: string;
  updatedAt: string;
  status: 'Draft' | 'Running' | 'Needs Follow-up' | 'Completed' | 'Error';
  mode: ResearchMode;
  reportLength: ReportLength;
  domains: ResearchDomain[];
  config: ResearchConfig;
  isSimulatedDemo: boolean;
  providerMode: 'demo' | 'live';
  databaseStatuses: DatabaseStatus[];
  duplicatesRemovedCount: number;
  rejectedUnverifiedCount: number;
  rejectionNotes: string[];
  simulationProgress: number; // 0-100
  iterationRound: number;
  maxIterations: number;
  reasonForAdditionalResearch?: string;
  lastError?: string | null;
  agents: Record<AgentId, AgentState>;
  parallelBranches: ResearchBranch[];
  agentHandoffs: AgentHandoff[];
  sharedFindings: SharedFinding[];
  autonomousDecisions: AutonomousDecision[];
  expandedQueries: ExpandedQuery[];
  sources: ResearchSource[];
  claims: ResearchClaim[];
  contradictions: ContradictionItem[];
  gaps: ResearchGapItem[];
  activityLog: ActivityLogEntry[];
  trail: TrailStep[];
  knowledgeNodes: KnowledgeNode[];
  knowledgeEdges: KnowledgeEdge[];
  reportSections: ReportSection[];
  reportComments: ReportComment[];
  qualityScore: QualityScoreBreakdown;
  researchHoursSaved: number;
}

export interface DocumentCrossRefResult {
  id: string;
  fileName: string;
  fileType: 'PDF' | 'DOCX' | 'TXT';
  uploadedAt: string;
  summary: string;
  extractedClaims: { id: string; text: string; alignment: 'Aligned' | 'Conflicting' | 'Missing in Web Research' }[];
  extractedStatistics: { label: string; value: string; sourceContext: string }[];
  importantReferences: string[];
  missingInformation: string[];
  webComparisons: {
    documentClaim: string;
    webFinding: string;
    analysis: string;
    status: 'Confirmed' | 'Conflict Detected' | 'Novel Insight';
  }[];
}

export interface ResearchMemoryItem {
  id: string;
  projectId: string;
  topic: string;
  finding: string;
  relatedTopics: string[];
  sourceTitles: string[];
  lastVerifiedDate: string;
  isOutdated: boolean;
  confidence: number;
  reusedInCurrent: boolean;
  rejected: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  targetPage?: NavPage;
}

export interface WorkspaceSettings {
  defaultMode: ResearchMode;
  defaultLength: ReportLength;
  simulationSpeed: 'normal' | 'fast';
  autoDetectContradictions: boolean;
  autoInvestigateGaps: boolean;
  demoWatermarkVisible: boolean;
  apiEndpointPlaceholder: string;
}
