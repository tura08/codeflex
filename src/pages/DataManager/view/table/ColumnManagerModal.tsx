import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { ReferenceDatasetOption, ReferenceMeta } from "./types";
import ColumnSelectorPanel from "./ColumnSelectorPanel";
import ColumnRelationPanel from "./ColumnRelationPanel";

type Props = {
  open: boolean;
  onOpenChange: (value: boolean) => void;

  all: string[];
  initialVisible: string[];
  onApply: (nextVisible: string[]) => void;

  initialReferences?: Record<string, ReferenceMeta | undefined>;
  onApplyReferences?: (next: Record<string, ReferenceMeta | undefined>) => void;

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
  const [activeTab, setActiveTab] = useState<"columns" | "references">("columns");

  // selection + order
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});
  const [order, setOrder] = useState<string[]>([]);

  // references
  const [references, setReferences] = useState<
    Record<string, ReferenceMeta | undefined>
  >({});

  // init on open
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

  const filteredAllColumns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return all;
    return all.filter((name) => name.toLowerCase().includes(q));
  }, [searchQuery, all]);

  const selectedCount = useMemo(
    () => Object.values(selectedMap).filter(Boolean).length,
    [selectedMap]
  );

  const selectedInOrder = useMemo(
    () => order.filter((name) => selectedMap[name]),
    [order, selectedMap]
  );

  const toggleColumn = (columnName: string) => {
    setSelectedMap((prev) => {
      const next = { ...prev, [columnName]: !prev[columnName] };
      setOrder((prevOrder) => {
        const nowSelected = next[columnName];
        if (nowSelected && !prevOrder.includes(columnName)) {
          return [...prevOrder, columnName];
        }
        if (!nowSelected && prevOrder.includes(columnName)) {
          return prevOrder.filter((n) => n !== columnName);
        }
        return prevOrder;
      });
      return next;
    });
  };

  const reorderSelected = (fromIndex: number, toIndex: number) => {
    setOrder((prevOrder) => {
      const onlySelected = prevOrder.filter((n) => selectedMap[n]);
      const notSelected = prevOrder.filter((n) => !selectedMap[n]);

      const nextSel = [...onlySelected];
      const [moved] = nextSel.splice(fromIndex, 1);
      nextSel.splice(toIndex, 0, moved);

      return [...nextSel, ...notSelected];
    });
  };

  const saveReferenceForColumn = (columnId: string, targetDatasetId?: string) => {
    setReferences((prev) => ({
      ...prev,
      [columnId]: targetDatasetId ? { targetDatasetId } : undefined,
    }));
  };
  const clearReferenceForColumn = (columnId: string) => {
    setReferences((prev) => {
      const next = { ...prev };
      delete next[columnId];
      return next;
    });
  };

  const handleSave = () => {
    const nextVisible = order.filter((name) => selectedMap[name]);
    const fallback = all[0] ? [all[0]] : [];
    onApply(nextVisible.length ? nextVisible : fallback);
    onApplyReferences?.(references);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* cap dialog height and prevent outer overflow */}
      <DialogContent className="min-w-[70vw] max-w-[90vw] max-h-[85vh] p-0 overflow-hidden">
        <div className="flex h-full flex-col">
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
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            className="px-6 flex-1 min-h-0 flex flex-col"
          >
            <TabsList>
              <TabsTrigger value="columns">Columns</TabsTrigger>
              <TabsTrigger value="references">References</TabsTrigger>
            </TabsList>

            {/* Filter row (static) */}
            <div className="mt-4 mb-4 flex items-center justify-between gap-2">
              <Input
                placeholder={
                  activeTab === "columns"
                    ? "Filter columns…"
                    : "Filter columns for references…"
                }
                className="h-8 w-[360px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="text-xs text-muted-foreground">
                {activeTab === "columns"
                  ? `Visible: ${selectedCount} / ${all.length}`
                  : `Columns: ${filteredAllColumns.length}`}
              </div>
            </div>

            {/* Panels (each handles its own scrolling) */}
            <TabsContent value="columns" className="m-0">
              <ColumnSelectorPanel
                filteredAllColumns={filteredAllColumns}
                selectedMap={selectedMap}
                selectedInOrder={selectedInOrder}
                onToggleColumn={toggleColumn}
                onReorderSelected={reorderSelected}
              />
            </TabsContent>

            <TabsContent value="references" className="m-0">
              <ColumnRelationPanel
                filteredAllColumns={filteredAllColumns}
                references={references}
                referenceDatasets={referenceDatasets}
                onSaveReference={saveReferenceForColumn}
                onClearReference={clearReferenceForColumn}
              />
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="mt-auto flex items-center justify-end gap-2 p-6">
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
