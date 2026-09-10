'use client';

import { Handle, Position } from '@xyflow/react';
import { AlertTriangle, Server, Database, Monitor, HardDrive, Share2, Layers } from 'lucide-react';
import { NodeData, EvaluationResult } from '../lib/types';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const iconMap = {
  Client: Monitor,
  Server: Server,
  Database: Database,
  Cache: HardDrive,
  LoadBalancer: Share2,
  Queue: Layers,
};

type Props = {
  id: string;
  data: NodeData & {
    evalResult?: EvaluationResult;
    onUpdate?: (id: string, patch: Partial<NodeData>) => void;
  };
};

export default function SystemNode({ id, data }: Props) {
  const Icon = iconMap[data.type] || Server;
  const status = data.evalResult?.status || 'OK';
  const isFail = status === 'FAIL';
  const isUnused = status === 'UNUSED';
  const isDown = status === 'DOWN';

  const updateField = (field: keyof NodeData, value: string | number | boolean) => {
    data.onUpdate?.(id, { [field]: value });
  };

  return (
    <div
      className={cn(
        'relative flex min-w-[220px] flex-col rounded-lg border bg-[#1e1f22] p-3 text-gray-100 shadow-lg transition-colors',
        isFail && 'border-red-500 ring-2 ring-red-500/40',
        isUnused && 'border-gray-600 opacity-50',
        isDown && 'border-dashed border-gray-500 opacity-45',
        !isFail && !isUnused && !isDown && 'border-gray-600'
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !border-0 !bg-sky-400" />

      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
              isFail ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-gray-300'
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={data.label}
            onChange={(e) => updateField('label', e.target.value)}
            className="w-full truncate rounded bg-transparent px-1 text-sm font-semibold text-white outline-none hover:bg-white/5 focus:bg-white/10 focus:ring-1 focus:ring-sky-500"
          />
        </div>
        {isFail && (
          <div className="group relative shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 hidden w-56 rounded-md bg-red-600 px-2.5 py-2 text-xs leading-snug text-white shadow-xl group-hover:block">
              {data.evalResult?.reason}
            </div>
          </div>
        )}
        {isUnused && !isFail && (
          <span className="shrink-0 rounded bg-gray-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-300">
            Unused
          </span>
        )}
        {isDown && (
          <span className="shrink-0 rounded bg-gray-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-300">
            Down
          </span>
        )}
      </div>

      <div className="mb-2 text-[10px] uppercase tracking-wider text-gray-500">{data.type}</div>

      <div className="flex flex-col gap-1.5 text-xs text-gray-400">
        {data.throughput !== undefined && (
          <label className="flex items-center justify-between gap-2">
            <span>Throughput (req/s)</span>
            <input
              type="number"
              min={0}
              value={data.throughput}
              onChange={(e) => updateField('throughput', Number(e.target.value))}
              className="w-24 rounded border border-transparent bg-white/5 px-1.5 py-0.5 text-right font-medium text-gray-100 outline-none hover:border-gray-500 focus:border-sky-500"
            />
          </label>
        )}

        {data.type === 'Queue' && data.n !== undefined && (
          <div>
            <label className="flex items-center justify-between gap-2">
              <span>Queue limit (N)</span>
              <input
                type="number"
                min={0}
                value={data.n}
                onChange={(e) => updateField('n', Number(e.target.value))}
                className="w-24 rounded border border-transparent bg-white/5 px-1.5 py-0.5 text-right font-medium text-gray-100 outline-none hover:border-gray-500 focus:border-sky-500"
              />
            </label>
            <p className="mt-0.5 text-[10px] text-gray-500">Reference only — not time-simulated.</p>
          </div>
        )}

        {data.type === 'Cache' && data.hitRate !== undefined && (
          <label className="flex items-center justify-between gap-2">
            <span>Hit rate (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={data.hitRate}
              onChange={(e) => updateField('hitRate', Number(e.target.value))}
              className="w-24 rounded border border-transparent bg-white/5 px-1.5 py-0.5 text-right font-medium text-gray-100 outline-none hover:border-gray-500 focus:border-sky-500"
            />
          </label>
        )}

        {(data.type === 'Server' || data.type === 'Database') && data.latency !== undefined && (
          <label className="flex items-center justify-between gap-2">
            <span>Latency (ms)</span>
            <input
              type="number"
              min={0}
              value={data.latency}
              onChange={(e) => updateField('latency', Number(e.target.value))}
              className="w-24 rounded border border-transparent bg-white/5 px-1.5 py-0.5 text-right font-medium text-gray-100 outline-none hover:border-gray-500 focus:border-sky-500"
            />
          </label>
        )}

        <label className="mt-1 flex items-center justify-between gap-2 border-t border-white/10 pt-2">
          <span>Down</span>
          <input
            type="checkbox"
            checked={!!data.down}
            onChange={(e) => updateField('down', e.target.checked)}
            className="h-3.5 w-3.5 rounded border-gray-500 bg-transparent text-red-500 focus:ring-red-500"
          />
        </label>

        {data.type !== 'Client' && (
          <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[11px]">
            <span className="text-gray-500">Demand in</span>
            <span className="font-semibold text-gray-200">
              {Math.round(data.evalResult?.demandIn || 0).toLocaleString()} req/s
            </span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !border-0 !bg-sky-400" />
    </div>
  );
}
