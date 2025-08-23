// src/lib/datamanager/api.ts
import { supabase } from "@/lib/supabase-client";

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

// Lightweight shape for the list page
export type DatasetSummary = Pick<DatasetMeta, "id" | "name" | "grouping_enabled" | "updated_at">;

export type Row = {
  id: string;
  role: string;
  group_key?: string;
  data: Record<string, any>;
};

export async function listDatasets(): Promise<DatasetSummary[]> {
  const { data, error } = await supabase
    .from("datasets")
    .select("id,name,grouping_enabled,updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DatasetSummary[];
}

export async function getDatasetMeta(datasetId: string): Promise<DatasetMeta> {
  const { data, error } = await supabase
    .from("datasets")
    .select("*")
    .eq("id", datasetId)
    .single();
  if (error) throw error;
  return data as DatasetMeta;
}

export async function listBatchStamps(
  datasetId: string
): Promise<Array<{ import_batch_id: string; imported_at: string }>> {
  const { data, error } = await supabase
    .from("dataset_rows")
    .select("import_batch_id, imported_at")
    .eq("dataset_id", datasetId)
    .order("imported_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Array<{ import_batch_id: string; imported_at: string }>;
}

export function computeBatches(
  stamps: Array<{ import_batch_id: string; imported_at: string }>
): Batch[] {
  const newest = new Map<string, string>();
  for (const s of stamps) {
    const prev = newest.get(s.import_batch_id);
    if (!prev || prev < s.imported_at) newest.set(s.import_batch_id, s.imported_at);
  }
  return [...newest.entries()]
    .map(([id, imported_at]) => ({ id, imported_at }))
    .sort((a, b) => (a.imported_at < b.imported_at ? 1 : -1));
}

export async function getLatestBatchId(datasetId: string): Promise<string | null> {
  const stamps = await listBatchStamps(datasetId);
  const batches = computeBatches(stamps);
  return batches[0]?.id ?? null;
}

/* ──────────────────────────────────────────────────────────────
 * Rows (paged)
 * ────────────────────────────────────────────────────────────── */
type ListRowsArgs = {
  datasetId: string;
  batchId: string;
  mode: Mode;
  page: number;
  pageSize: number;
  q?: string;
  // placeholders for future server sorting/filtering
  sortBy?: string | null;
  sortDir?: "asc" | "desc" | null;
  filterField?: string | null;
  filterValue?: string | null;
};

export async function listRows(args: ListRowsArgs): Promise<{ data: Row[]; count: number }> {
  const { datasetId, batchId, mode, page, pageSize, q } = args;
  const table = mode === "grouped" ? "v_dataset_parents" : "v_dataset_flat";
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let qy = supabase
    .from(table)
    .select("id,data,role,group_key,import_batch_id", { count: "exact" })
    .eq("dataset_id", datasetId)
    .eq("import_batch_id", batchId)
    .range(from, to)
    .order("id", { ascending: true });

  // Full-text-ish search on precomputed text column
  if (q && q.trim()) qy = qy.ilike("data_text", `%${q}%`);

  const { data, count, error } = await qy;
  if (error) throw error;
  return { data: (data ?? []) as Row[], count: count ?? 0 };
}

/* ──────────────────────────────────────────────────────────────
 * Children by group_key
 * ────────────────────────────────────────────────────────────── */
export async function listChildren(
  datasetId: string,
  batchId: string,
  groupKey: string
): Promise<Row[]> {
  const { data, error } = await supabase
    .from("v_dataset_children")
    .select("id,data,role,group_key,import_batch_id")
    .eq("dataset_id", datasetId)
    .eq("import_batch_id", batchId)
    .eq("group_key", groupKey)
    .order("id", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Row[];
}

/* ──────────────────────────────────────────────────────────────
 * Deep delete
 * ────────────────────────────────────────────────────────────── */
export async function deleteDatasetDeep(datasetId: string) {
  // 1) find source
  const { data: ds, error: e0 } = await supabase.from("datasets").select("id, source_id").eq("id", datasetId).single();
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

  // 5) ALWAYS try to delete the linked source if unused
  if (sourceId) {
    const { data: refs, error: e4 } = await supabase.from("datasets").select("id").eq("source_id", sourceId).limit(1);
    if (e4) throw e4;

    if (!refs || refs.length === 0) {
      const { error: e5 } = await supabase.from("sheet_sources").delete().eq("id", sourceId);
      if (e5) throw e5;
    }
  }

  return { ok: true };
}