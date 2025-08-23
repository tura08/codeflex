import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Backward compatible ColumnManagerModal:
 * - Keeps your filter + checkbox selection UX.
 * - Adds a "Selected (drag to reorder)" panel so you can reorder visible columns.
 * - Props unchanged.
 */
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
  const [order, setOrder] = useState<string[]>([]); // ordered list of selected columns

  // hydrate selection/order each time modal opens or inputs change
  useEffect(() => {
    if (!open) return;
    const map: Record<string, boolean> = {};
    all.forEach((c) => (map[c] = initialVisible.includes(c)));
    setSelected(map);
    setOrder(initialVisible); // start with current order
    setQ("");
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

  const toggle = (col: string) => {
    setSelected((s) => {
      const next = { ...s, [col]: !s[col] };
      // keep order in sync
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
        // append newly added at the end in the filtered order
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

  // DnD within "Selected" list
  const onDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.setData("text/plain", String(idx));
    e.dataTransfer.effectAllowed = "move";
  };
  const onDrop = (e: React.DragEvent, to: number) => {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData("text/plain"));
    if (Number.isNaN(from) || from === to) return;
    setOrder((ord) => {
      const onlySelected = ord.filter((c) => selected[c]);
      const next = [...onlySelected];
      const [x] = next.splice(from, 1);
      next.splice(to, 0, x);
      return next;
    });
  };

  const handleSave = () => {
    // Persist only items that are selected, in the chosen order.
    const onlySelectedInOrder = order.filter((c) => selected[c]);
    const fallback = all[0] ? [all[0]] : [];
    onApply(onlySelectedInOrder.length ? onlySelectedInOrder : fallback);
    onOpenChange(false);
  };

  // computed list for reorder panel: selected columns in current order
  const selectedOrdered = useMemo(() => order.filter((c) => selected[c]), [order, selected]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage columns</DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Input
              placeholder="Filter columns…"
              className="h-8"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="text-xs text-muted-foreground">
              Selected: {selectedCount} / {all.length}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={selectAllFiltered}>
              Select all (filtered)
            </Button>
            <Button variant="outline" size="sm" onClick={clearAllFiltered}>
              Clear all (filtered)
            </Button>
          </div>

          {/* Selection grid (kept from your original) */}
          <div className="max-h-[40vh] overflow-auto rounded-md border p-2">
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
                    <label htmlFor={`col-${c}`} className="cursor-pointer">
                      {c}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* NEW: Reorder panel */}
          <div>
            <div className="mb-2 text-xs font-medium">Selected (drag to reorder)</div>
            <div className="max-h-[32vh] overflow-auto rounded-md border p-2">
              {selectedOrdered.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No selected columns to reorder.
                </div>
              ) : (
                <ul className="space-y-1 text-sm">
                  {selectedOrdered.map((c, i) => (
                    <li
                      key={c}
                      className="flex items-center justify-between rounded px-2 py-1 hover:bg-muted/60 cursor-grab"
                      draggable
                      onDragStart={(e) => onDragStart(e, i)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => onDrop(e, i)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground select-none">⋮⋮</span>
                        <span>{c}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggle(c)}
                      >
                        Hide
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
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
