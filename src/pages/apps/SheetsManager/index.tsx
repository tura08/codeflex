// src/pages/apps/SheetsManager/index.tsx
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useSheets } from "@/integrations/google/hooks/useSheets";
import { supabase } from "@/lib/supabase-client";

import { SourceControls } from "./SourceControls";
import { usePreviewPipeline, type Mapping as PipeMapping } from "@/integrations/google/hooks/usePreviewPipeline";
import SheetsTop from "./SheetsTop";
import PreviewPanel from "./PreviewPanel";
import MappingPanel from "./MappingPanel";

// sheets sources helper (moved out of this file)
import { saveSheetSource } from "@/lib/google/sheets-sources";

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
    normalizeDates, setNormalizeDates,
    normalizeCurrency, setNormalizeCurrency,

    removeEmptyRows, setRemoveEmptyRows,
    removeMostlyEmptyRows, setRemoveMostlyEmptyRows,
    mostlyThreshold, setMostlyThreshold,
    skipped, // { empty, mostly }
  } = usePreviewPipeline(fetchPreview);

  // Modal
  const [open, setOpen] = useState(false);

  const subtitle = useMemo(
    () => (sheetName ? `Pick → Preview → Map` : `Pick → Preview`),
    [sheetName]
  );

  // Feedback: rows skipped by empty/mostly-empty filters
  useEffect(() => {
    if (skipped.empty || skipped.mostly) {
      const parts: string[] = [];
      if (skipped.empty) parts.push(`${skipped.empty} empty`);
      if (skipped.mostly) parts.push(`${skipped.mostly} mostly-empty`);
      toast("Rows skipped", { description: parts.join(" · ") });
    }
  }, [skipped.empty, skipped.mostly]);

  return (
    <div className="space-y-4">
      {/* Header: title/subtitle + toolbar + Connect dialog trigger */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Sheets Manager</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex items-center gap-4">
          <SheetsTop
            normalizeDates={normalizeDates}
            setNormalizeDates={setNormalizeDates}
            normalizeCurrency={normalizeCurrency}
            setNormalizeCurrency={setNormalizeCurrency}
            removeEmptyRows={removeEmptyRows}
            setRemoveEmptyRows={setRemoveEmptyRows}
            removeMostlyEmptyRows={removeMostlyEmptyRows}
            setRemoveMostlyEmptyRows={setRemoveMostlyEmptyRows}
            mostlyThreshold={mostlyThreshold}
            setMostlyThreshold={setMostlyThreshold}
            recompute={recompute}
            rawRows={rawRows}
            headers={headers}
            loading={loading}
            sheetName={sheetName}
          />

          {/* Connect & Load dialog (unchanged, stays here) */}
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
                onSaveSource={async () => {
                  if (!spreadsheetId || !sheetName) return alert("Pick a spreadsheet and tab");

                  // Optional pretty name from your Edge Function
                  const { data: file } = await supabase.functions
                    .invoke("lookup-file-name", { body: { spreadsheetId } })
                    .catch(() => ({ data: null as any }));

                  const spreadsheet_name = (file as any)?.name ?? spreadsheetId;

                  try {
                    await saveSheetSource({
                      spreadsheetId,
                      sheetName,
                      headerRow,
                      spreadsheetName: spreadsheet_name,
                    });
                    alert("Saved as source.");
                  } catch (e: any) {
                    alert(e?.message ?? "Failed to save source");
                  }
                }}
              />

              <Button
                className="mt-4 w-full"
                disabled={!spreadsheetId || !sheetName || loading}
                onClick={async () => {
                  try {
                    await loadPreview(spreadsheetId, sheetName, headerRow, maxRows);
                    if (!datasetName) setDatasetName(sheetName);
                    setOpen(false);
                    toast.success("Preview loaded", {
                      description: `${sheetName} — first ${maxRows} rows`,
                    });
                  } catch (e: any) {
                    toast.error("Failed to load preview", { description: e?.message ?? "Unknown error" });
                  }
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
          <PreviewPanel headers={headers} rows={rows} stats={stats} issues={issues} />
        </div>

        {/* Column B — Mapping & Import */}
        <div className="col-span-12 xl:col-span-4 space-y-4">
          <MappingPanel
            mapping={mapping}
            setMapping={setMapping}
            datasetName={datasetName}
            setDatasetName={setDatasetName}
            rows={rows}
            headers={headers}
            issues={issues}
            spreadsheetId={spreadsheetId}
            sheetName={sheetName}
            headerRow={headerRow}
            onCheckData={() => recompute(rawRows, { keepMapping: true })}
          />
        </div>
      </div>
    </div>
  );
}
