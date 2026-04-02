import { useState, useRef } from 'react';
import { Upload, X, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseCollection } from '@/lib/collection-parser';
import { useFlowStore } from '@/store/flow-store';
import { toast } from 'sonner';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ImportDialog({ open, onClose }: ImportDialogProps) {
  const [dragOver, setDragOver] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const setCollection = useFlowStore(s => s.setCollection);

  if (!open) return null;

  const handleImport = (content: string) => {
    try {
      const collection = parseCollection(content);
      if (collection.endpoints.length === 0) {
        toast.error('Nenhum endpoint encontrado na collection.');
        return;
      }
      setCollection(collection);
      toast.success(`${collection.endpoints.length} endpoints importados de "${collection.name}"`);
      onClose();
      setJsonText('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao importar collection.');
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleImport(content);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Importar Collection</h2>
            <p className="text-sm text-muted-foreground">Postman JSON ou OpenAPI/Swagger</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'}
          `}
        >
          <FileJson className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-foreground font-medium">Arraste um arquivo JSON aqui</p>
          <p className="text-xs text-muted-foreground mt-1">ou clique para selecionar</p>
          <input
            ref={fileRef}
            type="file"
            accept=".json,.yaml,.yml"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>

        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2">Ou cole o JSON diretamente:</p>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="w-full h-32 bg-muted border border-border rounded-lg p-3 text-xs font-mono text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder='{"info": {"name": "My API"}, ...}'
          />
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button
            className="flex-1"
            disabled={!jsonText.trim()}
            onClick={() => handleImport(jsonText)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
        </div>
      </div>
    </div>
  );
}
