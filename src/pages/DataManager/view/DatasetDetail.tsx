import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import DataTable from "./DataTable";
import { useViewReducer } from "@/pages/DataManager/hooks/useViewReducer";

export default function DatasetDetail() {
  const { id: routeId } = useParams();
  const id = routeId ?? "";

  // hydrate reducer (single source of truth for view state)
  const view = useViewReducer(id);
  const { state, updateParams, removeDataset } = view;

  const { loading, dataset, mode, total, error, deleting, q } = state;

  const [openDelete, setOpenDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  // keep URL search param in sync with reducer's q (optional — reducer already does this)
  const [searchInput, setSearchInput] = useState(q);
  useEffect(() => setSearchInput(q), [q]);

  return (
    <div className="space-y-4">
      {/* Title + Delete */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{dataset?.name ?? "Dataset"}</h1>
          <p className="text-xs text-muted-foreground">
            {mode === "grouped" ? "Grouped view (parents with inline children preview)" : "Flat view"}
          </p>
        </div>

        <Dialog open={openDelete} onOpenChange={setOpenDelete}>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">Delete dataset</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete dataset</DialogTitle>
              <DialogDescription>
                This will permanently delete all imported rows and column mappings for{" "}
                <b>{dataset?.name}</b>. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label htmlFor="confirmName">Type dataset name to confirm</Label>
                <Input
                  id="confirmName"
                  placeholder={dataset?.name ?? "dataset name"}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="accent-destructive" checked readOnly />
                I understand this cannot be undone.
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpenDelete(false)} disabled={deleting}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={confirmText.trim() !== (dataset?.name ?? "") || deleting}
                  onClick={async () => {
                    if (!id) return;
                    try {
                      await removeDataset(/* alsoDeleteSource */ false);
                      toast.success("Dataset deleted");
                      setOpenDelete(false);
                      window.location.assign("/datamanager/view/datasets");
                    } catch (e: any) {
                      toast.error("Delete failed", { description: e?.message ?? "Unknown error" });
                    }
                  }}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search + total */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search…"
            className="h-8 w-64"
            value={searchInput}
            onChange={(e) => {
              const val = e.target.value;
              setSearchInput(val);
              updateParams({ q: val, page: 1 });
            }}
          />
          <span className="text-xs text-muted-foreground">Rows: {loading ? "…" : total}</span>
        </div>
        {/* future: batch/filters/sort */}
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {/* Table in fixed-height card */}
      <Card className="h-[68vh] p-3">
        <DataTable view={view} />
      </Card>
    </div>
  );
}
