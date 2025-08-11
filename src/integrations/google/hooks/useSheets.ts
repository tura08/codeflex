import { useState } from "react";
import { listSpreadsheets, getSheetTabs, getSheetValues } from "@/lib/google/api";

export function useSheets() {
  const [loading, setLoading] = useState(false);

  async function fetchSpreadsheets() {
    setLoading(true);
    try {
      const items = await listSpreadsheets();
      return items.map((f) => ({ id: f.id, name: f.name })) as {id:string;name:string;}[];
    } finally {
      setLoading(false);
    }
  }

  async function fetchTabs(spreadsheetId: string) {
    return getSheetTabs(spreadsheetId);
  }

  async function fetchPreview(spreadsheetId: string, sheetName: string, headerRow: number, maxRows: number) {
    const values = await getSheetValues(spreadsheetId, sheetName); // A:Z for now
    const hIdx = Math.max(1, headerRow) - 1;
    const headers = (values[hIdx] ?? []).map((h: any) => String(h ?? "").trim() || "Unnamed");
    const rows = values.slice(hIdx + 1).slice(0, Math.max(1, maxRows));
    return { headers, rows };
  }

  return { loading, fetchSpreadsheets, fetchTabs, fetchPreview };
}
