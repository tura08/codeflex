// src/integrations/google/hooks/useDatasetBrowser.ts
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase-client";

export function useDatasetsList() {
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("datasets")
          .select("id,name,grouping_enabled,grouping_config,updated_at")
          .order("updated_at", { ascending: false });
        if (error) throw error;
        setDatasets(data ?? []);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load datasets");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { loading, datasets, error };
}

type Mode = "grouped" | "flat";

export function useDatasetDetail(params: {
  datasetId: string;
  page: number;
  pageSize?: number;
  batchId?: string | null; // if null → latest
  q?: string;
}) {
  const { datasetId, page, pageSize = 50, batchId, q } = params;
  const [loading, setLoading] = useState(true);
  const [dataset, setDataset] = useState<any | null>(null);
  const [batches, setBatches] = useState<{ id: string; imported_at: string }[]>([]);
  const [effectiveBatchId, setEffectiveBatchId] = useState<string | null>(batchId ?? null);
  const [mode, setMode] = useState<Mode>("flat");
  const [rows, setRows] = useState<any[]>([]); // parents if grouped, flat rows otherwise
  const [total, setTotal] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // 1) load dataset + batches, decide mode
  useEffect(() => {
    (async () => {
      setError(null);
      try {
        const [{ data: ds, error: e1 }, { data: allRows, error: e2 }] = await Promise.all([
          supabase.from("datasets").select("*").eq("id", datasetId).single(),
          supabase
            .from("dataset_rows")
            .select("import_batch_id, imported_at")
            .eq("dataset_id", datasetId)
            .order("imported_at", { ascending: false }),
        ]);
        if (e1) throw e1;
        if (e2) throw e2;
        setDataset(ds);
        setMode(ds?.grouping_enabled ? "grouped" : "flat");

        const map = new Map<string, string>();
        (allRows ?? []).forEach((r: any) => {
          const prev = map.get(r.import_batch_id);
          if (!prev || prev < r.imported_at) map.set(r.import_batch_id, r.imported_at);
        });
        const list = [...map.entries()]
          .map(([id, imported_at]) => ({ id, imported_at }))
          .sort((a, b) => (a.imported_at < b.imported_at ? 1 : -1));
        setBatches(list);
        if (!batchId && list.length) setEffectiveBatchId(list[0].id);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load dataset");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetId]);

  // 2) load rows (parents or flat)
  useEffect(() => {
    const targetBatch = effectiveBatchId ?? batchId ?? null;
    if (!datasetId || !targetBatch) {
      setRows([]); setTotal(0); setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const table = mode === "grouped" ? "v_dataset_parents" : "v_dataset_flat";
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let qy = supabase
          .from(table)
          .select("id,data,role,group_key,import_batch_id", { count: "exact" })
          .eq("dataset_id", datasetId)
          .eq("import_batch_id", targetBatch)
          .range(from, to)
          .order("id", { ascending: true });

        if (q && q.trim()) qy = qy.ilike("data::text", `%${q}%`);

        const { data, count, error } = await qy;
        if (error) throw error;

        setRows(data ?? []);
        setTotal(count ?? 0);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load rows");
      } finally {
        setLoading(false);
      }
    })();
  }, [datasetId, effectiveBatchId, batchId, page, pageSize, q, mode]);

  // 3) children loader for a parent (order → products)
  const loadChildren = async (groupKey: string) => {
    if (!groupKey || !datasetId || !(effectiveBatchId ?? batchId)) return [];
    const { data, error } = await supabase
      .from("v_dataset_children")
      .select("id,data,group_key")
      .eq("dataset_id", datasetId)
      .eq("import_batch_id", effectiveBatchId ?? batchId!)
      .eq("group_key", groupKey)
      .order("id", { ascending: true });
    if (error) throw error;
    return data ?? [];
  };

  return {
    loading,
    dataset,
    mode, // 'grouped' or 'flat'
    batches,
    batchId: effectiveBatchId,
    setBatchId: setEffectiveBatchId,
    rows,
    total,
    error,
    loadChildren,
  };
}

  // --- ADD at bottom of file ---
// Deep delete: rows → columns → dataset. Optionally delete source if unused.
export async function removeDataset(datasetId: string, opts?: { alsoDeleteSource?: boolean }) {
  // 1) fetch dataset to know source_id
  const { data: ds, error: e0 } = await supabase
    .from("datasets")
    .select("id, source_id, name")
    .eq("id", datasetId)
    .single();
  if (e0) throw e0;
  const sourceId = ds?.source_id as string | null;

  // 2) delete rows
  const { error: e1 } = await supabase.from("dataset_rows").delete().eq("dataset_id", datasetId);
  if (e1) throw e1;

  // 3) delete columns
  const { error: e2 } = await supabase.from("dataset_columns").delete().eq("dataset_id", datasetId);
  if (e2) throw e2;

  // 4) delete dataset
  const { error: e3 } = await supabase.from("datasets").delete().eq("id", datasetId);
  if (e3) throw e3;

  // 5) optionally delete source if unused anywhere else
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