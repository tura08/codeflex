import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTopBarActions } from "../layout/DataShell";
import ConnectDialog from "./ConnectDialog";
import { useImportController } from "./ImportControllerContext";

/** Inline toolbar mounted once into the shell header. */
function ToolbarInline() {
  const controller = useImportController();
  const openConnect = controller.dialog.openConnect;
  const { saving, run: save } = controller.save;
  const { records } = controller.dataset;

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

  useEffect(() => {
    setTop(<ToolbarInline />);
    return () => setTop(null);
  }, [setTop]);

  return null;
}
