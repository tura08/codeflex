import { useCallback, useEffect, useMemo, useReducer } from "react";
import { useSearchParams } from "react-router-dom";
import { getDatasetMeta, listRows, listChildren, type DatasetMeta, type Row, type Mode } from "@/lib/datamanager/api";

export type SortDir = "asc" | "desc";

type ReducerState = {
  datasetId: string;
  page: number;
  pageSize: number;
  q: string;
  sortDir: SortDir;
  sortKey: string | null;
  dataset: DatasetMeta | null;
  rows: Row[];
  total: number;
  mode: Mode;
  visibleColumns: string[];
  expandedKeys: Set<string>;
  childrenCache: Record<string, Row[]>;
  loading: boolean;
  error: string | null;
};

type Action =
  | { type: "INIT"; payload: Partial<ReducerState> }
  | { type: "PATCH"; patch: Partial<ReducerState> }
  | { type: "SET_META"; dataset: DatasetMeta; mode: Mode }
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
  dataset: null,
  rows: [],
  total: 0,
  mode: "flat",
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
    case "INIT": return { ...state, ...action.payload };
    case "PATCH": return { ...state, ...action.patch };
    case "SET_META": return { ...state, dataset: action.dataset, mode: action.mode };
    case "SET_ROWS": return { ...state, rows: action.rows, total: action.total };
    case "TOGGLE_EXPANDED": {
      const next = new Set(state.expandedKeys);
      next.has(action.key) ? next.delete(action.key) : next.add(action.key);
      return { ...state, expandedKeys: next };
    }
    case "SET_CHILDREN": return { ...state, childrenCache: { ...state.childrenCache, [action.key]: action.rows } };
    default: return state;
  }
}

export function useViewReducer(datasetId: string) {
  const [sp, setSp] = useSearchParams();

  const [state, dispatch] = useReducer(
    reducer,
    { datasetId, sp } as { datasetId: string; sp: URLSearchParams },
    (arg) => {
      const page = Number(arg.sp.get("page") || 1);
      const pageSize = Number(arg.sp.get("pp") || 50);
      const q = arg.sp.get("q") || "";

      let sortKey: string | null = null;
      let sortDir: SortDir = "asc";
      const sortParam = arg.sp.get("sort");
      if (sortParam) {
        const [k, d] = sortParam.split(":");
        sortKey = k || null;
        sortDir = d === "desc" ? "desc" : "asc";
      }

      let visibleColumns: string[] = [];
      try {
        const raw = localStorage.getItem(storageKey(datasetId));
        visibleColumns = raw ? JSON.parse(raw) : [];
      } catch {}

      return { ...initialState, datasetId, page, pageSize, q, sortDir, sortKey, visibleColumns };
    }
  );

  // ✅ Single effect for meta + rows
  useEffect(() => {
    if (!state.datasetId) return;
    let active = true;

    (async () => {
      dispatch({ type: "PATCH", patch: { loading: true, error: null } });
      try {
        const meta = await getDatasetMeta(state.datasetId);
        if (!active) return;
        const mode: Mode = meta.grouping_enabled ? "grouped" : "flat";
        dispatch({ type: "SET_META", dataset: meta, mode });

        const { data, count } = await listRows({
          datasetId: state.datasetId,
          mode,
          page: state.page,
          pageSize: state.pageSize,
          q: state.q,
        });
        if (!active) return;
        dispatch({ type: "SET_ROWS", rows: data, total: count });

        if (!state.visibleColumns.length && data.length) {
          const first = Object.keys(data[0]?.data ?? {}).slice(0, 8);
          dispatch({ type: "PATCH", patch: { visibleColumns: first } });
          localStorage.setItem(storageKey(state.datasetId), JSON.stringify(first));
        }
      } catch (e: any) {
        if (!active) return;
        dispatch({ type: "PATCH", patch: { error: e?.message ?? "Failed to load dataset" } });
      } finally {
        if (active) dispatch({ type: "PATCH", patch: { loading: false } });
      }
    })();

    return () => { active = false };
  }, [state.datasetId, state.page, state.pageSize, state.q, state.sortDir, state.sortKey]);

  // actions
  const updateParams = useCallback(
    (patch: Partial<Pick<ReducerState, "page" | "pageSize" | "q" | "sortDir" | "sortKey">>) => {
      const nextPage =
        patch.sortKey !== undefined || patch.sortDir !== undefined
          ? 1
          : patch.page ?? state.page;

      const next = {
        page: nextPage,
        pageSize: patch.pageSize ?? state.pageSize,
        q: patch.q ?? state.q,
        sortKey: patch.sortKey ?? state.sortKey,
        sortDir: patch.sortDir ?? state.sortDir,
      };

      dispatch({
        type: "PATCH",
        patch: {
          ...next,
          expandedKeys: new Set<string>(),
          childrenCache: {},
        },
      });

      // Update URL params
      const sp2 = new URLSearchParams(sp);
      sp2.set("page", String(next.page));
      sp2.set("pp", String(next.pageSize));
      next.q ? sp2.set("q", next.q) : sp2.delete("q");

      if (next.sortKey) {
        sp2.set("sort", `${next.sortKey}:${next.sortDir}`);
        sp2.delete("dir");
      } else {
        sp2.delete("sort");
        sp2.set("dir", next.sortDir);
      }

      if (sp2.toString() !== sp.toString()) {
        setSp(sp2, { replace: true });
      }
    },
    [sp, setSp, state.page, state.pageSize, state.q, state.sortKey, state.sortDir]
  );


  const setVisibleColumns = useCallback((cols: string[]) => {
    dispatch({ type: "PATCH", patch: { visibleColumns: cols } });
    localStorage.setItem(storageKey(state.datasetId), JSON.stringify(cols));
  }, [state.datasetId]);

  const toggleRowExpanded = useCallback((key: string) => dispatch({ type: "TOGGLE_EXPANDED", key }), []);
  const clearExpanded = useCallback(() => dispatch({ type: "PATCH", patch: { expandedKeys: new Set(), childrenCache: {} } }), []);
  const setChildrenCache = useCallback((key: string, rows: Row[]) => dispatch({ type: "SET_CHILDREN", key, rows }), []);

  const loadChildren = useCallback(
    async (groupKey: string) => {
      if (!groupKey || !state.datasetId) return [];

      const cached = state.childrenCache[groupKey];
      if (cached) return cached;

      const list = await listChildren(state.datasetId, groupKey);
      const safe = Array.isArray(list) ? list.slice(0, 50) : [];

      dispatch({ type: "SET_CHILDREN", key: groupKey, rows: safe });
      return safe;
    },
    [state.datasetId, state.childrenCache]
  );

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil((state.total || 0) / state.pageSize)),
    [state.total, state.pageSize]
  );

  return {
    state: { ...state, pageCount },

    updateParams,
    setVisibleColumns,
    toggleRowExpanded,
    clearExpanded,
    setChildrenCache,
    loadChildren,
  };
}