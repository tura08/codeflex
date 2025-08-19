import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import GroupingView from "./GroupingView";
import MappingEditor from "./MappingEditor";
import PreviewPanel from "./PreviewPanel";
import { useImportController } from "./ImportControllerContext";

export default function Workbench() {
  const controller = useImportController();
  const { headers, rows, mapping, setMapping } = controller.pipeline;
  const { sheetName, datasetName, setDatasetName } = controller.source;
  const { enabled: groupingEnabled, config: groupingConfig } = controller.grouping;

  // Local UI state
  const [view, setView] = useState<"workbench" | "grouping">("workbench");

  const subtitle = useMemo(
    () => (sheetName ? `Pick → Preview → Map → Group → Review → Save` : `Pick → Preview`),
    [sheetName]
  );

  if (view === "grouping") {
    return <GroupingView onClose={() => setView("workbench")} />;
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

        {/* Right: Grouping */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            className="cursor-pointer"
            disabled={!rows.length}
            onClick={() => setView("grouping")}
          >
            Grouping
          </Button>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 xl:col-span-8 space-y-4">
          <PreviewPanel headers={headers} rows={rows} mapping={mapping} />
        </div>
        <div className="col-span-12 xl:col-span-4 space-y-4">
          <MappingEditor
            headers={headers}
            rows={rows}
            mapping={mapping}
            setMapping={setMapping}
            datasetName={datasetName}
            setDatasetName={setDatasetName}
          />
        </div>
      </div>
    </div>
  );
}
