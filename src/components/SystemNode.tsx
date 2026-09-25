'use client';

import { Handle, Position } from '@xyflow/react';
import { Activity, AlertTriangle, Check, Cloud, Database, Gauge, HardDrive, Layers, Monitor, Network, Server, Share2, TriangleAlert } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { EvaluationResult, NodeData } from '../lib/types';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const iconMap = { Client: Monitor, Server, Database, Cache: HardDrive, LoadBalancer: Share2, Queue: Layers, RateLimiter: Gauge, Cloud, Network, Activity };

type Props = {
  id: string;
  selected?: boolean;
  data: NodeData & { evalResult?: EvaluationResult; showStatus?: boolean; onConfigure?: (id: string) => void };
};

export default function SystemNode({ id, data, selected }: Props) {
  const Icon = iconMap[data.icon as keyof typeof iconMap] ?? iconMap[data.type];
  const status = data.evalResult?.status;
  const showStatus = data.showStatus && status;
  const isFail = showStatus && status === 'FAIL';
  const isOk = showStatus && status === 'OK';
  const isMuted = showStatus && (status === 'UNUSED' || status === 'DOWN');
  const isDatabase = data.type === 'Database';

  return (
    <div className="group relative w-[132px] text-center" onDoubleClick={() => data.onConfigure?.(id)}>
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-[#17181c] !bg-[#a9b1c7]" />
      <button type="button" onClick={() => data.onConfigure?.(id)} aria-label={`Configure ${data.label}`} className={cn(
        'relative mx-auto flex h-[94px] w-[94px] items-center justify-center border-2 bg-[#202126] shadow-[0_10px_24px_rgba(0,0,0,.24)] transition',
        isDatabase ? 'rounded-[38%_38%_30%_30%]' : 'rounded-2xl',
        selected ? 'border-[#8798ff] ring-4 ring-[#7183ff]/15' : 'border-[#858a99]',
        isFail && 'border-[#ff4d5d] ring-4 ring-[#ff4d5d]/15', isOk && 'border-[#3ddc97]', isMuted && 'border-[#606574] opacity-55',
        !selected && !isFail && !isOk && !isMuted && 'hover:border-[#c5cad8] hover:bg-[#25262c]'
      )}>
        <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl', isFail ? 'bg-red-500/15 text-[#ff5d6b]' : isOk ? 'bg-emerald-400/10 text-[#4ce0a2]' : 'bg-white/[.06] text-[#c7cee1]')}>
          <Icon className="h-6 w-6" strokeWidth={1.8} />
        </span>
        {showStatus && <span className={cn('absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#17181c]', isFail ? 'bg-[#ff4d5d] text-white' : isOk ? 'bg-[#32c982] text-[#0b1912]' : 'bg-[#687080] text-white')}>
          {isFail ? <AlertTriangle className="h-3.5 w-3.5" /> : isOk ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <TriangleAlert className="h-3.5 w-3.5" />}
        </span>}
      </button>
      <div className="mt-2 px-1"><p className="truncate text-[13px] font-semibold leading-tight text-[#eef0f8]">{data.label}</p><p className="mt-1 truncate text-[10px] font-medium uppercase tracking-[.12em] text-[#858b9d]">{data.provider ?? data.type}</p></div>
      {isFail && <div className="pointer-events-none absolute left-1/2 top-[122px] z-50 hidden w-56 -translate-x-1/2 rounded-lg border border-red-400/30 bg-[#35171c] px-3 py-2 text-left text-xs leading-snug text-red-100 shadow-xl group-hover:block">{data.evalResult?.reason}</div>}
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-[#17181c] !bg-[#a9b1c7]" />
    </div>
  );
}
