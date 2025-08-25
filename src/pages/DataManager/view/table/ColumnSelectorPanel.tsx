import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function ColumnSelectorPanel(props: {
  filteredAllColumns: string[];
  selectedMap: Record<string, boolean>;
  selectedInOrder: string[];
  onToggleColumn: (columnName: string) => void;
  onReorderSelected: (fromIndex: number, toIndex: number) => void;
}) {
  const {
    filteredAllColumns,
    selectedMap,
    selectedInOrder,
    onToggleColumn,
    onReorderSelected,
  } = props;

  // DnD highlight state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleDragStart = (event: React.DragEvent, index: number) => {
    setDragIndex(index);
    setOverIndex(index);
    try {
      event.dataTransfer.setData("text/plain", String(index));
    } catch {}
    event.dataTransfer.effectAllowed = "move";
  };
  const handleDragEnter = (index: number) => (event: React.DragEvent) => {
    event.preventDefault();
    setOverIndex(index);
  };
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };
  const handleDrop = (event: React.DragEvent, toIndex: number) => {
    event.preventDefault();
    const fromRaw = event.dataTransfer.getData("text/plain");
    const fromIndex = dragIndex ?? (fromRaw ? Number(fromRaw) : null);
    if (fromIndex === null || Number.isNaN(fromIndex) || fromIndex === toIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    onReorderSelected(fromIndex, toIndex);
    setDragIndex(null);
    setOverIndex(null);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  // We cap the inner content to ~60vh so it scrolls inside the panel only
  const panelMaxH = "max-h-[40vh]";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* LEFT: All columns (select/deselect) */}
      <div className="rounded-md border flex flex-col">
        <div className="border-b bg-background p-2 text-xs font-medium">
          All columns
        </div>
        <ScrollArea className={panelMaxH}>
          <div className="p-2">
            {filteredAllColumns.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No columns match your filter.
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-2 text-sm">
                {filteredAllColumns.map((columnName) => (
                  <li key={columnName} className="flex items-center gap-2">
                    <input
                      id={`col-${columnName}`}
                      type="checkbox"
                      className="h-4 w-4"
                      checked={!!selectedMap[columnName]}
                      onChange={() => onToggleColumn(columnName)}
                    />
                    <label
                      htmlFor={`col-${columnName}`}
                      className="cursor-pointer truncate"
                      title={columnName}
                    >
                      {columnName}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </div>

      {/* RIGHT: Selected + reorder */}
      <div className="rounded-md border flex flex-col">
        <div className="border-b bg-background p-2 text-xs font-medium">
          Selected (drag to reorder)
        </div>
        <ScrollArea className={panelMaxH}>
          <div className="p-2">
            {selectedInOrder.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                No selected columns to reorder.
              </div>
            ) : (
              <ul className="space-y-2 text-sm">
                {selectedInOrder.map((columnName, index) => (
                  <li
                    key={columnName}
                    className={`rounded border px-2 py-1 transition-colors ${
                      overIndex === index ? "bg-muted/60" : "bg-background"
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={handleDragEnter(index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex-1 truncate" title={columnName}>
                        {columnName}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => onToggleColumn(columnName)}
                        title="Hide"
                      >
                        Hide
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </div>
    </div>
  );
}
