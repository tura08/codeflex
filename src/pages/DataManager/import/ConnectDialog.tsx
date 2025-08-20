// src/pages/DataManager/import/ConnectDialog.tsx
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SourceControls } from "./SourceControls";
import { toast } from "sonner";
import { useGoogleAuth } from "@/pages/DataManager/hooks/useGoogleAuth";
import { useImport } from "../context/ImportContext";

export default function ConnectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { connected } = useGoogleAuth();
  const { state, updateSource, loadPreview } = useImport();

  const handlePreview = useCallback(async () => {
    if (!connected) return toast.error("Please connect Google first.");
    await loadPreview();
    onOpenChange(false);
  }, [connected, loadPreview, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Connect Google Sheet</DialogTitle></DialogHeader>
        <div className={!connected ? "pointer-events-none opacity-50" : ""}>
          <SourceControls
            spreadsheetId={state.spreadsheetId}
            setSpreadsheetId={(v) => updateSource({ spreadsheetId: v })}
            sheetName={state.sheetName}
            setSheetName={(v) => updateSource({ sheetName: v })}
            headerRow={state.headerRow}
            setHeaderRow={(n) => updateSource({ headerRow: n })}
            maxRows={state.maxRows}
            setMaxRows={(n) => updateSource({ maxRows: n })}
            loading={state.loading}
            showActions={false}
            onPreview={handlePreview}
            onSaveSource={() => {}}
          />
          <Button
            className="mt-4 w-full"
            disabled={!connected || !state.spreadsheetId || !state.sheetName || state.loading}
            onClick={handlePreview}
          >
            {state.loading ? "Loading…" : "Load Preview"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
