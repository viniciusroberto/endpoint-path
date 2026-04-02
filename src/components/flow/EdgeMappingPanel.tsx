import { X, Plus, Trash2, ArrowRight } from 'lucide-react';
import { useFlowStore } from '@/store/flow-store';
import { DataMapping, FlowEdgeData } from '@/types/api-flow';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MethodBadge } from './MethodBadge';

export function EdgeMappingPanel() {
  const selectedEdgeId = useFlowStore(s => s.selectedEdgeId);
  const edges = useFlowStore(s => s.edges);
  const nodes = useFlowStore(s => s.nodes);
  const setSelectedEdge = useFlowStore(s => s.setSelectedEdge);
  const updateEdgeMappings = useFlowStore(s => s.updateEdgeMappings);

  const edge = edges.find(e => e.id === selectedEdgeId);
  if (!edge) return null;

  const sourceNode = nodes.find(n => n.id === edge.source);
  const targetNode = nodes.find(n => n.id === edge.target);
  if (!sourceNode || !targetNode) return null;

  const mappings: DataMapping[] = (edge.data as FlowEdgeData)?.mappings || [];

  const addMapping = () => {
    const newMapping: DataMapping = {
      id: Math.random().toString(36).substring(2),
      sourceField: '',
      targetField: '',
      targetLocation: 'body',
    };
    updateEdgeMappings(edge.id, [...mappings, newMapping]);
  };

  const updateMapping = (id: string, updates: Partial<DataMapping>) => {
    updateEdgeMappings(
      edge.id,
      mappings.map(m => m.id === id ? { ...m, ...updates } : m)
    );
  };

  const removeMapping = (id: string) => {
    updateEdgeMappings(edge.id, mappings.filter(m => m.id !== id));
  };

  return (
    <div className="w-96 bg-card border-l border-border flex flex-col h-full animate-slide-in-right">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Mapeamento de Dados</h3>
          <button onClick={() => setSelectedEdge(null)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <MethodBadge method={sourceNode.data.endpoint.method} />
            <span className="font-mono text-foreground">{sourceNode.data.endpoint.path}</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <div className="flex items-center gap-1">
            <MethodBadge method={targetNode.data.endpoint.method} />
            <span className="font-mono text-foreground">{targetNode.data.endpoint.path}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {mappings.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            Nenhum mapeamento configurado.
            <br />
            Adicione um para passar dados entre os endpoints.
          </p>
        )}

        {mappings.map(mapping => (
          <MappingRow
            key={mapping.id}
            mapping={mapping}
            onChange={(updates) => updateMapping(mapping.id, updates)}
            onRemove={() => removeMapping(mapping.id)}
          />
        ))}

        <Button variant="outline" size="sm" onClick={addMapping} className="w-full">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Adicionar Mapeamento
        </Button>
      </div>
    </div>
  );
}

function MappingRow({
  mapping,
  onChange,
  onRemove,
}: {
  mapping: DataMapping;
  onChange: (updates: Partial<DataMapping>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-muted rounded-lg p-3 space-y-2 border border-border">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mapeamento</span>
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div>
        <label className="text-xs text-muted-foreground block mb-1">Campo origem (response)</label>
        <input
          type="text"
          value={mapping.sourceField}
          onChange={(e) => onChange({ sourceField: e.target.value })}
          placeholder="ex: data.id, token"
          className="w-full bg-card border border-border rounded-md px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground block mb-1">Campo destino</label>
          <input
            type="text"
            value={mapping.targetField}
            onChange={(e) => onChange({ targetField: e.target.value })}
            placeholder="ex: id, Authorization"
            className="w-full bg-card border border-border rounded-md px-2.5 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="w-24">
          <label className="text-xs text-muted-foreground block mb-1">Local</label>
          <select
            value={mapping.targetLocation}
            onChange={(e) => onChange({ targetLocation: e.target.value as DataMapping['targetLocation'] })}
            className="w-full bg-card border border-border rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="body">Body</option>
            <option value="header">Header</option>
            <option value="query">Query</option>
            <option value="path">Path</option>
          </select>
        </div>
      </div>
    </div>
  );
}
