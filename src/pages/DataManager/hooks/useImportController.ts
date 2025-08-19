import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSheets } from "@/integrations/google/hooks/useSheets";
import type { GroupingConfig } from "@/lib/google/grouping";
import { createDatasetWithSource, saveDatasetColumns } from "@/lib/google/datasets";
import { appendImportSingleTable } from "@/lib/google/append-import";
import { getOrCreateSheetSource } from "@/lib/google/sheets-sources";
import { applyRules, validate, qualityFromIssues, type TransformRule } from "@/lib/google/sheets-import";
import { inferType, normalizeHeader, coerce } from "@/lib/google/infer";
import type { Mapping } from "../../../integrations/google/types";

/** Public shape consumed by the Provider/context. */
export type ImportControllerValue = {
  dialog: {
    open: boolean;
    openConnect: () => void;
    closeConnect: () => void;
  };

  source: {
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
    loadPreview: (opts?: { spreadsheetId?: string; sheetName?: string; headerRow?: number; maxRows?: number }) => Promise<void>;
  };

  pipeline: {
    data: {
      headers: string[];
      rows: any[][];
      rawRows: any[];
      mapping: Mapping[];
      issues: any[];
      stats: any;
    };
    rules: {
      normalizeDates: boolean;
      normalizeCurrency: boolean;
      removeEmptyRows: boolean;
      removeMostlyEmptyRows: boolean;
      mostlyThreshold: number;
    };
    setRules: {
      setNormalizeDates: (v: boolean) => void;
      setNormalizeCurrency: (v: boolean) => void;
      setRemoveEmptyRows: (v: boolean) => void;
      setRemoveMostlyEmptyRows: (v: boolean) => void;
      setMostlyThreshold: (v: number) => void;
      setMapping: React.Dispatch<React.SetStateAction<Mapping[]>>;
    };
    skipped: { empty?: number; mostly?: number };
    loading: boolean;
    actions: {
      recompute: (baseRows?: any[] | any[][], opts?: { keepMapping?: boolean }) => void;
    };
  };

  dataset: {
    records: any[];
    availableFields: string[];
  };

  grouping: {
    enabled: boolean;
    setEnabled: (v: boolean) => void;
    config: GroupingConfig | null;
    setConfig: (c: GroupingConfig | null) => void;
  };

  save: {
    saving: boolean;
    run: () => Promise<void>;
  };
};

/** Small helpers */
const isCellBlank = (v: unknown) => v == null || (typeof v === "string" && v.trim() === "");
const isRowBlank = (row: any[]) => row.every(isCellBlank);
const isRowMostlyBlank = (row: any[], threshold = 0.8) => {
  const blanks = row.filter(isCellBlank).length;
  return row.length > 0 && blanks / row.length >= threshold;
};
const pickColumnsByType = (mapping: Mapping[], t: "string" | "number" | "boolean" | "date") =>
  mapping.filter((m) => m.type === t).map((m) => m.map_from);

/**
 * Pure logic hook. No JSX. Safe in .ts.
 * Provider will call this and put the value into context.
 */
export function useImportControllerLogic(): ImportControllerValue {
  const { fetchPreview } = useSheets();

  /** dialog */
  const [connectOpen, setConnectOpen] = useState(false);
  const openConnect = () => setConnectOpen(true);
  const closeConnect = () => setConnectOpen(false);

  /** source */
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [headerRow, setHeaderRow] = useState(1);
  const [maxRows, setMaxRows] = useState(200);
  const [datasetName, setDatasetName] = useState("");

  /** pipeline core */
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [mapping, setMapping] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(false);

  /** rules (single object internally) */
  const [rules, setRules] = useState({
    trimSpaces: false,
    normalizeDates: false,
    normalizeCurrency: false,
    skipEmpty: true,
    skipMostlyEmpty: false,
    mostlyThreshold: 0.8,
  });

  // Back-compatible getters/setters that UI uses
  const normalizeDates = rules.normalizeDates;
  const setNormalizeDates = (v: boolean) => setRules((s) => ({ ...s, normalizeDates: v }));
  const normalizeCurrency = rules.normalizeCurrency;
  const setNormalizeCurrency = (v: boolean) => setRules((s) => ({ ...s, normalizeCurrency: v }));
  const removeEmptyRows = rules.skipEmpty;
  const setRemoveEmptyRows = (v: boolean) => setRules((s) => ({ ...s, skipEmpty: v }));
  const removeMostlyEmptyRows = rules.skipMostlyEmpty;
  const setRemoveMostlyEmptyRows = (v: boolean) => setRules((s) => ({ ...s, skipMostlyEmpty: v }));
  const mostlyThreshold = rules.mostlyThreshold;
  const setMostlyThreshold = (v: number) => setRules((s) => ({ ...s, mostlyThreshold: v }));

  /** derived: skipped counts */
  const skipped = useMemo(() => {
    let empty = 0, mostly = 0;
    for (const r of rawRows) {
      if (rules.skipEmpty && isRowBlank(r)) { empty += 1; continue; }
      if (rules.skipMostlyEmpty && isRowMostlyBlank(r, rules.mostlyThreshold)) { mostly += 1; }
    }
    return { empty, mostly };
  }, [rawRows, rules]);

  /** derived: base rows and transforms */
  const baseRows = useMemo(() => {
    if (!rawRows.length) return [];
    return rawRows.filter((r) => {
      if (rules.skipEmpty && isRowBlank(r)) return false;
      if (rules.skipMostlyEmpty && isRowMostlyBlank(r, rules.mostlyThreshold)) return false;
      return true;
    });
  }, [rawRows, rules]);

  const buildTransformRules = useCallback((mappingRef: Mapping[], columns: string[]): TransformRule[] => {
    if (!columns.length) return [];
    const list: TransformRule[] = [];
    if (rules.trimSpaces) list.push({ kind: "trim", columns });
    if (!mappingRef.length) return list;
    const dateCols = pickColumnsByType(mappingRef, "date");
    const numCols  = pickColumnsByType(mappingRef, "number");
    if (rules.normalizeDates && dateCols.length) list.push({ kind: "parseDate", columns: dateCols, dayFirst: true });
    if (rules.normalizeCurrency && numCols.length) list.push({ kind: "parseCurrency", columns: numCols });
    return list;
  }, [rules]);

  const rows = useMemo(() => {
    if (!headers.length || !baseRows.length) return [];
    const transforms = buildTransformRules(mapping, headers);
    return applyRules(baseRows, headers, transforms);
  }, [headers, baseRows, mapping, buildTransformRules]);

  const issues = useMemo(() => {
    if (!headers.length || !rows.length) return [];
    const types = mapping.map((c) => c.type);
    return validate(rows, headers, types);
  }, [rows, headers, mapping]);

  const stats = useMemo(
    () => qualityFromIssues(rows.length, headers.length, issues),
    [rows.length, headers.length, issues]
  );

  /** load preview (fetch + infer initial mapping) */
  const loadPreview = useCallback(async (opts?: { spreadsheetId?: string; sheetName?: string; headerRow?: number; maxRows?: number }) => {
    const sid = opts?.spreadsheetId ?? spreadsheetId;
    const tab = opts?.sheetName ?? sheetName;
    const hdr = opts?.headerRow ?? headerRow;
    const lim = opts?.maxRows ?? maxRows;
    if (!sid || !tab) {
      toast.error("Missing source", { description: "Pick a spreadsheet and tab first." });
      return;
    }
    setLoading(true);
    try {
      const { headers: H, rows: R } = await fetchPreview(sid, tab, hdr, lim);
      setHeaders(H);
      setRawRows(R);

      // initial mapping from trimmed rows for better type inference
      const initialRules: TransformRule[] = rules.trimSpaces ? [{ kind: "trim", columns: H }] : [];
      const trimmed = applyRules(R, H, initialRules);

      const used = new Set<string>();
      const inferred: Mapping[] = H.map((h, i) => ({
        map_from: h,
        name: normalizeHeader(h, i, used),
        type: inferType(trimmed.map((r) => r[i])),
      }));
      setMapping(inferred);

      if (!datasetName) setDatasetName(tab);
      closeConnect();
      toast.success("Preview loaded", { description: `${tab} — first ${lim} rows` });
    } finally {
      setLoading(false);
    }
  }, [fetchPreview, spreadsheetId, sheetName, headerRow, maxRows, rules.trimSpaces, datasetName]);

  /** recompute: no-op (derived values track mapping/rules automatically) */
  const recompute = useCallback((_baseRows?: any[] | any[][], _opts?: { keepMapping?: boolean }) => {}, []);

  /** dataset (final objects) */
  const records = useMemo(() => {
    if (!rows?.length || !headers?.length || !mapping?.length) return [];
    const idx: Record<string, number> = {};
    headers.forEach((h, i) => (idx[h] = i));
    return rows.map((r) => {
      const obj: Record<string, any> = {};
      for (const m of mapping) {
        const i = idx[m.map_from];
        const v = i >= 0 ? r[i] : null;
        obj[m.name] = coerce(v, m.type, { dayFirst: true });
      }
      return obj;
    });
  }, [rows, headers, mapping]);

  const availableFields = useMemo(() => mapping.map((m) => m.name), [mapping]);

  /** grouping */
  const [groupingEnabled, setGroupingEnabled] = useState(false);
  const [groupingConfig, setGroupingConfig] = useState<GroupingConfig | null>(null);

  /** save flow */
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

  /** grouped value */
  const value: ImportControllerValue = {
    dialog: { open: connectOpen, openConnect, closeConnect },
    source: {
      spreadsheetId, setSpreadsheetId,
      sheetName, setSheetName,
      headerRow, setHeaderRow,
      maxRows, setMaxRows,
      datasetName, setDatasetName,
      loadPreview,
    },
    pipeline: {
      data: { headers, rows, rawRows, mapping, issues, stats },
      rules: {
        normalizeDates, normalizeCurrency,
        removeEmptyRows, removeMostlyEmptyRows, mostlyThreshold,
      },
      setRules: {
        setNormalizeDates, setNormalizeCurrency,
        setRemoveEmptyRows, setRemoveMostlyEmptyRows, setMostlyThreshold,
        setMapping,
      },
      skipped,
      loading,
      actions: { recompute },
    },
    dataset: { records, availableFields },
    grouping: {
      enabled: groupingEnabled,
      setEnabled: setGroupingEnabled,
      config: groupingConfig,
      setConfig: setGroupingConfig,
    },
    save: { saving, run: save },
  };

  return value;
}
