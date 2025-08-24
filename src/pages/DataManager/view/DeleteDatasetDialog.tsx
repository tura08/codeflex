// src/pages/DataManager/view/DeleteDatasetDialog.tsx
import { useState } from "react";
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
import { deleteDatasetDeep } from "@/lib/datamanager/api";

type Props = {
  datasetId: string;
  datasetName?: string | null;
};

export default function DeleteDatasetDialog({ datasetId, datasetName }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setConfirmText("");
          setBusy(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">Delete dataset</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete dataset</DialogTitle>
          <DialogDescription>
            This will permanently delete all rows and column mappings for{" "}
            <b>{datasetName || "this dataset"}</b>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-4">
            <Label htmlFor="confirmName">Type the dataset name to confirm</Label>
            <Input
              id="confirmName"
              placeholder={datasetName || "dataset name"}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!datasetName || confirmText.trim() !== datasetName || busy}
              onClick={async () => {
                try {
                  setBusy(true);
                  await deleteDatasetDeep(datasetId);
                  toast.success("Dataset deleted");
                  window.location.assign("/datamanager/view/datasets");
                } catch (e: any) {
                  toast.error("Delete failed", { description: e?.message ?? "Unknown error" });
                  setBusy(false);
                }
              }}
            >
              {busy ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
