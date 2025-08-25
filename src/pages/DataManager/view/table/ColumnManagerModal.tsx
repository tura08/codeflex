import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ReferenceDatasetOption, ReferenceMeta } from "./types";
import ColumnSelectorPanel from "./ColumnSelectorPanel";
import ColumnRelationPanel from "./ColumnRelationPanel";

type Props = {
  open: boolean;
  onOpenChange: (value: boolean) => void;

  /** All available data columns (canonical names) */
  all: string[];

  /** Initially visible columns (defines initial order) */
  initialVisible: string[];

  /** Called on Save with the new visible columns (ordered) */
  onApply: (nextVisible: string[]) => void;

  /** Optional: initial references per column id */
  initialReferences?: Record<string, ReferenceMeta | undefined>;

  /** Optional: called on Save with references per column id */
  onApplyReferences?: (next: Record<string, ReferenceMeta | undefined>) => void;

  /** Optional: dropdown options for target datasets */
  referenceDatasets?: ReferenceDatasetOption[];
};

export default function ColumnManagerModal({
  open,
  onOpenChange,
  all,
  initialVisible,
  onApply,
  initialReferences,
  onApplyReferences,
  referenceDatasets = [],
}: Props) {
  // Tabs
  const [activeTab, setActiveTab] = useState<"columns" | "references">("columns");

  // Column selection + order
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});
  const [order, setOrder] = useState<string[]>([]);

  // References map
  const [references, setReferences] = useState<
    Record<string, ReferenceMeta | undefined>
  >({});

  // Init modal state on open
  useEffect(() => {
    if (!open) return;

    const nextSelected: Record<string, boolean> = {};
    for (const columnName of all) {
      nextSelected[columnName] = initialVisible.includes(columnName);
    }
    setSelectedMap(nextSelected);
    setOrder(initialVisible);

    setReferences(initialReferences ?? {});
    setSearchQuery("");
    setActiveTab("columns");
  }, [open, all, initialVisible, initialReferences]);

  // Filter helper (shared across tabs)
  const filteredAllColumns = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return all;
    return all.filter((name) => name.toLowerCase().includes(normalizedQuery));
  }, [searchQuery, all]);

  const selectedCount = useMemo(
    () => Object.values(selectedMap).filter(Boolean).length,
    [selectedMap]
  );

  const selectedInOrder = useMemo(
    () => order.filter((name) => selectedMap[name]),
    [order, selectedMap]
  );

  // Toggle column selection
  const toggleColumn = (columnName: string) => {
    setSelectedMap((previous) => {
      const nextSelected = { ...previous, [columnName]: !previous[columnName] };
      setOrder((previousOrder) => {
        const nowSelected = nextSelected[columnName];
        if (nowSelected && !previousOrder.includes(columnName)) {
          return [...previousOrder, columnName];
        }
        if (!nowSelected && previousOrder.includes(columnName)) {
          return previousOrder.filter((n) => n !== columnName);
        }
        return previousOrder;
      });
      return nextSelected;
    });
  };

  // Reorder callback for the Columns panel (only for selected items)
  const reorderSelected = (fromIndex: number, toIndex: number) => {
    setOrder((previousOrder) => {
      const onlySelected = previousOrder.filter((name) => selectedMap[name]);
      const notSelected = previousOrder.filter((name) => !selectedMap[name]);

      const nextSelectedOrder = [...onlySelected];
      const [moved] = nextSelectedOrder.splice(fromIndex, 1);
      nextSelectedOrder.splice(toIndex, 0, moved);

      return [...nextSelectedOrder, ...notSelected];
    });
  };

  // Reference change helpers
  const saveReferenceForColumn = (columnId: string, targetDatasetId?: string) => {
    setReferences((previous) => ({
      ...previous,
      [columnId]: targetDatasetId ? { targetDatasetId } : undefined,
    }));
  };

  const clearReferenceForColumn = (columnId: string) => {
    setReferences((previous) => {
      const next = { ...previous };
      delete next[columnId];
      return next;
    });
  };

  // Save all changes
  const handleSave = () => {
    const nextVisible = order.filter((name) => selectedMap[name]);
    const fallback = all[0] ? [all[0]] : [];
    onApply(nextVisible.length ? nextVisible : fallback);
    onApplyReferences?.(references);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[60vw] max-w-[90vw] p-0">
        {/* Use a flex column wrapper with a single scroll container inside – no fixed heights */}
        <div className="flex flex-col">
          {/* Header */}
          <DialogHeader className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-xl font-semibold truncate">
                  Manage Columns
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure which columns are visible and define dataset references.
                </p>
              </div>
              <span className="shrink-0 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                {selectedCount} selected
              </span>
            </div>
          </DialogHeader>

          {/* Tabs */}
          <div className="border-b bg-muted/10 px-6">
            <div className="flex gap-2">
              {[
                { key: "columns", label: "Columns" },
                { key: "references", label: "References" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as "columns" | "references")}
                  className={[
                    "px-4 py-2 text-sm rounded-t-md transition-colors",
                    activeTab === key
                      ? "bg-background border border-b-transparent border-muted-foreground/30 font-medium"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            {/* Common filter */}
            <div className="mb-4 flex items-center justify-between gap-2">
              <Input
                placeholder={
                  activeTab === "columns"
                    ? "Filter columns…"
                    : "Filter columns for references…"
                }
                className="h-8 w-[360px]"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <div className="text-xs text-muted-foreground">
                {activeTab === "columns"
                  ? `Visible: ${selectedCount} / ${all.length}`
                  : `Columns: ${filteredAllColumns.length}`}
              </div>
            </div>

            {activeTab === "columns" ? (
              <ColumnSelectorPanel
                filteredAllColumns={filteredAllColumns}
                selectedMap={selectedMap}
                selectedInOrder={selectedInOrder}
                onToggleColumn={toggleColumn}
                onReorderSelected={reorderSelected}
              />
            ) : (
              <ColumnRelationPanel
                filteredAllColumns={filteredAllColumns}
                references={references}
                referenceDatasets={referenceDatasets}
                onSaveReference={saveReferenceForColumn}
                onClearReference={clearReferenceForColumn}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
