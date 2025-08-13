// src/pages/apps/SheetsManager/MappingEditor.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/lib/supabase-client";
import { coerce, type SimpleType } from "@/lib/google/infer";
import type { Mapping } from "@/integrations/google/hooks/usePreviewPipeline";

interface Props {
  mapping: Mapping[];
  setMapping: (m: Mapping[]) => void;
  datasetName: string;
  setDatasetName: (s: string) => void;
  rows: any[][];
  spreadsheetId: string;
  sheetName: string;
  headerRow: number;
}

export function MappingEditor({
  mapping,
  setMapping,
  datasetName,
  setDatasetName,
  rows,
  spreadsheetId,
  sheetName,
  headerRow,
}: Props) {
  const [sqlPreview, setSqlPreview] = useState("");

  async function getOrCreateSourceId(userId: string): Promise<string> {
    // Try to find an existing source
    const { data: existing, error: qErr } = await supabase
      .from("sheet_sources")
      .select("id")
      .eq("user_id", userId)
      .eq("spreadsheet_id", spreadsheetId)
      .eq("sheet_name", sheetName)
      .eq("header_row", headerRow)
      .limit(1)
      .maybeSingle();

    if (qErr) throw qErr;
    if (existing?.id) return existing.id;

    // Create one if not found (simple fallback name)
    let spreadsheet_name = spreadsheetId;
    try {
      const { data: file } = await supabase.functions
        .invoke("lookup-file-name", { body: { spreadsheetId } });
      if ((file as any)?.name) spreadsheet_name = (file as any).name;
    } catch {
      /* ignore, fallback to id */
    }

    const { data: created, error: cErr } = await supabase
      .from("sheet_sources")
      .insert({
        user_id: userId,
        spreadsheet_id: spreadsheetId,
        spreadsheet_name,
        sheet_name: sheetName,
        header_row: headerRow,
      })
      .select("id")
      .single();

    if (cErr) throw cErr;
    return created.id as string;
  }

  async function handleCreateDatasetAndImport() {
    if (!datasetName.trim()) return alert("Dataset name required");
    if (!spreadsheetId || !sheetName) return alert("Pick a spreadsheet and tab");

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return alert("Sign in first");

    const sourceId = await getOrCreateSourceId(user.id);

    // 1) dataset
    const { data: ds, error: e1 } = await supabase
      .from("datasets")
      .insert({ user_id: user.id, name: datasetName.trim(), source_id: sourceId })
      .select()
      .single();
    if (e1 || !ds) return alert(e1?.message || "Failed to create dataset");

    // 2) columns
    const { error: e2 } = await supabase.from("dataset_columns").insert(
      mapping.map(m => ({ dataset_id: ds.id, name: m.name, type: m.type, map_from: m.map_from }))
    );
    if (e2) return alert(e2.message);

    // 3) rows (preview import)
    const typedRows = rows.map(r => {
      const obj: Record<string, any> = {};
      mapping.forEach((m, idx) => { obj[m.name] = coerce(r[idx], m.type); });
      return { dataset_id: ds.id, data: obj };
    });
    if (typedRows.length) {
      const { error: e3 } = await supabase.from("dataset_rows").insert(typedRows);
      if (e3) return alert(e3.message);
    }

    alert(`Dataset created and ${typedRows.length} rows imported.`);
  }

  function handleGenerateSQL() {
    const tbl = datasetName.trim().toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "_")
      .replace(/^_+|_+$/g, "");
    const pgType = (t: SimpleType) =>
      t === "number" ? "numeric" :
      t === "boolean" ? "boolean" :
      t === "date" ? "timestamptz" : "text";

    const cols = mapping.map(m => `  "${m.name}" ${pgType(m.type)}`).join(",\n");
    const sql =
`create table if not exists public."${tbl}" (
  id uuid primary key default gen_random_uuid(),
${cols ? cols + ",\n" : ""}  created_at timestamptz default now()
);`;
    setSqlPreview(sql);
  }

  function handleCopySQL() {
    if (!sqlPreview) return;
    navigator.clipboard.writeText(sqlPreview);
    alert("SQL copied");
  }

  return (
    <div className="space-y-4">
      {/* Dataset/Table name */}
      <div className="flex items-center gap-2">
        <span className="text-sm">Dataset/Table name:</span>
        <Input
          className="w-[360px]"
          value={datasetName}
          onChange={(e) => setDatasetName(e.target.value)}
        />
      </div>

      {/* Column mapping */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {mapping.map((m, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              className="w-48"
              value={m.name}
              onChange={(e) =>
                setMapping(mapping.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))
              }
            />
            <Select
              value={m.type}
              onValueChange={(v) =>
                setMapping(mapping.map((x, i) => (i === idx ? { ...x, type: v as SimpleType } : x)))
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">string</SelectItem>
                <SelectItem value="number">number</SelectItem>
                <SelectItem value="boolean">boolean</SelectItem>
                <SelectItem value="date">date</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">← {m.map_from}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button className="cursor-pointer" onClick={handleCreateDatasetAndImport}>
          Create Dataset + Import Preview
        </Button>
        <Button variant="outline" className="cursor-pointer" onClick={handleGenerateSQL}>
          Generate SQL (CREATE TABLE)
        </Button>
        {!!sqlPreview && (
          <Button variant="secondary" className="cursor-pointer" onClick={handleCopySQL}>
            Copy SQL
          </Button>
        )}
      </div>

      {/* SQL Preview */}
      {!!sqlPreview && (
        <pre className="mt-2 whitespace-pre-wrap rounded bg-muted p-3 text-xs">
          {sqlPreview}
        </pre>
      )}
    </div>
  );
}
