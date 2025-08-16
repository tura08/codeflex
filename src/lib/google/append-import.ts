import { supabase } from "@/lib/supabase-client";
import { groupRecords, type GroupingConfig } from "@/lib/google/grouping";

function makeGroupKey(groupBy: string[], row: Record<string, any>) {
  const SEP = "¦¦";
  return groupBy.map((k) => String(row?.[k] ?? "")).join(SEP);
}

export async function appendImportSingleTable(params: {
  datasetId: string;
  records: Record<string, any>[];
  groupingEnabled?: boolean;
  groupingConfig?: GroupingConfig | null;
}) {
  const { datasetId, records, groupingEnabled, groupingConfig } = params;
  const import_batch_id =
    (globalThis as any).crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

  // FLAT APPEND (no grouping)
  if (!groupingEnabled || !groupingConfig) {
    const rowsToInsert = records.map((r) => ({
      dataset_id: datasetId,
      data: r, // write to `data` jsonb
      role: "row" as const,
      group_key: null,
      import_batch_id,
    }));

    const { error } = await supabase.from("dataset_rows").insert(rowsToInsert);
    if (error) throw error;

    return { parents: 0, children: 0, rows: rowsToInsert.length, import_batch_id };
  }

  // GROUPED APPEND (parent/child)
  const grouped = groupRecords(records, groupingConfig);

  const parents = grouped.parents.map((p) => ({
    dataset_id: datasetId,
    data: p,
    role: "parent" as const,
    group_key: makeGroupKey(groupingConfig.groupBy, p),
    import_batch_id,
  }));

  const children = grouped.children.map((c) => ({
    dataset_id: datasetId,
    data: c,
    role: "child" as const,
    group_key: makeGroupKey(groupingConfig.groupBy, c),
    import_batch_id,
  }));

  if (parents.length) {
    const { error } = await supabase.from("dataset_rows").insert(parents);
    if (error) throw error;
  }
  if (children.length) {
    const { error } = await supabase.from("dataset_rows").insert(children);
    if (error) throw error;
  }

  return {
    parents: parents.length,
    children: children.length,
    rows: 0,
    import_batch_id,
  };
}
