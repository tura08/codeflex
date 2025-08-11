import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSheets } from "../hooks/useSheets";

export function SpreadsheetSelect({
  value, onChange,
}: { value?: string; onChange: (id: string) => void; }) {
  const { loading, fetchSpreadsheets } = useSheets();
  const [files, setFiles] = useState<{id:string;name:string}[]>([]);

  useEffect(() => { (async () => setFiles(await fetchSpreadsheets()))(); }, []);

  return (
    <div className="flex items-center gap-3">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[480px]"><SelectValue placeholder="Select a spreadsheet" /></SelectTrigger>
        <SelectContent className="max-h-72">
          {files.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button variant="outline" className="cursor-pointer" onClick={async()=>setFiles(await fetchSpreadsheets())} disabled={loading}>
        {loading ? "Loading…" : "Reload"}
      </Button>
    </div>
  );
}
