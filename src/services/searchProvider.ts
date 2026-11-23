import { AcademicDatabaseName, DatabaseStatus, ResearchSource } from '../types/research';

export interface BackendCapabilities {
  ok: boolean;
  academicDatabases: string[];
  liveSearchConfigured: boolean;
  geminiConfigured: boolean;
  mode: 'live' | 'demo';
}

export interface SearchProviderResponse {
  mode: 'live' | 'demo';
  configured: boolean;
  results: ResearchSource[];
  error?: string;
}

export interface RealAcademicPaperDTO {
  id: string;
  title: string;
  authors: string[];
  publicationYear?: number;
  publicationDate: string;
  venue: string;
  doi?: string;
  abstract?: string;
  url: string;
  openAccessPdfUrl?: string;
  citationCount?: number;
  databaseSource: AcademicDatabaseName;
  databasesFoundIn: AcademicDatabaseName[];
  verificationStatus: 'Verified' | 'Cross-Checked';
  verificationNotes: string;
  evidenceScope: 'Abstract Only' | 'Metadata Only' | 'Web Snippet';
  queryBranch: string;
  relevanceScore: number;
}

export interface AcademicSearchResponse {
  papers: ResearchSource[];
  databaseStatuses: DatabaseStatus[];
  duplicatesRemoved: number;
  rejectedCount: number;
  rejectionNotes: string[];
  error?: string;
}

function computeRecencyScore(year?: number): number {
  if (!year) return 45;
  const currentYear = new Date().getFullYear();
  const age = Math.max(0, currentYear - year);
  return Math.max(25, Math.min(99, Math.round(99 - age * 7)));
}

export function mapAcademicPaperToSource(paper: RealAcademicPaperDTO, index: number): ResearchSource {
  const yearLabel = paper.publicationYear ? String(paper.publicationYear) : 'Year unknown';
  const authorSummary =
    paper.authors.length > 2
      ? `${paper.authors[0]} et al.`
      : paper.authors.join(' & ') || 'Authors unlisted';

  const excerpt = paper.abstract
    ? paper.abstract.slice(0, 460) + (paper.abstract.length > 460 ? '...' : '')
    : `No abstract returned by ${paper.databaseSource} API (metadata verified only — ${authorSummary}, ${yearLabel}).`;

  return {
    id: String(index + 1),
    title: paper.title,
    authors: paper.authors,
    publicationYear: paper.publicationYear,
    venue: paper.venue,
    doi: paper.doi,
    abstract: paper.abstract,
    openAccessPdfUrl: paper.openAccessPdfUrl,
    citationCount: paper.citationCount,
    databaseSource: paper.databaseSource,
    databasesFoundIn: paper.databasesFoundIn,
    verificationStatus: paper.verificationStatus,
    verificationNotes: paper.verificationNotes,
    evidenceScope: paper.evidenceScope,
    publisher: `${paper.venue} · ${authorSummary}`,
    publicationDate: paper.publicationDate,
    category: paper.databaseSource === 'Web (Tavily)' ? 'News' : 'Academic research',
    relevanceScore: paper.relevanceScore,
    recencyScore: computeRecencyScore(paper.publicationYear),
    evidenceContribution: 0, // computed after full corpus assembly
    url: paper.url,
    isPrimary: paper.databaseSource !== 'Web (Tavily)',
    keyExcerpt: excerpt,
    queryBranch: paper.queryBranch,
    isSimulatedDemo: false,
  };
}

/**
 * Queries backend capability endpoint without exposing any secrets to the client.
 */
export async function checkBackendCapabilities(): Promise<BackendCapabilities> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as BackendCapabilities;
  } catch {
    return {
      ok: false,
      academicDatabases: ['OpenAlex', 'Crossref', 'Semantic Scholar'],
      liveSearchConfigured: false,
      geminiConfigured: false,
      mode: 'live',
    };
  }
}

/**
 * Queries real academic databases via backend (/api/academic/search):
 * OpenAlex, Crossref, and Semantic Scholar, with server-side deduplication and DOI verification.
 */
export async function searchAcademicDatabases(
  queries: Array<{ branch: string; query: string }>,
  maxPerQuery = 4
): Promise<AcademicSearchResponse> {
  try {
    const res = await fetch('/api/academic/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries, maxPerQuery }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        papers: [],
        databaseStatuses: Array.isArray(data?.databaseStatuses) ? data.databaseStatuses : [],
        duplicatesRemoved: 0,
        rejectedCount: 0,
        rejectionNotes: [],
        error: data?.error || `Academic search API returned HTTP ${res.status}`,
      };
    }

    const rawPapers: RealAcademicPaperDTO[] = Array.isArray(data?.papers) ? data.papers : [];
    const mapped = rawPapers.map((p, idx) => mapAcademicPaperToSource(p, idx));

    return {
      papers: mapped,
      databaseStatuses: Array.isArray(data?.databaseStatuses) ? data.databaseStatuses : [],
      duplicatesRemoved: Number(data?.duplicatesRemoved || 0),
      rejectedCount: Number(data?.rejectedCount || 0),
      rejectionNotes: Array.isArray(data?.rejectionNotes) ? data.rejectionNotes : [],
    };
  } catch (err) {
    return {
      papers: [],
      databaseStatuses: [],
      duplicatesRemoved: 0,
      rejectedCount: 0,
      rejectionNotes: [],
      error: err instanceof Error ? err.message : 'Network error contacting /api/academic/search',
    };
  }
}

/**
 * Optional Live Web Search Provider calling backend proxy (/api/search).
 * Server uses TAVILY_API_KEY if present; otherwise transparently returns configured: false with empty results.
 */
export const backendSearchProvider = {
  name: 'Backend Tavily Proxy (/api/search)',
  async search(query: string, branchName: string, maxResults = 3): Promise<SearchProviderResponse> {
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, maxResults }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          mode: 'live',
          configured: Boolean(data?.configured),
          results: [],
          error: data?.error || `Search request failed (HTTP ${res.status})`,
        };
      }

      if (!data?.configured) {
        return {
          mode: 'live',
          configured: false,
          results: [],
        };
      }

      const rawResults: RealAcademicPaperDTO[] = Array.isArray(data?.results) ? data.results : [];
      const mapped = rawResults.map((r, i) =>
        mapAcademicPaperToSource({ ...r, queryBranch: branchName }, i)
      );

      return {
        mode: 'live',
        configured: true,
        results: mapped,
      };
    } catch (err) {
      return {
        mode: 'live',
        configured: false,
        results: [],
        error: err instanceof Error ? err.message : 'Network error contacting /api/search',
      };
    }
  },
};
