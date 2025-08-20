// pages/DataManager/logic/reducer.ts
import type { Dispatch } from "react";
import type { ColumnSchema, InferredType } from "@/lib/google-sheets/infer";
import { inferSchema, coerceRowsToSchema } from "@/lib/google-sheets/infer";
import { attachIds, upsertMerge, type IdentifiedRow } from "@/lib/google-sheets/merge";
import {
  groupRows,
  type GroupConfig,        // new, minimal
  type GroupedRow,
  type GroupingConfig,      // legacy (DB expects this)
  inferParentChildRoles,    // legacy helper to compute parent/child
} from "@/lib/google-sheets/grouping";
import { setCell as setCellFn } from "@/lib/google-sheets/transform";

/* ----------------------------- Types & State ------------------------------ */

export type Status = "idle" | "loading" | "ready" | "syncing" | "saving" | "error";

export interface SourceMeta {
  spreadsheetId: string;
  sheetName: string;
  headerRow: number;
  maxRows: number;
  datasetName: string;
}

export interface Issue {
  rowIndex: number;
  columnName: string;
  message: string;
}

export interface State {
  status: Status;
  error?: string | null;

  source: SourceMeta;

  headers: string[];
  schema: ColumnSchema[];       // current (may include user overrides)
  rows: IdentifiedRow[];        // coerced + __id
  issues: Issue[];              // mapped UI issues

  // grouping
  groupingEnabled: boolean;
  groupingConfig: GroupConfig | null; // new style in the UI
  flat?: GroupedRow[];
}

export type Action =
  | { type: "SET_SOURCE"; payload: Partial<SourceMeta> }
  | { type: "SET_STATUS"; status: Status; error?: string | null }
  | { type: "LOAD_SUCCESS"; headers: string[]; schema: ColumnSchema[]; rows: IdentifiedRow[]; issues: Issue[] }
  | { type: "OVERRIDE_COLUMN_TYPE"; columnName: string; inferredType: InferredType }
  | { type: "RECOERCE_APPLY"; rows: IdentifiedRow[]; issues: Issue[] }
  | { type: "SET_CELL"; id: string; field: string; value: unknown }
  | { type: "REMOVE_ROWS"; ids: string[] }
  | { type: "REMOVE_COLUMNS"; columns: string[] }
  | { type: "SET_GROUPING"; enabled: boolean; config: GroupConfig | null }
  | { type: "REBUILD_GROUP_VIEW" }
  | { type: "REPLACE_ROWS"; rows: IdentifiedRow[] };

export const initialState: State = {
  status: "idle",
  error: null,
  source: {
    spreadsheetId: "",
    sheetName: "",
    headerRow: 1,
    maxRows: 200,
    datasetName: "",
  },
  headers: [],
  schema: [],
  rows: [],
  issues: [],
  groupingEnabled: false,
  groupingConfig: null,
  flat: undefined,
};

/* ------------------------------- Helpers ---------------------------------- */

// build/refresh flat view when grouping enabled
function withFlat(next: State): State {
  if (next.groupingEnabled && next.groupingConfig) {
    const { flatWithParents } = groupRows(next.rows, next.groupingConfig);
    next.flat = flatWithParents;
  } else {
    next.flat = undefined;
  }
  return next;
}

// re-coerce all rows using current (or updated) schema
export function reCoerce(headers: string[], schema: ColumnSchema[], rawRows: any[]): { rows: IdentifiedRow[]; issues: Issue[] } {
  const { coercedRows, issues } = coerceRowsToSchema(rawRows, schema);
  const rows = attachIds(coercedRows);
  const mapped: Issue[] = issues.map((it) => ({
    rowIndex: it.rowIndex,
    columnName: it.columnName,
    message: `Invalid ${it.targetType}`,
  }));
  return { rows, issues: mapped };
}

/** Convert new UI GroupConfig → legacy GroupingConfig expected by DB calls */
export function toLegacyGroupingConfig(rows: Record<string, any>[], cfg: GroupConfig): GroupingConfig {
  const groupBy = cfg.keys;
  // Use legacy helper to infer parent vs child fields for the current dataset
  const { parentFields, childFields } = inferParentChildRoles(rows, groupBy);
  return {
    groupBy,
    parentFields,
    childFields,
    fieldStrategies: undefined, // you can extend if you add rollups later
  };
}

/* -------------------------------- Reducer --------------------------------- */

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_SOURCE":
      return { ...state, source: { ...state.source, ...action.payload } };

    case "SET_STATUS":
      return { ...state, status: action.status, error: action.error ?? null };

    case "LOAD_SUCCESS": {
      const next: State = {
        ...state,
        status: "ready",
        headers: action.headers,
        schema: action.schema,
        rows: action.rows,
        issues: action.issues,
        error: null,
      };
      return withFlat(next);
    }

    case "OVERRIDE_COLUMN_TYPE": {
      const schema = state.schema.map((c) =>
        c.columnName === action.columnName ? { ...c, inferredType: action.inferredType } : c
      );
      return { ...state, schema }; // caller must dispatch RECOERCE_APPLY next
    }

    case "RECOERCE_APPLY": {
      const next: State = { ...state, rows: action.rows, issues: action.issues };
      return withFlat(next);
    }

    case "SET_CELL": {
      const rows = setCellFn(state.rows, action.id, action.field, action.value);
      const next: State = { ...state, rows };
      return withFlat(next);
    }

    case "REMOVE_ROWS": {
      const remove = new Set(action.ids);
      const rows = state.rows.filter((r) => !remove.has(r.__id));
      const next: State = { ...state, rows };
      return withFlat(next);
    }

    case "REMOVE_COLUMNS": {
      // update headers + schema
      const toRemove = new Set(action.columns);
      const headers = state.headers.filter((h) => !toRemove.has(h));
      const schema = state.schema.filter((c) => !toRemove.has(c.columnName));
      // strip columns from each row
      const rows = state.rows.map((r) => {
        const clone: any = { ...r };
        for (const col of toRemove) delete clone[col];
        return clone;
      });
      const next: State = { ...state, headers, schema, rows };
      return withFlat(next);
    }

    case "SET_GROUPING": {
      const next: State = { ...state, groupingEnabled: action.enabled, groupingConfig: action.config };
      return withFlat(next);
    }

    case "REBUILD_GROUP_VIEW":
      return withFlat({ ...state });

    case "REPLACE_ROWS": {
      const next: State = { ...state, rows: action.rows };
      return withFlat(next);
    }

    default:
      return state;
  }
}

/* -----------------------------------------------------------------------------
   COMMANDS (thin async functions that call pure libs, then dispatch)
----------------------------------------------------------------------------- */

import { loadPreviewFromGoogle, type PreviewMeta } from "@/lib/google-sheets/source";
import { googleListSpreadsheets, googleGetSheetTabs } from "@/lib/google-sheets/api";
import { createDatasetWithSource, saveDatasetColumns } from "@/lib/google/datasets";
import { appendImportSingleTable } from "@/lib/google/append-import";
import { getOrCreateSheetSource } from "@/lib/google/sheets-sources";

export async function cmdLoadPreview(state: State, dispatch: Dispatch<Action>) {
  const { spreadsheetId, sheetName, headerRow } = state.source;
  if (!spreadsheetId || !sheetName) {
    dispatch({ type: "SET_STATUS", status: "error", error: "Pick a spreadsheet and tab first." });
    return;
  }
  dispatch({ type: "SET_STATUS", status: "loading" });
  try {
    const meta: PreviewMeta = { spreadsheetId, sheetName, headerRow };
    const preview = await loadPreviewFromGoogle(meta); // { headers, rows: Row[] }

    // infer initial schema from preview rows
    const schema = inferSchema(preview.rows);
    // coerce with that schema
    const { rows, issues } = reCoerce(preview.headers, schema, preview.rows);

    dispatch({ type: "LOAD_SUCCESS", headers: preview.headers, schema, rows, issues });
  } catch (e: any) {
    dispatch({ type: "SET_STATUS", status: "error", error: e?.message ?? "Failed to load preview" });
  }
}

export async function cmdOverrideColumnType(
  state: State,
  dispatch: Dispatch<Action>,
  columnName: string,
  inferredType: InferredType
) {
  // Update schema locally
  dispatch({ type: "OVERRIDE_COLUMN_TYPE", columnName, inferredType });
  // Re-coerce rows with the updated schema
  const updatedSchema = state.schema.map((c) =>
    c.columnName === columnName ? { ...c, inferredType } : c
  );
  const { rows, issues } = reCoerce(state.headers, updatedSchema, state.rows);
  dispatch({ type: "RECOERCE_APPLY", rows, issues });
}

export async function cmdRefreshFromSheets(
  state: State,
  dispatch: Dispatch<Action>,
  preserve: string[] = ["status"]
) {
  const { spreadsheetId, sheetName, headerRow } = state.source;
  if (!spreadsheetId || !sheetName) return;
  dispatch({ type: "SET_STATUS", status: "syncing" });
  try {
    const meta: PreviewMeta = { spreadsheetId, sheetName, headerRow };
    const preview = await loadPreviewFromGoogle(meta);
    // keep the *current* schema (with any overrides) so your types stay stable
    const { coercedRows } = coerceRowsToSchema(preview.rows, state.schema);
    const merged = upsertMerge(state.rows, coercedRows, { preserve });
    dispatch({ type: "REPLACE_ROWS", rows: merged });
    dispatch({ type: "SET_STATUS", status: "ready" });
  } catch (e: any) {
    dispatch({ type: "SET_STATUS", status: "error", error: e?.message ?? "Sync failed" });
  }
}

export async function cmdSaveToDataset(state: State, dispatch: Dispatch<Action>) {
  if (!state.rows.length) {
    dispatch({ type: "SET_STATUS", status: "error", error: "Nothing to import" });
    return;
  }
  const { spreadsheetId, sheetName, headerRow, datasetName } = state.source;
  if (!spreadsheetId || !sheetName) {
    dispatch({ type: "SET_STATUS", status: "error", error: "Missing source" });
    return;
  }
  dispatch({ type: "SET_STATUS", status: "saving" });
  try {
    const { id: sourceId } = await getOrCreateSheetSource({ spreadsheetId, sheetName, headerRow });

    // Convert new UI config -> legacy config (ONLY when enabled)
    const legacyCfg: GroupingConfig | null =
      state.groupingEnabled && state.groupingConfig
        ? toLegacyGroupingConfig(state.rows as unknown as Record<string, any>[], state.groupingConfig)
        : null;

    const { id: datasetId } = await createDatasetWithSource({
      name: datasetName || sheetName,
      source_id: sourceId,
      grouping_enabled: !!legacyCfg,
      grouping_config: legacyCfg,
    });

    // Save columns using the current schema (simple 1:1 mapping)
    await saveDatasetColumns({
      dataset_id: datasetId,
      mapping: state.schema.map((c) => ({
        map_from: c.columnName,
        name: c.columnName,
        type:
          c.inferredType === "number"
            ? "number"
            : c.inferredType === "boolean"
            ? "boolean"
            : c.inferredType === "date"
            ? "date"
            : "string",
      })),
    });

    // Append rows (pass legacy grouping to satisfy append-import)
    const res = await appendImportSingleTable({
      datasetId,
      records: state.rows, // already coerced + __id
      groupingEnabled: !!legacyCfg,
      groupingConfig: legacyCfg,
    });

    dispatch({ type: "SET_STATUS", status: "ready" });
    return res;
  } catch (e: any) {
    dispatch({ type: "SET_STATUS", status: "error", error: e?.message ?? "Import failed" });
    throw e;
  }
}

// Expose pickers with your api.ts names
export const cmdListSpreadsheets = () => googleListSpreadsheets();
export const cmdGetSheetTabs = (spreadsheetId: string) => googleGetSheetTabs(spreadsheetId);
