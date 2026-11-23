import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Plus, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { DemoDisclosure, EmptyNotice, SectionHeader } from '../components/shared/StatusHelpers';
import { useResearch } from '../context/ResearchContext';
import { KnowledgeEdge, KnowledgeNode, KnowledgeNodeType } from '../types/research';

const NODE_STYLES: Record<
  KnowledgeNodeType,
  { border: string; bg: string; labelColor: string; typeName: string }
> = {
  topic: {
    border: 'border-violet-400',
    bg: 'bg-violet-600/20',
    labelColor: 'text-violet-200',
    typeName: 'Root Topic',
  },
  subtopic: {
    border: 'border-blue-400/70',
    bg: 'bg-blue-500/15',
    labelColor: 'text-blue-200',
    typeName: 'Subtopic',
  },
  claim: {
    border: 'border-emerald-400/70',
    bg: 'bg-emerald-500/15',
    labelColor: 'text-emerald-200',
    typeName: 'Verified Claim',
  },
  source: {
    border: 'border-cyan-400/70',
    bg: 'bg-cyan-500/15',
    labelColor: 'text-cyan-200',
    typeName: 'Verified Paper',
  },
  contradiction: {
    border: 'border-rose-400/80',
    bg: 'bg-rose-500/15',
    labelColor: 'text-rose-200',
    typeName: 'Contradiction',
  },
  gap: {
    border: 'border-amber-400/80',
    bg: 'bg-amber-500/15',
    labelColor: 'text-amber-200',
    typeName: 'Research Gap',
  },
};

export const KnowledgeMapPage: React.FC = () => {
  const { activeProject, setActivePage } = useResearch();

  const [nodes, setNodes] = useState<KnowledgeNode[]>(activeProject?.knowledgeNodes || []);
  const [edges, setEdges] = useState<KnowledgeEdge[]>(activeProject?.knowledgeEdges || []);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    activeProject?.knowledgeNodes[0]?.id || ''
  );
  const [zoom, setZoom] = useState<number>(1);
  const [filterType, setFilterType] = useState<'all' | KnowledgeNodeType>('all');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [expandedExtra, setExpandedExtra] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNodes(activeProject?.knowledgeNodes || []);
    setEdges(activeProject?.knowledgeEdges || []);
    setSelectedNodeId(activeProject?.knowledgeNodes[0]?.id || '');
    setExpandedExtra(false);
  }, [activeProject?.id, activeProject?.knowledgeNodes, activeProject?.knowledgeEdges]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const set = new Set<string>([selectedNodeId]);
    edges.forEach((e) => {
      if (e.source === selectedNodeId) set.add(e.target);
      if (e.target === selectedNodeId) set.add(e.source);
    });
    return set;
  }, [edges, selectedNodeId]);

  const unmappedSources = useMemo(() => {
    if (!activeProject) return [];
    const mappedRefIds = new Set(nodes.map((n) => n.refId).filter(Boolean));
    const mappedLabels = new Set(nodes.map((n) => n.label.slice(0, 18)));
    return activeProject.sources.filter(
      (s) => !mappedRefIds.has(s.id) && !mappedLabels.has(s.title.slice(0, 18))
    );
  }, [activeProject, nodes]);

  if (!activeProject) {
    return (
      <EmptyNotice
        title="No active knowledge map"
        description="Launch a research topic to build a visual graph of retrieved papers, verified claims, contradictions, and research gaps."
        actionLabel="Start New Research"
        onAction={() => setActivePage('new-research')}
      />
    );
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(60, Math.min(940, (e.clientX - rect.left) / zoom));
    const y = Math.max(40, Math.min(540, (e.clientY - rect.top) / zoom));
    setNodes((prev) => prev.map((n) => (n.id === draggingId ? { ...n, x, y } : n)));
  };

  const handleExpandRelated = () => {
    if (expandedExtra || unmappedSources.length === 0) return;
    setExpandedExtra(true);
    const rootNodeId = nodes.find((n) => n.type === 'topic')?.id || nodes[0]?.id;
    const extras = unmappedSources.slice(0, 4);
    const extraNodes: KnowledgeNode[] = extras.map((src, idx) => ({
      id: `kn-extra-${src.id}`,
      refId: src.id,
      label: src.title.length > 34 ? `${src.title.slice(0, 34)}...` : src.title,
      type: 'source',
      x: 190 + idx * 200,
      y: 470,
      summary: `${src.authors.slice(0, 2).join(', ') || src.publisher} (${src.publicationYear ?? 'n.d.'}) · ${src.venue}. ${src.keyExcerpt}`,
      meta: `${src.databaseSource}${src.doi ? ` · DOI ${src.doi}` : ''}`,
    }));
    const extraEdges: KnowledgeEdge[] = rootNodeId
      ? extras.map((src, idx) => ({
          id: `ke-ex-${src.id}-${idx}`,
          source: rootNodeId,
          target: `kn-extra-${src.id}`,
          relation: 'retrieved paper',
        }))
      : [];
    setNodes((prev) => [...prev, ...extraNodes]);
    setEdges((prev) => [...prev, ...extraEdges]);
  };

  const handleResetLayout = () => {
    setNodes(activeProject.knowledgeNodes);
    setEdges(activeProject.knowledgeEdges);
    setExpandedExtra(false);
    setZoom(1);
  };

  const visibleNodes = nodes.filter((n) => (filterType === 'all' ? true : n.type === filterType));
  const visibleNodeSet = new Set(visibleNodes.map((n) => n.id));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Interactive Knowledge Map"
        subtitle="Drag nodes, zoom the canvas, highlight connected evidence relationships, and inspect verified papers, claims, and gaps."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DemoDisclosure providerMode={activeProject.providerMode} />
            <button
              onClick={handleExpandRelated}
              disabled={expandedExtra || unmappedSources.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-xs font-medium text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              {unmappedSources.length === 0
                ? 'All Retrieved Papers Mapped'
                : expandedExtra
                ? 'Additional Papers Added'
                : `Add ${Math.min(4, unmappedSources.length)} More Papers`}
            </button>
          </div>
        }
      />

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#0D1323] border border-slate-800">
          {(['all', 'topic', 'subtopic', 'claim', 'source', 'contradiction', 'gap'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                filterType === t ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom((z) => Math.max(0.65, Number((z - 0.1).toFixed(2))))}
            aria-label="Zoom out"
            className="p-2 rounded-lg border border-slate-800 bg-[#0D1323] text-slate-300 hover:text-white"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="font-mono text-xs tabular-nums text-slate-300 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(2))))}
            aria-label="Zoom in"
            className="p-2 rounded-lg border border-slate-800 bg-[#0D1323] text-slate-300 hover:text-white"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleResetLayout}
            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-slate-800 bg-[#0D1323] text-xs text-slate-300 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Canvas + Detail Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-8 rounded-xl border border-slate-800/80 bg-[#070B14] overflow-auto relative h-[560px]">
          {nodes.length === 0 ? (
            <div className="h-full flex items-center justify-center px-6 text-center text-xs text-slate-400">
              No knowledge nodes generated yet. Once academic papers are retrieved and verified, the graph populates automatically.
            </div>
          ) : (
            <div
              ref={canvasRef}
              onPointerMove={handlePointerMove}
              onPointerUp={() => setDraggingId(null)}
              onPointerLeave={() => setDraggingId(null)}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: '1000px', height: '560px' }}
              className="relative select-none"
            >
              {/* Subtle Grid Background */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
                <defs>
                  <pattern id="rf-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                    <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(148,163,184,0.06)" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#rf-grid)" />

                {/* Edges */}
                {edges.map((edge) => {
                  if (!visibleNodeSet.has(edge.source) || !visibleNodeSet.has(edge.target)) return null;
                  const src = nodes.find((n) => n.id === edge.source);
                  const tgt = nodes.find((n) => n.id === edge.target);
                  if (!src || !tgt) return null;
                  const highlighted =
                    selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId);
                  return (
                    <g key={edge.id}>
                      <line
                        x1={src.x}
                        y1={src.y}
                        x2={tgt.x}
                        y2={tgt.y}
                        stroke={highlighted ? '#38bdf8' : 'rgba(148,163,184,0.22)'}
                        strokeWidth={highlighted ? 2 : 1.25}
                      />
                      {highlighted && (
                        <text
                          x={(src.x + tgt.x) / 2}
                          y={(src.y + tgt.y) / 2 - 6}
                          fill="#7dd3fc"
                          fontSize="10"
                          textAnchor="middle"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {edge.relation}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Nodes */}
              {visibleNodes.map((node) => {
                const style = NODE_STYLES[node.type];
                const isSelected = selectedNodeId === node.id;
                const isConnected = connectedNodeIds.has(node.id);
                const dimmed = selectedNodeId && !isConnected;

                return (
                  <div
                    key={node.id}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setDraggingId(node.id);
                      setSelectedNodeId(node.id);
                    }}
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className={`absolute cursor-grab active:cursor-grabbing rounded-lg border px-3 py-2 min-w-[140px] max-w-[190px] backdrop-blur-sm transition-opacity ${
                      style.border
                    } ${style.bg} ${
                      isSelected ? 'ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(56,189,248,0.25)]' : ''
                    } ${dimmed ? 'opacity-40' : 'opacity-100'}`}
                  >
                    <div className={`text-[10px] font-mono ${style.labelColor}`}>{style.typeName}</div>
                    <div className="text-xs font-semibold text-slate-100 leading-snug mt-0.5">
                      {node.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Node Detail Inspector */}
        <aside className="xl:col-span-4 rounded-xl border border-slate-800/80 bg-[#0D1323] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-100">Node Detail Inspector</h2>
            <Maximize2 className="h-4 w-4 text-slate-500" />
          </div>

          {!selectedNode ? (
            <p className="text-xs text-slate-400">Click any node in the graph to inspect its connections.</p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1 pb-3 border-b border-slate-800/70">
                <div className={`text-xs font-mono ${NODE_STYLES[selectedNode.type].labelColor}`}>
                  {NODE_STYLES[selectedNode.type].typeName}
                  {selectedNode.meta ? ` · ${selectedNode.meta}` : ''}
                </div>
                <h3 className="text-lg font-semibold text-slate-50">{selectedNode.label}</h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{selectedNode.summary}</p>

              <div className="space-y-2 pt-2 border-t border-slate-800/70">
                <div className="text-xs font-medium text-slate-400">Connected Nodes</div>
                <div className="divide-y divide-slate-800/60">
                  {edges
                    .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map((e) => {
                      const otherId = e.source === selectedNode.id ? e.target : e.source;
                      const other = nodes.find((n) => n.id === otherId);
                      if (!other) return null;
                      return (
                        <button
                          key={e.id}
                          onClick={() => setSelectedNodeId(other.id)}
                          className="w-full py-2 flex items-center justify-between text-left text-xs hover:text-cyan-300"
                        >
                          <span className="text-slate-200">{other.label}</span>
                          <span className="font-mono text-[11px] text-slate-500">{e.relation}</span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {selectedNode.type === 'contradiction' && (
                <button
                  onClick={() => setActivePage('contradiction-radar')}
                  className="w-full py-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs font-medium text-rose-200 hover:bg-rose-500/25"
                >
                  Open in Contradiction Radar →
                </button>
              )}
              {selectedNode.type === 'gap' && (
                <button
                  onClick={() => setActivePage('research-gaps')}
                  className="w-full py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-xs font-medium text-amber-200 hover:bg-amber-500/25"
                >
                  Open in Research Gaps →
                </button>
              )}
              {selectedNode.type === 'claim' && (
                <button
                  onClick={() => setActivePage('evidence-ledger')}
                  className="w-full py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs font-medium text-emerald-200 hover:bg-emerald-500/25"
                >
                  Open in Evidence Ledger →
                </button>
              )}
              {selectedNode.type === 'source' && (
                <button
                  onClick={() => setActivePage('research-library')}
                  className="w-full py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-xs font-medium text-cyan-200 hover:bg-cyan-500/25"
                >
                  Open in Research Library →
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
