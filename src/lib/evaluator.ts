import { GraphNode, GraphEdge, EvaluatorOutput } from './types';

/**
 * Static graph evaluator — no animation, no time.
 * Demand from Clients → type rules → OK | UNUSED | DOWN | FAIL.
 */
export function evaluateGraph(nodes: GraphNode[], edges: GraphEdge[]): EvaluatorOutput {
  const out: EvaluatorOutput = {};
  const nodesMap = new Map(nodes.map((n) => [n.id, n]));
  const adj = new Map<string, string[]>();

  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    if (nodesMap.has(e.source) && nodesMap.has(e.target)) {
      adj.get(e.source)!.push(e.target);
    }
  }

  const isUp = (id: string) => {
    const n = nodesMap.get(id);
    return !!n && !n.data.down;
  };

  // 1. Reachability from non-down Clients (do not walk through down nodes)
  const reachable = new Set<string>();
  const bfs: string[] = [];

  for (const n of nodes) {
    if (n.data.type === 'Client' && !n.data.down) {
      reachable.add(n.id);
      bfs.push(n.id);
    }
  }

  while (bfs.length > 0) {
    const curr = bfs.shift()!;
    for (const next of adj.get(curr) ?? []) {
      if (!isUp(next) || reachable.has(next)) continue;
      reachable.add(next);
      bfs.push(next);
    }
  }

  // Seed DOWN / UNUSED
  for (const n of nodes) {
    if (n.data.down) {
      out[n.id] = { status: 'DOWN', reason: 'Manually marked down.', demandIn: 0 };
    } else if (n.data.type !== 'Client' && !reachable.has(n.id)) {
      out[n.id] = {
        status: 'UNUSED',
        reason: 'No path from any Client — unused.',
        demandIn: 0,
      };
    } else if (n.data.type === 'Client' && n.data.down) {
      // already handled by down
    }
  }

  // 2. Propagate demand (relax |V| times for DAGs / shallow cycles)
  let demandIn = new Map<string, number>();
  const demandOut = new Map<string, number>();
  for (const n of nodes) {
    demandIn.set(n.id, 0);
    demandOut.set(n.id, 0);
  }

  const rounds = Math.max(nodes.length, 1);
  for (let i = 0; i < rounds; i++) {
    for (const n of nodes) {
      if (n.data.down || (!reachable.has(n.id) && n.data.type !== 'Client')) {
        demandOut.set(n.id, 0);
        continue;
      }
      if (n.data.type === 'Client') {
        demandOut.set(n.id, n.data.throughput ?? 0);
        continue;
      }
      const incoming = demandIn.get(n.id) ?? 0;
      if (n.data.type === 'Cache') {
        const hr = Math.min(100, Math.max(0, n.data.hitRate ?? 0));
        demandOut.set(n.id, incoming * (1 - hr / 100));
      } else {
        // Forward full incoming demand (FAIL is independent; downstream still sees load)
        demandOut.set(n.id, incoming);
      }
    }

    const nextIn = new Map<string, number>();
    for (const n of nodes) nextIn.set(n.id, 0);

    for (const n of nodes) {
      const outDemand = demandOut.get(n.id) ?? 0;
      if (outDemand <= 0) continue;

      const liveTargets = (adj.get(n.id) ?? []).filter(isUp);
      if (liveTargets.length === 0) continue;

      if (n.data.type === 'LoadBalancer') {
        const split = outDemand / liveTargets.length;
        for (const t of liveTargets) {
          nextIn.set(t, (nextIn.get(t) ?? 0) + split);
        }
      } else {
        // Fan-out: full demand on each live outgoing edge
        for (const t of liveTargets) {
          nextIn.set(t, (nextIn.get(t) ?? 0) + outDemand);
        }
      }
    }

    demandIn = nextIn;
  }

  // 3. Status rules
  for (const n of nodes) {
    const dIn = demandIn.get(n.id) ?? 0;

    if (out[n.id]) {
      out[n.id] = { ...out[n.id], demandIn: dIn };
      continue;
    }

    if (n.data.type === 'Client') {
      out[n.id] = { status: 'OK', demandIn: 0 };
      continue;
    }

    const throughput = n.data.throughput ?? 0;
    if (dIn > throughput) {
      out[n.id] = {
        status: 'FAIL',
        reason: `Incoming demand ${Math.round(dIn).toLocaleString()} req/s exceeds Throughput ${throughput.toLocaleString()} req/s.`,
        demandIn: dIn,
      };
    } else {
      out[n.id] = { status: 'OK', demandIn: dIn };
    }
  }

  return out;
}
