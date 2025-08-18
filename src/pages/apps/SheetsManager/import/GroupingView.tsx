import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import GroupingPanel from "./GroupingPanel";
import type { GroupingConfig } from "@/lib/google/grouping";

type Props = {
  records: Record<string, any>[];
  fields: string[];
  initialEnabled?: boolean;
  initialConfig?: GroupingConfig | null;
  onClose: (result?: { enabled: boolean; config: GroupingConfig | null }) => void;
};

export default function GroupingView({
  records,
  fields,
  initialEnabled,
  initialConfig,
  onClose,
}: Props) {
  const [enabled, setEnabled] = useState<boolean>(!!initialEnabled);
  const [config, setConfig] = useState<GroupingConfig | null>(initialConfig ?? null);

  const haveData = useMemo(() => Array.isArray(records) && records.length > 0, [records]);

  useEffect(() => {
    // keep initial values in sync if the parent reopens the view with new defaults
    setEnabled(!!initialEnabled);
    setConfig(initialConfig ?? null);
  }, [initialEnabled, initialConfig]);

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Grouping</h1>
          <p className="text-sm text-muted-foreground">
            Choose keys → auto-detect parent/child → tweak roles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onClose()}>
            ← Back
          </Button>
          <Button
            disabled={!haveData}
            onClick={() =>
              onClose({
                enabled,
                config: enabled ? (config ?? { groupBy: [], parentFields: [], childFields: [] }) : null,
              })
            }
          >
            Apply
          </Button>
        </div>
      </div>

      <Separator />

      <GroupingPanel
        records={records}
        fields={fields}
        enabled={enabled}
        setEnabled={setEnabled}
        value={config}
        onChange={(cfg) => setConfig(cfg)}
      />
    </div>
  );
}
