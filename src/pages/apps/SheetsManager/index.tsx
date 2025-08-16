// src/pages/apps/SheetsManager/index.tsx
import { useMemo, useState, useEffect, useCallback } from "react";
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
import {
  usePreviewPipeline,
  type Mapping as PipeMapping,
} from "@/integrations/google/hooks/usePreviewPipeline";
import { useFinalDataset } from "@/integrations/google/hooks/useFinalDataset";

import SheetsTop from "./SheetsTop";
import PreviewPanel from "./PreviewPanel";
import GroupingView from "./GroupingView";
import MappingEditor from "./MappingEditor";

import type { GroupingConfig } from "@/lib/google/grouping";
import { saveSheetSource, getOrCreateSheetSource } from "@/lib/google/sheets-sources";
import { createDatasetWithSource, saveDatasetColumns } from "@/lib/google/datasets";
import { appendImportSingleTable } from "@/lib/google/append-import";

export type Mapping = PipeMapping;

export default function SheetsManager() {
  const { fetchPreview } = useSheets();

  // View toggle
  const [view, setView] = useState<"workbench" | "grouping">("workbench");

  // Source selection (no DB yet)
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [headerRow, setHeaderRow] = useState(1);
  const [maxRows, setMaxRows] = useState(200);
  const [datasetName, setDatasetName] = useState("");

  // Preview pipeline (in memory)
  const {
    headers,
    rows,
    rawRows,
    mapping,
    setMapping,
    issues,
    stats,
    loadPreview,
    recompute,
    loading,
    normalizeDates,
    setNormalizeDates,
    normalizeCurrency,
    setNormalizeCurrency,
    removeEmptyRows,
    setRemoveEmptyRows,
    removeMostlyEmptyRows,
    setRemoveMostlyEmptyRows,
    mostlyThreshold,
    setMostlyThreshold,
    skipped,
  } = usePreviewPipeline(fetchPreview);

  // Build mapped objects for JSON/grouping preview
  const { records, availableFields } = useFinalDataset(rows, headers, mapping);

  // Grouping state (in memory until final save)
  const [groupingEnabled, setGroupingEnabled] = useState(false);
  const [groupingConfig, setGroupingConfig] = useState<GroupingConfig | null>(null);

  // Modal (Connect & Load)
  const [open, setOpen] = useState(false);

  // Header save busy state
  const [saving, setSaving] = useState(false);

  const subtitle = useMemo(
    () => (sheetName ? `Pick → Preview → Map → Group → Review → Save` : `Pick → Preview`),
    [sheetName]
  );

  // Feedback: skipped rows
  useEffect(() => {
    if (skipped.empty || skipped.mostly) {
      const parts: string[] = [];
      if (skipped.empty) parts.push(`${skipped.empty} empty`);
      if (skipped.mostly) parts.push(`${skipped.mostly} mostly-empty`);
      toast("Rows skipped", { description: parts.join(" · ") });
    }
  }, [skipped.empty, skipped.mostly]);

  // HEADER: Save & Import (final persistence only here)
  const handleSaveAndImport = useCallback(async () => {
    if (!records || records.length === 0) {
      toast.error("Nothing to import", { description: "Load and map some rows first." });
      return;
    }
    if (!spreadsheetId || !sheetName) {
      toast.error("Missing source", { description: "Pick a spreadsheet and tab first." });
      return;
    }

    setSaving(true);
    try {
      // 1) Ensure sheet source (required to satisfy datasets.source_id NOT NULL)
      const { id: sourceId } = await getOrCreateSheetSource({
        spreadsheetId,
        sheetName,
        headerRow,
      });

      // 2) Create dataset snapshot with name + source_id (+ grouping flags)
      const label = datasetName || sheetName;
      const { id: datasetId } = await createDatasetWithSource({
        name: label,
        source_id: sourceId,
        grouping_enabled: groupingEnabled,
        grouping_config: groupingEnabled ? (groupingConfig ?? null) : null,
      });

      // 3) Persist mapping
      await saveDatasetColumns({ dataset_id: datasetId, mapping });

      // 4) Append import rows (flat or parent/child)
      const res = await appendImportSingleTable({
        datasetId,
        records,
        groupingEnabled,
        groupingConfig: groupingEnabled ? groupingConfig ?? undefined : undefined,
      });

      toast.success("Import complete", {
        description: groupingEnabled
          ? `Parents: ${res.parents} · Children: ${res.children} · Batch: ${res.import_batch_id}`
          : `Rows: ${res.rows} · Batch: ${res.import_batch_id}`,
      });
    } catch (e: any) {
      toast.error("Import failed", { description: e?.message ?? "Unknown error" });
    } finally {
      setSaving(false);
    }
  }, [
    records,
    spreadsheetId,
    sheetName,
    headerRow,
    datasetName,
    groupingEnabled,
    groupingConfig,
    mapping,
  ]);

  /* ──────────────────────────────────────────────────────────────
   * GROUPING VIEW (configure only)
   * ──────────────────────────────────────────────────────────── */
  if (view === "grouping") {
    return (
      <GroupingView
        records={records}
        fields={availableFields}
        initialEnabled={groupingEnabled}
        initialConfig={groupingConfig}
        onClose={(res) => {
          if (res) {
            setGroupingEnabled(res.enabled);
            setGroupingConfig(res.config ?? null);
          }
          setView("workbench");
        }}
      />
    );
  }

  /* ──────────────────────────────────────────────────────────────
   * DEFAULT VIEW (Preview + Mapping + Import)
   * ──────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Sheets Manager</h1>
          <p className="text-sm text-muted-foreground">
            {subtitle}
            {groupingEnabled && groupingConfig?.groupBy?.length ? (
              <span className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                Grouping ON (keys: {groupingConfig.groupBy.join(", ")})
              </span>
            ) : null}
          </p>
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

          {/* OPEN GROUPING VIEW (configure in memory) */}
          <Button
            variant="outline"
            className="cursor-pointer"
            disabled={!records.length}
            onClick={() => setView("grouping")}
          >
            Grouping
          </Button>

          {/* Connect & Load dialog */}
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
                  try {
                    await loadPreview(spreadsheetId, sheetName, headerRow, maxRows);
                    if (!datasetName) setDatasetName(sheetName);
                    setOpen(false);
                  } catch (e: any) {
                    toast.error("Failed to load preview", { description: e?.message ?? "Unknown error" });
                  }
                }}
                onSaveSource={async () => {
                  if (!spreadsheetId || !sheetName) return alert("Pick a spreadsheet and tab");
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
                    toast.error("Failed to load preview", {
                      description: e?.message ?? "Unknown error",
                    });
                  }
                }}
              >
                {loading ? "Loading…" : "Load Preview"}
              </Button>
            </DialogContent>
          </Dialog>

          {/* Save & Import in header (final commit) */}
          <Button
            className="cursor-pointer"
            disabled={saving || !records.length}
            onClick={handleSaveAndImport}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <Separator />

      {/* 2-column layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* Column A — Preview & Quality */}
        <div className="col-span-12 xl:col-span-8 space-y-4">
          <PreviewPanel headers={headers} rows={rows} stats={stats} issues={issues} />
        </div>

        {/* Column B — Mapping (single component) + optional ImportPanel */}
        <div className="col-span-12 xl:col-span-4 space-y-4">
          <MappingEditor
            mapping={mapping}
            setMapping={setMapping}
            datasetName={datasetName}
            setDatasetName={setDatasetName}
            rows={rows}
            headers={headers}
            issues={issues}
            onCheckData={() => recompute(rawRows, { keepMapping: true })}
          />
        </div>
      </div>
    </div>
  );
}