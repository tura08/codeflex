// src/lib/google/sheets-sources.ts
import { supabase } from "@/lib/supabase-client";

/** Keep: your existing helper to explicitly save a source */
export async function saveSheetSource(params: {
  spreadsheetId: string;
  sheetName: string;
  headerRow: number;
  spreadsheetName?: string; // optional pretty name
}) {
  const { spreadsheetId, sheetName, headerRow, spreadsheetName } = params;

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Sign in first");

  const { error } = await supabase.from("sheet_sources").insert({
    user_id: user.id,
    spreadsheet_id: spreadsheetId,
    spreadsheet_name: spreadsheetName ?? spreadsheetId,
    sheet_name: sheetName,
    header_row: headerRow,
  });
  if (error) throw error;
}

/** Keep: list helper */
export async function listSheetSources() {
  const { data, error } = await supabase
    .from("sheet_sources")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** NEW: ensure (find or create) a sheet source and return its id */
export async function getOrCreateSheetSource(params: {
  spreadsheetId: string;
  sheetName: string;
  headerRow: number;
}): Promise<{ id: string }> {
  const { spreadsheetId, sheetName, headerRow } = params;

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Sign in first");

  // 1) try to find existing
  const { data: existing, error: qErr } = await supabase
    .from("sheet_sources")
    .select("id")
    .eq("user_id", user.id)
    .eq("spreadsheet_id", spreadsheetId)
    .eq("sheet_name", sheetName)
    .eq("header_row", headerRow)
    .maybeSingle();
  if (qErr) throw qErr;
  if (existing?.id) return { id: existing.id };

  // 2) create one (try to decorate with file name if available)
  let spreadsheet_name = spreadsheetId;
  try {
    const { data: file } = await supabase.functions
      .invoke("lookup-file-name", { body: { spreadsheetId } })
      .catch(() => ({ data: null as any }));
    if ((file as any)?.name) spreadsheet_name = (file as any).name;
  } catch {
    // ignore; not critical
  }

  const { data: created, error: cErr } = await supabase
    .from("sheet_sources")
    .insert({
      user_id: user.id,
      spreadsheet_id: spreadsheetId,
      spreadsheet_name,
      sheet_name: sheetName,
      header_row: headerRow,
    })
    .select("id")
    .single();
  if (cErr) throw cErr;

  return { id: created.id as string };
}
