// src/pages/DataManager/import/TopActions.Import.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTopBarActions } from "../layout/DataShell";
import ConnectDialog from "./ConnectDialog";
import { useImport } from "../context/ImportContext";

function ToolbarInline({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const { state, saveImport } = useImport();

  return (
    <>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Connect & Load
        </Button>
        <Button size="sm" onClick={saveImport} disabled={!state.rows.length || state.saving}>
          {state.saving ? "Saving…" : "Save"}
        </Button>
      </div>
      <ConnectDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export default function TopActionsImport() {
  const setTop = useTopBarActions();
  const [connectOpen, setConnectOpen] = useState(false);

  useEffect(() => {
    setTop(<ToolbarInline open={connectOpen} setOpen={setConnectOpen} />);
    return () => setTop(null);
  }, [setTop, connectOpen]);

  return null;
}
