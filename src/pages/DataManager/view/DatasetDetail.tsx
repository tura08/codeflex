import { useMemo, useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
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

import {
  useDatasetDetail,
  removeDataset,
} from "@/pages/DataManager/hooks/useDatasetBrowser";
import DataTable from "./DataTable";

export default function DatasetDetail() {
  const { id: routeId } = useParams();
  const id = routeId ?? "";
  const [sp, setSp] = useSearchParams();

  const page = Number(sp.get("page") || 1);
  const q = sp.get("q") || "";

  // Delete modal state
  const [openDelete, setOpenDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [doubleCheck, setDoubleCheck] = useState(false);
  const [alsoDeleteSource, setAlsoDeleteSource] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Data (Phase 1: batch intentionally omitted)
  const pageSize = 50;
  const {
    loading,
    dataset,
    mode, // 'grouped' | 'flat'
    rows,
    total,
    error,
    loadChildren,
  } = useDatasetDetail({ datasetId: id, page, pageSize, batchId: null, q });

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  // Search input state synced with URL
  const [searchInput, setSearchInput] = useState(q);
  useEffect(() => setSearchInput(q), [q]);

  return (
    <div className="space-y-4">
      {/* Title + Delete */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{dataset?.name ?? "Dataset"}</h1>
          <p className="text-xs text-muted-foreground">
            {mode === "grouped"
              ? "Grouped view (parents with inline children preview)"
              : "Flat view"}
          </p>
        </div>

        <Dialog open={openDelete} onOpenChange={setOpenDelete}>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              Delete dataset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete dataset</DialogTitle>
              <DialogDescription>
                This will permanently delete all imported rows and column mappings
                for <b>{dataset?.name}</b>. This action cannot be undone.
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
                <input
                  type="checkbox"
                  checked={doubleCheck}
                  onChange={(e) => setDoubleCheck(e.target.checked)}
                />
                I understand this cannot be undone.
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={alsoDeleteSource}
                  onChange={(e) => setAlsoDeleteSource(e.target.checked)}
                />
                Also delete the linked <code>sheet_source</code> if unused by
                other datasets
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setOpenDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={
                    !doubleCheck ||
                    confirmText.trim() !== (dataset?.name ?? "") ||
                    deleting
                  }
                  onClick={async () => {
                    if (!id) return;
                    try {
                      setDeleting(true);
                      await removeDataset(id, { alsoDeleteSource });
                      toast.success("Dataset deleted");
                      setOpenDelete(false);
                      window.location.assign("/datamanager/view/datasets");
                    } catch (e: any) {
                      toast.error("Delete failed", {
                        description: e?.message ?? "Unknown error",
                      });
                    } finally {
                      setDeleting(false);
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
              if (val) sp.set("q", val);
              else sp.delete("q");
              sp.set("page", "1");
              setSp(sp, { replace: true });
            }}
          />
          <span className="text-xs text-muted-foreground">
            Rows: {loading ? "…" : total}
          </span>
        </div>
        {/* (Phase 2) controls (batch/filters/columns) can go here */}
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {/* Table in fixed-height card */}
      <Card className="h-[68vh] p-3">
        <DataTable
          loading={loading}
          mode={mode}
          rows={rows}
          page={page}
          pageCount={pageCount}
          onPageChange={(p) => {
            sp.set("page", String(p));
            setSp(sp, { replace: true });
          }}
          onLoadChildren={
            mode === "grouped"
              ? async (groupKey: string) => {
                  const list = await loadChildren(groupKey);
                  return Array.isArray(list) ? list.slice(0, 50) : [];
                }
              : undefined
          }
        />
      </Card>
    </div>
  );
}
