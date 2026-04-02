import { HttpMethod } from '@/types/api-flow';

const METHOD_CLASSES: Record<HttpMethod, string> = {
  GET: 'bg-method-get/15 text-method-get border-method-get/30',
  POST: 'bg-method-post/15 text-method-post border-method-post/30',
  PUT: 'bg-method-put/15 text-method-put border-method-put/30',
  DELETE: 'bg-method-delete/15 text-method-delete border-method-delete/30',
  PATCH: 'bg-method-patch/15 text-method-patch border-method-patch/30',
  HEAD: 'bg-muted text-muted-foreground border-border',
  OPTIONS: 'bg-muted text-muted-foreground border-border',
};

export function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${METHOD_CLASSES[method]}`}>
      {method}
    </span>
  );
}
