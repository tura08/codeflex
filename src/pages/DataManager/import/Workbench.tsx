// src/pages/apps/SheetsManager/import/Workbench.tsx
import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import ImportFunctions from "./ImportFunctions";
import GroupingView from "./GroupingView";
import MappingEditor from "./MappingEditor";
import { toast } from "sonner";
import PreviewPanel from "./PreviewPanel";
import { useImportController } from "./ImportControllerContext";

export default function Workbench() {
  const controller = useImportController();

  // Pipeline
  const { headers, rows, rawRows, mapping, issues, stats } = controller.pipeline.data;
  const { setMapping } = controller.pipeline.setRules;
  const { recompute } = controller.pipeline.actions;
  const { skipped } = controller.pipeline;

  // Source / dataset
  const { sheetName, datasetName, setDatasetName } = controller.source;
  const { records } = controller.dataset;

  // Grouping (display only here)
  const { enabled: groupingEnabled, config: groupingConfig } = controller.grouping;

  // Local UI state
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
        onClose={() => {
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
          <h1 className="text-base font-semibold">Actions</h1>
          <p className="text-sm text-muted-foreground">
            {subtitle}
            {groupingEnabled && groupingConfig?.groupBy?.length ? (
              <span className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                Grouping ON (keys: {groupingConfig.groupBy.join(", ")})
              </span>
            ) : null}
          </p>
        </div>

        {/* Right: rules + Grouping */}
        <div className="flex items-center gap-4">
          <ImportFunctions />
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
            issues={issues}
            onCheckData={() => recompute(rawRows, { keepMapping: true })}
          />
        </div>
      </div>
    </div>
  );
}
