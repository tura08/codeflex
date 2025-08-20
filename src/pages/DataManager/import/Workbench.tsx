// src/pages/DataManager/import/Workbench.tsx
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import GroupingView from "./GroupingView";
import PreviewPanel from "./PreviewPanel";
import MappingEditor from "./MappingEditor";
import { useImport } from "../context/ImportContext";

export default function Workbench() {
  const { state } = useImport();
  const [view, setView] = useState<"workbench" | "grouping">("workbench");

  const subtitle = useMemo(
    () => (state.sheetName ? `Pick → Preview → Map → Group → Review → Save` : `Pick → Preview`),
    [state.sheetName]
  );

  if (view === "grouping") {
    return <GroupingView onClose={() => setView("workbench")} />;
  }

  const groupingEnabled = state.groupingEnabled;
  const groupKeys = state.groupingConfig?.groupBy ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-base font-semibold">Actions</h1>
          <p className="text-sm text-muted-foreground">
            {subtitle}
            {groupingEnabled && groupKeys.length > 0 ? (
              <span className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                Grouping ON (keys: {groupKeys.join(", ")})
              </span>
            ) : null}
          </p>
        </div>

        {/* Right: Grouping */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            className="cursor-pointer"
            disabled={!state.rows.length}
            onClick={() => setView("grouping")}
          >
            Grouping
          </Button>
        </div>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 xl:col-span-8 space-y-4">
          <PreviewPanel />
        </div>
        <div className="col-span-12 xl:col-span-4 space-y-4">
          <MappingEditor />
        </div>
      </div>
    </div>
  );
}
