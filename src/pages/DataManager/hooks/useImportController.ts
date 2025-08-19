import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSheets } from "@/integrations/google/hooks/useSheets";
import type { GroupingConfig } from "@/lib/google/grouping";
import { createDatasetWithSource, saveDatasetColumns } from "@/lib/google/datasets";
import { appendImportSingleTable } from "@/lib/google/append-import";
import { getOrCreateSheetSource } from "@/lib/google/sheets-sources";
import { inferType, normalizeHeader, coerce } from "@/lib/google/infer";
import type { Mapping } from "../../../integrations/google/types";

/** helpers */
const isCellBlank = (v: unknown) => v == null || (typeof v === "string" && v.trim() === "");
const isRowBlank = (row: any[]) => Array.isArray(row) && row.every(isCellBlank);

export type ImportControllerValue = {
  source: {
    spreadsheetId: string; setSpreadsheetId: (v: string) => void;
    sheetName: string; setSheetName: (v: string) => void;
    headerRow: number; setHeaderRow: (v: number) => void;
    maxRows: number; setMaxRows: (v: number) => void;
    datasetName: string; setDatasetName: (v: string) => void;
    loadPreview: (opts?: { spreadsheetId?: string; sheetName?: string; headerRow?: number; maxRows?: number }) => Promise<void>;
  };
  pipeline: {
    headers: string[];
    rows: any[][];
    rawRows: any[][];
    mapping: Mapping[];
    setMapping: React.Dispatch<React.SetStateAction<Mapping[]>>;
  };
  dataset: { records: any[] };
  grouping: {
    enabled: boolean; setEnabled: (v: boolean) => void;
    config: GroupingConfig | null; setConfig: (c: GroupingConfig | null) => void;
  };
  save: { saving: boolean; run: () => Promise<void> };
};

export function useImportControllerLogic(): ImportControllerValue {
  const { fetchPreview } = useSheets();

  // source
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [headerRow, setHeaderRow] = useState(1);
  const [maxRows, setMaxRows] = useState(200);
  const [datasetName, setDatasetName] = useState("");

  // preview core
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [mapping, setMapping] = useState<Mapping[]>([]);

  // derived: always drop truly empty rows
  const rows = useMemo(() => rawRows.filter((r) => !isRowBlank(r)), [rawRows]);

  // load preview (no hook-level loading anymore)
  const loadPreview = useCallback(async (opts?: { spreadsheetId?: string; sheetName?: string; headerRow?: number; maxRows?: number }) => {
    const sid = opts?.spreadsheetId ?? spreadsheetId;
    const tab = opts?.sheetName ?? sheetName;
    const hdr = opts?.headerRow ?? headerRow;
    const lim = opts?.maxRows ?? maxRows;
    if (!sid || !tab) {
      toast.error("Missing source", { description: "Pick a spreadsheet and tab first." });
      return;
    }
    const { headers: H, rows: R } = await fetchPreview(sid, tab, hdr, lim);
    setHeaders(H);
    setRawRows(R);

    // simple initial mapping
    const used = new Set<string>();
    const inferred: Mapping[] = H.map((h, i) => ({
      map_from: h,
      name: normalizeHeader(h, i, used),
      type: inferType(R.map((r) => r?.[i])),
    }));
    setMapping(inferred);

    if (!datasetName) setDatasetName(tab);
    toast.success("Preview loaded", { description: `${tab} — first ${lim} rows` });
  }, [fetchPreview, spreadsheetId, sheetName, headerRow, maxRows, datasetName]);

  // dataset records (kept for now since your GroupingView uses controller.dataset.records)
  const records = useMemo(() => {
    if (!rows?.length || !headers?.length || !mapping?.length) return [];
    const idx: Record<string, number> = {};
    headers.forEach((h, i) => (idx[h] = i));
    return rows.map((r) => {
      const obj: Record<string, any> = {};
      for (const m of mapping) {
        const i = idx[m.map_from];
        const v = i >= 0 ? r?.[i] : null;
        obj[m.name] = coerce(v, m.type, { dayFirst: true });
      }
      return obj;
    });
  }, [rows, headers, mapping]);

  // grouping
  const [groupingEnabled, setGroupingEnabled] = useState(false);
  const [groupingConfig, setGroupingConfig] = useState<GroupingConfig | null>(null);

  // save
  const [saving, setSaving] = useState(false);
  const save = useCallback(async () => {
    if (!records || records.length === 0) {
      toast.error("Nothing to import", { description: "Load and map some rows first." });
      return;
    }
    if (!spreadsheetId || !sheetName) {
      toast.error("Missing source", { description: "Pick a spreadsheet and tab first." });
      return;
    }
    setSaving(true);
    try {
      const { id: sourceId } = await getOrCreateSheetSource({ spreadsheetId, sheetName, headerRow });
      const label = datasetName || sheetName;
      const { id: datasetId } = await createDatasetWithSource({
        name: label,
        source_id: sourceId,
        grouping_enabled: groupingEnabled,
        grouping_config: groupingEnabled ? (groupingConfig ?? null) : null,
      });
      await saveDatasetColumns({ dataset_id: datasetId, mapping });
      const res = await appendImportSingleTable({
        datasetId,
        records,
        groupingEnabled,
        groupingConfig: groupingEnabled ? (groupingConfig ?? undefined) : undefined,
      });
      toast.success("Import complete", {
        description: groupingEnabled
          ? `Parents: ${res.parents} · Children: ${res.children} · Batch: ${res.import_batch_id}`
          : `Rows: ${res.rows} · Batch: ${res.import_batch_id}`,
      });
    } catch (e: any) {
      toast.error("Import failed", { description: e?.message ?? "Unknown error" });
    } finally {
      setSaving(false);
    }
  }, [records, spreadsheetId, sheetName, headerRow, datasetName, groupingEnabled, groupingConfig, mapping]);

  return {
    source: {
      spreadsheetId, setSpreadsheetId,
      sheetName, setSheetName,
      headerRow, setHeaderRow,
      maxRows, setMaxRows,
      datasetName, setDatasetName,
      loadPreview,
    },
    pipeline: {
      headers, rows, rawRows, mapping, setMapping,
    },
    dataset: { records },
    grouping: {
      enabled: groupingEnabled,
      setEnabled: setGroupingEnabled,
      config: groupingConfig,
      setConfig: setGroupingConfig,
    },
    save: { saving, run: save },
  };
}
