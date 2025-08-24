// src/pages/DataManager/view/table/ColumnManagerModal.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ColumnManagerModal({
  open,
  onOpenChange,
  all,
  initialVisible,
  onApply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  all: string[];
  initialVisible: string[];
  onApply: (nextVisible: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [order, setOrder] = useState<string[]>([]);

  // DnD (right pane)
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const map: Record<string, boolean> = {};
    all.forEach((c) => (map[c] = initialVisible.includes(c)));
    setSelected(map);
    setOrder(initialVisible);
    setQ("");
    setDragIndex(null);
    setOverIndex(null);
  }, [open, all, initialVisible]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return all;
    return all.filter((c) => c.toLowerCase().includes(t));
  }, [q, all]);

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );

  const selectedOrdered = useMemo(
    () => order.filter((c) => selected[c]),
    [order, selected]
  );

  const toggle = (col: string) => {
    setSelected((s) => {
      const next = { ...s, [col]: !s[col] };
      setOrder((ord) => {
        if (next[col] && !ord.includes(col)) return [...ord, col];
        if (!next[col] && ord.includes(col)) return ord.filter((x) => x !== col);
        return ord;
      });
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelected((s) => {
      const next = { ...s };
      setOrder((ord) => {
        const added: string[] = [];
        filtered.forEach((c) => {
          if (!next[c]) added.push(c);
          next[c] = true;
        });
        return [...ord, ...added.filter((c) => !ord.includes(c))];
      });
      return next;
    });
  };

  const clearAllFiltered = () => {
    setSelected((s) => {
      const next = { ...s };
      setOrder((ord) => ord.filter((c) => !filtered.includes(c)));
      filtered.forEach((c) => (next[c] = false));
      return next;
    });
  };

  // DnD handlers (right pane)
  const onDragStart = (e: React.DragEvent, idx: number) => {
    setDragIndex(idx);
    setOverIndex(idx);
    try { e.dataTransfer.setData("text/plain", String(idx)); } catch {}
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragEnter = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    setOverIndex(idx);
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (e: React.DragEvent, to: number) => {
    e.preventDefault();
    const fromRaw = e.dataTransfer.getData("text/plain");
    const from = dragIndex ?? (fromRaw ? Number(fromRaw) : null);
    if (from === null || Number.isNaN(from) || from === to) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    setOrder((ord) => {
      const onlySelected = ord.filter((c) => selected[c]);
      const notSelected = ord.filter((c) => !selected[c]);
      const next = [...onlySelected];
      const [x] = next.splice(from, 1);
      next.splice(to, 0, x);
      return [...next, ...notSelected];
    });
    setDragIndex(null);
    setOverIndex(null);
  };
  const onDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleSave = () => {
    const onlySelectedInOrder = order.filter((c) => selected[c]);
    const fallback = all[0] ? [all[0]] : [];
    onApply(onlySelectedInOrder.length ? onlySelectedInOrder : fallback);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden sm:max-w-[92vw] lg:max-w-[1200px]">
        <DialogHeader className="mb-2">
          <DialogTitle>Manage columns</DialogTitle>
        </DialogHeader>

        {/* Controls */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Filter columns…"
              className="h-8 w-[360px]"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Button variant="outline" size="sm" onClick={selectAllFiltered}>
              Select all (filtered)
            </Button>
            <Button variant="outline" size="sm" onClick={clearAllFiltered}>
              Clear (filtered)
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Selected: {selectedCount} / {all.length}
          </div>
        </div>

        {/* Two independent scroll panes with sticky inner headers */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* LEFT PANEL */}
          <div className="rounded-md border">
            <div className="max-h-[60vh] overflow-auto">
              <div className="sticky top-0 z-10 border-b bg-background p-2 text-xs font-medium">
                All columns
              </div>
              <div className="p-2">
                {filtered.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No columns match your filter.
                  </div>
                ) : (
                  <ul className="grid grid-cols-2 gap-2 text-sm">
                    {filtered.map((c) => (
                      <li key={c} className="flex items-center gap-2">
                        <input
                          id={`col-${c}`}
                          type="checkbox"
                          className="h-4 w-4"
                          checked={!!selected[c]}
                          onChange={() => toggle(c)}
                        />
                        <label
                          htmlFor={`col-${c}`}
                          className="cursor-pointer truncate"
                          title={c}
                        >
                          {c}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="rounded-md border">
            <div className="max-h-[60vh] overflow-auto">
              <div className="sticky top-0 z-10 border-b bg-background p-2 text-xs font-medium">
                Selected (drag to reorder)
              </div>
              <div className="p-2">
                {selectedOrdered.length === 0 ? (
                  <div className="py-10 text-center text-xs text-muted-foreground">
                    No selected columns to reorder.
                  </div>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {selectedOrdered.map((c, i) => (
                      <li
                        key={c}
                        className={`rounded px-2 py-1 ${
                          overIndex === i ? "bg-muted/60" : ""
                        }`}
                        onDragEnter={onDragEnter(i)}
                        onDragOver={onDragOver}
                        onDrop={(e) => onDrop(e, i)}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="mr-2 inline-flex cursor-grab select-none text-muted-foreground"
                            draggable
                            onDragStart={(e) => onDragStart(e, i)}
                            onDragEnd={onDragEnd}
                            title="Drag to reorder"
                          >
                            ⋮⋮
                          </span>
                          <span className="flex-1 truncate" title={c}>
                            {c}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="ml-2"
                            onClick={() => toggle(c)}
                          >
                            Hide
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
