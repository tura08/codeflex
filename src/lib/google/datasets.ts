import { supabase } from "@/lib/supabase-client";
import type { GroupingConfig } from "@/lib/google/grouping";
import type { Mapping } from "@/integrations/google/types";

async function getUserId() {
  const { data } = await supabase.auth.getUser();
  const uid = data?.user?.id;
  if (!uid) throw new Error("Sign in first");
  return uid;
}

/** Create a dataset row with a safe name */
export async function createDatasetMinimal(name?: string): Promise<{ id: string }> {
  const user_id = await getUserId();
  const safe = (name ?? "").trim() || `dataset_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const { data, error } = await supabase
    .from("datasets")
    .insert({ user_id, name: safe })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id as string };
}

/** Create a dataset with source + optional grouping flags */
export async function createDatasetWithSource(params: {
  name: string;
  source_id: string;
  grouping_enabled?: boolean;
  grouping_config?: GroupingConfig | null;
}): Promise<{ id: string }> {
  const user_id = await getUserId();
  const safe = (params.name ?? "").trim() || `dataset_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const { data, error } = await supabase
    .from("datasets")
    .insert({
      user_id,
      name: safe,
      source_id: params.source_id,
      grouping_enabled: !!params.grouping_enabled,
      grouping_config: params.grouping_config ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id as string };
}

export async function getGroupingConfigById(datasetId: string): Promise<{
  enabled: boolean;
  config: GroupingConfig | null;
}> {
  const { data, error } = await supabase
    .from("datasets")
    .select("grouping_enabled, grouping_config")
    .eq("id", datasetId)
    .maybeSingle();
  if (error) throw error;
  return {
    enabled: !!data?.grouping_enabled,
    config: (data?.grouping_config as GroupingConfig | null) ?? null,
  };
}

export async function saveGroupingConfigById(params: {
  datasetId: string;
  enabled: boolean;
  config: GroupingConfig | null;
}): Promise<string> {
  const user_id = await getUserId();
  const { datasetId, enabled, config } = params;
  const { data, error } = await supabase
    .from("datasets")
    .update({
      grouping_enabled: enabled,
      grouping_config: config ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", datasetId)
    .eq("user_id", user_id)
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Save the finalized mapping into dataset_columns */
export async function saveDatasetColumns(params: {
  dataset_id: string;
  mapping: Mapping[];
}): Promise<void> {
  const { dataset_id, mapping } = params;
  if (!dataset_id || !mapping?.length) return;

  const rows = mapping.map((m) => ({
    dataset_id,
    name: m.name,
    type: m.type,
    map_from: m.map_from,
  }));

  const { error } = await supabase.from("dataset_columns").insert(rows);
  if (error) throw error;
}
