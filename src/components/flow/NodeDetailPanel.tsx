import { X, Clock, Hash, Plus, Trash2, CheckCircle2, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { useFlowStore } from '@/store/flow-store';
import { MethodBadge } from './MethodBadge';
import { FlowNodeData, FieldValidation } from '@/types/api-flow';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function NodeDetailPanel() {
  const selectedNodeId = useFlowStore(s => s.selectedNodeId);
  const nodes = useFlowStore(s => s.nodes);
  const collection = useFlowStore(s => s.collection);
  const setSelectedNode = useFlowStore(s => s.setSelectedNode);
  const updateNodeOverrides = useFlowStore(s => s.updateNodeOverrides);
  const updateExpectedStatusCodes = useFlowStore(s => s.updateExpectedStatusCodes);
  const updateFieldValidations = useFlowStore(s => s.updateFieldValidations);

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
        {/* Execution result summary */}
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

        {/* Status code validation results */}
        {result?.statusCodeValidation && (
          <div className={`rounded-lg border p-3 ${result.statusCodeValidation.passed ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}>
            <div className="flex items-center gap-2 text-xs">
              {result.statusCodeValidation.passed
                ? <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                : <XCircle className="w-3.5 h-3.5 text-destructive" />}
              <span className={result.statusCodeValidation.passed ? 'text-success' : 'text-destructive'}>
                Status Code: esperado [{result.statusCodeValidation.expected.join(', ')}], recebido {result.statusCodeValidation.actual}
              </span>
            </div>
          </div>
        )}

        {/* Field validation results */}
        {result?.fieldValidationResults && result.fieldValidationResults.length > 0 && (
          <DetailSection title="Resultados das Validações">
            <div className="space-y-1.5">
              {result.fieldValidationResults.map((r, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs rounded-md px-2 py-1.5 ${r.passed ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                  {r.passed ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> : <XCircle className="w-3 h-3 flex-shrink-0" />}
                  <span className="font-mono">
                    {r.fieldPath}: {r.passed ? r.expectedType : `esperado ${r.expectedType}, recebido ${r.actualType}`}
                  </span>
                </div>
              ))}
            </div>
          </DetailSection>
        )}

        {/* Expected Status Codes */}
        <StatusCodeEditor
          codes={data.expectedStatusCodes || []}
          onChange={(codes) => updateExpectedStatusCodes(node.id, codes)}
        />

        {/* Field Validations */}
        <FieldValidationEditor
          validations={data.fieldValidations || []}
          onChange={(validations) => updateFieldValidations(node.id, validations)}
        />

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

function StatusCodeEditor({ codes, onChange }: { codes: number[]; onChange: (codes: number[]) => void }) {
  const [input, setInput] = useState('');

  const addCode = () => {
    const num = parseInt(input.trim());
    if (!isNaN(num) && num >= 100 && num <= 599 && !codes.includes(num)) {
      onChange([...codes, num]);
      setInput('');
    }
  };

  const removeCode = (code: number) => {
    onChange(codes.filter(c => c !== code));
  };

  return (
    <DetailSection title="Status Code Esperado">
      <div className="space-y-2">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCode()}
            placeholder="Ex: 200, 201"
            className="flex-1 bg-muted border border-border rounded-md px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button variant="outline" size="sm" onClick={addCode} className="h-7 px-2">
            <Plus className="w-3 h-3" />
          </Button>
        </div>
        {codes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {codes.map(code => (
              <span
                key={code}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-md font-mono group"
              >
                {code}
                <button onClick={() => removeCode(code)} className="text-primary/50 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {codes.length === 0 && (
          <p className="text-[10px] text-muted-foreground">Nenhum status code definido — qualquer resposta será aceita.</p>
        )}
      </div>
    </DetailSection>
  );
}

function FieldValidationEditor({ validations, onChange }: { validations: FieldValidation[]; onChange: (v: FieldValidation[]) => void }) {
  const addValidation = () => {
    const newVal: FieldValidation = {
      id: Math.random().toString(36).substring(2),
      fieldPath: '',
      expectedType: 'string',
    };
    onChange([...validations, newVal]);
  };

  const updateValidation = (id: string, updates: Partial<FieldValidation>) => {
    onChange(validations.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const removeValidation = (id: string) => {
    onChange(validations.filter(v => v.id !== id));
  };

  return (
    <DetailSection title="Validações de Campo">
      <div className="space-y-2">
        {validations.map(v => (
          <div key={v.id} className="bg-muted border border-border rounded-lg p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Validação</span>
              <button onClick={() => removeValidation(v.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground block mb-0.5">Campo (path)</label>
                <input
                  type="text"
                  value={v.fieldPath}
                  onChange={(e) => updateValidation(v.id, { fieldPath: e.target.value })}
                  placeholder="ex: data.name, id"
                  className="w-full bg-card border border-border rounded-md px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="w-24">
                <label className="text-[10px] text-muted-foreground block mb-0.5">Tipo</label>
                <select
                  value={v.expectedType}
                  onChange={(e) => updateValidation(v.id, { expectedType: e.target.value as FieldValidation['expectedType'] })}
                  className="w-full bg-card border border-border rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                  <option value="array">array</option>
                  <option value="object">object</option>
                </select>
              </div>
            </div>
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={addValidation} className="w-full">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Adicionar Validação
        </Button>
      </div>
    </DetailSection>
  );
}
