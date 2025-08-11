import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { SimpleType } from "@/lib/google/infer";
import type { Mapping } from "./index";

export function MappingEditor(props: {
  mapping: Mapping[];
  setMapping: (m: Mapping[]) => void;
  datasetName: string;
  setDatasetName: (s: string) => void;
  onCreateDatasetAndImport: () => void;
  onGenerateSQL: () => void;
  sqlPreview: string;
  onCopySQL: () => void;
}) {
  const { mapping, setMapping, datasetName, setDatasetName,
          onCreateDatasetAndImport, onGenerateSQL,
          sqlPreview, onCopySQL } = props;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm">Dataset/Table name:</span>
        <Input className="w-[360px]" value={datasetName} onChange={(e)=>setDatasetName(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {mapping.map((m, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input className="w-48" value={m.name}
              onChange={(e)=>setMapping(mapping.map((x,i)=> i===idx? {...x, name: e.target.value}: x))} />
            <Select value={m.type} onValueChange={(v)=>setMapping(mapping.map((x,i)=> i===idx? {...x, type: v as SimpleType}: x))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="string">string</SelectItem>
                <SelectItem value="number">number</SelectItem>
                <SelectItem value="boolean">boolean</SelectItem>
                <SelectItem value="date">date</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">← {m.map_from}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button className="cursor-pointer" onClick={onCreateDatasetAndImport} >
          Create Dataset + Import Preview
        </Button>
        <Button variant="outline" className="cursor-pointer" onClick={onGenerateSQL}>
          Generate SQL (CREATE TABLE)
        </Button>
        {!!sqlPreview && (
          <Button variant="secondary" className="cursor-pointer" onClick={onCopySQL}>
            Copy SQL
          </Button>
        )}
      </div>

      {!!sqlPreview && (
        <pre className="mt-2 whitespace-pre-wrap rounded bg-muted p-3 text-xs">{sqlPreview}</pre>
      )}
    </div>
  );
}
