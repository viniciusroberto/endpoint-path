import { useState, useCallback } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { useFlowStore } from '@/store/flow-store';
import { executeFlow } from '@/lib/execution-engine';
import { FlowHeader } from '@/components/flow/FlowHeader';
import { EndpointSidebar } from '@/components/flow/EndpointSidebar';
import { FlowCanvas } from '@/components/flow/FlowCanvas';
import { NodeDetailPanel } from '@/components/flow/NodeDetailPanel';
import { EdgeMappingPanel } from '@/components/flow/EdgeMappingPanel';
import { ImportDialog } from '@/components/flow/ImportDialog';
import { toast } from 'sonner';
import { Upload, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [importOpen, setImportOpen] = useState(false);
  const collection = useFlowStore(s => s.collection);
  const selectedNodeId = useFlowStore(s => s.selectedNodeId);
  const selectedEdgeId = useFlowStore(s => s.selectedEdgeId);

  const handleExecute = useCallback(async () => {
    const store = useFlowStore.getState();
    if (!store.collection || store.nodes.length === 0) return;

    store.setExecuting(true);
    store.clearExecutionResults();

    try {
      await executeFlow(
        store.nodes,
        store.edges,
        store.collection.baseUrl,
        {
          onNodeStart: (nodeId) => {
            store.setNodeExecutionResult(nodeId, { status: 'running' });
          },
          onNodeComplete: (nodeId, result) => {
            store.setNodeExecutionResult(nodeId, result);
          },
        }
      );
      toast.success('Fluxo executado com sucesso!');
    } catch (err) {
      toast.error('Erro ao executar fluxo: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      store.setExecuting(false);
    }
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background dark">
      <FlowHeader onImport={() => setImportOpen(true)} onExecute={handleExecute} />

      <div className="flex flex-1 overflow-hidden">
        {collection ? (
          <>
            <EndpointSidebar />
            <ReactFlowProvider>
              <FlowCanvas />
            </ReactFlowProvider>
            {selectedNodeId && <NodeDetailPanel />}
            {selectedEdgeId && !selectedNodeId && <EdgeMappingPanel />}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center animate-fade-in">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Layers className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground mb-2">API Flow Orchestrator</h1>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
                Importe uma collection Postman ou OpenAPI/Swagger para começar a construir fluxos de teste E2E visuais.
              </p>
              <Button onClick={() => setImportOpen(true)} size="lg">
                <Upload className="w-4 h-4 mr-2" />
                Importar Collection
              </Button>
            </div>
          </div>
        )}
      </div>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
};

export default Index;
