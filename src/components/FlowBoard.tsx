'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addEdge, applyEdgeChanges, applyNodeChanges, Background, BackgroundVariant, Connection, ConnectionMode, Controls, Edge, EdgeChange, Node, NodeChange, Panel, ReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Activity, Bell, Boxes, CheckCircle2, Cloud, Database, Gauge, HardDrive, Layers, Monitor,
  Network, Plus, Search, Server, Share2, ShieldCheck, TextCursorInput, TriangleAlert, X, Zap,
} from 'lucide-react';
import SystemNode, { cn } from './SystemNode';
import { evaluateGraph } from '../lib/evaluator';
import type { AnnotationData, DiagramNodeData, EvaluationResult, NodeData, NodeType } from '../lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';

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

function ToolButton({ children, onClick, shortcut, title }: { children: React.ReactNode; onClick: () => void; shortcut?: string; title: string }) {
  return <Button type="button" variant="ghost" size="icon-lg" onClick={onClick} title={`${title}${shortcut ? ` (${shortcut})` : ''}`} className="text-[#b8bfd1] hover:bg-white/[.08] hover:text-white">
    {children}<span className="sr-only">{title}</span>
  </Button>;
}

function numberValue(value: string) { return Math.max(0, Number(value) || 0); }

export default function FlowBoard() {
  const [nodes, setNodes] = useState<Node<DiagramNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isInsertOpen, setIsInsertOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
  const onConnect = useCallback((connection: Connection) => { setEdges((current) => addEdge({ ...connection, style: edgeStyle }, current)); invalidate(); }, [invalidate]);
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
    const label = window.prompt('Text label', 'Architecture note');
    if (!label?.trim()) return;
    setNodes((current) => [...current, { id: `note-${Date.now()}`, type: 'annotation', position: { x: 250, y: 120 }, data: { label: label.trim() } satisfies AnnotationData }]);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key.toLowerCase() === 't') addTextLabel();
      if (event.key.toLowerCase() === 'i' || event.key === '/') { event.preventDefault(); setIsInsertOpen(true); }
      if (event.key === 'Escape') { setIsInsertOpen(false); setSelectedId(null); }
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
      deleteKeyCode={['Backspace', 'Delete']} connectionMode={ConnectionMode.Loose} nodesConnectable elementsSelectable panOnDrag selectionOnDrag defaultEdgeOptions={{ style: edgeStyle }} colorMode="dark" className="flowsim-canvas"
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#353842" />
      <Controls showInteractive={false} className="!bottom-4 !left-4 !border-[#3a3e49] !bg-[#202126] !fill-[#bbc2d4] [&>button]:!border-[#3a3e49] [&>button]:!bg-[#202126]" />

      <Panel position="top-left" className="!m-5"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"><Activity className="h-4 w-4" /></div><div><p className="text-sm font-semibold tracking-tight text-foreground">FlowSim</p><p className="text-[10px] font-medium uppercase tracking-[.14em] text-muted-foreground">Architecture validator</p></div></div></Panel>
      <Panel position="top-center" className="!m-4"><Card size="sm" className="flex-row items-center gap-2 bg-card/95 py-1.5 shadow-lg backdrop-blur"><CardContent className="flex items-center gap-2 px-1.5"><Button onClick={runAnalysis} size="sm" className="bg-primary text-primary-foreground"><ShieldCheck data-icon="inline-start" />Run analysis</Button>{hasRun && <Badge variant={failingCount ? 'destructive' : 'secondary'}>{failingCount ? `${failingCount} issue${failingCount > 1 ? 's' : ''}` : 'All checked nodes pass'}</Badge>}</CardContent></Card></Panel>
      <Panel position="center-left" className="!m-5 !mt-0"><Card size="sm" className="gap-1 bg-card/95 p-1 shadow-lg backdrop-blur"><ToolButton title="Insert component" shortcut="/" onClick={() => setIsInsertOpen(true)}><Plus className="h-4 w-4" /></ToolButton><Separator /><ToolButton title="Text note" shortcut="T" onClick={addTextLabel}><TextCursorInput className="h-4 w-4" /></ToolButton><ToolButton title="Search components" shortcut="I" onClick={() => setIsInsertOpen(true)}><Search className="h-4 w-4" /></ToolButton></Card></Panel>

    </ReactFlow></ReactFlowProvider>
    <Sheet open={Boolean(selectedNode)} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
      <SheetContent side="right" className="w-full gap-0 border-border bg-popover p-0 sm:max-w-md">
        {selectedNode && <InspectorSheet node={selectedNode} result={hasRun ? evaluation[selectedNode.id] : undefined} onUpdate={updateNode} />}
      </SheetContent>
    </Sheet>
    <Sheet open={analysisOpen && hasRun} onOpenChange={setAnalysisOpen}>
      <SheetContent side="left" className="w-full gap-0 border-border bg-popover p-0 sm:max-w-md">
        <AnalysisSheet findings={findings} onSelect={(id) => { setSelectedId(id); setAnalysisOpen(false); }} />
      </SheetContent>
    </Sheet>
    {isInsertOpen && <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0c0d10]/70 p-4 backdrop-blur-sm" onClick={() => setIsInsertOpen(false)}><div className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/[.1] bg-[#202126] shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center gap-3 border-b border-white/[.08] p-4"><Search className="h-5 w-5 text-[#9299aa]" /><input ref={searchRef} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search AWS, GCP, Azure, databases, queues…" className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#73798a]" /><button type="button" onClick={() => setIsInsertOpen(false)} className="rounded-md p-1 text-[#9299aa] hover:bg-white/[.08]"><X className="h-5 w-5" /></button></div><div className="overflow-y-auto p-4">{Object.entries(groupedLibrary).map(([provider, items]) => <section key={provider} className="mb-6 last:mb-0"><h2 className="mb-2 text-[11px] font-bold uppercase tracking-[.15em] text-[#81889a]">{provider}</h2><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{items.map((item) => { const Icon = libraryIcon[item.icon] ?? Server; return <button key={`${item.provider}-${item.name}`} type="button" onClick={() => addNodeFromLibrary(item)} className="flex items-start gap-3 rounded-xl border border-white/[.08] bg-[#17181c] p-3 text-left transition hover:border-[#7585ff]/70 hover:bg-[#25262c]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[.06] text-[#b5c0ff]"><Icon className="h-4 w-4" /></span><span><span className="block text-xs font-semibold text-[#ecedf3]">{item.name}</span><span className="mt-0.5 block text-[11px] text-[#858b9d]">{item.description}</span></span></button>; })}</div></section>)}{filteredLibrary.length === 0 && <p className="py-10 text-center text-sm text-[#858b9d]">No components found for “{searchQuery}”.</p>}</div></div></div>}
  </div>;
}

function FormField({ children, label }: { children: React.ReactNode; label: string }) { return <div className="grid gap-2"><Label className="text-xs font-medium text-muted-foreground">{label}</Label>{children}</div>; }
function InspectorSheet({ node, onUpdate, result }: { node: Node<NodeData>; onUpdate: (id: string, patch: Partial<NodeData>) => void; result?: EvaluationResult }) {
  const data = node.data;
  return <><SheetHeader className="border-b border-border px-6 py-5"><SheetTitle>Configure component</SheetTitle><SheetDescription>Update settings without cluttering the diagram.</SheetDescription></SheetHeader><ScrollArea className="flex-1"><div className="space-y-6 px-6 py-5"><FormField label="Name"><Input value={data.label} onChange={(e) => onUpdate(node.id, { label: e.target.value })} /></FormField><div className="grid grid-cols-2 gap-4"><FormField label="Type"><div className="rounded-lg border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{data.type}</div></FormField><FormField label="Provider"><div className="rounded-lg border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{data.provider ?? 'Core'}</div></FormField></div><Separator /><FormField label="Throughput (req/s)"><Input type="number" min="0" value={data.throughput ?? 0} onChange={(e) => onUpdate(node.id, { throughput: numberValue(e.target.value) })} /></FormField>{(data.type === 'Server' || data.type === 'Database') && <FormField label="Latency (ms)"><Input type="number" min="0" value={data.latency ?? 0} onChange={(e) => onUpdate(node.id, { latency: numberValue(e.target.value) })} /></FormField>}{data.type === 'Cache' && <FormField label="Hit rate (%)"><Input type="number" min="0" max="100" value={data.hitRate ?? 0} onChange={(e) => onUpdate(node.id, { hitRate: Math.min(100, numberValue(e.target.value)) })} /></FormField>}{data.type === 'Queue' && <FormField label="Queue limit (N)"><Input type="number" min="0" value={data.n ?? 0} onChange={(e) => onUpdate(node.id, { n: numberValue(e.target.value) })} /><p className="text-xs leading-relaxed text-muted-foreground">Reference only; queue time is not simulated.</p></FormField>}<div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3"><div><Label htmlFor={`down-${node.id}`} className="text-sm text-foreground">Mark component down</Label><p className="mt-1 text-xs text-muted-foreground">Removes it from demand propagation.</p></div><Switch id={`down-${node.id}`} checked={Boolean(data.down)} onCheckedChange={(checked) => onUpdate(node.id, { down: checked })} /></div>{result && <NodeResult result={result} />}</div></ScrollArea></>;
}
function NodeResult({ result }: { result: EvaluationResult }) { const fail = result.status === 'FAIL'; return <Card className={cn('gap-2 py-4', fail ? 'border-destructive/45 bg-destructive/8' : 'border-emerald-500/35 bg-emerald-500/8')}><CardHeader className="px-4"><CardTitle className="flex items-center gap-2 text-sm">{fail ? <TriangleAlert className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}{result.status === 'OK' ? 'Passes analysis' : result.status}</CardTitle><CardDescription>{result.reason ?? `Incoming demand: ${Math.round(result.demandIn).toLocaleString()} req/s.`}</CardDescription></CardHeader></Card>; }
function AnalysisSheet({ findings, onSelect }: { findings: { id: string; label: string; result: EvaluationResult }[]; onSelect: (id: string) => void }) { const issues = findings.filter(({ result }) => result.status === 'FAIL'); const passes = findings.filter(({ result }) => result.status === 'OK'); const muted = findings.filter(({ result }) => result.status === 'UNUSED' || result.status === 'DOWN'); return <><SheetHeader className="border-b border-border px-6 py-5"><SheetTitle>Analysis results</SheetTitle><SheetDescription>Static architecture checks, not live traffic.</SheetDescription></SheetHeader><ScrollArea className="flex-1"><div className="space-y-6 px-4 py-5">{issues.length > 0 && <ResultGroup title={`${issues.length} issue${issues.length > 1 ? 's' : ''}`} tone="issue" items={issues} onSelect={onSelect} />}{passes.length > 0 && <ResultGroup title={`${passes.length} passing`} tone="pass" items={passes} onSelect={onSelect} />}{muted.length > 0 && <ResultGroup title="Needs attention" tone="muted" items={muted} onSelect={onSelect} />}</div></ScrollArea></>; }
function ResultGroup({ items, onSelect, title, tone }: { items: { id: string; label: string; result: EvaluationResult }[]; onSelect: (id: string) => void; title: string; tone: 'issue' | 'pass' | 'muted' }) { const Icon = tone === 'issue' ? TriangleAlert : tone === 'pass' ? CheckCircle2 : Bell; return <section><div className="mb-2 flex items-center gap-2"><Icon className={cn('h-4 w-4', tone === 'issue' ? 'text-destructive' : tone === 'pass' ? 'text-emerald-400' : 'text-muted-foreground')} /><p className="text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">{title}</p></div><div className="space-y-2">{items.map(({ id, label, result }) => <Button key={id} type="button" variant="outline" onClick={() => onSelect(id)} className="h-auto w-full items-start justify-start px-3 py-3 text-left"><span><span className="block text-sm font-medium text-foreground">{label}</span><span className="mt-1 block whitespace-normal text-xs font-normal leading-relaxed text-muted-foreground">{result.reason ?? `Incoming demand ${Math.round(result.demandIn).toLocaleString()} req/s`}</span></span></Button>)}</div></section>; }
