import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SourceControls } from "./SourceControls";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-client";
import { saveSheetSource } from "@/lib/google/sheets-sources";
import { useGoogleAuth } from "@/integrations/google/hooks/useGoogleAuth";
import { useImportController } from "./ImportControllerContext";

export default function ConnectDialog() {
  const controller = useImportController();

  // dialog
  const { open, openConnect, closeConnect } = controller.dialog;

  // source fields
  const {
    spreadsheetId, setSpreadsheetId,
    sheetName, setSheetName,
    headerRow, setHeaderRow,
    maxRows, setMaxRows,
    datasetName, setDatasetName,
    loadPreview,
  } = controller.source;

  // pipeline loading state
  const { loading } = controller.pipeline;

  const { connected } = useGoogleAuth();

  // ───────────────────────── handlers ─────────────────────────

  const handlePreview = useCallback(async () => {
    try {
      if (!connected) {
        toast.error("Please connect Google first.");
        return;
      }
      await loadPreview(); // uses current source state
      if (!datasetName) setDatasetName(sheetName);
    } catch (e: any) {
      toast.error("Failed to load preview", { description: e?.message ?? "Unknown error" });
    }
  }, [connected, loadPreview, datasetName, setDatasetName, sheetName]);

  const handleSaveSource = useCallback(async () => {
    if (!connected) {
      alert("Please connect Google first.");
      return;
    }
    if (!spreadsheetId || !sheetName) {
      alert("Pick a spreadsheet and tab");
      return;
    }

    // Try to resolve the spreadsheet's human name (fallback to ID)
    const { data: file } = await supabase.functions
      .invoke("lookup-file-name", { body: { spreadsheetId } })
      .catch(() => ({ data: null as any }));
    const spreadsheet_name = (file as any)?.name ?? spreadsheetId;

    try {
      await saveSheetSource({
        spreadsheetId,
        sheetName,
        headerRow,
        spreadsheetName: spreadsheet_name,
      });
      alert("Saved as source.");
    } catch (e: any) {
      alert(e?.message ?? "Failed to save source");
    }
  }, [connected, spreadsheetId, sheetName, headerRow]);

  const handleDialogOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) openConnect();
      else closeConnect();
    },
    [openConnect, closeConnect]
  );

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Connect Google Sheet</DialogTitle>
        </DialogHeader>

        <div className={!connected ? "pointer-events-none opacity-50" : ""}>
          <SourceControls
            spreadsheetId={spreadsheetId}
            setSpreadsheetId={setSpreadsheetId}
            sheetName={sheetName}
            setSheetName={setSheetName}
            headerRow={headerRow}
            setHeaderRow={setHeaderRow}
            maxRows={maxRows}
            setMaxRows={setMaxRows}
            loading={loading}
            showActions={false}
            onPreview={handlePreview}
            onSaveSource={handleSaveSource}
          />

          <Button
            className="mt-4 w-full"
            disabled={!connected || !spreadsheetId || !sheetName || loading}
            onClick={handlePreview}
          >
            {loading ? "Loading…" : "Load Preview"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
