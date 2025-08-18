import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useImportController } from "../import/ImportController";
import { SourceControls } from "./SourceControls";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-client";
import { saveSheetSource } from "@/lib/google/sheets-sources";

// bring in auth status + quick connect button
import { useGoogleAuth } from "@/integrations/google/hooks/useGoogleAuth";

export default function ConnectDialog() {
  const {
    connectOpen,
    closeConnect,
    spreadsheetId, setSpreadsheetId,
    sheetName, setSheetName,
    headerRow, setHeaderRow,
    maxRows, setMaxRows,
    datasetName, setDatasetName,
    loading,
    loadPreview,
  } = useImportController();

  const { connected } = useGoogleAuth();

  return (
    <Dialog open={connectOpen} onOpenChange={(o) => (o ? undefined : closeConnect())}>
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
            onPreview={async () => {
              try {
                if (!connected) {
                  toast.error("Please connect Google first.");
                  return;
                }
                await loadPreview();
                if (!datasetName) setDatasetName(sheetName);
              } catch (e: any) {
                toast.error("Failed to load preview", { description: e?.message ?? "Unknown error" });
              }
            }}
            onSaveSource={async () => {
              if (!connected) {
                alert("Please connect Google first.");
                return;
              }
              if (!spreadsheetId || !sheetName) return alert("Pick a spreadsheet and tab");
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
            }}
          />

          <Button
            className="mt-4 w-full"
            disabled={!connected || !spreadsheetId || !sheetName || loading}
            onClick={async () => {
              try {
                if (!connected) {
                  toast.error("Please connect Google first.");
                  return;
                }
                await loadPreview();
                if (!datasetName) setDatasetName(sheetName);
              } catch (e: any) {
                toast.error("Failed to load preview", { description: e?.message ?? "Unknown error" });
              }
            }}
          >
            {loading ? "Loading…" : "Load Preview"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
