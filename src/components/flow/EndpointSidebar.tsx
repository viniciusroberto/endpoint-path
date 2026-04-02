import { Search } from 'lucide-react';
import { useState } from 'react';
import { useFlowStore } from '@/store/flow-store';
import { MethodBadge } from './MethodBadge';
import { ApiEndpoint } from '@/types/api-flow';

export function EndpointSidebar() {
  const collection = useFlowStore(s => s.collection);
  const addEndpointNode = useFlowStore(s => s.addEndpointNode);
  const nodes = useFlowStore(s => s.nodes);
  const [search, setSearch] = useState('');

  if (!collection) return null;

  const filtered = collection.endpoints.filter(ep =>
    `${ep.method} ${ep.path} ${ep.name}`.toLowerCase().includes(search.toLowerCase())
  );

  const onDragStart = (e: React.DragEvent, endpoint: ApiEndpoint) => {
    e.dataTransfer.setData('application/endpoint-id', endpoint.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const isOnCanvas = (id: string) => nodes.some(n => n.data.endpoint.id === id);

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Endpoints</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar..."
            className="w-full bg-muted border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.map(ep => {
          const used = isOnCanvas(ep.id);
          return (
            <div
              key={ep.id}
              draggable={!used}
              onDragStart={(e) => onDragStart(e, ep)}
              onClick={() => {
                if (!used) {
                  addEndpointNode(ep.id, {
                    x: 300 + Math.random() * 200,
                    y: 100 + Math.random() * 300,
                  });
                }
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all cursor-grab active:cursor-grabbing
                ${used
                  ? 'opacity-40 cursor-default'
                  : 'hover:bg-muted/70'
                }
              `}
            >
              <MethodBadge method={ep.method} />
              <span className="font-mono text-foreground truncate">{ep.path}</span>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum endpoint encontrado</p>
        )}
      </div>
    </div>
  );
}
