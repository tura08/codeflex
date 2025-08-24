import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Columns3 } from "lucide-react";
import { useTableContext } from "./TableContext";

/**
 * Table toolbar:
 * - LEFT: Search (commit on Enter / blur) + optional leftSlot
 * - RIGHT: optional rightSlot + Manage Columns
 */
export function Toolbar({
  q,
  onSearch,
  leftSlot,
  rightSlot,
}: {
  q?: string | null;
  onSearch: (next: string) => void;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  const { openColumnManager } = useTableContext();

  const [val, setVal] = useState<string>(q ?? "");
  const [focused, setFocused] = useState(false);
  const enterCommittedRef = useRef(false); // prevent Enter → blur double commit

  // Only sync external q when NOT focused (don’t clobber typing)
  useEffect(() => {
    if (!focused) setVal(q ?? "");
  }, [q, focused]);

  return (
    <div className="flex items-center justify-between gap-2">
      {/* LEFT group: Search + leftSlot */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search…"
          className="h-8 w-64"
          value={val}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (enterCommittedRef.current) {
              enterCommittedRef.current = false;
              return; // avoid double commit
            }
            onSearch(val);
          }}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              enterCommittedRef.current = true;
              onSearch(val);
            }
            if (e.key === "Escape") {
              setVal("");
              onSearch("");
            }
          }}
        />
        {leftSlot}
      </div>

      {/* RIGHT group: rightSlot + manage columns */}
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
