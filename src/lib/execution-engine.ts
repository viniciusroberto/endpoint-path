import { Node, Edge } from 'reactflow';
import { FlowNodeData, FlowEdgeData, DataMapping, NodeExecutionResult } from '@/types/api-flow';

function resolveFieldPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setFieldPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

function getExecutionOrder(nodes: Node<FlowNodeData>[], edges: Edge<FlowEdgeData>[]): string[] {
  const adjacency: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};

  nodes.forEach(n => {
    adjacency[n.id] = [];
    inDegree[n.id] = 0;
  });

  edges.forEach(e => {
    adjacency[e.source]?.push(e.target);
    inDegree[e.target] = (inDegree[e.target] || 0) + 1;
  });

  // Topological sort (Kahn's)
  const queue: string[] = [];
  for (const id of Object.keys(inDegree)) {
    if (inDegree[id] === 0) queue.push(id);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    for (const neighbor of (adjacency[current] || [])) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  return order;
}

function applyMappings(
  mappings: DataMapping[],
  sourceResponse: unknown,
  targetEndpoint: FlowNodeData
): { headers: Record<string, string>; body: string; queryParams: Record<string, string>; url: string } {
  const ep = targetEndpoint.endpoint;
  const headers: Record<string, string> = { ...ep.headers, ...targetEndpoint.overrides?.headers };
  let bodyObj: Record<string, unknown> = {};
  try {
    bodyObj = JSON.parse(targetEndpoint.overrides?.body || ep.body || '{}');
  } catch { /* ignore */ }
  const queryParams: Record<string, string> = { ...ep.queryParams, ...targetEndpoint.overrides?.queryParams };
  let url = ep.path;

  for (const mapping of mappings) {
    const value = resolveFieldPath(sourceResponse, mapping.sourceField);
    if (value === undefined) continue;

    const strValue = typeof value === 'string' ? value : JSON.stringify(value);

    switch (mapping.targetLocation) {
      case 'header':
        headers[mapping.targetField] = strValue;
        break;
      case 'body':
        setFieldPath(bodyObj, mapping.targetField, value);
        break;
      case 'query':
        queryParams[mapping.targetField] = strValue;
        break;
      case 'path':
        url = url.replace(`:${mapping.targetField}`, strValue).replace(`{${mapping.targetField}}`, strValue);
        break;
    }
  }

  return {
    headers,
    body: JSON.stringify(bodyObj),
    queryParams,
    url,
  };
}

export interface ExecutionCallbacks {
  onNodeStart: (nodeId: string) => void;
  onNodeComplete: (nodeId: string, result: NodeExecutionResult) => void;
}

export async function executeFlow(
  nodes: Node<FlowNodeData>[],
  edges: Edge<FlowEdgeData>[],
  baseUrl: string,
  callbacks: ExecutionCallbacks
): Promise<void> {
  const order = getExecutionOrder(nodes, edges);
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const results = new Map<string, unknown>();

  for (const nodeId of order) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;

    callbacks.onNodeStart(nodeId);
    const startTime = performance.now();

    try {
      const ep = node.data.endpoint;

      // Find incoming edges with mappings
      const incomingEdges = edges.filter(e => e.target === nodeId);
      let headers: Record<string, string> = { ...ep.headers, ...node.data.overrides?.headers };
      let body = node.data.overrides?.body || ep.body || '';
      let queryParams: Record<string, string> = { ...ep.queryParams, ...node.data.overrides?.queryParams };
      let url = ep.path;

      // Apply mappings from all incoming edges
      for (const edge of incomingEdges) {
        const edgeData = edge.data as FlowEdgeData | undefined;
        if (edgeData?.mappings?.length && results.has(edge.source)) {
          const mapped = applyMappings(edgeData.mappings, results.get(edge.source), node.data);
          headers = { ...headers, ...mapped.headers };
          body = mapped.body;
          queryParams = { ...queryParams, ...mapped.queryParams };
          url = mapped.url;
        }
      }

      // Build final URL
      const cleanBase = baseUrl.replace(/\/$/, '');
      const cleanPath = url.startsWith('/') ? url : '/' + url;
      let finalUrl = cleanBase + cleanPath;

      const qsEntries = Object.entries(queryParams).filter(([, v]) => v);
      if (qsEntries.length) {
        finalUrl += '?' + qsEntries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
      }

      // Set Content-Type if body exists
      if (body && !headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
      }

      const fetchOptions: RequestInit = {
        method: ep.method,
        headers,
      };

      if (['POST', 'PUT', 'PATCH'].includes(ep.method) && body) {
        fetchOptions.body = body;
      }

      const response = await fetch(finalUrl, fetchOptions);
      const duration = Math.round(performance.now() - startTime);

      let responseBody: string;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await response.json();
        responseBody = JSON.stringify(json, null, 2);
        results.set(nodeId, json);
      } else {
        responseBody = await response.text();
        try {
          const parsed = JSON.parse(responseBody);
          results.set(nodeId, parsed);
        } catch {
          results.set(nodeId, { _text: responseBody });
        }
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((v, k) => { responseHeaders[k] = v; });

      callbacks.onNodeComplete(nodeId, {
        status: response.ok ? 'success' : 'error',
        statusCode: response.status,
        responseBody,
        responseHeaders,
        duration,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      });
    } catch (err) {
      const duration = Math.round(performance.now() - startTime);
      callbacks.onNodeComplete(nodeId, {
        status: 'error',
        duration,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
}
