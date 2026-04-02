import { create } from 'zustand';
import {
  Node,
  Edge,
  Connection,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from 'reactflow';
import { CollectionInfo, FlowNodeData, FlowEdgeData, NodeExecutionResult, DataMapping } from '@/types/api-flow';

interface FlowState {
  // Collection
  collection: CollectionInfo | null;
  setCollection: (collection: CollectionInfo) => void;

  // Nodes & edges
  nodes: Node<FlowNodeData>[];
  edges: Edge<FlowEdgeData>[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addEndpointNode: (endpointId: string, position: { x: number; y: number }) => void;

  // Selection
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;

  // Execution
  isExecuting: boolean;
  setExecuting: (v: boolean) => void;
  setNodeExecutionResult: (nodeId: string, result: NodeExecutionResult) => void;
  clearExecutionResults: () => void;

  // Node overrides
  updateNodeOverrides: (nodeId: string, overrides: FlowNodeData['overrides']) => void;

  // Edge mappings
  updateEdgeMappings: (edgeId: string, mappings: DataMapping[]) => void;
}

export const useFlowStore = create<FlowState>((set, get) => ({
  collection: null,
  setCollection: (collection) => set({ collection, nodes: [], edges: [], selectedNodeId: null, selectedEdgeId: null }),

  nodes: [],
  edges: [],

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    const newEdge: Edge<FlowEdgeData> = {
      ...connection,
      id: `e-${connection.source}-${connection.target}`,
      type: 'smoothstep',
      animated: true,
      data: { mappings: [] },
    } as Edge<FlowEdgeData>;
    set({ edges: addEdge(newEdge, get().edges) });
  },

  addEndpointNode: (endpointId, position) => {
    const { collection, nodes } = get();
    if (!collection) return;
    const endpoint = collection.endpoints.find(e => e.id === endpointId);
    if (!endpoint) return;

    // Don't add duplicates
    if (nodes.some(n => n.data.endpoint.id === endpointId)) return;

    const newNode: Node<FlowNodeData> = {
      id: `node-${endpointId}`,
      type: 'apiNode',
      position,
      data: { endpoint },
    };
    set({ nodes: [...nodes, newNode] });
  },

  selectedNodeId: null,
  selectedEdgeId: null,
  setSelectedNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  setSelectedEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

  isExecuting: false,
  setExecuting: (v) => set({ isExecuting: v }),

  setNodeExecutionResult: (nodeId, result) => {
    set({
      nodes: get().nodes.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, executionResult: result } } : n
      ),
    });
  },

  clearExecutionResults: () => {
    set({
      nodes: get().nodes.map(n => ({
        ...n,
        data: { ...n.data, executionResult: undefined },
      })),
    });
  },

  updateNodeOverrides: (nodeId, overrides) => {
    set({
      nodes: get().nodes.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, overrides } } : n
      ),
    });
  },

  updateEdgeMappings: (edgeId, mappings) => {
    set({
      edges: get().edges.map(e =>
        e.id === edgeId ? { ...e, data: { ...e.data, mappings } } : e
      ),
    });
  },
}));
