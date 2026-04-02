import { X, Clock, Hash } from 'lucide-react';
import { useFlowStore } from '@/store/flow-store';
import { MethodBadge } from './MethodBadge';
import { FlowNodeData } from '@/types/api-flow';
import { useState } from 'react';

export function NodeDetailPanel() {
  const selectedNodeId = useFlowStore(s => s.selectedNodeId);
  const nodes = useFlowStore(s => s.nodes);
  const collection = useFlowStore(s => s.collection);
  const setSelectedNode = useFlowStore(s => s.setSelectedNode);
  const updateNodeOverrides = useFlowStore(s => s.updateNodeOverrides);

  const node = nodes.find(n => n.id === selectedNodeId);
  if (!node || !collection) return null;

  const data: FlowNodeData = node.data;
  const ep = data.endpoint;
  const result = data.executionResult;

  return (
    <div className="w-96 bg-card border-l border-border flex flex-col h-full animate-slide-in-right">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MethodBadge method={ep.method} />
          <span className="text-sm font-mono font-medium text-foreground truncate">{ep.path}</span>
        </div>
        <button onClick={() => setSelectedNode(null)} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Execution result */}
        {result && result.status !== 'idle' && (
          <div className={`rounded-lg border p-3 ${result.status === 'success' ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}>
            <div className="flex items-center gap-3 text-sm">
              <Hash className="w-3.5 h-3.5 text-muted-foreground" />
              <span className={`font-mono font-bold ${result.status === 'success' ? 'text-success' : 'text-destructive'}`}>
                {result.statusCode || 'ERR'}
              </span>
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{result.duration}ms</span>
            </div>
            {result.error && <p className="text-xs text-destructive mt-2">{result.error}</p>}
          </div>
        )}

        {/* URL */}
        <DetailSection title="URL Completa">
          <p className="text-xs font-mono text-foreground break-all">
            {collection.baseUrl}{ep.path}
          </p>
        </DetailSection>

        {/* Description */}
        {ep.description && (
          <DetailSection title="Descrição">
            <p className="text-xs text-muted-foreground">{ep.description}</p>
          </DetailSection>
        )}

        {/* Headers */}
        <EditableJsonSection
          title="Headers"
          initialValue={JSON.stringify({ ...ep.headers, ...data.overrides?.headers }, null, 2)}
          onSave={(val) => {
            try {
              const parsed = JSON.parse(val);
              updateNodeOverrides(node.id, { ...data.overrides, headers: parsed });
            } catch { /* ignore */ }
          }}
        />

        {/* Body */}
        {['POST', 'PUT', 'PATCH'].includes(ep.method) && (
          <EditableJsonSection
            title="Body"
            initialValue={data.overrides?.body || ep.body || '{}'}
            onSave={(val) => {
              updateNodeOverrides(node.id, { ...data.overrides, body: val });
            }}
          />
        )}

        {/* Query Params */}
        {Object.keys({ ...ep.queryParams, ...data.overrides?.queryParams }).length > 0 && (
          <EditableJsonSection
            title="Query Params"
            initialValue={JSON.stringify({ ...ep.queryParams, ...data.overrides?.queryParams }, null, 2)}
            onSave={(val) => {
              try {
                const parsed = JSON.parse(val);
                updateNodeOverrides(node.id, { ...data.overrides, queryParams: parsed });
              } catch { /* ignore */ }
            }}
          />
        )}

        {/* Path Params */}
        {ep.pathParams.length > 0 && (
          <DetailSection title="Path Params">
            <div className="flex flex-wrap gap-1">
              {ep.pathParams.map(p => (
                <span key={p} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded font-mono">{p}</span>
              ))}
            </div>
          </DetailSection>
        )}

        {/* Example Response */}
        {ep.exampleResponse && (
          <DetailSection title="Exemplo de Response">
            <pre className="text-xs font-mono text-muted-foreground bg-muted rounded-lg p-3 overflow-x-auto max-h-48">
              {ep.exampleResponse}
            </pre>
          </DetailSection>
        )}

        {/* Response body from execution */}
        {result?.responseBody && (
          <DetailSection title="Response">
            <pre className="text-xs font-mono text-foreground bg-muted rounded-lg p-3 overflow-x-auto max-h-64">
              {result.responseBody}
            </pre>
          </DetailSection>
        )}
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</h4>
      {children}
    </div>
  );
}

function EditableJsonSection({ title, initialValue, onSave }: { title: string; initialValue: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue);

  return (
    <DetailSection title={title}>
      {editing ? (
        <div>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full h-32 bg-muted border border-border rounded-lg p-3 text-xs font-mono text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => { onSave(value); setEditing(false); }}
              className="text-xs text-primary hover:underline"
            >
              Salvar
            </button>
            <button
              onClick={() => { setValue(initialValue); setEditing(false); }}
              className="text-xs text-muted-foreground hover:underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <pre
          onClick={() => setEditing(true)}
          className="text-xs font-mono text-muted-foreground bg-muted rounded-lg p-3 overflow-x-auto max-h-32 cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
        >
          {initialValue || '{}'}
        </pre>
      )}
    </DetailSection>
  );
}
