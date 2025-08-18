// src/pages/apps/SheetsManager/import/GroupingView.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { groupRecords, inferParentChildRoles, type GroupingConfig } from "@/lib/google/grouping";

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
  // local state
  const [enabled, setEnabled] = useState<boolean>(!!initialEnabled);
  const [config, setConfig] = useState<GroupingConfig | null>(initialConfig ?? null);

  // panel (merged) state
  const [groupBy, setGroupBy] = useState<string[]>(initialConfig?.groupBy ?? []);
  const [parentFields, setParentFields] = useState<string[]>(initialConfig?.parentFields ?? []);
  const [childFields, setChildFields] = useState<string[]>(
    initialConfig?.childFields ??
      fields.filter((f) => !groupBy.includes(f) && !parentFields.includes(f))
  );

  // keep initial props in sync if parent reopens with new defaults
  useEffect(() => {
    setEnabled(!!initialEnabled);
    setConfig(initialConfig ?? null);
    setGroupBy(initialConfig?.groupBy ?? []);
    setParentFields(initialConfig?.parentFields ?? []);
    setChildFields(
      initialConfig?.childFields ??
        fields.filter((f) => !initialConfig?.groupBy?.includes(f ?? "") && !initialConfig?.parentFields?.includes(f ?? ""))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEnabled, initialConfig, fields.join("|")]);

  // auto-infer roles when enabled + groupBy changes
  useEffect(() => {
    if (!enabled || groupBy.length === 0 || records.length === 0) return;
    const { parentFields: p, childFields: c } = inferParentChildRoles(records, groupBy, fields);
    setParentFields(p);
    setChildFields(c);
  }, [enabled, groupBy, records, fields]);

  // derived cfg + preview
  const cfg: GroupingConfig = useMemo(
    () => ({ groupBy, parentFields, childFields }),
    [groupBy, parentFields, childFields]
  );

  const preview = useMemo(() => {
    if (!enabled || !groupBy.length || !records.length) {
      return { parents: [], children: [], stats: { groups: 0, parents: 0, children: 0 } };
    }
    return groupRecords(records, cfg);
  }, [enabled, groupBy, records, cfg]);

  // bubble up only when enabled (avoids toggling loops)
  useEffect(() => {
    if (enabled) setConfig(cfg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, cfg.groupBy.join("|"), cfg.parentFields.join("|"), cfg.childFields.join("|")]);

  // ui helpers
  const [qKeys, setQKeys] = useState("");
  const [qRoles, setQRol] = useState("");

  const filtKeys = useMemo(
    () => fields.filter((f) => f.toLowerCase().includes(qKeys.toLowerCase())),
    [fields, qKeys]
  );

  const nonKeyFields = useMemo(
    () => fields.filter((f) => !groupBy.includes(f) && f.toLowerCase().includes(qRoles.toLowerCase())),
    [fields, groupBy, qRoles]
  );

  const toggleKey = (f: string) => {
    const next = groupBy.includes(f) ? groupBy.filter((x) => x !== f) : [...groupBy, f];
    setGroupBy(next);
  };

  const setRole = (f: string, role: "parent" | "child") => {
    if (role === "parent") {
      if (!parentFields.includes(f)) setParentFields([...parentFields, f]);
      setChildFields(childFields.filter((x) => x !== f));
    } else {
      if (!childFields.includes(f)) setChildFields([...childFields, f]);
      setParentFields(parentFields.filter((x) => x !== f));
    }
  };

  const clearAll = () => {
    setGroupBy([]);
    setParentFields([]);
    setChildFields(fields);
  };

  const haveData = records.length > 0;

  return (
    <div className="space-y-3">
      {/* Header row (no Card wrapper here) */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-base font-semibold">Grouping</h1>
          <div className="text-sm text-muted-foreground">
            Pick <b>group keys</b> (e.g., order_id). Remaining fields get a <b>Parent</b> or <b>Child</b> role.
            {enabled && (
              <div className="text-xs mt-1">
                {preview.stats.groups} groups · {preview.stats.parents} parents · {preview.stats.children} children
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="grp-enabled" checked={enabled} onCheckedChange={setEnabled} />
            <Label htmlFor="grp-enabled" className="text-sm">Enable</Label>
          </div>

          <Separator orientation="vertical" className="h-6" />

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

      {/* Work area: fixed height; columns scroll internally */}
      <div className="h-[66vh] grid grid-cols-12 gap-3 overflow-hidden">
        {/* KEYS (left) */}
        <Card className="col-span-12 lg:col-span-4 flex flex-col min-h-0 overflow-hidden">
          <CardContent className="p-0 flex-1 flex flex-col min-h-0">
            <div className="p-2 flex items-center justify-between gap-2">
              <Label className="text-sm">Group by (keys)</Label>
              <Input
                value={qKeys}
                onChange={(e) => setQKeys(e.target.value)}
                placeholder="Search"
                className="h-8 w-36"
              />
            </div>
            <Separator />
            <div className="p-2 overflow-auto text-xs flex-1 min-h-0">
              <div className="grid grid-cols-1 gap-1">
                {filtKeys.map((f) => (
                  <label
                    key={`gb-${f}`}
                    className="flex items-center gap-2 rounded border px-2 py-1 cursor-pointer hover:bg-muted/60"
                    title={f}
                  >
                    <input type="checkbox" checked={groupBy.includes(f)} onChange={() => toggleKey(f)} />
                    <span className="truncate">{f}</span>
                  </label>
                ))}
              </div>
            </div>
            {groupBy.length > 0 && (
              <>
                <Separator />
                <div className="p-2 text-xs">
                  <div className="mb-1 text-muted-foreground">Selected</div>
                  <div className="flex flex-wrap gap-1">
                    {groupBy.map((f) => (
                      <button
                        key={`sel-gb-${f}`}
                        className="rounded-full border px-2 py-0.5 hover:bg-muted"
                        onClick={() => toggleKey(f)}
                        title="Remove"
                      >
                        {f} ×
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ROLES (center) */}
        <Card className="col-span-12 lg:col-span-4 flex flex-col min-h-0 overflow-hidden">
          <CardContent className="p-0 flex-1 flex flex-col min-h-0">
            <div className="p-2 flex items-center justify-between gap-2">
              <Label className="text-sm">Field roles</Label>
              <Input
                value={qRoles}
                onChange={(e) => setQRol(e.target.value)}
                placeholder="Search"
                className="h-8 w-48"
              />
            </div>
            <Separator />
            <div className="p-2 overflow-auto text-xs flex-1 min-h-0">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6 font-medium text-muted-foreground">Field</div>
                <div className="col-span-6 font-medium text-muted-foreground">Role</div>
                {nonKeyFields.map((f) => {
                  const isParent = parentFields.includes(f);
                  return (
                    <div key={`role-${f}`} className="contents">
                      <div className="col-span-6 truncate border-t py-1" title={f}>
                        {f}
                      </div>
                      <div className="col-span-6 border-t py-1">
                        <div className="inline-flex items-center gap-2">
                          <button
                            className={`rounded px-2 py-0.5 border ${isParent ? "bg-muted" : ""}`}
                            onClick={() => setRole(f, "parent")}
                          >
                            Parent
                          </button>
                          <button
                            className={`rounded px-2 py-0.5 border ${!isParent ? "bg-muted" : ""}`}
                            onClick={() => setRole(f, "child")}
                          >
                            Child
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <Separator />
            <div className="p-2 text-xs flex flex-wrap gap-2">
              <span className="rounded-full border px-2 py-0.5">Keys: {groupBy.length}</span>
              <span className="rounded-full border px-2 py-0.5">Parent: {parentFields.length}</span>
              <span className="rounded-full border px-2 py-0.5">Child: {childFields.length}</span>
              <button className="ml-auto rounded border px-2 py-0.5 hover:bg-muted" onClick={clearAll}>
                Clear all
              </button>
            </div>
          </CardContent>
        </Card>

        {/* JSON PREVIEWS (right, stacked) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3 min-h-0 overflow-hidden">
          <Card className="flex-1 min-h-0 overflow-hidden">
            <CardContent className="p-2 flex flex-col min-h-0">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium">Parents (first 5)</div>
                <div className="text-xs text-muted-foreground">
                  {enabled ? `total: ${preview.stats.parents}` : "—"}
                </div>
              </div>
              <pre className="text-xs overflow-auto mt-1 flex-1 min-h-0">
{enabled && groupBy.length ? JSON.stringify(preview.parents.slice(0, 5), null, 2) : "Enable + pick keys to preview"}
              </pre>
            </CardContent>
          </Card>

          <Card className="flex-1 min-h-0 overflow-hidden">
            <CardContent className="p-2 flex flex-col min-h-0">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium">Children (first 5)</div>
                <div className="text-xs text-muted-foreground">
                  {enabled ? `total: ${preview.stats.children}` : "—"}
                </div>
              </div>
              <pre className="text-xs overflow-auto mt-1 flex-1 min-h-0">
{enabled && groupBy.length ? JSON.stringify(preview.children.slice(0, 5), null, 2) : "Enable + pick keys to preview"}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
