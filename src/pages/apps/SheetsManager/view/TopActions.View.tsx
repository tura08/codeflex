// src/pages/apps/SheetsManager/components/TopActions.View.tsx
import { useEffect } from "react";
import { useTopBarActions } from "../layout/SheetsShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TopActionsView() {
  const set = useTopBarActions();
  useEffect(() => {
    const node = (
      <div className="flex items-center gap-2">
        <Input placeholder="Search..." className="h-8 w-48" />
        <Button size="sm" variant="secondary">Latest batch</Button>
      </div>
    );
    set(node);
    return () => set(null);
  }, [set]);
  return null;
}
