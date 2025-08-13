// src/pages/apps/SheetsManager/index.tsx
import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { PreviewTable } from "@/integrations/google/components/SheetsWidgets";
import { useSheets } from "@/integrations/google/hooks/useSheets";
import { supabase } from "@/lib/supabase-client";

import { SourceControls } from "./SourceControls";
import { MappingEditor } from "./MappingEditor";
import { QualityBar, IssuesPanel } from "./Quality";
import { usePreviewPipeline, type Mapping as PipeMapping } from "@/integrations/google/hooks/usePreviewPipeline";

export type Mapping = PipeMapping;

export default function SheetsManager() {
  const { fetchPreview } = useSheets();

  // Selection
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [headerRow, setHeaderRow] = useState(1);
  const [maxRows, setMaxRows] = useState(200);
  const [datasetName, setDatasetName] = useState("");

  // Preview pipeline
  const {
    headers, rows, rawRows,
    mapping, setMapping,
    issues, stats,
    loadPreview, recompute,
    loading,
    // trimSpaces, setTrimSpaces,
    normalizeDates, setNormalizeDates,
    normalizeCurrency, setNormalizeCurrency,
  } = usePreviewPipeline(fetchPreview);

  // Modal
  const [open, setOpen] = useState(false);

  const subtitle = useMemo(
    () => (sheetName ? `Pick → Preview → Map` : `Pick → Preview`),
    [sheetName]
  );

  return (
    <div className="space-y-4">
      {/* Header with Connect button + Transform rules */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Sheets Manager</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Transform & Tools Toolbar */}
          <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
            {/* Normalize dates */}
            <label className="flex items-center gap-1 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={normalizeDates}
                onChange={(e) => setNormalizeDates(e.target.checked)}
              />
              Dates
            </label>

            {/* Parse currency */}
            <label className="flex items-center gap-1 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={normalizeCurrency}
                onChange={(e) => setNormalizeCurrency(e.target.checked)}
              />
              Currency
            </label>

            {/* Divider */}
            <div className="w-px h-5 bg-border mx-1" />

            {/* Placeholder buttons for future features */}
            <Button variant="ghost" size="sm" disabled title="Coming soon">
              Trim
            </Button>
            <Button variant="ghost" size="sm" disabled title="Coming soon">
              Dedup
            </Button>
            <Button variant="ghost" size="sm" disabled title="Coming soon">
              Clean
            </Button>

            {/* Divider */}
            <div className="w-px h-5 bg-border mx-1" />

            {/* Recalculate */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => recompute(rawRows, { keepMapping: true })}
              disabled={!sheetName || !!loading || !headers.length}
            >
              Recalculate
            </Button>
          </div>

          {/* Connect button (unchanged) */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="cursor-pointer">
                Connect & Load
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Connect Google Sheet</DialogTitle>
              </DialogHeader>
              <SourceControls
                spreadsheetId={spreadsheetId}
                setSpreadsheetId={setSpreadsheetId}
                sheetName={sheetName}
                setSheetName={setSheetName}
                headerRow={headerRow}
                setHeaderRow={setHeaderRow}
                maxRows={maxRows}
                setMaxRows={setMaxRows}
                loading={loading}
                showActions={false}
                onPreview={async () => {
                  await loadPreview(spreadsheetId, sheetName, headerRow, maxRows);
                  if (!datasetName) setDatasetName(sheetName);
                  setOpen(false);
                }}
                onSaveSource={() => saveAsSource(spreadsheetId, sheetName, headerRow)}
              />
              <Button
                className="mt-4 w-full"
                disabled={!spreadsheetId || !sheetName || loading}
                onClick={async () => {
                  await loadPreview(spreadsheetId, sheetName, headerRow, maxRows);
                  if (!datasetName) setDatasetName(sheetName);
                  setOpen(false);
                }}
              >
                {loading ? "Loading…" : "Load Preview"}
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Separator />

      {/* 2-column layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* Column A — Preview & Quality */}
        <div className="col-span-12 xl:col-span-8 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                First {rows.length} rows — {headers.length} columns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <QualityBar {...stats} />
              <PreviewTable headers={headers} rows={rows} />
              <IssuesPanel issues={issues} />
            </CardContent>
          </Card>
        </div>

        {/* Column B — Mapping & Import */}
        <div className="col-span-12 xl:col-span-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mapping & Import</CardTitle>
              <CardDescription>Rename, type, then import</CardDescription>
            </CardHeader>
            <CardContent>
              {mapping.length > 0 ? (
                <MappingEditor
                  mapping={mapping}
                  setMapping={setMapping}
                  datasetName={datasetName}
                  setDatasetName={setDatasetName}
                  rows={rows}
                  headers={headers}      // <-- add
                  issues={issues}        // <-- add
                  spreadsheetId={spreadsheetId}
                  sheetName={sheetName}
                  headerRow={headerRow}
                  onCheckData={() => recompute(rawRows, { keepMapping: true })}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Load a preview to configure mapping.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Save the spreadsheet source in Supabase
 */
async function saveAsSource(spreadsheetId: string, sheetName: string, headerRow: number) {
  if (!spreadsheetId || !sheetName) return alert("Pick a spreadsheet and tab");
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return alert("Sign in first");

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
