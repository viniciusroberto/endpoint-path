import { useCallback, useRef, useMemo, DragEvent } from 'react';
import ReactFlow, {
  Background,
  Controls,
  BackgroundVariant,
  NodeTypes,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useFlowStore } from '@/store/flow-store';
import { ApiNode } from './ApiNode';
import { FlowEdgeData } from '@/types/api-flow';

const nodeTypes: NodeTypes = {
  apiNode: ApiNode,
};

export function FlowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project } = useReactFlow();

  const nodes = useFlowStore(s => s.nodes);
  const edges = useFlowStore(s => s.edges);
  const onNodesChange = useFlowStore(s => s.onNodesChange);
  const onEdgesChange = useFlowStore(s => s.onEdgesChange);
  const onConnect = useFlowStore(s => s.onConnect);
  const addEndpointNode = useFlowStore(s => s.addEndpointNode);
  const setSelectedNode = useFlowStore(s => s.setSelectedNode);
  const setSelectedEdge = useFlowStore(s => s.setSelectedEdge);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const endpointId = event.dataTransfer.getData('application/endpoint-id');
      if (!endpointId || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
      addEndpointNode(endpointId, position);
    },
    [project, addEndpointNode]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={(_, node) => setSelectedNode(node.id)}
        onEdgeClick={(_, edge) => setSelectedEdge(edge.id)}
        onPaneClick={() => { setSelectedNode(null); setSelectedEdge(null); }}
        fitView
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-canvas-bg" color="hsl(var(--canvas-dot))" />
        <Controls />
      </ReactFlow>
    </div>
  );
}
