// src/pages/DataManager/hooks/useViewReducer.ts
import { useCallback, useEffect, useMemo, useReducer } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getDatasetMeta,
  listRows,
  listChildren,
  listBatchStamps,
  computeBatches,
  type DatasetMeta,
  type Row,
  type Batch,
  type Mode,
} from "@/lib/datamanager/api";

/** Minimal sort model: only direction for now */
export type SortDir = "asc" | "desc";

type ReducerState = {
  // identity
  datasetId: string;

  // URL params
  page: number;
  pageSize: number;
  q: string;
  sortDir: SortDir;

  // server selection
  mode: Mode;
  batchId: string | null;

  // server data
  dataset: DatasetMeta | null;
  batches: Batch[];
  rows: Row[];
  total: number;

  // ui
  visibleColumns: string[];
  expandedKeys: Set<string>;
  childrenCache: Record<string, Row[]>;

  // status
  loading: boolean;
  error: string | null;
};

type Action =
  | { type: "INIT"; payload: Partial<ReducerState> }
  | { type: "PATCH"; patch: Partial<ReducerState> }
  | { type: "SET_META"; dataset: DatasetMeta; mode: Mode }
  | { type: "SET_BATCHES"; batches: Batch[]; batchId: string | null }
  | { type: "SET_ROWS"; rows: Row[]; total: number }
  | { type: "TOGGLE_EXPANDED"; key: string }
  | { type: "SET_CHILDREN"; key: string; rows: Row[] };

const initialState: ReducerState = {
  datasetId: "",

  page: 1,
  pageSize: 50,
  q: "",
  sortDir: "asc",

  mode: "flat",
  batchId: null,

  dataset: null,
  batches: [],
  rows: [],
  total: 0,

  visibleColumns: [],
  expandedKeys: new Set(),
  childrenCache: {},

  loading: true,
  error: null,
};

function storageKey(datasetId: string) {
  return `dm:cols:${datasetId}`;
}

/* ──────────────────────────────────────────────────────────────
 * Reducer
 * ────────────────────────────────────────────────────────────── */
function reducer(state: ReducerState, action: Action): ReducerState {
  switch (action.type) {
    case "INIT":
      return { ...state, ...action.payload };

    case "PATCH":
      return { ...state, ...action.patch };

    case "SET_META":
      return { ...state, dataset: action.dataset, mode: action.mode };

    case "SET_BATCHES":
      return { ...state, batches: action.batches, batchId: action.batchId };

    case "SET_ROWS":
      return { ...state, rows: action.rows, total: action.total };

    case "TOGGLE_EXPANDED": {
      const next = new Set(state.expandedKeys);
      next.has(action.key) ? next.delete(action.key) : next.add(action.key);
      return { ...state, expandedKeys: next };
    }

    case "SET_CHILDREN":
      return { ...state, childrenCache: { ...state.childrenCache, [action.key]: action.rows } };

    default:
      return state;
  }
}

/* ──────────────────────────────────────────────────────────────
 * Hook
 * ────────────────────────────────────────────────────────────── */
export function useViewReducer(datasetId: string) {
  const [sp, setSp] = useSearchParams();
  const [state, dispatch] = useReducer(reducer, initialState);

  // --- bootstrap from URL + LS ---
  useEffect(() => {
    const page = Number(sp.get("page") || 1);
    const pageSize = Number(sp.get("pp") || 50);
    const q = sp.get("q") || "";
    const dir = (sp.get("dir") as SortDir) || "asc";

    let visibleColumns: string[] = [];
    try {
      const raw = localStorage.getItem(storageKey(datasetId));
      visibleColumns = raw ? (JSON.parse(raw) as string[]) : [];
    } catch (e) {
      console.log(e)
    }

    dispatch({
      type: "INIT",
      payload: {
        datasetId,
        page,
        pageSize,
        q,
        sortDir: dir,
        visibleColumns,
        loading: true,
        error: null,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetId]);

  // --- keep URL in sync ---
  useEffect(() => {
    if (!state.datasetId) return;
    const next = new URLSearchParams(sp);
    next.set("page", String(state.page));
    next.set("pp", String(state.pageSize));
    state.q ? next.set("q", state.q) : next.delete("q");
    next.set("dir", state.sortDir);
    setSp(next, { replace: true });
  }, [state.datasetId, state.page, state.pageSize, state.q, state.sortDir, sp, setSp]);

  // --- loaders ---
  const loadMeta = useCallback(async () => {
    const meta = await getDatasetMeta(state.datasetId);
    const mode: Mode = meta.grouping_enabled ? "grouped" : "flat";
    dispatch({ type: "SET_META", dataset: meta, mode });
  }, [state.datasetId]);

  const loadBatches = useCallback(async () => {
    const stamps = await listBatchStamps(state.datasetId);
    const batches = computeBatches(stamps);
    const chosen = state.batchId ?? batches[0]?.id ?? null;
    dispatch({ type: "SET_BATCHES", batches, batchId: chosen });
    return chosen;
  }, [state.datasetId, state.batchId]);

  const loadRows = useCallback(
    async (effectiveBatchId: string | null) => {
      if (!effectiveBatchId) {
        dispatch({ type: "SET_ROWS", rows: [], total: 0 });
        return;
      }
      const { data, count } = await listRows({
        datasetId: state.datasetId,
        batchId: effectiveBatchId,
        mode: state.mode,
        page: state.page,
        pageSize: state.pageSize,
        q: state.q,
        sortDir: state.sortDir,
      });
      dispatch({ type: "SET_ROWS", rows: data, total: count });

      // default visible cols (first 8)
      if (!state.visibleColumns.length && data.length) {
        const first = Object.keys(data[0]?.data ?? {}).slice(0, 8);
        dispatch({ type: "PATCH", patch: { visibleColumns: first } });
        try {
          localStorage.setItem(storageKey(state.datasetId), JSON.stringify(first));
        } catch {
          /* noop */
        }
      }
    }, [state.datasetId, state.mode, state.page, state.pageSize, state.q, state.sortDir, state.visibleColumns.length]);

  const refreshAll = useCallback(async () => {
    dispatch({ type: "PATCH", patch: { loading: true, error: null } });
    try {
      await loadMeta();
      const chosen = await loadBatches();
      await loadRows(chosen);
      dispatch({ type: "PATCH", patch: { loading: false } });
    } catch (e: any) {
      dispatch({
        type: "PATCH",
        patch: { loading: false, error: e?.message ?? "Failed to load dataset" },
      });
    }
  }, [loadMeta, loadBatches, loadRows]);

  // initial + param-driven
  useEffect(() => {
    if (!state.datasetId) return;
    refreshAll();
  }, [state.datasetId, refreshAll]);

  useEffect(() => {
    if (!state.datasetId) return;
    loadRows(state.batchId);
  }, [state.page, state.pageSize, state.q, state.sortDir, state.mode, state.batchId, loadRows]);

  // --- actions (simple) ---
  const updateParams = useCallback(
    (patch: Partial<Pick<ReducerState, "page" | "pageSize" | "q" | "sortDir">>) => {
      dispatch({
        type: "PATCH",
        patch: {
          ...patch,
          // reset expand/cache when params change
          expandedKeys: new Set<string>(),
          childrenCache: {},
        } as Partial<ReducerState>,
      });
    }, []);

  const setVisibleColumns = useCallback(
    (columns: string[]) => {
      dispatch({ type: "PATCH", patch: { visibleColumns: columns } });
      localStorage.setItem(storageKey(state.datasetId), JSON.stringify(columns));
    }, [state.datasetId]);

  const setBatchId = useCallback((batchId: string | null) => { dispatch({ type: "PATCH", patch: { batchId } }) }, []);

  const toggleRowExpanded = useCallback((key: string) => dispatch({ type: "TOGGLE_EXPANDED", key }), []);
  const clearExpanded = useCallback(() => dispatch({ type: "PATCH", patch: { expandedKeys: new Set(), childrenCache: {} } }), []);
  const setChildrenCache = useCallback((key: string, rows: Row[]) => dispatch({ type: "SET_CHILDREN", key, rows }), []);

  const loadChildren = useCallback(
    async (groupKey: string) => {
      if (!groupKey || !state.batchId) return [];
      const cached = state.childrenCache[groupKey];
      if (cached) return cached;
      const list = await listChildren(state.datasetId, state.batchId, groupKey);
      const safe = Array.isArray(list) ? list.slice(0, 50) : [];
      dispatch({ type: "SET_CHILDREN", key: groupKey, rows: safe });
      return safe;
    },
    [state.datasetId, state.batchId, state.childrenCache]
  );

  // derived
  const pageCount = useMemo(
    () => Math.max(1, Math.ceil((state.total || 0) / state.pageSize)),
    [state.total, state.pageSize]
  );

  return {
    state: { ...state, pageCount },
    // loaders
    refreshAll,
    loadRows: () => loadRows(state.batchId),
    loadChildren,
    loadMeta,
    setBatchId,
    // actions
    updateParams,
    setVisibleColumns,
    toggleRowExpanded,
    clearExpanded,
    setChildrenCache,
  };
}
