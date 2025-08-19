import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTopBarActions } from "../layout/DataShell";
import ConnectDialog from "./ConnectDialog";
import { useImportController } from "./ImportControllerContext";

/** Inline toolbar mounted once into the shell header. */
function ToolbarInline({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const controller = useImportController();
  const { saving, run: save } = controller.save;
  const { rows } = controller.pipeline;

  return (
    <>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Connect & Load
        </Button>
        <Button size="sm" onClick={save} disabled={saving || !rows?.length}>
          {saving ? "Saving…" : "Save"}
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
