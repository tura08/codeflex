// src/pages/apps/SheetsManager/datasets/DatasetDetail.tsx
import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

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

import { useDatasetDetail, removeDataset } from "@/integrations/google/hooks/useDatasetBrowser";
import DatasetHeader from "./DatasetHeader";
import DataTable from "./DataTable";


export default function DatasetDetail() {
  const { id: routeId } = useParams();
  const id = routeId ?? ""; // ensure string
  const [sp, setSp] = useSearchParams();

  const page = Number(sp.get("page") || 1);
  const q = sp.get("q") || "";
  const batchId = sp.get("batch") || null;

  // Delete modal state
  const [openDelete, setOpenDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [doubleCheck, setDoubleCheck] = useState(false);
  const [alsoDeleteSource, setAlsoDeleteSource] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    loading,
    dataset,
    mode, // 'grouped' | 'flat'
    batches,
    batchId: effectiveBatch,
    setBatchId,
    rows,
    total,
    error,
    loadChildren,
  } = useDatasetDetail({ datasetId: id, page, pageSize: 50, batchId, q });

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / 50)), [total]);
  const canDelete = doubleCheck && confirmText.trim() === (dataset?.name ?? "");

  return (
    <div className="space-y-4">
      {/* Title + quick nav */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{dataset?.name ?? "Dataset"}</h1>
        <div className="flex gap-2">

          {/* Delete dataset */}
          <Dialog open={openDelete} onOpenChange={setOpenDelete}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete dataset</Button>
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
                  Also delete the linked <code>sheet_source</code> if unused by other datasets
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
                    disabled={!canDelete || deleting}
                    onClick={async () => {
                      if (!id) return;
                      try {
                        setDeleting(true);
                        await removeDataset(id, { alsoDeleteSource });
                        toast.success("Dataset deleted");
                        setOpenDelete(false);
                        // Redirect back to list
                        window.location.assign("/apps/sheetsmanager/datasets");
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
      </div>

      {/* Header: grouping chip + batch + search */}
      <DatasetHeader
        groupingEnabled={!!dataset?.grouping_enabled}
        batches={batches}
        batchId={effectiveBatch}
        onBatchChange={(bid) => {
          setBatchId(bid);
          sp.set("batch", bid);
          sp.set("page", "1");
          setSp(sp, { replace: true });
        }}
        q={q}
        onSearch={(val) => {
          if (val) sp.set("q", val);
          else sp.delete("q");
          sp.set("page", "1");
          setSp(sp, { replace: true });
        }}
        loading={loading}
      />

      {error && <p className="text-destructive text-sm">{error}</p>}

      {/* Auto-mode table: grouped => expandable parents, else flat */}
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
        onLoadChildren={mode === "grouped" ? loadChildren : undefined}
      />
    </div>
  );
}
