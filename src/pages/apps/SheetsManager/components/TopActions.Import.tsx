import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTopBarActions } from "../layout/SheetsShell";
import { useImportController } from "../import/ImportController";
import ConnectDialog from "./ConnectDialog";

/** Inline toolbar mounted once into the shell header. */
function ToolbarInline() {
  const { openConnect, save, saving, records } = useImportController();

  return (
    <>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={openConnect}>
          Connect &amp; Load
        </Button>
        <Button size="sm" onClick={save} disabled={saving || !records?.length}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
      {/* Keep the dialog mounted so openConnect() works */}
      <ConnectDialog />
    </>
  );
}

export default function TopActionsImport() {
  const setTop = useTopBarActions();

  // Mount the toolbar once. No deps besides setTop to avoid loops.
  useEffect(() => {
    setTop(<ToolbarInline />);
    return () => setTop(null);
  }, [setTop]);

  return null;
}
