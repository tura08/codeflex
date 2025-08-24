import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Columns3 } from "lucide-react";
import { useTableContext } from "./TableContext";

/**
 * Generic, reusable table toolbar.
 * - Center: search input (controlled via `q`/`onSearch`)
 * - Right: "Manage columns" with Columns icon (from TableContext)
 * - Left/Right slots allow dataset-specific controls (batch selector, chips, etc.)
 */
export function Toolbar({
  q,
  onSearch,
  leftSlot,
  rightSlot,
}: {
  q?: string | null; // allow null/undefined
  onSearch: (next: string) => void;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  const { openColumnManager } = useTableContext();

  // Controlled input that reflects reducer `q`
  const [val, setVal] = React.useState<string>(q ?? "");
  React.useEffect(() => {
    setVal(q ?? "");
  }, [q]);

  return (
    <div className="flex items-center justify-between">
      {/* Left area (optional) */}

      <div className="flex items-center gap-2">
        <Input
          placeholder="Search…"
          className="h-8 w-64"
          />
      </div>

      {/* Center: search */}
      <div className="flex items-center gap-2">{leftSlot}</div>

      {/* Right: manage columns + optional rightSlot */}
      <div className="flex items-center gap-2">
        {rightSlot}
        <Button variant="outline" size="sm" onClick={openColumnManager}>
          <Columns3 className="mr-2 h-4 w-4" />
          Manage columns
        </Button>
      </div>
    </div>
  );
}
