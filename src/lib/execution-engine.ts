import { Node, Edge } from 'reactflow';
import { FlowNodeData, FlowEdgeData, DataMapping, NodeExecutionResult, FieldValidationResult } from '@/types/api-flow';

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

  return { headers, body: JSON.stringify(bodyObj), queryParams, url };
}

function validateFields(responseData: unknown, nodeData: FlowNodeData): FieldValidationResult[] {
  const validations = nodeData.fieldValidations;
  if (!validations || validations.length === 0) return [];

  return validations.map(v => {
    const value = resolveFieldPath(responseData, v.fieldPath);
    let actualType: string;
    if (value === undefined || value === null) {
      actualType = 'null';
    } else if (Array.isArray(value)) {
      actualType = 'array';
    } else {
      actualType = typeof value;
    }

    return {
      fieldPath: v.fieldPath,
      expectedType: v.expectedType,
      actualType,
      actualValue: value,
      passed: actualType === v.expectedType,
    };
  });
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

      const incomingEdges = edges.filter(e => e.target === nodeId);
      let headers: Record<string, string> = { ...ep.headers, ...node.data.overrides?.headers };
      let body = node.data.overrides?.body || ep.body || '';
      let queryParams: Record<string, string> = { ...ep.queryParams, ...node.data.overrides?.queryParams };
      let url = ep.path;

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

      const cleanBase = baseUrl.replace(/\/$/, '');
      const cleanPath = url.startsWith('/') ? url : '/' + url;
      let finalUrl = cleanBase + cleanPath;

      const qsEntries = Object.entries(queryParams).filter(([, v]) => v);
      if (qsEntries.length) {
        finalUrl += '?' + qsEntries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
      }

      if (body && !headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
      }

      const fetchOptions: RequestInit = { method: ep.method, headers };
      if (['POST', 'PUT', 'PATCH'].includes(ep.method) && body) {
        fetchOptions.body = body;
      }

      const response = await fetch(finalUrl, fetchOptions);
      const duration = Math.round(performance.now() - startTime);

      let responseBody: string;
      let parsedResponse: unknown;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await response.json();
        responseBody = JSON.stringify(json, null, 2);
        parsedResponse = json;
        results.set(nodeId, json);
      } else {
        responseBody = await response.text();
        try {
          const parsed = JSON.parse(responseBody);
          parsedResponse = parsed;
          results.set(nodeId, parsed);
        } catch {
          parsedResponse = { _text: responseBody };
          results.set(nodeId, parsedResponse);
        }
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((v, k) => { responseHeaders[k] = v; });

      // Status code validation
      const expectedCodes = node.data.expectedStatusCodes;
      const statusCodeValidation = expectedCodes && expectedCodes.length > 0
        ? { expected: expectedCodes, actual: response.status, passed: expectedCodes.includes(response.status) }
        : undefined;

      // Field validations
      const fieldValidationResults = validateFields(parsedResponse, node.data);

      const allValidationsPassed = (
        (!statusCodeValidation || statusCodeValidation.passed) &&
        fieldValidationResults.every(r => r.passed)
      );

      const baseStatus = response.ok ? 'success' : 'error';
      const finalStatus = allValidationsPassed ? baseStatus : 'error';

      const errors: string[] = [];
      if (!response.ok) errors.push(`HTTP ${response.status}`);
      if (statusCodeValidation && !statusCodeValidation.passed) {
        errors.push(`Status esperado [${statusCodeValidation.expected.join(', ')}], recebido ${statusCodeValidation.actual}`);
      }
      const failedFields = fieldValidationResults.filter(r => !r.passed);
      if (failedFields.length > 0) {
        errors.push(failedFields.map(f => `Campo "${f.fieldPath}": esperado ${f.expectedType}, recebido ${f.actualType}`).join('; '));
      }

      callbacks.onNodeComplete(nodeId, {
        status: finalStatus as 'success' | 'error',
        statusCode: response.status,
        responseBody,
        responseHeaders,
        duration,
        error: errors.length > 0 ? errors.join(' | ') : undefined,
        statusCodeValidation,
        fieldValidationResults,
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
