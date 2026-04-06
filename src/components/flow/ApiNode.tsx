import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FlowNodeData } from '@/types/api-flow';
import { MethodBadge } from './MethodBadge';
import { useFlowStore } from '@/store/flow-store';
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

const statusBorderClass: Record<string, string> = {
  idle: 'border-node-border',
  running: 'border-warning',
  success: 'border-success',
  error: 'border-destructive',
};

const ApiNodeComponent = ({ data, id, selected }: NodeProps<FlowNodeData>) => {
  const setSelectedNode = useFlowStore(s => s.setSelectedNode);
  const status = data.executionResult?.status || 'idle';
  const result = data.executionResult;

  const hasValidations = (data.expectedStatusCodes && data.expectedStatusCodes.length > 0) ||
    (data.fieldValidations && data.fieldValidations.length > 0);

  const statusCodeFailed = result?.statusCodeValidation && !result.statusCodeValidation.passed;
  const fieldsFailed = result?.fieldValidationResults?.some(r => !r.passed);
  const validationFailed = statusCodeFailed || fieldsFailed;

  return (
    <div
      onClick={() => setSelectedNode(id)}
      className={`group relative bg-card rounded-xl border-2 px-4 py-3 min-w-[220px] max-w-[300px] cursor-pointer
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

      {/* Expected status codes badge */}
      {hasValidations && status === 'idle' && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {data.expectedStatusCodes && data.expectedStatusCodes.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
              expect: {data.expectedStatusCodes.join('/')}
            </span>
          )}
          {data.fieldValidations && data.fieldValidations.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground font-mono">
              {data.fieldValidations.length} validação(ões)
            </span>
          )}
        </div>
      )}

      {/* Execution results */}
      {result && status !== 'idle' && (
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {status === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin text-warning" />}
            {status === 'success' && !validationFailed && <CheckCircle2 className="w-3.5 h-3.5 text-success" />}
            {(status === 'error' || validationFailed) && <XCircle className="w-3.5 h-3.5 text-destructive" />}
            {result.statusCode && (
              <span className={`font-mono font-bold ${
                validationFailed || status === 'error' ? 'text-destructive' : 'text-success'
              }`}>
                {result.statusCode}
              </span>
            )}
            {result.duration != null && <span>{result.duration}ms</span>}
          </div>

          {/* Validation failure banner */}
          {validationFailed && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-md px-2 py-1.5 space-y-1">
              {statusCodeFailed && (
                <div className="flex items-center gap-1.5 text-[10px] text-destructive">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span className="font-medium">
                    Status: esperado {result.statusCodeValidation!.expected.join('/')}, recebido {result.statusCodeValidation!.actual}
                  </span>
                </div>
              )}
              {result.fieldValidationResults?.filter(r => !r.passed).map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px] text-destructive">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span className="font-mono">
                    {r.fieldPath}: esperado <strong>{r.expectedType}</strong>, recebido <strong>{r.actualType}</strong>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* All passed banner */}
          {result.status === 'success' && !validationFailed && hasValidations && (
            <div className="bg-success/10 border border-success/30 rounded-md px-2 py-1 text-[10px] text-success flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3" />
              <span className="font-medium">Todas as validações passaram</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ApiNode = memo(ApiNodeComponent);
