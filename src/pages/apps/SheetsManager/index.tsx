import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PreviewTable } from "@/integrations/google/components/PreviewTable";
import { useSheets } from "@/integrations/google/hooks/useSheets";
import { supabase } from "@/lib/supabase-client";
import { inferType, normalizeHeader, coerce, type SimpleType } from "@/lib/google/infer";
import { SourceControls } from "./SourceControls";
import { MappingEditor } from "./MappingEditor";


export type Mapping = { map_from: string; name: string; type: SimpleType };

export default function SheetsManager() {
  const { fetchPreview } = useSheets();

  // selection
  const [spreadsheetId, setSpreadsheetId] = useState<string>("");
  const [sheetName, setSheetName] = useState<string>("");
  const [headerRow, setHeaderRow] = useState<number>(1);
  const [maxRows, setMaxRows] = useState<number>(50);

  // preview
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[][]>([]);
  const [loading, setLoading] = useState(false);

  // mapping/dataset
  const [datasetName, setDatasetName] = useState<string>("");
  const [mapping, setMapping] = useState<Mapping[]>([]);
  const [sqlPreview, setSqlPreview] = useState<string>("");

  async function preview() {
    if (!spreadsheetId || !sheetName) return;
    setLoading(true);
    try {
      const { headers, rows } = await fetchPreview(spreadsheetId, sheetName, headerRow, maxRows);

      // set data
      setHeaders(headers);
      setRows(rows);

      // infer mapping
      const used = new Set<string>();
      const cols: Mapping[] = headers.map((h, i) => ({
        map_from: h,
        name: normalizeHeader(h, i, used),
        type: inferType(rows.map(r => r[i])),
      }));
      setMapping(cols);

      // default dataset name
      setDatasetName(`${sheetName}`); // simple; tweak if you want to include file name
      setSqlPreview(""); // clear any previous SQL
    } finally {
      setLoading(false);
    }
  }
  async function getOrCreateSourceId(userId: string): Promise<string> {
    // 1) try find an existing source for this file/tab/header
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

    // 2) create one if not found (optional lookup for nice name)
    let spreadsheet_name = spreadsheetId;
    try {
        const { data: file } = await supabase.functions
        .invoke("lookup-file-name", { body: { spreadsheetId } });
        if ((file as any)?.name) spreadsheet_name = (file as any).name;
    } catch { /* ignore, fallback to id */ }

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

  async function saveAsSource() {
    if (!spreadsheetId || !sheetName) return alert("Pick a spreadsheet and tab");
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return alert("Sign in first");

    // optional edge function to get file name; safe fallback included
    const { data: file } = await supabase.functions
      .invoke("lookup-file-name", { body: { spreadsheetId } })
      .catch(() => ({ data: null as any }));
    const spreadsheet_name = (file as any)?.name ?? spreadsheetId;

    const { error } = await supabase.from("sheet_sources").insert({
      user_id: user.id,
      spreadsheet_id: spreadsheetId,
      spreadsheet_name,
      sheet_name: sheetName,
      header_row: headerRow,
    });
    if (error) return alert(error.message);
    alert("Saved as source.");
  }

  async function createDatasetAndImportPreview() {
    if (!datasetName.trim()) return alert("Dataset name required");
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return alert("Sign in first");

    const sourceId = await getOrCreateSourceId(user.id);

    // 1) dataset
    const { data: ds, error: e1 } = await supabase
        .from("datasets")
        .insert({ user_id: user.id, name: datasetName.trim(), source_id: sourceId }) // ← use it here
        .select()
        .single();
    if (e1 || !ds) return alert(e1?.message || "Failed to create dataset");

    // 2) columns
    const { error: e2 } = await supabase.from("dataset_columns").insert(
      mapping.map(m => ({ dataset_id: ds.id, name: m.name, type: m.type, map_from: m.map_from }))
    );
    if (e2) return alert(e2.message);

    // 3) rows (preview only for now)
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

  function buildCreateTableSQL() {
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
    ${cols ? cols + ",\n" : ""}
    created_at timestamptz default now()
    );`;
        setSqlPreview(sql);
    }

  const subtitle = useMemo(() => (sheetName ? `Pick → Preview → Map` : `Pick → Preview`), [sheetName]);

  return (
    <div className="space-y-6 max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle>Sheets Manager</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Top controls (connect + sheet/tab/header) */}
          <SourceControls
            spreadsheetId={spreadsheetId}
            setSpreadsheetId={setSpreadsheetId}
            sheetName={sheetName}
            setSheetName={setSheetName}
            headerRow={headerRow}
            setHeaderRow={setHeaderRow}
            maxRows={maxRows}
            setMaxRows={setMaxRows}
            onPreview={preview}
            onSaveSource={saveAsSource}
            loading={loading}
          />

          {/* Preview table */}
          <PreviewTable headers={headers} rows={rows} />

          {/* Mapping + actions */}
          {mapping.length > 0 && (
            <MappingEditor
              mapping={mapping}
              setMapping={setMapping}
              datasetName={datasetName}
              setDatasetName={setDatasetName}
              onCreateDatasetAndImport={createDatasetAndImportPreview}
              onGenerateSQL={buildCreateTableSQL}
              sqlPreview={sqlPreview}
              onCopySQL={() => { navigator.clipboard.writeText(sqlPreview); alert("SQL copied"); }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
