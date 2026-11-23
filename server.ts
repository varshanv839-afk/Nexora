import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  DatabaseStatus,
  deduplicateAndVerifyPapers,
  queryCrossref,
  queryOpenAlex,
  querySemanticScholar,
  RealAcademicPaper,
} from './server/academicEngine';

dotenv.config();

const PORT = 3000;

function isRealSecret(val?: string): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  return trimmed.length > 8 && !trimmed.startsWith('MY_');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const liveSearchConfigured = isRealSecret(process.env.TAVILY_API_KEY);
    const geminiConfigured = isRealSecret(process.env.GEMINI_API_KEY);
    res.json({
      ok: true,
      academicDatabases: ['OpenAlex', 'Crossref', 'Semantic Scholar'],
      liveSearchConfigured,
      geminiConfigured,
      mode: 'live',
    });
  });

  // Real multi-database scholarly retrieval & DOI cross-verification
  app.post('/api/academic/search', async (req, res) => {
    const rawQueries = Array.isArray(req.body?.queries) ? req.body.queries : [];
    const maxPerQuery = Math.min(6, Math.max(2, Number(req.body?.maxPerQuery) || 4));

    if (rawQueries.length === 0) {
      return res.status(400).json({
        error: 'At least one search query is required.',
        papers: [],
        databaseStatuses: [],
        duplicatesRemoved: 0,
        rejectedCount: 0,
      });
    }

    const queries = rawQueries.slice(0, 4).map((q: { branch?: string; query?: string }) => ({
      branch: typeof q?.branch === 'string' && q.branch.trim() ? q.branch.trim() : 'Primary Inquiry',
      query: typeof q?.query === 'string' ? q.query.trim() : '',
    })).filter((q: { query: string }) => q.query.length > 0);

    if (queries.length === 0) {
      return res.status(400).json({
        error: 'Valid query text is required.',
        papers: [],
        databaseStatuses: [],
        duplicatesRemoved: 0,
        rejectedCount: 0,
      });
    }

    try {
      const allCandidates: RealAcademicPaper[] = [];
      const statusAccumulator: Record<string, DatabaseStatus> = {
        OpenAlex: { database: 'OpenAlex', status: 'ok', retrievedCount: 0, latencyMs: 0 },
        Crossref: { database: 'Crossref', status: 'ok', retrievedCount: 0, latencyMs: 0 },
        'Semantic Scholar': { database: 'Semantic Scholar', status: 'ok', retrievedCount: 0, latencyMs: 0 },
      };
      const errorsByDb: Record<string, string[]> = {
        OpenAlex: [],
        Crossref: [],
        'Semantic Scholar': [],
      };

      // Query OpenAlex and Crossref across branches, plus Semantic Scholar on top 2 branches to respect public rate limits
      await Promise.all(
        queries.map(async (q: { branch: string; query: string }, idx: number) => {
          const tasks: Array<Promise<{ papers: RealAcademicPaper[]; status: DatabaseStatus }>> = [
            queryOpenAlex(q.query, q.branch, maxPerQuery),
            queryCrossref(q.query, q.branch, maxPerQuery),
          ];
          if (idx < 2) {
            tasks.push(querySemanticScholar(q.query, q.branch, maxPerQuery));
          }

          const results = await Promise.all(tasks);
          for (const r of results) {
            allCandidates.push(...r.papers);
            const acc = statusAccumulator[r.status.database];
            acc.retrievedCount += r.status.retrievedCount;
            acc.latencyMs = Math.max(acc.latencyMs, r.status.latencyMs);
            if (r.status.status === 'failed' && r.status.error) {
              errorsByDb[r.status.database].push(r.status.error);
            }
          }
        })
      );

      // Finalize database statuses
      const databaseStatuses: DatabaseStatus[] = Object.values(statusAccumulator).map((st) => {
        const errs = errorsByDb[st.database] || [];
        if (errs.length > 0 && st.retrievedCount === 0) {
          return { ...st, status: 'failed', error: errs[0] };
        }
        if (errs.length > 0 && st.retrievedCount > 0) {
          return { ...st, status: 'degraded', error: errs[0] };
        }
        return st;
      });

      const { verified, duplicatesRemoved, rejectedCount, rejectionNotes } =
        await deduplicateAndVerifyPapers(allCandidates);

      return res.json({
        papers: verified,
        databaseStatuses,
        duplicatesRemoved,
        rejectedCount,
        rejectionNotes,
      });
    } catch (err) {
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Academic search orchestration failed',
        papers: [],
        databaseStatuses: [],
        duplicatesRemoved: 0,
        rejectedCount: 0,
      });
    }
  });

  // Optional Tavily web search proxy (never exposes TAVILY_API_KEY)
  app.post('/api/search', async (req, res) => {
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    const maxResults = Math.min(6, Math.max(1, Number(req.body?.maxResults) || 4));

    if (!query) {
      return res.status(400).json({ error: 'Query is required', results: [], configured: false });
    }

    const tavilyKey = process.env.TAVILY_API_KEY;
    if (!isRealSecret(tavilyKey)) {
      return res.json({
        configured: false,
        message: 'Tavily web search key is not configured on server.',
        results: [],
      });
    }

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: tavilyKey,
          query,
          search_depth: 'advanced',
          max_results: maxResults,
          include_answer: false,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        return res.status(502).json({
          configured: true,
          error: `Tavily returned HTTP ${response.status}: ${text.slice(0, 120)}`,
          results: [],
        });
      }

      const data = (await response.json()) as {
        results?: Array<{
          title?: string;
          url?: string;
          content?: string;
          score?: number;
          published_date?: string;
        }>;
      };

      const normalized = (data.results || [])
        .filter((r) => r.title && r.url)
        .map((r, idx) => {
          let publisher = 'Web Source';
          try {
            if (r.url) publisher = new URL(r.url).hostname.replace(/^www\./, '');
          } catch {
            // ignore
          }
          return {
            id: `WEB-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${idx + 1}`,
            title: r.title!,
            authors: [publisher],
            publicationDate: r.published_date || 'Unknown',
            venue: publisher,
            abstract: r.content || undefined,
            url: r.url!,
            databaseSource: 'Web (Tavily)',
            databasesFoundIn: ['Web (Tavily)'],
            verificationStatus: 'Verified',
            verificationNotes: 'Retrieved live via Tavily web search API.',
            evidenceScope: 'Web Snippet',
            relevanceScore: Math.min(99, Math.round((r.score ?? 0.8) * 100)),
          };
        });

      return res.json({ configured: true, results: normalized });
    } catch (err) {
      return res.status(500).json({
        configured: true,
        error: err instanceof Error ? err.message : 'Unexpected web search failure',
        results: [],
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ResearchFlow AI server listening on http://localhost:${PORT}`);
  });
}

startServer();
