export type NodeType = 'Client' | 'Server' | 'Database' | 'Cache' | 'LoadBalancer' | 'Queue';

export interface NodeData extends Record<string, unknown> {
  type: NodeType;
  label: string;
  throughput?: number; // req/s
  latency?: number; // ms
  down?: boolean; // Manual down toggle
  hitRate?: number; // Cache hit rate (0-100)
  n?: number; // Queue capacity (N)
}

/** A non-simulated canvas note. It is deliberately separate from NodeData. */
export interface AnnotationData extends Record<string, unknown> {
  label: string;
}

export type DiagramNodeData = NodeData | AnnotationData;

export interface GraphNode {
  id: string;
  data: NodeData;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

export type NodeStatus = 'OK' | 'UNUSED' | 'DOWN' | 'FAIL';

export interface EvaluationResult {
  status: NodeStatus;
  reason?: string;
  demandIn: number;
}

export type EvaluatorOutput = Record<string, EvaluationResult>;
