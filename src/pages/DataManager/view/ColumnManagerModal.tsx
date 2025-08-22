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

  // hydrate selection each time modal opens or inputs change
  useEffect(() => {
    if (!open) return;
    const map: Record<string, boolean> = {};
    all.forEach((c) => (map[c] = initialVisible.includes(c)));
    setSelected(map);
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

  const toggle = (col: string) =>
    setSelected((s) => ({ ...s, [col]: !s[col] }));

  const selectAllFiltered = () =>
    setSelected((s) => {
      const next = { ...s };
      filtered.forEach((c) => (next[c] = true));
      return next;
    });

  const clearAllFiltered = () =>
    setSelected((s) => {
      const next = { ...s };
      filtered.forEach((c) => (next[c] = false));
      return next;
    });

  const handleSave = () => {
    const nextVisible = all.filter((c) => selected[c]);
    // at least one visible column
    onApply(nextVisible.length ? nextVisible : [all[0]].filter(Boolean));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Manage columns</DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-3">
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
