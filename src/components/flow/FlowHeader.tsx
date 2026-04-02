import { Upload, Play, Globe, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFlowStore } from '@/store/flow-store';

interface FlowHeaderProps {
  onImport: () => void;
  onExecute: () => void;
}

export function FlowHeader({ onImport, onExecute }: FlowHeaderProps) {
  const collection = useFlowStore(s => s.collection);
  const isExecuting = useFlowStore(s => s.isExecuting);
  const nodes = useFlowStore(s => s.nodes);

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">API Flow</span>
        </div>

        {collection && (
          <>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{collection.name}</span>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Globe className="w-3 h-3" />
                <span className="font-mono">{collection.baseUrl}</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onImport}>
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          Importar
        </Button>

        {nodes.length > 0 && (
          <Button
            size="sm"
            onClick={onExecute}
            disabled={isExecuting}
            className="bg-success hover:bg-success/90 text-success-foreground"
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            {isExecuting ? 'Executando...' : 'Executar Fluxo'}
          </Button>
        )}
      </div>
    </header>
  );
}
