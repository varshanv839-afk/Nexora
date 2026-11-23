export type AcademicDatabaseName = 'OpenAlex' | 'Crossref' | 'Semantic Scholar' | 'Web (Tavily)';

export interface DatabaseStatus {
  database: AcademicDatabaseName;
  status: 'ok' | 'degraded' | 'failed';
  retrievedCount: number;
  error?: string;
  latencyMs: number;
}

export interface RealAcademicPaper {
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

const FETCH_TIMEOUT_MS = 9000;

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalizeTitle(a).split(' ').filter((w) => w.length > 2));
  const wordsB = new Set(normalizeTitle(b).split(' ').filter((w) => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  wordsA.forEach((w) => {
    if (wordsB.has(w)) intersection += 1;
  });
  return intersection / Math.max(wordsA.size, wordsB.size);
}

function cleanDoi(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '');
  return cleaned.includes('/') ? cleaned : undefined;
}

function stripXmlTags(text?: string): string | undefined {
  if (!text) return undefined;
  const cleaned = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > 15 ? cleaned : undefined;
}

function reconstructOpenAlexAbstract(inverted?: Record<string, number[]> | null): string | undefined {
  if (!inverted || typeof inverted !== 'object') return undefined;
  const positions: Array<[number, string]> = [];
  for (const [word, idxs] of Object.entries(inverted)) {
    if (Array.isArray(idxs)) {
      for (const pos of idxs) {
        positions.push([pos, word]);
      }
    }
  }
  if (positions.length === 0) return undefined;
  positions.sort((a, b) => a[0] - b[0]);
  const text = positions.map((p) => p[1]).join(' ').replace(/\s+/g, ' ').trim();
  return text.length > 15 ? text : undefined;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function queryOpenAlex(
  query: string,
  branch: string,
  limit = 5
): Promise<{ papers: RealAcademicPaper[]; status: DatabaseStatus }> {
  const start = Date.now();
  try {
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}&mailto=researchflow@example.org`;
    const res = await fetchWithTimeout(url, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      return {
        papers: [],
        status: {
          database: 'OpenAlex',
          status: 'failed',
          retrievedCount: 0,
          error: `HTTP ${res.status} ${res.statusText}`,
          latencyMs: Date.now() - start,
        },
      };
    }

    const data = (await res.json()) as {
      results?: Array<{
        id?: string;
        doi?: string;
        title?: string;
        publication_year?: number;
        publication_date?: string;
        cited_by_count?: number;
        abstract_inverted_index?: Record<string, number[]> | null;
        open_access?: { oa_url?: string | null };
        primary_location?: {
          landing_page_url?: string | null;
          pdf_url?: string | null;
          source?: { display_name?: string | null } | null;
        } | null;
        authorships?: Array<{ author?: { display_name?: string } }>;
      }>;
    };

    const papers: RealAcademicPaper[] = [];
    for (const item of data.results || []) {
      const title = item.title?.trim();
      const authors = (item.authorships || [])
        .map((a) => a.author?.display_name?.trim())
        .filter((n): n is string => Boolean(n));
      const doi = cleanDoi(item.doi);
      const pubUrl = doi
        ? `https://doi.org/${doi}`
        : item.primary_location?.landing_page_url || item.id || '';

      if (!title || authors.length === 0 || !pubUrl) continue;

      const abstract = reconstructOpenAlexAbstract(item.abstract_inverted_index);
      const oaPdf = item.primary_location?.pdf_url || item.open_access?.oa_url || undefined;

      papers.push({
        id: `oa-${doi || item.id || Math.random().toString(36).slice(2, 8)}`,
        title,
        authors,
        publicationYear: item.publication_year,
        publicationDate: item.publication_date || (item.publication_year ? `${item.publication_year}-01-01` : 'Unknown'),
        venue: item.primary_location?.source?.display_name?.trim() || 'Venue not listed',
        doi,
        abstract,
        url: pubUrl,
        openAccessPdfUrl: oaPdf,
        citationCount: typeof item.cited_by_count === 'number' ? item.cited_by_count : undefined,
        databaseSource: 'OpenAlex',
        databasesFoundIn: ['OpenAlex'],
        verificationStatus: 'Verified',
        verificationNotes: 'Retrieved from OpenAlex scholarly graph.',
        evidenceScope: abstract ? 'Abstract Only' : 'Metadata Only',
        queryBranch: branch,
        relevanceScore: 88,
      });
    }

    return {
      papers,
      status: {
        database: 'OpenAlex',
        status: 'ok',
        retrievedCount: papers.length,
        latencyMs: Date.now() - start,
      },
    };
  } catch (err) {
    return {
      papers: [],
      status: {
        database: 'OpenAlex',
        status: 'failed',
        retrievedCount: 0,
        error: err instanceof Error ? err.message : 'OpenAlex request failed',
        latencyMs: Date.now() - start,
      },
    };
  }
}

export async function queryCrossref(
  query: string,
  branch: string,
  limit = 5
): Promise<{ papers: RealAcademicPaper[]; status: DatabaseStatus }> {
  const start = Date.now();
  try {
    const url = `https://api.crossref.org/works?query=${encodeURIComponent(
      query
    )}&rows=${limit}&select=DOI,title,author,issued,container-title,abstract,URL,link,is-referenced-by-count`;

    const res = await fetchWithTimeout(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ResearchFlowAI/1.0 (mailto:researchflow@example.org)',
      },
    });

    if (!res.ok) {
      return {
        papers: [],
        status: {
          database: 'Crossref',
          status: 'failed',
          retrievedCount: 0,
          error: `HTTP ${res.status} ${res.statusText}`,
          latencyMs: Date.now() - start,
        },
      };
    }

    const data = (await res.json()) as {
      message?: {
        items?: Array<{
          DOI?: string;
          title?: string[];
          author?: Array<{ given?: string; family?: string; name?: string }>;
          issued?: { 'date-parts'?: number[][] };
          'container-title'?: string[];
          abstract?: string;
          URL?: string;
          link?: Array<{ URL?: string; 'content-type'?: string }>;
          'is-referenced-by-count'?: number;
        }>;
      };
    };

    const papers: RealAcademicPaper[] = [];
    for (const item of data.message?.items || []) {
      const title = item.title?.[0]?.trim();
      const authors = (item.author || [])
        .map((a) => (a.name ? a.name.trim() : [a.given, a.family].filter(Boolean).join(' ').trim()))
        .filter((n) => n.length > 0);
      const doi = cleanDoi(item.DOI);
      const pubUrl = doi ? `https://doi.org/${doi}` : item.URL || '';

      if (!title || authors.length === 0 || !pubUrl || !doi) continue;

      const dateParts = item.issued?.['date-parts']?.[0];
      const year = dateParts?.[0];
      const month = dateParts?.[1] ? String(dateParts[1]).padStart(2, '0') : '01';
      const day = dateParts?.[2] ? String(dateParts[2]).padStart(2, '0') : '01';
      const pubDate = year ? `${year}-${month}-${day}` : 'Unknown';
      const abstract = stripXmlTags(item.abstract);
      const pdfLink = item.link?.find((l) => l['content-type']?.includes('pdf'))?.URL;

      papers.push({
        id: `cr-${doi}`,
        title,
        authors,
        publicationYear: year,
        publicationDate: pubDate,
        venue: item['container-title']?.[0]?.trim() || 'Venue not listed',
        doi,
        abstract,
        url: pubUrl,
        openAccessPdfUrl: pdfLink,
        citationCount: typeof item['is-referenced-by-count'] === 'number' ? item['is-referenced-by-count'] : undefined,
        databaseSource: 'Crossref',
        databasesFoundIn: ['Crossref'],
        verificationStatus: 'Verified',
        verificationNotes: 'DOI & metadata verified in Crossref registry.',
        evidenceScope: abstract ? 'Abstract Only' : 'Metadata Only',
        queryBranch: branch,
        relevanceScore: 86,
      });
    }

    return {
      papers,
      status: {
        database: 'Crossref',
        status: 'ok',
        retrievedCount: papers.length,
        latencyMs: Date.now() - start,
      },
    };
  } catch (err) {
    return {
      papers: [],
      status: {
        database: 'Crossref',
        status: 'failed',
        retrievedCount: 0,
        error: err instanceof Error ? err.message : 'Crossref request failed',
        latencyMs: Date.now() - start,
      },
    };
  }
}

export async function querySemanticScholar(
  query: string,
  branch: string,
  limit = 5
): Promise<{ papers: RealAcademicPaper[]; status: DatabaseStatus }> {
  const start = Date.now();
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(
    query
  )}&limit=${limit}&fields=title,authors,year,venue,publicationVenue,abstract,externalIds,openAccessPdf,citationCount,url`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (process.env.SEMANTIC_SCHOLAR_API_KEY?.trim()) {
    headers['x-api-key'] = process.env.SEMANTIC_SCHOLAR_API_KEY.trim();
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchWithTimeout(url, { headers });
      if (res.status === 429 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 950));
        continue;
      }

      if (!res.ok) {
        return {
          papers: [],
          status: {
            database: 'Semantic Scholar',
            status: 'failed',
            retrievedCount: 0,
            error: res.status === 429 ? 'HTTP 429 rate limit exceeded (retried once)' : `HTTP ${res.status} ${res.statusText}`,
            latencyMs: Date.now() - start,
          },
        };
      }

      const data = (await res.json()) as {
        data?: Array<{
          paperId?: string;
          title?: string;
          authors?: Array<{ name?: string }>;
          year?: number;
          venue?: string;
          publicationVenue?: { name?: string };
          abstract?: string;
          externalIds?: { DOI?: string };
          openAccessPdf?: { url?: string };
          citationCount?: number;
          url?: string;
        }>;
      };

      const papers: RealAcademicPaper[] = [];
      for (const item of data.data || []) {
        const title = item.title?.trim();
        const authors = (item.authors || [])
          .map((a) => a.name?.trim())
          .filter((n): n is string => Boolean(n));
        const doi = cleanDoi(item.externalIds?.DOI);
        const pubUrl = doi ? `https://doi.org/${doi}` : item.url || '';

        if (!title || authors.length === 0 || !pubUrl) continue;

        const abstract = item.abstract?.trim() || undefined;
        papers.push({
          id: `s2-${item.paperId || doi || Math.random().toString(36).slice(2, 8)}`,
          title,
          authors,
          publicationYear: item.year,
          publicationDate: item.year ? `${item.year}-01-01` : 'Unknown',
          venue: item.publicationVenue?.name?.trim() || item.venue?.trim() || 'Venue not listed',
          doi,
          abstract,
          url: pubUrl,
          openAccessPdfUrl: item.openAccessPdf?.url,
          citationCount: typeof item.citationCount === 'number' ? item.citationCount : undefined,
          databaseSource: 'Semantic Scholar',
          databasesFoundIn: ['Semantic Scholar'],
          verificationStatus: 'Verified',
          verificationNotes: 'Retrieved from Semantic Scholar Graph API.',
          evidenceScope: abstract ? 'Abstract Only' : 'Metadata Only',
          queryBranch: branch,
          relevanceScore: 87,
        });
      }

      return {
        papers,
        status: {
          database: 'Semantic Scholar',
          status: 'ok',
          retrievedCount: papers.length,
          latencyMs: Date.now() - start,
        },
      };
    } catch (err) {
      if (attempt === 1) {
        return {
          papers: [],
          status: {
            database: 'Semantic Scholar',
            status: 'failed',
            retrievedCount: 0,
            error: err instanceof Error ? err.message : 'Semantic Scholar request failed',
            latencyMs: Date.now() - start,
          },
        };
      }
    }
  }

  return {
    papers: [],
    status: {
      database: 'Semantic Scholar',
      status: 'failed',
      retrievedCount: 0,
      error: 'Semantic Scholar unavailable',
      latencyMs: Date.now() - start,
    },
  };
}

/**
 * Cross-checks a paper's DOI against Crossref or OpenAlex when only seen in one database.
 */
async function verifyDoiAgainstRegistry(paper: RealAcademicPaper): Promise<{ valid: boolean; note: string }> {
  if (!paper.doi) {
    // Papers without DOIs must still come from a live scholarly DB with authors + URL
    return {
      valid: Boolean(paper.title && paper.authors.length > 0 && paper.url),
      note: `Verified in ${paper.databaseSource} (no DOI assigned in record).`,
    };
  }

  try {
    const res = await fetchWithTimeout(
      `https://api.crossref.org/works/${encodeURIComponent(paper.doi)}`,
      { headers: { 'User-Agent': 'ResearchFlowAI/1.0 (mailto:researchflow@example.org)' } },
      5500
    );
    if (!res.ok) {
      return {
        valid: paper.databaseSource === 'OpenAlex' || paper.databaseSource === 'Semantic Scholar',
        note: `DOI lookup returned HTTP ${res.status}; retained via ${paper.databaseSource} record.`,
      };
    }
    const data = (await res.json()) as {
      message?: {
        title?: string[];
        author?: Array<{ given?: string; family?: string; name?: string }>;
      };
    };
    const crTitle = data.message?.title?.[0] || '';
    const sim = titleSimilarity(paper.title, crTitle);
    if (crTitle && sim < 0.45) {
      return {
        valid: false,
        note: `Excluded: DOI ${paper.doi} resolved to a different title ("${crTitle.slice(0, 60)}").`,
      };
    }
    return {
      valid: true,
      note: `DOI ${paper.doi} cross-verified against Crossref registry (${Math.round(sim * 100)}% title match).`,
    };
  } catch {
    return {
      valid: true,
      note: `Retrieved from ${paper.databaseSource} (Crossref DOI check timed out).`,
    };
  }
}

export async function deduplicateAndVerifyPapers(
  candidates: RealAcademicPaper[]
): Promise<{
  verified: RealAcademicPaper[];
  duplicatesRemoved: number;
  rejectedCount: number;
  rejectionNotes: string[];
}> {
  const mergedMap = new Map<string, RealAcademicPaper>();
  let duplicatesRemoved = 0;

  for (const cand of candidates) {
    const doiKey = cand.doi ? `doi:${cand.doi.toLowerCase()}` : null;
    const titleKey = `title:${normalizeTitle(cand.title)}`;

    let existingKey: string | undefined;
    if (doiKey && mergedMap.has(doiKey)) {
      existingKey = doiKey;
    } else if (mergedMap.has(titleKey)) {
      existingKey = titleKey;
    } else {
      // Check fuzzy title match against existing keys
      for (const [k, existing] of mergedMap.entries()) {
        if (titleSimilarity(existing.title, cand.title) >= 0.85) {
          existingKey = k;
          break;
        }
      }
    }

    if (existingKey) {
      duplicatesRemoved += 1;
      const existing = mergedMap.get(existingKey)!;
      const dbs = Array.from(new Set([...existing.databasesFoundIn, ...cand.databasesFoundIn]));
      mergedMap.set(existingKey, {
        ...existing,
        doi: existing.doi || cand.doi,
        abstract:
          (existing.abstract?.length || 0) >= (cand.abstract?.length || 0)
            ? existing.abstract
            : cand.abstract,
        openAccessPdfUrl: existing.openAccessPdfUrl || cand.openAccessPdfUrl,
        citationCount:
          existing.citationCount !== undefined && cand.citationCount !== undefined
            ? Math.max(existing.citationCount, cand.citationCount)
            : existing.citationCount ?? cand.citationCount,
        venue:
          existing.venue.includes('Indexed') && !cand.venue.includes('Indexed')
            ? cand.venue
            : existing.venue,
        databasesFoundIn: dbs,
        verificationStatus: dbs.length > 1 ? 'Cross-Checked' : existing.verificationStatus,
        verificationNotes:
          dbs.length > 1
            ? `Cross-checked across ${dbs.join(' & ')}.`
            : existing.verificationNotes,
        evidenceScope:
          existing.abstract || cand.abstract ? 'Abstract Only' : 'Metadata Only',
      });
    } else {
      mergedMap.set(doiKey || titleKey, cand);
    }
  }

  const deduped = Array.from(mergedMap.values());
  // Sort preferring papers with abstracts + cross-checked + citations
  deduped.sort((a, b) => {
    const scoreA = (a.abstract ? 30 : 0) + (a.verificationStatus === 'Cross-Checked' ? 20 : 0) + Math.min(30, a.citationCount || 0);
    const scoreB = (b.abstract ? 30 : 0) + (b.verificationStatus === 'Cross-Checked' ? 20 : 0) + Math.min(30, b.citationCount || 0);
    return scoreB - scoreA;
  });

  // Cross-verify top 18 candidates that aren't already Cross-Checked via multiple DBs
  const toVerify = deduped.slice(0, 18);
  const verified: RealAcademicPaper[] = [];
  const rejectionNotes: string[] = [];
  let rejectedCount = 0;

  const checks = await Promise.all(
    toVerify.map(async (paper) => {
      if (paper.verificationStatus === 'Cross-Checked') {
        return { paper, valid: true, note: paper.verificationNotes };
      }
      if (paper.databaseSource === 'Crossref' && paper.doi) {
        return {
          paper,
          valid: true,
          note: `DOI ${paper.doi} verified directly in Crossref registry.`,
        };
      }
      const res = await verifyDoiAgainstRegistry(paper);
      return { paper, valid: res.valid, note: res.note };
    })
  );

  for (const item of checks) {
    if (item.valid) {
      verified.push({
        ...item.paper,
        verificationNotes: item.note,
      });
    } else {
      rejectedCount += 1;
      rejectionNotes.push(item.note);
    }
  }

  return {
    verified,
    duplicatesRemoved,
    rejectedCount,
    rejectionNotes,
  };
}
