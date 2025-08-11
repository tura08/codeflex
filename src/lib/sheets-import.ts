import { supabase } from "@/lib/supabase-client";

export type SheetSource = {
  id: string;
  user_id: string;
  spreadsheet_id: string;
  spreadsheet_name: string;
  sheet_name: string;
  header_row: number;
};

export async function listSheetSources(): Promise<SheetSource[]> {
  const { data, error } = await supabase
    .from("sheet_sources")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
