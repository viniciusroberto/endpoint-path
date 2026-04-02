import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FlowNodeData } from '@/types/api-flow';
import { MethodBadge } from './MethodBadge';
import { useFlowStore } from '@/store/flow-store';

const statusBorderClass: Record<string, string> = {
  idle: 'border-node-border',
  running: 'border-warning',
  success: 'border-success',
  error: 'border-destructive',
};

const ApiNodeComponent = ({ data, id, selected }: NodeProps<FlowNodeData>) => {
  const setSelectedNode = useFlowStore(s => s.setSelectedNode);
  const status = data.executionResult?.status || 'idle';

  return (
    <div
      onClick={() => setSelectedNode(id)}
      className={`group relative bg-card rounded-xl border-2 px-4 py-3 min-w-[200px] max-w-[280px] cursor-pointer
        transition-all duration-200 hover:shadow-lg
        ${statusBorderClass[status]}
        ${selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
        ${status === 'running' ? 'node-executing' : ''}
      `}
    >
      <Handle type="target" position={Position.Left} className="!-left-[6px]" />
      <Handle type="source" position={Position.Right} className="!-right-[6px]" />

      <div className="flex items-center gap-2">
        <MethodBadge method={data.endpoint.method} />
        <span className="text-sm font-mono text-foreground truncate">{data.endpoint.path}</span>
      </div>

      {data.executionResult && status !== 'idle' && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          {data.executionResult.statusCode && (
            <span className={`font-mono font-bold ${status === 'success' ? 'text-success' : 'text-destructive'}`}>
              {data.executionResult.statusCode}
            </span>
          )}
          {data.executionResult.duration != null && (
            <span>{data.executionResult.duration}ms</span>
          )}
        </div>
      )}
    </div>
  );
};

export const ApiNode = memo(ApiNodeComponent);
