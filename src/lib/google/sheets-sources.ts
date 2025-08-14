// src/lib/google/sheets-sources.ts
import { supabase } from "@/lib/supabase-client";

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

export async function listSheetSources() {
  const { data, error } = await supabase
    .from("sheet_sources")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
