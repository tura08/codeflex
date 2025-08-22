import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-client";

/* ──────────────────────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────────────────────── */
export type Mode = "grouped" | "flat";
export type Batch = { id: string; imported_at: string };
export type DatasetMeta = {
  id: string;
  name: string;
  grouping_enabled: boolean;
  grouping_config: any | null;
  updated_at?: string;
  [k: string]: any;
};

/* ──────────────────────────────────────────────────────────────
 * Low-level fetchers (pure async functions)
 * ────────────────────────────────────────────────────────────── */
async function fetchDatasets(): Promise<DatasetMeta[]> {
  const { data, error } = await supabase
    .from("datasets")
    .select("id,name,grouping_enabled,grouping_config,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DatasetMeta[];
}

async function fetchDatasetMeta(datasetId: string): Promise<DatasetMeta> {
  const { data, error } = await supabase
    .from("datasets")
    .select("*")
    .eq("id", datasetId)
    .single();
  if (error) throw error;
  return data as DatasetMeta;
}

async function fetchBatchStamps(datasetId: string): Promise<
  Array<{ import_batch_id: string; imported_at: string }>
> {
  const { data, error } = await supabase
    .from("dataset_rows")
    .select("import_batch_id, imported_at")
    .eq("dataset_id", datasetId)
    .order("imported_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Array<{ import_batch_id: string; imported_at: string }>;
}

function computeBatches(stamps: Array<{ import_batch_id: string; imported_at: string }>): Batch[] {
  const newest = new Map<string, string>();
  for (const s of stamps) {
    const prev = newest.get(s.import_batch_id);
    if (!prev || prev < s.imported_at) newest.set(s.import_batch_id, s.imported_at);
  }
  return [...newest.entries()]
    .map(([id, imported_at]) => ({ id, imported_at }))
    .sort((a, b) => (a.imported_at < b.imported_at ? 1 : -1));
}

async function fetchRows(params: {
  datasetId: string;
  table: "v_dataset_parents" | "v_dataset_flat";
  batchId: string;
  from: number;
  to: number;
  q?: string;
}): Promise<{ data: any[]; count: number }> {
  const { datasetId, table, batchId, from, to, q } = params;

  let qy = supabase
    .from(table)
    .select("id,data,role,group_key,import_batch_id", { count: "exact" })
    .eq("dataset_id", datasetId)
    .eq("import_batch_id", batchId)
    .range(from, to)
    .order("id", { ascending: true });

  if (q && q.trim()) qy = qy.ilike("data_text", `%${q}%`);

  const { data, count, error } = await qy;
  if (error) throw error;
  return { data: (data ?? []) as any[], count: count ?? 0 };
}

export async function fetchChildren(datasetId: string, batchId: string, groupKey: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("v_dataset_children")
    .select("id,data,group_key")
    .eq("dataset_id", datasetId)
    .eq("import_batch_id", batchId)
    .eq("group_key", groupKey)
    .order("id", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/* ──────────────────────────────────────────────────────────────
 * useDatasetsList — list page
 * ────────────────────────────────────────────────────────────── */
export function useDatasetsList() {
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDatasets(await fetchDatasets());
    } catch (e: any) {
      setError(e?.message ?? "Failed to load datasets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await load();
      } finally {
        if (!alive) return;
      }
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  return { loading, datasets, error, refresh: load };
}

/* ──────────────────────────────────────────────────────────────
 * useDatasetDetail — detail page
 * ────────────────────────────────────────────────────────────── */
export function useDatasetDetail(params: {
  datasetId: string;
  page: number;
  pageSize?: number;
  batchId?: string | null; // if null → latest
  q?: string;
}) {
  const { datasetId, page, pageSize = 50, batchId, q } = params;

  // meta
  const [dataset, setDataset] = useState<DatasetMeta | null>(null);
  const [mode, setMode] = useState<Mode>("flat");

  // batches
  const [batches, setBatches] = useState<Batch[]>([]);
  const [chosenBatchId, setChosenBatchId] = useState<string | null>(batchId ?? null);

  // rows
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [allColumns, setAllColumns] = useState<string[]>([]);

  // ui
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Effective batch = chosen locally OR prop.batchId fallback */
  const effectiveBatchId = useMemo(() => chosenBatchId ?? batchId ?? null, [chosenBatchId, batchId]);

  /** Load meta + batches for a dataset id */
  const refreshMeta = useCallback(async () => {
    if (!datasetId) return;
    const meta = await fetchDatasetMeta(datasetId);
    setDataset(meta);
    setMode(meta?.grouping_enabled ? "grouped" : "flat");
  }, [datasetId]);

  const refreshBatches = useCallback(async () => {
    if (!datasetId) return;
    const stamps = await fetchBatchStamps(datasetId);
    const computed = computeBatches(stamps);
    setBatches(computed);
    if (!batchId && computed.length) setChosenBatchId(computed[0].id);
  }, [datasetId, batchId]);

  /** Load a page of rows */
  const refreshRows = useCallback(async () => {
    if (!datasetId || !effectiveBatchId) {
      setRows([]);
      setTotal(0);
      return;
    }
    const table = mode === "grouped" ? "v_dataset_parents" : "v_dataset_flat";
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, count } = await fetchRows({
      datasetId,
      table,
      batchId: effectiveBatchId,
      from,
      to,
      q,
    });
    setRows(data);
    setTotal(count);
    if (data.length > 0) setAllColumns(Object.keys(data[0]?.data || {}));
  }, [datasetId, effectiveBatchId, mode, page, pageSize, q]);

  /** Load children for a given group key (parents → children) */
  const loadChildren = useCallback(
    async (groupKey: string) => {
      if (!datasetId || !effectiveBatchId || !groupKey) return [];
      return fetchChildren(datasetId, effectiveBatchId, groupKey);
    },
    [datasetId, effectiveBatchId]
  );

  /** Refresh all */
  const refreshAll = useCallback(async () => {
    await refreshMeta();
    await refreshBatches();
    await refreshRows();
  }, [refreshMeta, refreshBatches, refreshRows]);

  /** Effect: initial load */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        await refreshAll();
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Failed to load dataset");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [refreshAll]);

  /** Effect: rows (runs when page, batch, mode, or query changes) */
  useEffect(() => {
    refreshRows();
  }, [effectiveBatchId, mode, page, pageSize, q, refreshRows]);

  return {
    // meta
    loading,
    error,
    dataset,
    mode, // 'grouped' | 'flat'

    // batches
    batches,
    batchId: effectiveBatchId,
    setBatchId: setChosenBatchId,

    // rows
    rows,
    total,
    allColumns,

    // commands
    refreshMeta,
    refreshBatches,
    refreshRows,
    refreshAll,
    loadChildren, // ✅ now exposed to consumers
  };
}

/* ──────────────────────────────────────────────────────────────
 * Deep delete: rows → columns → dataset (+ optionally source)
 * ────────────────────────────────────────────────────────────── */
export async function removeDataset(datasetId: string, opts?: { alsoDeleteSource?: boolean }) {
  // 1) find source
  const { data: ds, error: e0 } = await supabase
    .from("datasets")
    .select("id, source_id, name")
    .eq("id", datasetId)
    .single();
  if (e0) throw e0;
  const sourceId = (ds?.source_id as string) || null;

  // 2) rows
  const { error: e1 } = await supabase.from("dataset_rows").delete().eq("dataset_id", datasetId);
  if (e1) throw e1;

  // 3) columns
  const { error: e2 } = await supabase.from("dataset_columns").delete().eq("dataset_id", datasetId);
  if (e2) throw e2;

  // 4) dataset
  const { error: e3 } = await supabase.from("datasets").delete().eq("id", datasetId);
  if (e3) throw e3;

  // 5) optionally remove unused source
  if (opts?.alsoDeleteSource && sourceId) {
    const { data: refs, error: e4 } = await supabase
      .from("datasets")
      .select("id")
      .eq("source_id", sourceId)
      .limit(1);
    if (e4) throw e4;
    if (!refs || refs.length === 0) {
      const { error: e5 } = await supabase.from("sheet_sources").delete().eq("id", sourceId);
      if (e5) throw e5;
    }
  }

  return { ok: true };
}
