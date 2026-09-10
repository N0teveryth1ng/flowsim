'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  Panel,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  Search,
  Plus,
  MousePointer2,
  MoveUpRight,
  Type,
  Server as ServerIcon,
  Database as DBIcon,
  HardDrive,
  Share2,
  Layers,
  Monitor,
  Sparkles,
} from 'lucide-react';
import SystemNode, { cn } from './SystemNode';
import { evaluateGraph } from '../lib/evaluator';
import { AnnotationData, DiagramNodeData, NodeData, NodeType } from '../lib/types';

const initialNodes: Node<NodeData>[] = [
  {
    id: 'client-1',
    type: 'systemNode',
    position: { x: 280, y: 40 },
    data: { type: 'Client', label: 'Mobile App', throughput: 10000 },
  },
  {
    id: 'server-1',
    type: 'systemNode',
    position: { x: 280, y: 200 },
    data: { type: 'Server', label: 'API Gateway', throughput: 5000, latency: 15 },
  },
  {
    id: 'db-1',
    type: 'systemNode',
    position: { x: 280, y: 380 },
    data: { type: 'Database', label: 'Primary DB', throughput: 8000, latency: 12 },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: 'client-1',
    target: 'server-1',
    style: { stroke: '#64748b', strokeWidth: 2 },
  },
  {
    id: 'e2-3',
    source: 'server-1',
    target: 'db-1',
    style: { stroke: '#64748b', strokeWidth: 2 },
  },
];

type LibraryItem = {
  name: string;
  type: NodeType;
  provider: string;
  icon: React.ComponentType<{ className?: string }>;
};

const libraryItems: LibraryItem[] = [
  { name: 'Client App', type: 'Client', provider: 'Core', icon: Monitor },
  { name: 'Server', type: 'Server', provider: 'Core', icon: ServerIcon },
  { name: 'Database', type: 'Database', provider: 'Core', icon: DBIcon },
  { name: 'Cache', type: 'Cache', provider: 'Core', icon: HardDrive },
  { name: 'Load Balancer', type: 'LoadBalancer', provider: 'Core', icon: Share2 },
  { name: 'Queue', type: 'Queue', provider: 'Core', icon: Layers },
  { name: 'Amazon EC2', type: 'Server', provider: 'AWS', icon: ServerIcon },
  { name: 'Amazon RDS', type: 'Database', provider: 'AWS', icon: DBIcon },
  { name: 'Amazon DynamoDB', type: 'Database', provider: 'AWS', icon: DBIcon },
  { name: 'ElastiCache', type: 'Cache', provider: 'AWS', icon: HardDrive },
  { name: 'Amazon SQS', type: 'Queue', provider: 'AWS', icon: Layers },
  { name: 'ALB', type: 'LoadBalancer', provider: 'AWS', icon: Share2 },
  { name: 'Compute Engine', type: 'Server', provider: 'GCP', icon: ServerIcon },
  { name: 'Cloud SQL', type: 'Database', provider: 'GCP', icon: DBIcon },
  { name: 'Cloud Spanner', type: 'Database', provider: 'GCP', icon: DBIcon },
  { name: 'Cloud Memorystore', type: 'Cache', provider: 'GCP', icon: HardDrive },
  { name: 'Cloud Pub/Sub', type: 'Queue', provider: 'GCP', icon: Layers },
  { name: 'Cloud Load Balancing', type: 'LoadBalancer', provider: 'GCP', icon: Share2 },
  { name: 'Virtual Machines', type: 'Server', provider: 'Azure', icon: ServerIcon },
  { name: 'Azure SQL', type: 'Database', provider: 'Azure', icon: DBIcon },
  { name: 'Cosmos DB', type: 'Database', provider: 'Azure', icon: DBIcon },
  { name: 'Azure Cache', type: 'Cache', provider: 'Azure', icon: HardDrive },
  { name: 'Service Bus', type: 'Queue', provider: 'Azure', icon: Layers },
];

function ToolBtn({
  active,
  title,
  shortcut,
  onClick,
  children,
}: {
  active?: boolean;
  title: string;
  shortcut?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex h-9 w-9 items-center justify-center rounded-md text-gray-300 transition-colors',
        active ? 'bg-white/15 text-white' : 'hover:bg-white/10 hover:text-white'
      )}
      title={`${title}${shortcut ? ` ${shortcut}` : ''}`}
    >
      {children}
      {shortcut && (
        <span className="pointer-events-none absolute bottom-0.5 right-0.5 text-[8px] leading-none text-gray-500">
          {shortcut}
        </span>
      )}
      <span className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white group-hover:block">
        {title}
        {shortcut ? ` ${shortcut}` : ''}
      </span>
    </button>
  );
}

export default function FlowBoard() {
  const [nodes, setNodes] = useState<Node<DiagramNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [isInsertOpen, setIsInsertOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTool, setActiveTool] = useState<'select' | 'arrow' | 'text'>('select');
  const [honestyOpen, setHonestyOpen] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  const updateNode = useCallback((id: string, patch: Partial<NodeData>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))
    );
  }, []);

  const evalResults = useMemo(() => {
    const simNodes = nodes.filter((n) => n.type === 'systemNode');
    const simIds = new Set(simNodes.map((n) => n.id));
    return evaluateGraph(
      simNodes.map((n) => ({ id: n.id, data: n.data as NodeData })),
      edges
        .filter((e) => simIds.has(e.source) && simIds.has(e.target))
        .map((e) => ({ id: e.id, source: e.source, target: e.target }))
    );
  }, [nodes, edges]);

  const nodesWithResults = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          evalResult: evalResults[n.id],
          onUpdate: updateNode,
        },
      })),
    [nodes, evalResults, updateNode]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds) as Node<DiagramNodeData>[]),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) =>
      addEdge(
        {
          ...params,
          style: { stroke: '#64748b', strokeWidth: 2 },
        },
        eds
      )
    );
    setActiveTool('select');
  }, []);

  const addNodeFromLibrary = useCallback((item: LibraryItem) => {
    const id = `${item.type.toLowerCase()}-${Date.now()}`;
    const newNode: Node<NodeData> = {
      id,
      type: 'systemNode',
      position: { x: 180 + Math.random() * 240, y: 80 + Math.random() * 240 },
      data: {
        type: item.type,
        label: item.name,
        throughput: item.type === 'Client' ? 1000 : 5000,
        ...((item.type === 'Server' || item.type === 'Database') ? { latency: 10 } : {}),
        ...(item.type === 'Cache' ? { hitRate: 80 } : {}),
        ...(item.type === 'Queue' ? { n: 1000 } : {}),
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setIsInsertOpen(false);
    setSearchQuery('');
    setActiveTool('select');
  }, []);

  const addTextLabel = useCallback(() => {
    const label = window.prompt('Text label', 'Notes');
    setActiveTool('select');
    if (!label?.trim()) return;
    setNodes((nds) => [
      ...nds,
      {
        id: `note-${Date.now()}`,
        type: 'annotation',
        position: { x: 160 + Math.random() * 180, y: 100 + Math.random() * 140 },
        data: { label: label.trim() } satisfies AnnotationData,
        draggable: true,
      },
    ]);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'v' || e.key === 'V') setActiveTool('select');
      if (e.key === 'a' || e.key === 'A') setActiveTool('arrow');
      if (e.key === 't' || e.key === 'T') {
        setActiveTool('text');
        addTextLabel();
      }
      if (e.key === 'i' || e.key === 'I' || e.key === '/') {
        e.preventDefault();
        setIsInsertOpen(true);
      }
      if (e.key === 'Escape') {
        setIsInsertOpen(false);
        setActiveTool('select');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addTextLabel]);

  useEffect(() => {
    if (isInsertOpen) {
      const t = setTimeout(() => searchRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isInsertOpen]);

  const filteredLibrary = libraryItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedLibrary = filteredLibrary.reduce(
    (acc, item) => {
      if (!acc[item.provider]) acc[item.provider] = [];
      acc[item.provider].push(item);
      return acc;
    },
    {} as Record<string, LibraryItem[]>
  );

  const AnnotationNode = useCallback(({ data }: { data: AnnotationData }) => {
    return (
      <div className="rounded-md border border-white/10 bg-[#1e1f22]/80 px-3 py-2 text-sm text-gray-200 shadow">
        {data.label}
      </div>
    );
  }, []);

  const allNodeTypes = useMemo(
    () => ({ systemNode: SystemNode, annotation: AnnotationNode }),
    [AnnotationNode]
  );

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#121316]">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodesWithResults}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={allNodeTypes}
          fitView
          deleteKeyCode={['Backspace', 'Delete']}
          connectionMode={ConnectionMode.Loose}
          nodesConnectable={activeTool === 'arrow' || activeTool === 'select'}
          elementsSelectable={activeTool === 'select' || activeTool === 'arrow'}
          panOnDrag={activeTool === 'select'}
          selectionOnDrag={activeTool === 'select'}
          defaultEdgeOptions={{ style: { stroke: '#64748b', strokeWidth: 2 } }}
          colorMode="dark"
          className="bg-[#121316]"
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#2a2b30" />
          <Controls className="!bg-[#1e1f22] !border-gray-700 !fill-gray-300 [&>button]:!border-gray-700 [&>button]:!bg-[#1e1f22]" />
          <MiniMap
            className="!bg-[#1e1f22] !border-gray-700"
            maskColor="rgb(0,0,0,0.55)"
            nodeColor="#334155"
          />

          {/* Eraser-like vertical toolbar */}
          <Panel position="top-left" className="!m-0 !left-3 !top-1/2 !-translate-y-1/2">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-0.5 rounded-xl border border-white/10 bg-[#1e1f22] p-1.5 shadow-xl">
                <ToolBtn title="Insert" shortcut="/" onClick={() => setIsInsertOpen(true)}>
                  <Plus className="h-4 w-4" />
                </ToolBtn>
              </div>

              <div className="flex flex-col gap-0.5 rounded-xl border border-white/10 bg-[#1e1f22] p-1.5 shadow-xl">
                <ToolBtn title="AI (soon)" shortcut="⌘J" onClick={() => {}}>
                  <Sparkles className="h-4 w-4 opacity-40" />
                </ToolBtn>
              </div>

              <div className="flex flex-col gap-0.5 rounded-xl border border-white/10 bg-[#1e1f22] p-1.5 shadow-xl">
                <ToolBtn
                  active={activeTool === 'select'}
                  title="Select"
                  shortcut="V"
                  onClick={() => setActiveTool('select')}
                >
                  <MousePointer2 className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  active={activeTool === 'arrow'}
                  title="Arrow"
                  shortcut="A"
                  onClick={() => setActiveTool('arrow')}
                >
                  <MoveUpRight className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  active={activeTool === 'text'}
                  title="Text"
                  shortcut="T"
                  onClick={() => {
                    setActiveTool('text');
                    addTextLabel();
                  }}
                >
                  <Type className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn title="Insert icons" shortcut="I" onClick={() => setIsInsertOpen(true)}>
                  <Search className="h-4 w-4" />
                </ToolBtn>
              </div>
            </div>
          </Panel>

          {honestyOpen && (
            <Panel position="bottom-right" className="!m-4">
              <div className="w-72 rounded-xl border border-white/10 bg-[#1e1f22]/95 p-3 text-xs text-gray-300 shadow-xl backdrop-blur">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Honesty panel</h3>
                  <button
                    type="button"
                    className="text-gray-500 hover:text-white"
                    onClick={() => setHonestyOpen(false)}
                  >
                    ✕
                  </button>
                </div>
                <p className="mb-1 font-medium text-gray-200">What this checks</p>
                <ul className="mb-2 list-inside list-disc space-y-0.5 text-gray-400">
                  <li>Demand from Clients through the graph</li>
                  <li>Throughput limits → red FAIL</li>
                  <li>LB even-split &amp; Cache hit rate</li>
                  <li>Reachability / unused / down</li>
                </ul>
                <p className="mb-1 font-medium text-gray-200">What it does not</p>
                <ul className="list-inside list-disc space-y-0.5 text-gray-400">
                  <li>Packet animation / live traffic</li>
                  <li>Retries, timeouts, pools</li>
                  <li>Queue time or latency simulation</li>
                  <li>Consistency / CAP / replication</li>
                  <li>Autoscaling / cloud SKUs</li>
                </ul>
              </div>
            </Panel>
          )}

          {!honestyOpen && (
            <Panel position="bottom-right" className="!m-4">
              <button
                type="button"
                onClick={() => setHonestyOpen(true)}
                className="rounded-lg border border-white/10 bg-[#1e1f22] px-3 py-1.5 text-xs text-gray-300 hover:text-white"
              >
                Honesty panel
              </button>
            </Panel>
          )}
        </ReactFlow>
      </ReactFlowProvider>

      {activeTool === 'arrow' && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-[#1e1f22] px-3 py-1 text-xs text-gray-300">
          Arrow mode — drag from a node handle to connect
        </div>
      )}

      {/* Insert modal */}
      {isInsertOpen && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setIsInsertOpen(false)}
        >
          <div
            className="flex max-h-[80vh] w-[640px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1e1f22] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-white/10 p-4">
              <Search className="h-5 w-5 text-gray-500" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search components or icons (e.g. EC2, Database)..."
                className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-gray-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="rounded bg-white/10 px-2 py-1 font-mono text-[10px] text-gray-400">
                ESC
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {Object.entries(groupedLibrary).map(([provider, items]) => (
                <div key={provider} className="mb-6 last:mb-0">
                  <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    {provider}
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {items.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => addNodeFromLibrary(item)}
                        className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#121316] p-4 text-gray-200 transition-all hover:border-sky-500/60 hover:bg-[#18191d]"
                      >
                        <item.icon className="h-6 w-6" />
                        <span className="text-center text-xs font-medium">{item.name}</span>
                        <span className="text-[10px] text-gray-500">{item.type}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {filteredLibrary.length === 0 && (
                <div className="py-10 text-center text-gray-500">
                  No components matching &quot;{searchQuery}&quot;
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
