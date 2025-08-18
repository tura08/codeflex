import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSheets } from "@/integrations/google/hooks/useSheets";
import {
  usePreviewPipeline,
  type Mapping as PipeMapping,
} from "@/integrations/google/hooks/usePreviewPipeline";
import { useFinalDataset } from "@/integrations/google/hooks/useFinalDataset";
import type { GroupingConfig } from "@/lib/google/grouping";
import { createDatasetWithSource, saveDatasetColumns } from "@/lib/google/datasets";
import { appendImportSingleTable } from "@/lib/google/append-import";
import { getOrCreateSheetSource } from "@/lib/google/sheets-sources";

export type Mapping = PipeMapping;

type ControllerValue = {
  // dialog
  connectOpen: boolean;
  openConnect: () => void;
  closeConnect: () => void;

  // source selection
  spreadsheetId: string;
  setSpreadsheetId: (v: string) => void;
  sheetName: string;
  setSheetName: (v: string) => void;
  headerRow: number;
  setHeaderRow: (v: number) => void;
  maxRows: number;
  setMaxRows: (v: number) => void;
  datasetName: string;
  setDatasetName: (v: string) => void;

  // pipeline
  headers: string[];
  rows: any[][];
  rawRows: any[]; // pipeline recompute accepts any[]
  issues: any[];
  stats: any;
  mapping: Mapping[]; // array
  setMapping: React.Dispatch<React.SetStateAction<Mapping[]>>; // exact dispatch type
  loading: boolean;
  skipped: { empty?: number; mostly?: number };
  normalizeDates: boolean;
  setNormalizeDates: (v: boolean) => void;
  normalizeCurrency: boolean;
  setNormalizeCurrency: (v: boolean) => void;
  removeEmptyRows: boolean;
  setRemoveEmptyRows: (v: boolean) => void;
  removeMostlyEmptyRows: boolean;
  setRemoveMostlyEmptyRows: (v: boolean) => void;
  mostlyThreshold: number;
  setMostlyThreshold: (v: number) => void;
  recompute: (baseRows?: any[] | any[][], opts?: { keepMapping?: boolean }) => void;
  loadPreview: (opts?: {
    spreadsheetId?: string;
    sheetName?: string;
    headerRow?: number;
    maxRows?: number;
  }) => Promise<void>;

  // computed dataset
  records: any[];
  availableFields: string[];

  // grouping
  groupingEnabled: boolean;
  setGroupingEnabled: (v: boolean) => void;
  groupingConfig: GroupingConfig | null;
  setGroupingConfig: (c: GroupingConfig | null) => void;

  // save
  saving: boolean;
  save: () => Promise<void>;
};

const Ctx = createContext<ControllerValue | null>(null);

export function useImportController() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useImportController must be used within ImportControllerProvider");
  return ctx;
}

export function ImportControllerProvider({ children }: { children: React.ReactNode }) {
  const { fetchPreview } = useSheets();

  // dialog
  const [connectOpen, setConnectOpen] = useState(false);
  const openConnect = () => setConnectOpen(true);
  const closeConnect = () => setConnectOpen(false);

  // source selection
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [headerRow, setHeaderRow] = useState(1);
  const [maxRows, setMaxRows] = useState(200);
  const [datasetName, setDatasetName] = useState("");

  // pipeline
  const {
    headers,
    rows,
    rawRows,
    mapping,
    setMapping,
    issues,
    stats,
    loadPreview: loadPipelinePreview,
    recompute: pipelineRecompute,
    loading,
    normalizeDates,
    setNormalizeDates,
    normalizeCurrency,
    setNormalizeCurrency,
    removeEmptyRows,
    setRemoveEmptyRows,
    removeMostlyEmptyRows,
    setRemoveMostlyEmptyRows,
    mostlyThreshold,
    setMostlyThreshold,
    skipped,
  } = usePreviewPipeline(fetchPreview);

  const recompute = useCallback(
    (baseRows?: any[] | any[][], opts?: { keepMapping?: boolean }) => {
      // pipeline expects any[]
      // allow 1D or 2D here for UI compatibility
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pipelineRecompute(baseRows as any, opts);
    },
    [pipelineRecompute]
  );

  const loadPreview = useCallback(
    async (opts?: { spreadsheetId?: string; sheetName?: string; headerRow?: number; maxRows?: number }) => {
      const sid = opts?.spreadsheetId ?? spreadsheetId;
      const tab = opts?.sheetName ?? sheetName;
      const hdr = opts?.headerRow ?? headerRow;
      const lim = opts?.maxRows ?? maxRows;
      if (!sid || !tab) {
        toast.error("Missing source", { description: "Pick a spreadsheet and tab first." });
        return;
      }
      await loadPipelinePreview(sid, tab, hdr, lim);
      if (!datasetName) setDatasetName(tab);
      closeConnect();
      toast.success("Preview loaded", { description: `${tab} — first ${lim} rows` });
    },
    [spreadsheetId, sheetName, headerRow, maxRows, datasetName, loadPipelinePreview]
  );

  // computed dataset
  const { records, availableFields } = useFinalDataset(rows, headers, mapping);

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
        grouping_config: groupingEnabled ? groupingConfig ?? null : null,
      });
      await saveDatasetColumns({ dataset_id: datasetId, mapping });
      const res = await appendImportSingleTable({
        datasetId,
        records,
        groupingEnabled,
        groupingConfig: groupingEnabled ? groupingConfig ?? undefined : undefined,
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
  }, [
    records,
    spreadsheetId,
    sheetName,
    headerRow,
    datasetName,
    groupingEnabled,
    groupingConfig,
    mapping,
  ]);

  const value = useMemo<ControllerValue>(
    () => ({
      // dialog
      connectOpen,
      openConnect,
      closeConnect,

      // source selection
      spreadsheetId,
      setSpreadsheetId,
      sheetName,
      setSheetName,
      headerRow,
      setHeaderRow,
      maxRows,
      setMaxRows,
      datasetName,
      setDatasetName,

      // pipeline
      headers,
      rows,
      rawRows,
      issues,
      stats,
      mapping,
      setMapping,
      loading,
      skipped,
      normalizeDates,
      setNormalizeDates,
      normalizeCurrency,
      setNormalizeCurrency,
      removeEmptyRows,
      setRemoveEmptyRows,
      removeMostlyEmptyRows,
      setRemoveMostlyEmptyRows,
      mostlyThreshold,
      setMostlyThreshold,
      recompute,
      loadPreview,

      // computed
      records,
      availableFields,

      // grouping
      groupingEnabled,
      setGroupingEnabled,
      groupingConfig,
      setGroupingConfig,

      // save
      saving,
      save,
    }),
    [
      connectOpen,
      spreadsheetId,
      sheetName,
      headerRow,
      maxRows,
      datasetName,
      headers,
      rows,
      rawRows,
      issues,
      stats,
      mapping,
      loading,
      skipped,
      normalizeDates,
      normalizeCurrency,
      removeEmptyRows,
      removeMostlyEmptyRows,
      mostlyThreshold,
      records,
      availableFields,
      groupingEnabled,
      groupingConfig,
      saving,
      // stable fns
      openConnect,
      closeConnect,
      setSpreadsheetId,
      setSheetName,
      setHeaderRow,
      setMaxRows,
      setDatasetName,
      setMapping,
      setNormalizeDates,
      setNormalizeCurrency,
      setRemoveEmptyRows,
      setRemoveMostlyEmptyRows,
      setMostlyThreshold,
      recompute,
      loadPreview,
      setGroupingEnabled,
      setGroupingConfig,
      save,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
