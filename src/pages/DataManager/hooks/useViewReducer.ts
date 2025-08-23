import { useCallback, useEffect, useMemo, useReducer } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getDatasetMeta,
  listRows,
  listChildren,
  deleteDatasetDeep,
  listBatchStamps,
  computeBatches,
  type DatasetMeta,
  type Row,
  type Batch,
  type Mode,
} from "@/lib/datamanager/api";

export type SortDir = "asc" | "desc" | null;

type State = {
  // identity
  datasetId: string;

  // URL params
  page: number;
  pageSize: number;
  q: string;
  sortBy: string | null;
  sortDir: SortDir;
  filterField: string | null;
  filterValue: string | null;

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
  deleting: boolean;
};

type Action =
  | { type: "INIT"; payload: Partial<State> }
  | { type: "PATCH"; patch: Partial<State> }
  | { type: "SET_META"; dataset: DatasetMeta; mode: Mode }
  | { type: "SET_BATCHES"; batches: Batch[]; batchId: string | null }
  | { type: "SET_ROWS"; rows: Row[]; total: number }
  | { type: "TOGGLE_EXPANDED"; key: string }
  | { type: "SET_CHILDREN"; key: string; rows: Row[] };

const initialState: State = {
  datasetId: "",
  page: 1,
  pageSize: 50,
  q: "",
  sortBy: null,
  sortDir: null,
  filterField: null,
  filterValue: null,

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
  deleting: false,
};

function storageKey(datasetId: string) {
  return `dm:cols:${datasetId}`;
}

function reducer(state: State, action: Action): State {
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

export function useViewReducer(datasetId: string) {
  const [sp, setSp] = useSearchParams();
  const [state, dispatch] = useReducer(reducer, initialState);

  // --- bootstrap from URL + LS ---
  useEffect(() => {
    const page = Number(sp.get("page") || 1);
    const pageSize = Number(sp.get("pp") || 50);
    const q = sp.get("q") || "";
    const sortBy = sp.get("sort") || null;
    const sortDir = (sp.get("dir") as SortDir) || null;
    const filterField = sp.get("f_field") || null;
    const filterValue = sp.get("f_value") || null;

    let visibleColumns: string[] = [];
    try {
      const raw = localStorage.getItem(storageKey(datasetId));
      visibleColumns = raw ? (JSON.parse(raw) as string[]) : [];
    } catch {/* noop */}

    dispatch({
      type: "INIT",
      payload: {
        datasetId,
        page,
        pageSize,
        q,
        sortBy,
        sortDir,
        filterField,
        filterValue,
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
    state.sortBy ? next.set("sort", state.sortBy) : next.delete("sort");
    state.sortDir ? next.set("dir", state.sortDir) : next.delete("dir");
    state.filterField ? next.set("f_field", state.filterField) : next.delete("f_field");
    state.filterValue ? next.set("f_value", state.filterValue) : next.delete("f_value");
    setSp(next, { replace: true });
  }, [
    state.datasetId,
    state.page,
    state.pageSize,
    state.q,
    state.sortBy,
    state.sortDir,
    state.filterField,
    state.filterValue,
    sp,
    setSp,
  ]);

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
        sortBy: state.sortBy,
        sortDir: state.sortDir,
        filterField: state.filterField,
        filterValue: state.filterValue,
      });
      dispatch({ type: "SET_ROWS", rows: data, total: count });

      // default visible cols (first 8)
      if (!state.visibleColumns.length && data.length) {
        const first = Object.keys(data[0]?.data ?? {}).slice(0, 8);
        dispatch({ type: "PATCH", patch: { visibleColumns: first } });
        try { localStorage.setItem(storageKey(state.datasetId), JSON.stringify(first)); } catch {/* noop */}
      }
    },
    [
      state.datasetId,
      state.mode,
      state.page,
      state.pageSize,
      state.q,
      state.sortBy,
      state.sortDir,
      state.filterField,
      state.filterValue,
      state.visibleColumns.length,
    ]
  );

  const refreshAll = useCallback(async () => {
    dispatch({ type: "PATCH", patch: { loading: true, error: null } });
    try {
      await loadMeta();
      const chosen = await loadBatches();
      await loadRows(chosen);
      dispatch({ type: "PATCH", patch: { loading: false } });
    } catch (e: any) {
      dispatch({ type: "PATCH", patch: { loading: false, error: e?.message ?? "Failed to load dataset" } });
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
  }, [
    state.page,
    state.pageSize,
    state.q,
    state.sortBy,
    state.sortDir,
    state.filterField,
    state.filterValue,
    state.mode,
    state.batchId,
    loadRows,
  ]);

  // --- actions (simple) ---
  const updateParams = useCallback(
    (patch: Partial<Pick<State, "page" | "pageSize" | "q" | "sortBy" | "sortDir" | "filterField" | "filterValue">>) => {
      dispatch({
        type: "PATCH",
        patch: {
          ...patch,
          // reset expand/cache when params change
          expandedKeys: new Set<string>(),
          childrenCache: {},
        } as Partial<State>,
      });
    },
    []
  );

  const setVisibleColumns = useCallback((columns: string[]) => {
    dispatch({ type: "PATCH", patch: { visibleColumns: columns } });
    try { localStorage.setItem(storageKey(state.datasetId), JSON.stringify(columns)); } catch {/* noop */}
  }, [state.datasetId]);

  const setBatchId = useCallback((batchId: string | null) => {
    dispatch({ type: "PATCH", patch: { batchId } });
  }, []);

  const toggleRowExpanded = useCallback((key: string) => dispatch({ type: "TOGGLE_EXPANDED", key }), []);
  const clearExpanded = useCallback(() => dispatch({ type: "PATCH", patch: { expandedKeys: new Set(), childrenCache: {} } }), []);
  const setChildrenCache = useCallback((key: string, rows: Row[]) => dispatch({ type: "SET_CHILDREN", key, rows }), []);

  const loadChildrenOnce = useCallback(
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

  const removeDataset = useCallback(
    async (alsoDeleteSource?: boolean) => {
      dispatch({ type: "PATCH", patch: { deleting: true, error: null } });
      try {
        await deleteDatasetDeep(state.datasetId, { alsoDeleteSource });
        dispatch({ type: "PATCH", patch: { deleting: false } });
        return { ok: true };
      } catch (e: any) {
        dispatch({ type: "PATCH", patch: { deleting: false, error: e?.message ?? "Delete failed" } });
        throw e;
      }
    },
    [state.datasetId]
  );

  // derived
  const pageCount = useMemo(
    () => Math.max(1, Math.ceil((state.total || 0) / state.pageSize)),
    [state.total, state.pageSize]
  );

  return {
    state: { ...state, pageCount },
    refreshAll,
    loadRows: () => loadRows(state.batchId),
    loadChildren: loadChildrenOnce,
    loadMeta,
    setBatchId,
    updateParams,
    setVisibleColumns,
    toggleRowExpanded,
    clearExpanded,
    setChildrenCache,
    removeDataset,
  };
}
