import { Button } from "@/components/ui/button";
import { useTableContext } from "./TableContext";

export function TableHeader() {
  const { openColumnManager } = useTableContext();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={openColumnManager}>
          Manage columns
        </Button>
      </div>
      <div className="flex items-center gap-2">{/* reserved for actions */}</div>
    </div>
  );
}
