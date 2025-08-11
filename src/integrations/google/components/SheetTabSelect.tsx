import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSheets } from "../hooks/useSheets";

export function SheetTabSelect({
  spreadsheetId, value, onChange,
}: { spreadsheetId?: string; value?: string; onChange: (name: string) => void; }) {
  const { fetchTabs } = useSheets();
  const [tabs, setTabs] = useState<{id:number;name:string}[]>([]);

  useEffect(() => {
    if (!spreadsheetId) return;
    (async () => setTabs(await fetchTabs(spreadsheetId)))();
  }, [spreadsheetId]);

  if (!spreadsheetId) return null;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select a tab" /></SelectTrigger>
      <SelectContent>
        {tabs.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
