// src/pages/apps/SheetsManager/GroupingPanel.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { groupRecords, inferParentChildRoles, type GroupingConfig } from "@/lib/google/grouping";

type Props = {
  records: Record<string, any>[];
  fields: string[];
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  value: GroupingConfig | null;
  onChange: (cfg: GroupingConfig) => void;
};

export default function GroupingPanel({
  records,
  fields,
  enabled,
  setEnabled,
  value,
  onChange,
}: Props) {
  // Core state
  const [groupBy, setGroupBy] = useState<string[]>(value?.groupBy ?? []);
  const [parentFields, setParentFields] = useState<string[]>(value?.parentFields ?? []);
  const [childFields, setChildFields] = useState<string[]>(
    value?.childFields ?? fields.filter((f) => !groupBy.includes(f) && !parentFields.includes(f))
  );

  // Auto-infer when enabled + groupBy changes (or records/fields change)
  useEffect(() => {
    if (!enabled || groupBy.length === 0 || records.length === 0) return;
    const { parentFields: p, childFields: c } = inferParentChildRoles(records, groupBy, fields);
    setParentFields(p);
    setChildFields(c);
  }, [enabled, groupBy, records, fields]);

  // Build config and preview
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

  // Notify parent on change
  useEffect(() => {
    if (enabled) onChange(cfg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, cfg.groupBy.join("|"), cfg.parentFields.join("|"), cfg.childFields.join("|")]);

  // UI logic
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

  // Filters
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

  const clearAll = () => {
    setGroupBy([]);
    setParentFields([]);
    setChildFields(fields);
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Grouping</CardTitle>
            <CardDescription>Auto-detect parent/child by keys; edit roles as needed.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="grp-enabled" checked={enabled} onCheckedChange={setEnabled} />
            <Label htmlFor="grp-enabled" className="text-sm">Enable</Label>
          </div>
        </div>
        {enabled && (
          <div className="mt-1 text-xs text-muted-foreground">
            {preview.stats.groups} groups · {preview.stats.parents} parents · {preview.stats.children} children
          </div>
        )}
      </CardHeader>

      <CardContent className="max-h-[72vh] flex flex-col gap-3">
        <div className="grid grid-cols-12 gap-3 min-h-0">
          {/* A: Group keys */}
          <section className="col-span-12 md:col-span-4 rounded-md border flex flex-col min-h-[40vh]">
            <div className="p-2 flex items-center justify-between gap-2">
              <Label className="text-sm">Group by (keys)</Label>
              <Input value={qKeys} onChange={(e) => setQKeys(e.target.value)} placeholder="Search" className="h-8 w-36" />
            </div>
            <Separator />
            <div className="p-2 overflow-auto text-xs flex-1">
              <div className="grid grid-cols-1 gap-1">
                {filtKeys.map((f) => (
                  <label key={`gb-${f}`} className="flex items-center gap-2 rounded border px-2 py-1 cursor-pointer hover:bg-muted/60" title={f}>
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
                      <button key={`sel-gb-${f}`} className="rounded-full border px-2 py-0.5 hover:bg-muted" onClick={() => toggleKey(f)} title="Remove">
                        {f} ×
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>

          {/* B: Roles (Parent / Child) */}
          <section className="col-span-12 md:col-span-8 rounded-md border flex flex-col min-h-[40vh]">
            <div className="p-2 flex items-center justify-between gap-2">
              <Label className="text-sm">Field roles</Label>
              <Input value={qRoles} onChange={(e) => setQRol(e.target.value)} placeholder="Search" className="h-8 w-48" />
            </div>
            <Separator />
            <div className="p-2 overflow-auto text-xs flex-1">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6 font-medium text-muted-foreground">Field</div>
                <div className="col-span-6 font-medium text-muted-foreground">Role</div>
                {nonKeyFields.map((f) => {
                  const isParent = parentFields.includes(f);
                  return (
                    <div key={`role-${f}`} className="contents">
                      <div className="col-span-6 truncate border-t py-1" title={f}>{f}</div>
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
          </section>
        </div>

        {/* BOTTOM: JSON previews side-by-side */}
        {enabled && (
          <>
            <Separator />
            <div className="grid grid-cols-12 gap-3 min-h-[18vh]">
              <div className="col-span-12 md:col-span-6 rounded-md border p-2 flex flex-col min-h-0">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium">Parents (first 5)</div>
                  <div className="text-xs text-muted-foreground">total: {preview.stats.parents}</div>
                </div>
                <pre className="text-xs overflow-auto mt-1 flex-1">
{JSON.stringify(preview.parents.slice(0, 5), null, 2)}
                </pre>
              </div>
              <div className="col-span-12 md:col-span-6 rounded-md border p-2 flex flex-col min-h-0">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium">Children (first 5)</div>
                  <div className="text-xs text-muted-foreground">total: {preview.stats.children}</div>
                </div>
                <pre className="text-xs overflow-auto mt-1 flex-1">
{JSON.stringify(preview.children.slice(0, 5), null, 2)}
                </pre>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
