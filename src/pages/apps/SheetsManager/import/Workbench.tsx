import { useMemo, useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import ImportFunctions from "../components/ImportFunctions";
import GroupingView from "./GroupingView";
import MappingEditor from "./MappingEditor";
import { useImportController } from "./ImportController";
import { toast } from "sonner";
import PreviewPanel from "./PreviewPanel";

export default function Workbench() {
  const {
    headers, rows, rawRows, mapping, setMapping, issues, stats,
    recompute, loading, normalizeDates, setNormalizeDates,
    normalizeCurrency, setNormalizeCurrency,
    removeEmptyRows, setRemoveEmptyRows,
    removeMostlyEmptyRows, setRemoveMostlyEmptyRows,
    mostlyThreshold, setMostlyThreshold,
    skipped, sheetName, datasetName, setDatasetName,
    records, availableFields,
    groupingEnabled, setGroupingEnabled,
    groupingConfig, setGroupingConfig,
  } = useImportController();

  const [view, setView] = useState<"workbench" | "grouping">("workbench");

  const subtitle = useMemo(
    () => (sheetName ? `Pick → Preview → Map → Group → Review → Save` : `Pick → Preview`),
    [sheetName]
  );

  useEffect(() => {
    if (skipped.empty || skipped.mostly) {
      const parts: string[] = [];
      if (skipped.empty) parts.push(`${skipped.empty} empty`);
      if (skipped.mostly) parts.push(`${skipped.mostly} mostly-empty`);
      toast("Rows skipped", { description: parts.join(" · ") });
    }
  }, [skipped.empty, skipped.mostly]);

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

        {/* Right: rules + Grouping (kept here) */}
        <div className="flex items-center gap-4">
          <ImportFunctions
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
          <Button
            variant="outline"
            className="cursor-pointer"
            disabled={!records.length}
            onClick={() => setView("grouping")}
          >
            Grouping
          </Button>
        </div>
      </div>

      <Separator />

      {/* 2-column layout */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 xl:col-span-8 space-y-4">
          <PreviewPanel headers={headers} rows={rows} stats={stats} issues={issues} />
        </div>
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
