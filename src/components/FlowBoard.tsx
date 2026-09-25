'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addEdge, applyEdgeChanges, applyNodeChanges, Background, BackgroundVariant, Connection, ConnectionMode, Controls, Edge, EdgeChange, MiniMap, Node, NodeChange, Panel, ReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Activity, Bell, Boxes, CheckCircle2, Cloud, Database, Gauge, HardDrive, Layers, Monitor,
  MousePointer2, Network, Plus, Search, Server, Share2, ShieldCheck, Sparkles, TextCursorInput,
  TriangleAlert, X, Zap,
} from 'lucide-react';
import SystemNode, { cn } from './SystemNode';
import { evaluateGraph } from '../lib/evaluator';
import type { AnnotationData, DiagramNodeData, EvaluationResult, NodeData, NodeType } from '../lib/types';

const edgeStyle = { stroke: '#8e95a8', strokeWidth: 2 };

const initialNodes: Node<NodeData>[] = [
  { id: 'client-1', type: 'systemNode', position: { x: 110, y: 250 }, data: { type: 'Client', label: 'Mobile app', throughput: 10_000, provider: 'Client', icon: 'Client' } },
  { id: 'limiter-1', type: 'systemNode', position: { x: 360, y: 250 }, data: { type: 'RateLimiter', label: 'Rate limiter', throughput: 8_000, provider: 'Core', icon: 'RateLimiter' } },
  { id: 'server-1', type: 'systemNode', position: { x: 610, y: 250 }, data: { type: 'Server', label: 'API service', throughput: 5_000, latency: 15, provider: 'Compute', icon: 'Server' } },
  { id: 'db-1', type: 'systemNode', position: { x: 860, y: 250 }, data: { type: 'Database', label: 'Primary database', throughput: 8_000, latency: 12, provider: 'Data', icon: 'Database' } },
];

const initialEdges: Edge[] = [
  { id: 'client-limiter', source: 'client-1', target: 'limiter-1', style: edgeStyle },
  { id: 'limiter-server', source: 'limiter-1', target: 'server-1', style: edgeStyle },
  { id: 'server-db', source: 'server-1', target: 'db-1', style: edgeStyle },
];

type IconName = 'Client' | 'Server' | 'Database' | 'Cache' | 'LoadBalancer' | 'Queue' | 'RateLimiter' | 'Cloud' | 'Network' | 'Activity' | 'Boxes' | 'Zap';
type LibraryItem = { name: string; type: NodeType; provider: string; icon: IconName; description: string };

const libraryItems: LibraryItem[] = [
  { name: 'Client app', type: 'Client', provider: 'Core', icon: 'Client', description: 'Emits demand' },
  { name: 'Service', type: 'Server', provider: 'Core', icon: 'Server', description: 'Handles requests' },
  { name: 'Database', type: 'Database', provider: 'Core', icon: 'Database', description: 'Stores data' },
  { name: 'Cache', type: 'Cache', provider: 'Core', icon: 'Cache', description: 'Reduces misses' },
  { name: 'Load balancer', type: 'LoadBalancer', provider: 'Core', icon: 'LoadBalancer', description: 'Evenly splits demand' },
  { name: 'Queue', type: 'Queue', provider: 'Core', icon: 'Queue', description: 'Buffers work' },
  { name: 'Rate limiter', type: 'RateLimiter', provider: 'Core', icon: 'RateLimiter', description: 'Limits request throughput' },
  { name: 'Amazon EC2', type: 'Server', provider: 'AWS', icon: 'Server', description: 'Compute service' },
  { name: 'Amazon ECS', type: 'Server', provider: 'AWS', icon: 'Boxes', description: 'Container service' },
  { name: 'AWS Lambda', type: 'Server', provider: 'AWS', icon: 'Zap', description: 'Function service' },
  { name: 'Amazon RDS', type: 'Database', provider: 'AWS', icon: 'Database', description: 'Relational database' },
  { name: 'Amazon DynamoDB', type: 'Database', provider: 'AWS', icon: 'Database', description: 'NoSQL database' },
  { name: 'Amazon ElastiCache', type: 'Cache', provider: 'AWS', icon: 'Cache', description: 'Managed cache' },
  { name: 'Amazon SQS', type: 'Queue', provider: 'AWS', icon: 'Queue', description: 'Message queue' },
  { name: 'Amazon SNS', type: 'Queue', provider: 'AWS', icon: 'Activity', description: 'Notification topic' },
  { name: 'Application Load Balancer', type: 'LoadBalancer', provider: 'AWS', icon: 'LoadBalancer', description: 'Traffic distribution' },
  { name: 'Amazon CloudFront', type: 'Cache', provider: 'AWS', icon: 'Cloud', description: 'Content delivery' },
  { name: 'Compute Engine', type: 'Server', provider: 'GCP', icon: 'Server', description: 'Virtual machine' },
  { name: 'Cloud Run', type: 'Server', provider: 'GCP', icon: 'Boxes', description: 'Container service' },
  { name: 'Cloud Functions', type: 'Server', provider: 'GCP', icon: 'Zap', description: 'Function service' },
  { name: 'Cloud SQL', type: 'Database', provider: 'GCP', icon: 'Database', description: 'Relational database' },
  { name: 'Cloud Spanner', type: 'Database', provider: 'GCP', icon: 'Database', description: 'Distributed database' },
  { name: 'Memorystore', type: 'Cache', provider: 'GCP', icon: 'Cache', description: 'Managed cache' },
  { name: 'Pub/Sub', type: 'Queue', provider: 'GCP', icon: 'Queue', description: 'Event messaging' },
  { name: 'Cloud Load Balancing', type: 'LoadBalancer', provider: 'GCP', icon: 'LoadBalancer', description: 'Traffic distribution' },
  { name: 'Azure Virtual Machines', type: 'Server', provider: 'Azure', icon: 'Server', description: 'Compute service' },
  { name: 'Azure Functions', type: 'Server', provider: 'Azure', icon: 'Zap', description: 'Function service' },
  { name: 'Azure Kubernetes Service', type: 'Server', provider: 'Azure', icon: 'Boxes', description: 'Container platform' },
  { name: 'Azure SQL Database', type: 'Database', provider: 'Azure', icon: 'Database', description: 'Relational database' },
  { name: 'Cosmos DB', type: 'Database', provider: 'Azure', icon: 'Database', description: 'NoSQL database' },
  { name: 'Azure Cache for Redis', type: 'Cache', provider: 'Azure', icon: 'Cache', description: 'Managed cache' },
  { name: 'Service Bus', type: 'Queue', provider: 'Azure', icon: 'Queue', description: 'Message broker' },
  { name: 'Azure Load Balancer', type: 'LoadBalancer', provider: 'Azure', icon: 'LoadBalancer', description: 'Traffic distribution' },
  { name: 'Kubernetes service', type: 'Server', provider: 'Platform', icon: 'Network', description: 'Cluster workload' },
  { name: 'Kafka topic', type: 'Queue', provider: 'Platform', icon: 'Activity', description: 'Event stream' },
  { name: 'Redis', type: 'Cache', provider: 'Platform', icon: 'Cache', description: 'In-memory data store' },
  { name: 'PostgreSQL', type: 'Database', provider: 'Platform', icon: 'Database', description: 'Relational database' },
];

const libraryIcon = { Client: Monitor, Server, Database, Cache: HardDrive, LoadBalancer: Share2, Queue: Layers, RateLimiter: Gauge, Cloud, Network, Activity, Boxes, Zap };

function ToolButton({ active, children, onClick, shortcut, title }: { active?: boolean; children: React.ReactNode; onClick: () => void; shortcut?: string; title: string }) {
  return <button type="button" onClick={onClick} title={`${title}${shortcut ? ` (${shortcut})` : ''}`} className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-[#b8bfd1] transition hover:bg-white/[.08] hover:text-white', active && 'bg-[#6d7cff]/20 text-[#aab4ff]')}>
    {children}<span className="sr-only">{title}</span>
  </button>;
}

function numberValue(value: string) { return Math.max(0, Number(value) || 0); }

export default function FlowBoard() {
  const [nodes, setNodes] = useState<Node<DiagramNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isInsertOpen, setIsInsertOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTool, setActiveTool] = useState<'select' | 'arrow' | 'text'>('select');
  const [hasRun, setHasRun] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const simNodes = useMemo(() => nodes.filter((node) => node.type === 'systemNode') as Node<NodeData>[], [nodes]);
  const evaluation = useMemo(() => evaluateGraph(simNodes.map(({ id, data }) => ({ id, data })), edges.filter((edge) => simNodes.some((node) => node.id === edge.source) && simNodes.some((node) => node.id === edge.target)).map(({ id, source, target }) => ({ id, source, target }))), [edges, simNodes]);
  const selectedNode = nodes.find((node) => node.id === selectedId && node.type === 'systemNode') as Node<NodeData> | undefined;
  const findings = useMemo(() => Object.entries(evaluation).map(([id, result]) => ({ id, label: simNodes.find((node) => node.id === id)?.data.label ?? 'Unknown', result })), [evaluation, simNodes]);
  const failingCount = findings.filter(({ result }) => result.status === 'FAIL').length;

  const invalidate = useCallback(() => setHasRun(false), []);
  const updateNode = useCallback((id: string, patch: Partial<NodeData>) => {
    setNodes((current) => current.map((node) => node.id === id ? { ...node, data: { ...node.data, ...patch } } : node));
    invalidate();
  }, [invalidate]);
  const configureNode = useCallback((id: string) => setSelectedId(id), []);
  const onNodesChange = useCallback((changes: NodeChange[]) => { setNodes((current) => applyNodeChanges(changes, current) as Node<DiagramNodeData>[]); }, []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => { setEdges((current) => applyEdgeChanges(changes, current)); invalidate(); }, [invalidate]);
  const onConnect = useCallback((connection: Connection) => { setEdges((current) => addEdge({ ...connection, style: edgeStyle }, current)); setActiveTool('select'); invalidate(); }, [invalidate]);
  const runAnalysis = useCallback(() => { setHasRun(true); setAnalysisOpen(true); }, []);

  const addNodeFromLibrary = useCallback((item: LibraryItem) => {
    const id = `${item.type.toLowerCase()}-${Date.now()}`;
    const node: Node<NodeData> = { id, type: 'systemNode', position: { x: 220 + Math.random() * 540, y: 120 + Math.random() * 420 }, data: {
      type: item.type, label: item.name, provider: item.provider, icon: item.icon,
      throughput: item.type === 'Client' ? 1_000 : item.type === 'RateLimiter' ? 1_000 : 5_000,
      ...((item.type === 'Server' || item.type === 'Database') ? { latency: 10 } : {}),
      ...(item.type === 'Cache' ? { hitRate: 80 } : {}), ...(item.type === 'Queue' ? { n: 1_000 } : {}),
    } };
    setNodes((current) => [...current, node]); setSelectedId(id); setIsInsertOpen(false); setSearchQuery(''); invalidate();
  }, [invalidate]);
  const addTextLabel = useCallback(() => {
    const label = window.prompt('Text label', 'Architecture note'); setActiveTool('select');
    if (!label?.trim()) return;
    setNodes((current) => [...current, { id: `note-${Date.now()}`, type: 'annotation', position: { x: 250, y: 120 }, data: { label: label.trim() } satisfies AnnotationData }]);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key.toLowerCase() === 'v') setActiveTool('select');
      if (event.key.toLowerCase() === 'a') setActiveTool('arrow');
      if (event.key.toLowerCase() === 't') { setActiveTool('text'); addTextLabel(); }
      if (event.key.toLowerCase() === 'i' || event.key === '/') { event.preventDefault(); setIsInsertOpen(true); }
      if (event.key === 'Escape') { setIsInsertOpen(false); setSelectedId(null); setActiveTool('select'); }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') runAnalysis();
    };
    window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown);
  }, [addTextLabel, runAnalysis]);
  useEffect(() => { if (isInsertOpen) setTimeout(() => searchRef.current?.focus(), 50); }, [isInsertOpen]);

  const filteredLibrary = libraryItems.filter((item) => `${item.name} ${item.provider} ${item.type}`.toLowerCase().includes(searchQuery.toLowerCase()));
  const groupedLibrary = filteredLibrary.reduce<Record<string, LibraryItem[]>>((groups, item) => { (groups[item.provider] ??= []).push(item); return groups; }, {});
  const nodesWithData = nodes.map((node) => node.type === 'systemNode' ? { ...node, selected: node.id === selectedId, data: { ...node.data, evalResult: hasRun ? evaluation[node.id] : undefined, showStatus: hasRun, onConfigure: configureNode } } : node);
  const AnnotationNode = useCallback(({ data }: { data: AnnotationData }) => <div className="rounded-md bg-white/[.05] px-3 py-2 text-sm text-[#b9c0d2]">{data.label}</div>, []);
  const nodeTypes = useMemo(() => ({ systemNode: SystemNode, annotation: AnnotationNode }), [AnnotationNode]);

  return <div className="relative h-screen w-full overflow-hidden bg-[#15161a]">
    <ReactFlowProvider><ReactFlow
      nodes={nodesWithData} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
      onNodeClick={(_, node) => configureNode(node.id)} onPaneClick={() => setSelectedId(null)} fitView fitViewOptions={{ padding: 0.25 }}
      deleteKeyCode={['Backspace', 'Delete']} connectionMode={ConnectionMode.Loose} nodesConnectable={activeTool !== 'text'} elementsSelectable={activeTool !== 'text'} panOnDrag={activeTool === 'select'} selectionOnDrag={activeTool === 'select'} defaultEdgeOptions={{ style: edgeStyle }} colorMode="dark" className="flowsim-canvas"
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#353842" />
      <Controls showInteractive={false} className="!bottom-4 !left-4 !border-[#3a3e49] !bg-[#202126] !fill-[#bbc2d4] [&>button]:!border-[#3a3e49] [&>button]:!bg-[#202126]" />
      <MiniMap className="!bottom-4 !right-4 !border !border-[#3a3e49] !bg-[#202126]" maskColor="rgb(12,13,16,.6)" nodeColor="#5e6987" />

      <Panel position="top-left" className="!m-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6d7cff] text-white shadow-lg shadow-indigo-500/20"><Activity className="h-5 w-5" /></div><div><p className="text-sm font-bold tracking-tight text-white">FlowSim</p><p className="text-[10px] font-medium uppercase tracking-[.14em] text-[#858b9d]">Architecture validator</p></div></div></Panel>
      <Panel position="top-center" className="!m-4"><div className="flex items-center gap-2 rounded-xl border border-white/[.09] bg-[#202126]/95 p-1.5 shadow-xl backdrop-blur"><button type="button" onClick={runAnalysis} className="flex items-center gap-2 rounded-lg bg-[#7b8cff] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#91a0ff]"><ShieldCheck className="h-4 w-4" />Run analysis<span className="hidden text-indigo-100/75 sm:inline">⌘↵</span></button>{hasRun && <span className={cn('px-2 text-xs font-semibold', failingCount ? 'text-[#ff737d]' : 'text-[#55dba4]')}>{failingCount ? `${failingCount} issue${failingCount > 1 ? 's' : ''}` : 'All checked nodes pass'}</span>}</div></Panel>
      <Panel position="center-left" className="!m-4 !mt-0"><div className="flex flex-col gap-2 rounded-2xl border border-white/[.09] bg-[#202126]/95 p-1.5 shadow-xl backdrop-blur"><ToolButton title="Insert component" shortcut="/" onClick={() => setIsInsertOpen(true)}><Plus className="h-5 w-5" /></ToolButton><div className="h-px bg-white/[.08]" /><ToolButton title="Select" shortcut="V" active={activeTool === 'select'} onClick={() => setActiveTool('select')}><MousePointer2 className="h-4 w-4" /></ToolButton><ToolButton title="Connect" shortcut="A" active={activeTool === 'arrow'} onClick={() => setActiveTool('arrow')}><Network className="h-4 w-4" /></ToolButton><ToolButton title="Text note" shortcut="T" active={activeTool === 'text'} onClick={() => { setActiveTool('text'); addTextLabel(); }}><TextCursorInput className="h-4 w-4" /></ToolButton><ToolButton title="Search components" shortcut="I" onClick={() => setIsInsertOpen(true)}><Search className="h-4 w-4" /></ToolButton><div className="h-px bg-white/[.08]" /><ToolButton title="AI coming soon" onClick={() => {}}><Sparkles className="h-4 w-4 opacity-45" /></ToolButton></div></Panel>

      {selectedNode && <Panel position="top-right" className="!m-4"><aside className="max-h-[calc(100vh-2rem)] w-[310px] overflow-y-auto rounded-2xl border border-white/[.1] bg-[#202126]/95 shadow-2xl backdrop-blur"><div className="flex items-center justify-between border-b border-white/[.08] px-4 py-3"><div><p className="text-sm font-bold text-white">Configure component</p><p className="mt-0.5 text-xs text-[#8f96a8]">Changes are saved on the canvas</p></div><button type="button" onClick={() => setSelectedId(null)} className="rounded-md p-1 text-[#9299aa] hover:bg-white/[.08] hover:text-white"><X className="h-4 w-4" /></button></div><div className="space-y-4 p-4"><Field label="Name"><input value={selectedNode.data.label} onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })} className="inspector-input" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Type"><div className="inspector-static">{selectedNode.data.type}</div></Field><Field label="Provider"><div className="inspector-static">{selectedNode.data.provider ?? 'Core'}</div></Field></div><Field label="Throughput (req/s)"><input type="number" min="0" value={selectedNode.data.throughput ?? 0} onChange={(e) => updateNode(selectedNode.id, { throughput: numberValue(e.target.value) })} className="inspector-input" /></Field>{(selectedNode.data.type === 'Server' || selectedNode.data.type === 'Database') && <Field label="Latency (ms)"><input type="number" min="0" value={selectedNode.data.latency ?? 0} onChange={(e) => updateNode(selectedNode.id, { latency: numberValue(e.target.value) })} className="inspector-input" /></Field>}{selectedNode.data.type === 'Cache' && <Field label="Hit rate (%)"><input type="number" min="0" max="100" value={selectedNode.data.hitRate ?? 0} onChange={(e) => updateNode(selectedNode.id, { hitRate: Math.min(100, numberValue(e.target.value)) })} className="inspector-input" /></Field>}{selectedNode.data.type === 'Queue' && <Field label="Queue limit (N)"><input type="number" min="0" value={selectedNode.data.n ?? 0} onChange={(e) => updateNode(selectedNode.id, { n: numberValue(e.target.value) })} className="inspector-input" /><p className="mt-1 text-[11px] leading-snug text-[#858b9d]">Reference only; queue time is not simulated.</p></Field>}<label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/[.08] bg-black/10 px-3 py-2.5 text-sm text-[#d9deeb]"><span>Mark component down</span><input type="checkbox" checked={Boolean(selectedNode.data.down)} onChange={(e) => updateNode(selectedNode.id, { down: e.target.checked })} className="h-4 w-4 accent-[#ff5d6b]" /></label>{hasRun && <NodeResult result={evaluation[selectedNode.id]} />}</div></aside></Panel>}
      {analysisOpen && hasRun && <Panel position="bottom-left" className="!m-4 !ml-[76px]"><AnalysisPanel findings={findings} onClose={() => setAnalysisOpen(false)} onSelect={(id) => setSelectedId(id)} /></Panel>}
    </ReactFlow></ReactFlowProvider>
    {isInsertOpen && <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0c0d10]/70 p-4 backdrop-blur-sm" onClick={() => setIsInsertOpen(false)}><div className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/[.1] bg-[#202126] shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center gap-3 border-b border-white/[.08] p-4"><Search className="h-5 w-5 text-[#9299aa]" /><input ref={searchRef} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search AWS, GCP, Azure, databases, queues…" className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#73798a]" /><button type="button" onClick={() => setIsInsertOpen(false)} className="rounded-md p-1 text-[#9299aa] hover:bg-white/[.08]"><X className="h-5 w-5" /></button></div><div className="overflow-y-auto p-4">{Object.entries(groupedLibrary).map(([provider, items]) => <section key={provider} className="mb-6 last:mb-0"><h2 className="mb-2 text-[11px] font-bold uppercase tracking-[.15em] text-[#81889a]">{provider}</h2><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{items.map((item) => { const Icon = libraryIcon[item.icon] ?? Server; return <button key={`${item.provider}-${item.name}`} type="button" onClick={() => addNodeFromLibrary(item)} className="flex items-start gap-3 rounded-xl border border-white/[.08] bg-[#17181c] p-3 text-left transition hover:border-[#7585ff]/70 hover:bg-[#25262c]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[.06] text-[#b5c0ff]"><Icon className="h-4 w-4" /></span><span><span className="block text-xs font-semibold text-[#ecedf3]">{item.name}</span><span className="mt-0.5 block text-[11px] text-[#858b9d]">{item.description}</span></span></button>; })}</div></section>)}{filteredLibrary.length === 0 && <p className="py-10 text-center text-sm text-[#858b9d]">No components found for “{searchQuery}”.</p>}</div></div></div>}
  </div>;
}

function Field({ children, label }: { children: React.ReactNode; label: string }) { return <label className="block text-xs font-medium text-[#aeb5c7]"><span className="mb-1.5 block">{label}</span>{children}</label>; }
function NodeResult({ result }: { result?: EvaluationResult }) { if (!result) return null; const fail = result.status === 'FAIL'; return <div className={cn('rounded-xl border p-3 text-xs', fail ? 'border-red-400/25 bg-red-500/10 text-red-100' : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100')}><div className="flex items-center gap-2 font-bold">{fail ? <TriangleAlert className="h-4 w-4 text-[#ff6b75]" /> : <CheckCircle2 className="h-4 w-4 text-[#4ce0a2]" />}{result.status === 'OK' ? 'Passes analysis' : result.status}</div><p className="mt-1.5 leading-snug opacity-85">{result.reason ?? `Incoming demand: ${Math.round(result.demandIn).toLocaleString()} req/s.`}</p></div>; }
function AnalysisPanel({ findings, onClose, onSelect }: { findings: { id: string; label: string; result: EvaluationResult }[]; onClose: () => void; onSelect: (id: string) => void }) { const issues = findings.filter(({ result }) => result.status === 'FAIL'); const passes = findings.filter(({ result }) => result.status === 'OK'); return <div className="w-[330px] overflow-hidden rounded-2xl border border-white/[.1] bg-[#202126]/95 shadow-2xl backdrop-blur"><div className="flex items-center justify-between border-b border-white/[.08] px-4 py-3"><div><p className="text-sm font-bold text-white">Analysis results</p><p className="mt-0.5 text-xs text-[#8f96a8]">Static checks, not live traffic</p></div><button type="button" onClick={onClose} className="p-1 text-[#9299aa] hover:text-white"><X className="h-4 w-4" /></button></div><div className="max-h-64 overflow-y-auto p-2">{issues.length > 0 && <ResultGroup title={`${issues.length} issue${issues.length > 1 ? 's' : ''}`} tone="issue" items={issues} onSelect={onSelect} />}{passes.length > 0 && <ResultGroup title={`${passes.length} passing`} tone="pass" items={passes} onSelect={onSelect} />}{findings.filter(({ result }) => result.status === 'UNUSED' || result.status === 'DOWN').length > 0 && <ResultGroup title="Needs attention" tone="muted" items={findings.filter(({ result }) => result.status === 'UNUSED' || result.status === 'DOWN')} onSelect={onSelect} />}</div></div>; }
function ResultGroup({ items, onSelect, title, tone }: { items: { id: string; label: string; result: EvaluationResult }[]; onSelect: (id: string) => void; title: string; tone: 'issue' | 'pass' | 'muted' }) { const Icon = tone === 'issue' ? TriangleAlert : tone === 'pass' ? CheckCircle2 : Bell; const color = tone === 'issue' ? 'text-[#ff737d]' : tone === 'pass' ? 'text-[#55dba4]' : 'text-[#aab1c2]'; return <div className="mb-2 last:mb-0"><p className={cn('px-2 py-1 text-[10px] font-bold uppercase tracking-[.13em]', color)}><Icon className="mr-1 inline h-3 w-3" />{title}</p>{items.map(({ id, label, result }) => <button key={id} type="button" onClick={() => onSelect(id)} className="w-full rounded-lg px-2 py-2 text-left transition hover:bg-white/[.06]"><span className="block text-xs font-semibold text-[#e8eaf1]">{label}</span><span className="mt-0.5 block truncate text-[11px] text-[#939aab]">{result.reason ?? `Incoming demand ${Math.round(result.demandIn).toLocaleString()} req/s`}</span></button>)}</div>; }
