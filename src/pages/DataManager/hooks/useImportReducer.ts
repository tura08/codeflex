// pages/DataManager/hooks/useImportReducer.ts
import { useCallback, useMemo, useReducer } from "react";
import { toast } from "sonner";
import { getSheetValues } from "@/lib/google/api";
import type { GroupingConfig } from "@/lib/google/grouping";

import {
  normalizeSheetValues,
  filterBlankRows,
  buildInitialMappingFromRows,
  mapRowsToRecords,
  removeRowsByIndex,
  reconcileMappingTypes,
} from "@/lib/google/transform";

import { getOrCreateSheetSource } from "@/lib/google/sheets-sources";
import { createDatasetWithSource, saveDatasetColumns } from "@/lib/google/datasets";
import { appendImportSingleTable } from "@/lib/google/append-import";

export type SimpleType = "string" | "number" | "boolean" | "date";
export type Mapping = {
  name: string;
  type: SimpleType;
  map_from: string;
  /** set to true when the user manually changes the column type */
  locked?: boolean;
};

type State = {
  // source
  spreadsheetId: string;
  sheetName: string;
  headerRow: number;
  maxRows: number;

  // preview + meta
  headers: string[];
  rows: any[][];
  rawRows: any[][];
  mapping: Mapping[];
  datasetName: string;

  loading: boolean;
  saving: boolean;
  error?: string | null;

  // selection
  selectedRowIdx: Set<number>;

  // grouping
  groupingEnabled: boolean;
  groupingConfig?: GroupingConfig | null;
};

type Action =
  | { type: "UPDATE_SOURCE"; patch: Partial<Pick<State, "spreadsheetId" | "sheetName" | "headerRow" | "maxRows">> }
  | { type: "LOAD_PREVIEW_START" }
  | { type: "LOAD_PREVIEW_SUCCESS"; headers: string[]; rows: any[][]; sheetName: string }
  | { type: "LOAD_PREVIEW_ERROR"; error: string }
  | { type: "SET_MAPPING"; mapping: Mapping[] }
  | { type: "SET_DATASET_NAME"; name: string }
  | { type: "SET_GROUPING_ENABLED"; enabled: boolean }
  | { type: "SET_GROUPING_CONFIG"; config: GroupingConfig | null }
  // selection & row ops
  | { type: "TOGGLE_ROW_SELECTED"; index: number }
  | { type: "CLEAR_SELECTION" }
  | { type: "SELECT_ROWS"; indices: number[] }
  | { type: "REMOVE_SELECTED_ROWS" }
  // save
  | { type: "SAVE_START" }
  | { type: "SAVE_SUCCESS" }
  | { type: "SAVE_ERROR"; error: string };

const initialState: State = {
  spreadsheetId: "",
  sheetName: "",
  headerRow: 1,
  maxRows: 200,

  headers: [],
  rows: [],
  rawRows: [],
  mapping: [],
  datasetName: "",

  loading: false,
  saving: false,
  error: null,

  selectedRowIdx: new Set<number>(),

  groupingEnabled: false,
  groupingConfig: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "UPDATE_SOURCE":
      return { ...state, ...action.patch };

    case "LOAD_PREVIEW_START":
      return { ...state, loading: true, error: null };

    case "LOAD_PREVIEW_SUCCESS": {
      // always drop fully blank rows here
      const filtered = filterBlankRows(action.rows);

      // initialize mapping if empty (robust inference from current rows)
      const mapping =
        state.mapping.length > 0
          ? state.mapping
          : buildInitialMappingFromRows(action.headers, filtered);

      const datasetName = state.datasetName || action.sheetName || "dataset";

      return {
        ...state,
        headers: action.headers,
        rawRows: action.rows,
        rows: filtered,
        mapping,
        datasetName,
        loading: false,
        error: null,
        selectedRowIdx: new Set<number>(), // reset selection on new preview
      };
    }

    case "LOAD_PREVIEW_ERROR":
      return { ...state, loading: false, error: action.error };

    case "SET_MAPPING": {
      // If user changed a type, mark that column as locked so later re-infers won't overwrite it
      const next = action.mapping.map((m) => {
        const prev = state.mapping.find((x) => x.map_from === m.map_from && x.name === m.name);
        const typeChanged = prev && prev.type !== m.type;
        return typeChanged ? { ...m, locked: true } : m;
      });
      return { ...state, mapping: next };
    }

    case "SET_DATASET_NAME":
      return { ...state, datasetName: action.name };

    case "SET_GROUPING_ENABLED":
      return { ...state, groupingEnabled: action.enabled };

    case "SET_GROUPING_CONFIG":
      return { ...state, groupingConfig: action.config };

    case "TOGGLE_ROW_SELECTED": {
      const next = new Set(state.selectedRowIdx);
      next.has(action.index) ? next.delete(action.index) : next.add(action.index);
      return { ...state, selectedRowIdx: next };
    }

    case "CLEAR_SELECTION":
      return { ...state, selectedRowIdx: new Set<number>() };

    case "SELECT_ROWS": {
      const set = new Set<number>();
      for (const i of action.indices) if (i >= 0 && i < state.rows.length) set.add(i);
      return { ...state, selectedRowIdx: set };
    }

    case "REMOVE_SELECTED_ROWS": {
      if (state.selectedRowIdx.size === 0) return state;

      // remove rows
      const newRows = removeRowsByIndex(state.rows, state.selectedRowIdx);

      // re-infer (robust) types for UNLOCKED columns only, based on the remaining rows
      const newMapping = reconcileMappingTypes(state.mapping, state.headers, newRows);

      return {
        ...state,
        rows: newRows,
        mapping: newMapping,
        selectedRowIdx: new Set<number>(),
      };
    }

    case "SAVE_START":
      return { ...state, saving: true, error: null };

    case "SAVE_SUCCESS":
      return { ...state, saving: false };

    case "SAVE_ERROR":
      return { ...state, saving: false, error: action.error };

    default:
      return state;
  }
}

export function useImportReducer(initial?: Partial<State>) {
  const [state, dispatch] = useReducer(reducer, { ...initialState, ...initial });

  /* ---------- source ---------- */
  const updateSource = useCallback(
    (patch: Partial<Pick<State, "spreadsheetId" | "sheetName" | "headerRow" | "maxRows">>) =>
      dispatch({ type: "UPDATE_SOURCE", patch }),
    []
  );

  /* ---------- load preview ---------- */
  const loadPreview = useCallback(async () => {
    const { spreadsheetId, sheetName, headerRow, maxRows } = state;
    if (!spreadsheetId || !sheetName) {
      toast.error("Missing source", { description: "Pick a spreadsheet and tab first." });
      return;
    }
    dispatch({ type: "LOAD_PREVIEW_START" });
    try {
      const values = await getSheetValues(spreadsheetId, sheetName);
      const { headers, rows } = normalizeSheetValues(values, headerRow, maxRows);
      dispatch({ type: "LOAD_PREVIEW_SUCCESS", headers, rows, sheetName });

      const removed = rows.length - filterBlankRows(rows).length;
      toast.success("Preview loaded", {
        description: `${sheetName} — first ${maxRows} rows${removed ? ` (removed ${removed} blank rows)` : ""}`,
      });
    } catch (e: any) {
      const msg = e?.message ?? "Failed to load preview";
      dispatch({ type: "LOAD_PREVIEW_ERROR", error: msg });
      toast.error("Failed to load preview", { description: msg });
    }
  }, [state]);

  /* ---------- mapping/meta ---------- */
  const setMapping = useCallback((mapping: Mapping[]) => dispatch({ type: "SET_MAPPING", mapping }), []);
  const setDatasetName = useCallback((name: string) => dispatch({ type: "SET_DATASET_NAME", name }), []);

  /* ---------- selection ops ---------- */
  const toggleRowSelected = useCallback((index: number) => dispatch({ type: "TOGGLE_ROW_SELECTED", index }), []);
  const clearSelection = useCallback(() => dispatch({ type: "CLEAR_SELECTION" }), []);
  const selectRows = useCallback((indices: number[]) => dispatch({ type: "SELECT_ROWS", indices }), []);
  const removeSelectedRows = useCallback(() => dispatch({ type: "REMOVE_SELECTED_ROWS" }), []);

  /* ---------- derived: records ---------- */
  const records = useMemo(
    () => mapRowsToRecords(state.rows, state.headers, state.mapping),
    [state.rows, state.headers, state.mapping]
  );

  /* ---------- grouping ---------- */
  const setGroupingEnabled = useCallback(
    (enabled: boolean) => dispatch({ type: "SET_GROUPING_ENABLED", enabled }),
    []
  );
  const setGroupingConfig = useCallback(
    (config: GroupingConfig | null) => dispatch({ type: "SET_GROUPING_CONFIG", config }),
    []
  );

  /* ---------- save pipeline ---------- */
  const saveImport = useCallback(async () => {
    const {
      spreadsheetId,
      sheetName,
      headerRow,
      datasetName,
      groupingEnabled,
      groupingConfig,
      mapping,
    } = state;

    if (!records.length) {
      toast.error("Nothing to import", { description: "Load and map some rows first." });
      return;
    }
    if (!spreadsheetId || !sheetName) {
      toast.error("Missing source", { description: "Pick a spreadsheet and tab first." });
      return;
    }

    dispatch({ type: "SAVE_START" });
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

      dispatch({ type: "SAVE_SUCCESS" });
      toast.success("Import complete", {
        description: groupingEnabled
          ? `Parents: ${res.parents} · Children: ${res.children} · Batch: ${res.import_batch_id}`
          : `Rows: ${res.rows} · Batch: ${res.import_batch_id}`,
      });
    } catch (e: any) {
      const msg = e?.message ?? "Unknown error";
      dispatch({ type: "SAVE_ERROR", error: msg });
      toast.error("Import failed", { description: msg });
    }
  }, [state, records]);

  return {
    state,
    // source
    updateSource,
    loadPreview,
    // mapping/meta
    setMapping,
    setDatasetName,
    // selection
    toggleRowSelected,
    clearSelection,
    selectRows,
    removeSelectedRows,
    // grouping
    setGroupingEnabled,
    setGroupingConfig,
    // derived
    records,
    // save
    saveImport,
  };
}
