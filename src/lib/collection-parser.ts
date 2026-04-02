import { ApiEndpoint, CollectionInfo, HttpMethod } from '@/types/api-flow';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function extractPathParams(path: string): string[] {
  const matches = path.match(/[:{](\w+)}?/g);
  return matches ? matches.map(m => m.replace(/[:{}]/g, '')) : [];
}

// --- Postman Parser ---

interface PostmanItem {
  name?: string;
  request?: {
    method?: string;
    url?: string | { raw?: string; host?: string[]; path?: string[]; query?: { key: string; value: string }[] };
    header?: { key: string; value: string }[];
    body?: { raw?: string; mode?: string };
    description?: string;
  };
  response?: { body?: string }[];
  item?: PostmanItem[];
}

interface PostmanCollection {
  info?: { name?: string; description?: string };
  variable?: { key: string; value: string }[];
  item?: PostmanItem[];
}

function flattenPostmanItems(items: PostmanItem[]): PostmanItem[] {
  const result: PostmanItem[] = [];
  for (const item of items) {
    if (item.request) {
      result.push(item);
    }
    if (item.item) {
      result.push(...flattenPostmanItems(item.item));
    }
  }
  return result;
}

function extractPostmanUrl(url: string | { raw?: string; host?: string[]; path?: string[]; query?: { key: string; value: string }[] } | undefined): { fullUrl: string; path: string; queryParams: Record<string, string> } {
  if (!url) return { fullUrl: '', path: '/', queryParams: {} };

  if (typeof url === 'string') {
    try {
      const parsed = new URL(url.replace(/\{\{[^}]+\}\}/g, 'placeholder'));
      const queryParams: Record<string, string> = {};
      parsed.searchParams.forEach((v, k) => { queryParams[k] = v; });
      return { fullUrl: url, path: parsed.pathname, queryParams };
    } catch {
      return { fullUrl: url, path: url, queryParams: {} };
    }
  }

  const queryParams: Record<string, string> = {};
  url.query?.forEach(q => { queryParams[q.key] = q.value; });
  const path = '/' + (url.path?.join('/') || '');
  return { fullUrl: url.raw || path, path, queryParams };
}

function parsePostman(json: PostmanCollection): CollectionInfo {
  const items = flattenPostmanItems(json.item || []);
  let baseUrl = '';

  // Try to extract base URL from variables or first request
  const baseUrlVar = json.variable?.find(v => v.key === 'baseUrl' || v.key === 'base_url');
  if (baseUrlVar) {
    baseUrl = baseUrlVar.value;
  } else if (items.length > 0) {
    const first = items[0];
    const { fullUrl } = extractPostmanUrl(first.request?.url);
    try {
      const parsed = new URL(fullUrl.replace(/\{\{[^}]+\}\}/g, 'https://api.example.com'));
      baseUrl = `${parsed.protocol}//${parsed.host}`;
    } catch { /* ignore */ }
  }

  const endpoints: ApiEndpoint[] = items.map(item => {
    const req = item.request;
    const { path, queryParams } = extractPostmanUrl(req?.url);
    const headers: Record<string, string> = {};
    req?.header?.forEach(h => { headers[h.key] = h.value; });

    return {
      id: generateId(),
      method: (req?.method?.toUpperCase() || 'GET') as HttpMethod,
      path: path.replace(/\{\{[^}]+\}\}/g, ''),
      name: item.name || path,
      description: typeof req?.description === 'string' ? req.description : undefined,
      headers,
      queryParams,
      pathParams: extractPathParams(path),
      body: req?.body?.raw,
      exampleResponse: item.response?.[0]?.body,
    };
  });

  return {
    name: json.info?.name || 'Imported Collection',
    baseUrl: baseUrl || 'https://api.example.com',
    description: json.info?.description as string | undefined,
    endpoints,
  };
}

// --- OpenAPI / Swagger Parser ---

interface OpenApiSpec {
  openapi?: string;
  swagger?: string;
  info?: { title?: string; description?: string };
  host?: string;
  basePath?: string;
  servers?: { url?: string }[];
  schemes?: string[];
  paths?: Record<string, Record<string, {
    summary?: string;
    description?: string;
    parameters?: { name: string; in: string; schema?: { type?: string }; example?: string }[];
    requestBody?: { content?: Record<string, { schema?: object; example?: object }> };
    responses?: Record<string, { description?: string; content?: Record<string, { schema?: object; example?: object }> }>;
  }>>;
}

function parseOpenApi(spec: OpenApiSpec): CollectionInfo {
  let baseUrl = '';

  if (spec.servers?.[0]?.url) {
    baseUrl = spec.servers[0].url;
  } else if (spec.host) {
    const scheme = spec.schemes?.[0] || 'https';
    baseUrl = `${scheme}://${spec.host}${spec.basePath || ''}`;
  }

  const endpoints: ApiEndpoint[] = [];

  if (spec.paths) {
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(method.toLowerCase())) {
          const headers: Record<string, string> = {};
          const queryParams: Record<string, string> = {};
          const pathParams: string[] = [];

          operation.parameters?.forEach(p => {
            if (p.in === 'header') headers[p.name] = p.example || '';
            if (p.in === 'query') queryParams[p.name] = p.example || '';
            if (p.in === 'path') pathParams.push(p.name);
          });

          let body: string | undefined;
          const reqContent = operation.requestBody?.content;
          if (reqContent) {
            const jsonContent = reqContent['application/json'];
            if (jsonContent?.example) {
              body = JSON.stringify(jsonContent.example, null, 2);
            }
          }

          let exampleResponse: string | undefined;
          const resp200 = operation.responses?.['200'] || operation.responses?.['201'];
          if (resp200?.content?.['application/json']?.example) {
            exampleResponse = JSON.stringify(resp200.content['application/json'].example, null, 2);
          }

          endpoints.push({
            id: generateId(),
            method: method.toUpperCase() as HttpMethod,
            path,
            name: operation.summary || `${method.toUpperCase()} ${path}`,
            description: operation.description,
            headers,
            queryParams,
            pathParams: pathParams.length ? pathParams : extractPathParams(path),
            body,
            exampleResponse,
          });
        }
      }
    }
  }

  return {
    name: spec.info?.title || 'Imported API',
    baseUrl: baseUrl || 'https://api.example.com',
    description: spec.info?.description,
    endpoints,
  };
}

// --- Main Parser ---

export function parseCollection(jsonStr: string): CollectionInfo {
  const json = JSON.parse(jsonStr);

  // Detect format
  if (json.info && json.item) {
    return parsePostman(json as PostmanCollection);
  }
  if (json.openapi || json.swagger || json.paths) {
    return parseOpenApi(json as OpenApiSpec);
  }

  throw new Error('Formato não reconhecido. Use uma collection Postman ou especificação OpenAPI/Swagger.');
}
