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
    const values = await getSheetValues(spreadsheetId, sheetName); // dynamic width now
    const hIdx = Math.max(1, headerRow) - 1;

    // 1) headers
    const headerRaw = (values[hIdx] ?? []) as any[];
    const headers = headerRaw.map((h) => String(h ?? "").trim() || "Unnamed");

    // 2) rows (normalize each row to headers.length)
    const width = headers.length;
    const matrix = values
      .slice(hIdx + 1)
      .slice(0, Math.max(1, maxRows))
      .map((r) => {
        const out = new Array(width);
        for (let i = 0; i < width; i++) out[i] = r?.[i] ?? "";
        return out;
      });

    return { headers, rows: matrix };
  }

  return { loading, fetchSpreadsheets, fetchTabs, fetchPreview };
}
