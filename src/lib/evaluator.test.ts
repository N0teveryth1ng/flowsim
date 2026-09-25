import { describe, expect, it } from 'vitest';
import { evaluateGraph } from './evaluator';
import type { GraphEdge, GraphNode } from './types';

const edge = (source: string, target: string): GraphEdge => ({ id: `${source}-${target}`, source, target });

describe('evaluateGraph', () => {
  it('marks overloaded downstream nodes as failed with exact demand', () => {
    const nodes: GraphNode[] = [
      { id: 'client', data: { type: 'Client', label: 'Client', throughput: 10_000 } },
      { id: 'server', data: { type: 'Server', label: 'Server', throughput: 5_000 } },
      { id: 'database', data: { type: 'Database', label: 'Database', throughput: 8_000 } },
    ];
    const result = evaluateGraph(nodes, [edge('client', 'server'), edge('server', 'database')]);
    expect(result.server).toMatchObject({ status: 'FAIL', demandIn: 10_000 });
    expect(result.database).toMatchObject({ status: 'FAIL', demandIn: 10_000 });
    expect(result.server.reason).toContain('10,000 req/s');
  });

  it('clears the failure when throughput exceeds incoming demand', () => {
    const result = evaluateGraph([
      { id: 'client', data: { type: 'Client', label: 'Client', throughput: 1_000 } },
      { id: 'server', data: { type: 'Server', label: 'Server', throughput: 5_000 } },
    ], [edge('client', 'server')]);
    expect(result.server).toEqual({ status: 'OK', demandIn: 1_000 });
  });

  it('marks an unconnected non-client node as unused', () => {
    const result = evaluateGraph([
      { id: 'client', data: { type: 'Client', label: 'Client', throughput: 100 } },
      { id: 'server', data: { type: 'Server', label: 'Server', throughput: 100 } },
      { id: 'orphan', data: { type: 'Database', label: 'Orphan', throughput: 10 } },
    ], [edge('client', 'server')]);
    expect(result.orphan).toMatchObject({ status: 'UNUSED', demandIn: 0 });
  });

  it('splits load balancer demand equally between live targets', () => {
    const result = evaluateGraph([
      { id: 'client', data: { type: 'Client', label: 'Client', throughput: 1_000 } },
      { id: 'lb', data: { type: 'LoadBalancer', label: 'LB', throughput: 5_000 } },
      { id: 'a', data: { type: 'Server', label: 'A', throughput: 400 } },
      { id: 'b', data: { type: 'Server', label: 'B', throughput: 600 } },
    ], [edge('client', 'lb'), edge('lb', 'a'), edge('lb', 'b')]);
    expect(result.a).toMatchObject({ status: 'FAIL', demandIn: 500 });
    expect(result.b).toEqual({ status: 'OK', demandIn: 500 });
  });

  it('reduces downstream demand by cache hit rate', () => {
    const result = evaluateGraph([
      { id: 'client', data: { type: 'Client', label: 'Client', throughput: 1_000 } },
      { id: 'cache', data: { type: 'Cache', label: 'Cache', throughput: 2_000, hitRate: 80 } },
      { id: 'database', data: { type: 'Database', label: 'Database', throughput: 250 } },
    ], [edge('client', 'cache'), edge('cache', 'database')]);
    expect(result.cache).toEqual({ status: 'OK', demandIn: 1_000 });
    expect(result.database).toMatchObject({ status: 'OK' });
    expect(result.database.demandIn).toBeCloseTo(200);
  });

  it('keeps manually down nodes out of propagation', () => {
    const result = evaluateGraph([
      { id: 'client', data: { type: 'Client', label: 'Client', throughput: 1_000 } },
      { id: 'server', data: { type: 'Server', label: 'Server', throughput: 500, down: true } },
      { id: 'database', data: { type: 'Database', label: 'Database', throughput: 500 } },
    ], [edge('client', 'server'), edge('server', 'database')]);
    expect(result.server).toMatchObject({ status: 'DOWN', demandIn: 0 });
    expect(result.database).toMatchObject({ status: 'UNUSED', demandIn: 0 });
  });

  it('validates a rate limiter using its declared throughput', () => {
    const result = evaluateGraph([
      { id: 'client', data: { type: 'Client', label: 'Client', throughput: 20_000 } },
      { id: 'limiter', data: { type: 'RateLimiter', label: 'Rate Limiter', throughput: 10_000 } },
    ], [edge('client', 'limiter')]);

    expect(result.limiter).toMatchObject({ status: 'FAIL', demandIn: 20_000 });
  });
});
