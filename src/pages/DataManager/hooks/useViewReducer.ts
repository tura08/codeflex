import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
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

/** Minimal sort model (kept for compatibility; you can ignore sortKey if not used) */
export type SortDir = "asc" | "desc";

type ReducerState = {
  // identity
  datasetId: string;

  // URL params
  page: number;
  pageSize: number;
  q: string;
  sortDir: SortDir;
  sortKey: string | null; // kept but unused if you dropped sorting

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
  sortKey: null,

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

/* ----------------------------------------------
 * Hook — single-effect, lazy init
 * ---------------------------------------------- */
export function useViewReducer(datasetId: string) {
  const [sp, setSp] = useSearchParams();

  // Lazy init reads URL + localStorage once. No bootstrap effect.
  const [state, dispatch] = useReducer(
    reducer,
    { datasetId, sp } as { datasetId: string; sp: URLSearchParams },
    (arg) => {
      const page = Number(arg.sp.get("page") || 1);
      const pageSize = Number(arg.sp.get("pp") || 50);
      const q = arg.sp.get("q") || "";

      // keep sort keys for compatibility (you can ignore in UI)
      let sortKey: string | null = null;
      let sortDir: SortDir = "asc";
      const sortParam = arg.sp.get("sort");
      if (sortParam) {
        const [k, d] = sortParam.split(":");
        sortKey = k || null;
        sortDir = d === "desc" ? "desc" : "asc";
      } else {
        const legacyDir = arg.sp.get("dir") as SortDir | null;
        if (legacyDir === "asc" || legacyDir === "desc") sortDir = legacyDir;
      }

      let visibleColumns: string[] = [];
      try {
        const raw = localStorage.getItem(storageKey(datasetId));
        visibleColumns = raw ? (JSON.parse(raw) as string[]) : [];
      } catch {}

      return {
        ...initialState,
        datasetId,
        page,
        pageSize,
        q,
        sortDir,
        sortKey,
        visibleColumns,
        loading: true,
      };
    }
  );

  // Track previous datasetId (to choose batch on dataset change)
  const prevDatasetIdRef = useRef<string | null>(null);

  /**
   * ONE EFFECT:
   * - On dataset change: fetch meta + batches and pick FIRST batch id.
   * - Always fetch rows using that concrete batch id (never undefined).
   */
  useEffect(() => {
    let active = true;

    (async () => {
      if (!state.datasetId) return;

      dispatch({ type: "PATCH", patch: { loading: true, error: null } });

      try {
        const datasetChanged = prevDatasetIdRef.current !== state.datasetId;
        let batchIdToUse = state.batchId;

        if (datasetChanged) {
          // meta -> mode
          const meta = await getDatasetMeta(state.datasetId);
          if (!active) return;
          const mode: Mode = meta.grouping_enabled ? "grouped" : "flat";
          dispatch({ type: "SET_META", dataset: meta, mode });

          // batches -> pick FIRST (your rule: one batch per dataset)
          const stamps = await listBatchStamps(state.datasetId);
          if (!active) return;
          const batches = computeBatches(stamps);
          batchIdToUse = batches[0]?.id ?? null;
          dispatch({ type: "SET_BATCHES", batches, batchId: batchIdToUse });
        } else {
          // dataset unchanged; ensure we have a batch id
          if (!batchIdToUse) {
            const stamps = await listBatchStamps(state.datasetId);
            if (!active) return;
            const batches = computeBatches(stamps);
            batchIdToUse = batches[0]?.id ?? null;
            dispatch({ type: "SET_BATCHES", batches, batchId: batchIdToUse });
          }
        }

        // If STILL no batch (truly empty dataset): show empty rows and stop
        if (!batchIdToUse) {
          dispatch({ type: "SET_ROWS", rows: [], total: 0 });
          return;
        }

        // Fetch rows with a definite batchId (never undefined)
        const { data, count } = await listRows({
          datasetId: state.datasetId,
          batchId: batchIdToUse,
          mode: state.mode,
          page: state.page,
          pageSize: state.pageSize,
          q: state.q,
          sortDir: state.sortDir,
        } as any);
        if (!active) return;

        dispatch({ type: "SET_ROWS", rows: data, total: count });

        // Seed visible cols once
        if (!state.visibleColumns.length && data.length) {
          const first = Object.keys(data[0]?.data ?? {}).slice(0, 8);
          dispatch({ type: "PATCH", patch: { visibleColumns: first } });
          try {
            localStorage.setItem(storageKey(state.datasetId), JSON.stringify(first));
          } catch {}
        }
      } catch (e: any) {
        if (!active) return;
        dispatch({ type: "PATCH", patch: { error: e?.message ?? "Failed to load dataset" } });
      } finally {
        if (active) dispatch({ type: "PATCH", patch: { loading: false } });
        prevDatasetIdRef.current = state.datasetId;
      }
    })();

    return () => {
      active = false;
    };
  }, [
    state.datasetId, // dataset switch -> re-pick first batch
    state.page,
    state.pageSize,
    state.q,
    state.sortDir,
    state.mode,
    state.sortKey, // safe to keep; ignored if not used server-side
  ]);

  /* ----------------------------------------------
   * Actions
   * ---------------------------------------------- */
  const updateParams = useCallback(
    (patch: Partial<Pick<ReducerState, "page" | "pageSize" | "q" | "sortDir" | "sortKey">>) => {
      const nextPage =
        patch.sortKey !== undefined || patch.sortDir !== undefined
          ? 1
          : patch.page ?? state.page;

      const nextPageSize = patch.pageSize ?? state.pageSize;
      const nextQ = patch.q ?? state.q;
      const nextSortKey = patch.sortKey ?? state.sortKey;
      const nextSortDir = patch.sortDir ?? state.sortDir;

      dispatch({
        type: "PATCH",
        patch: {
          page: nextPage,
          pageSize: nextPageSize,
          q: nextQ,
          sortKey: nextSortKey,
          sortDir: nextSortDir,
          expandedKeys: new Set<string>(),
          childrenCache: {},
        },
      });

      // Update URL idempotently
      const next = new URLSearchParams(sp);
      next.set("page", String(nextPage));
      next.set("pp", String(nextPageSize));
      nextQ ? next.set("q", nextQ) : next.delete("q");
      if (nextSortKey) {
        next.set("sort", `${nextSortKey}:${nextSortDir}`);
        next.delete("dir");
      } else {
        next.delete("sort");
        next.set("dir", nextSortDir);
      }
      if (next.toString() !== sp.toString()) setSp(next, { replace: true });
    },
    [sp, setSp, state.page, state.pageSize, state.q, state.sortKey, state.sortDir]
  );

  const setSort = useCallback(
    (key: string | null, dir: SortDir) => updateParams({ sortKey: key, sortDir: dir, page: 1 }),
    [updateParams]
  );

  const setVisibleColumns = useCallback(
    (columns: string[]) => {
      dispatch({ type: "PATCH", patch: { visibleColumns: columns } });
      try {
        localStorage.setItem(storageKey(state.datasetId), JSON.stringify(columns));
      } catch {}
    },
    [state.datasetId]
  );

  const setBatchId = useCallback((batchId: string | null) => {
    dispatch({ type: "PATCH", patch: { batchId } });
  }, []);

  const toggleRowExpanded = useCallback(
    (key: string) => dispatch({ type: "TOGGLE_EXPANDED", key }),
    []
  );

  const clearExpanded = useCallback(
    () => dispatch({ type: "PATCH", patch: { expandedKeys: new Set(), childrenCache: {} } }),
    []
  );

  const setChildrenCache = useCallback(
    (key: string, rows: Row[]) => dispatch({ type: "SET_CHILDREN", key, rows }),
    []
  );

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
    // loaders (kept for API compatibility)
    refreshAll: () => {},
    loadRows: () => {},
    loadChildren,
    loadMeta: () => {},
    setBatchId,
    // actions
    updateParams,
    setVisibleColumns,
    toggleRowExpanded,
    clearExpanded,
    setChildrenCache,
    setSort,
  };
}
