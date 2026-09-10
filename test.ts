import { evaluateGraph } from './src/lib/evaluator';

const nodes = [
  { id: 'client', data: { type: 'Client', throughput: 1000 } },
  { id: 'gw', data: { type: 'Server', throughput: 500 } },
  { id: 'sqs', data: { type: 'Queue', throughput: 1000 } },
] as any[];

const edges = [
  { source: 'client', target: 'gw' },
  { source: 'gw', target: 'sqs' }
] as any[];

const result = evaluateGraph(nodes, edges);
console.log(result);
