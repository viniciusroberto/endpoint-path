export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface ApiEndpoint {
  id: string;
  method: HttpMethod;
  path: string;
  name: string;
  description?: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  pathParams: string[];
  body?: string;
  exampleResponse?: string;
}

export interface CollectionInfo {
  name: string;
  baseUrl: string;
  description?: string;
  endpoints: ApiEndpoint[];
}

export type NodeExecutionStatus = 'idle' | 'running' | 'success' | 'error';

export interface NodeExecutionResult {
  status: NodeExecutionStatus;
  statusCode?: number;
  responseBody?: string;
  responseHeaders?: Record<string, string>;
  duration?: number;
  error?: string;
}

export interface DataMapping {
  id: string;
  sourceField: string;
  targetField: string;
  targetLocation: 'body' | 'header' | 'query' | 'path';
}

export interface FlowEdgeData {
  mappings: DataMapping[];
}

export interface FlowNodeData {
  endpoint: ApiEndpoint;
  executionResult?: NodeExecutionResult;
  overrides?: {
    headers?: Record<string, string>;
    body?: string;
    queryParams?: Record<string, string>;
  };
}
