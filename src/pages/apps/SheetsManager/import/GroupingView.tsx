// src/pages/apps/SheetsManager/import/GroupingView.tsx
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { groupRecords, inferParentChildRoles, type GroupingConfig } from "@/lib/google/grouping";
import { useImportController } from "./ImportControllerContext";

type Props = { onClose?: () => void };

export default function GroupingView({ onClose }: Props) {
  const controller = useImportController();

  // Data
  const { records, availableFields: allFields } = controller.dataset;
  const { config: savedConfig } = controller.grouping;

  // Initial keys (saved or first field)
  const initialKeys: string[] =
    savedConfig?.groupBy?.length ? savedConfig.groupBy : allFields[0] ? [allFields[0]] : [];

  // Local state
  const [groupKeys, setGroupKeys] = useState<string[]>(initialKeys);
  const [searchGroupKeys, setSearchGroupKeys] = useState("");
  const [searchRoles, setSearchRoles] = useState("");
  const [showAllParents, setShowAllParents] = useState(false);
  const [showAllChildren, setShowAllChildren] = useState(false);

  // Filtered key options
  const visibleGroupKeyOptions = useMemo(
    () =>
      allFields.filter((field) =>
        field.toLowerCase().includes(searchGroupKeys.toLowerCase())
      ),
    [allFields, searchGroupKeys]
  );

  // Auto-infer roles from selected keys (pure)
  const derivedRoles = useMemo(() => {
    if (!groupKeys.length || !records.length) {
      return { parentFields: [] as string[], childFields: [] as string[] };
    }
    return inferParentChildRoles(records, groupKeys, allFields);
  }, [groupKeys, records, allFields]);

  // Center list (exclude keys, filter by search)
  const visibleRoleFields = useMemo(
    () =>
      allFields
        .filter((f) => !groupKeys.includes(f))
        .filter((f) => f.toLowerCase().includes(searchRoles.toLowerCase())),
    [allFields, groupKeys, searchRoles]
  );

  // Current config + preview
  const currentConfig: GroupingConfig = useMemo(
    () => ({
      groupBy: groupKeys,
      parentFields: derivedRoles.parentFields,
      childFields: derivedRoles.childFields,
    }),
    [groupKeys, derivedRoles.parentFields, derivedRoles.childFields]
  );

  const previewData = useMemo(() => {
    if (!groupKeys.length || !records.length) {
      return { parents: [], children: [], stats: { groups: 0, parents: 0, children: 0 } };
    }
    return groupRecords(records, currentConfig);
  }, [groupKeys, records, currentConfig]);

  const hasRecords = records.length > 0;
  const canApply = hasRecords && groupKeys.length > 0;

  // Handlers
  const toggleGroupKey = (field: string) => {
    setGroupKeys((prev) =>
      prev.includes(field) ? prev.filter((x) => x !== field) : [...prev, field]
    );
  };
  const clearAllKeys = () => setGroupKeys([]);

  const applyAndClose = () => {
    controller.grouping.setEnabled(true);
    controller.grouping.setConfig(currentConfig);
    onClose?.();
  };

  // Preview slices
  const parentsPreview = showAllParents ? previewData.parents : previewData.parents.slice(0, 5);
  const childrenPreview = showAllChildren ? previewData.children : previewData.children.slice(0, 5);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-base font-semibold">Grouping</h1>
          <div className="text-sm text-muted-foreground">
            Select one or more <b>group keys</b> (e.g., order_id). Parent/Child roles are inferred automatically.
            <div className="text-xs mt-1">
              {groupKeys.length
                ? `${previewData.stats.groups} groups · ${previewData.stats.parents} parents · ${previewData.stats.children} children`
                : "Pick at least one key to preview"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onClose}>← Back</Button>
          <Button disabled={!canApply} onClick={applyAndClose}>Apply</Button>
        </div>
      </div>

      {/* Work area */}
      <div className="h-[66vh] grid grid-cols-12 gap-3 overflow-hidden">
        {/* KEYS (left) */}
        <Card className="col-span-12 lg:col-span-4 flex flex-col min-h-0 overflow-hidden">
          <CardContent className="p-0 flex-1 flex flex-col min-h-0">
            <div className="p-2 flex items-center justify-between gap-2">
              <Label className="text-sm">Group by (keys)</Label>
              <Input
                value={searchGroupKeys}
                onChange={(e) => setSearchGroupKeys(e.target.value)}
                placeholder="Search"
                className="h-8 w-36"
              />
            </div>
            <Separator />
            <div className="p-2 overflow-auto text-xs flex-1 min-h-0">
              <div className="grid grid-cols-1 gap-1">
                {visibleGroupKeyOptions.map((field) => (
                  <label
                    key={`gb-${field}`}
                    className="flex items-center gap-2 rounded border px-2 py-1 cursor-pointer hover:bg-muted/60"
                    title={field}
                  >
                    <input
                      type="checkbox"
                      checked={groupKeys.includes(field)}
                      onChange={() => toggleGroupKey(field)}
                    />
                    <span className="truncate">{field}</span>
                  </label>
                ))}
              </div>
            </div>

            {groupKeys.length > 0 && (
              <>
                <Separator />
                <div className="p-2 text-xs">
                  <div className="mb-1 text-muted-foreground">Selected</div>
                  <div className="flex flex-wrap gap-1">
                    {groupKeys.map((field) => (
                      <button
                        key={`sel-gb-${field}`}
                        className="rounded-full border px-2 py-0.5 hover:bg-muted"
                        onClick={() => toggleGroupKey(field)}
                        title="Remove"
                      >
                        {field} ×
                      </button>
                    ))}
                    <button
                      className="ml-auto rounded border px-2 py-0.5 hover:bg-muted"
                      onClick={clearAllKeys}
                      title="Clear all"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ROLES (center) — read-only */}
        <Card className="col-span-12 lg:col-span-4 flex flex-col min-h-0 overflow-hidden">
          <CardContent className="p-0 flex-1 flex flex-col min-h-0">
            <div className="p-2 flex items-center justify-between gap-2">
              <Label className="text-sm">Field roles (auto-inferred)</Label>
              <Input
                value={searchRoles}
                onChange={(e) => setSearchRoles(e.target.value)}
                placeholder="Search"
                className="h-8 w-48"
              />
            </div>
            <Separator />
            <div className="p-2 overflow-auto text-xs flex-1 min-h-0">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6 font-medium text-muted-foreground">Field</div>
                <div className="col-span-6 font-medium text-muted-foreground">Role</div>

                {visibleRoleFields.map((field) => {
                  const isParent = derivedRoles.parentFields.includes(field);
                  const isChild = derivedRoles.childFields.includes(field);
                  const roleLabel = isParent ? "Parent" : isChild ? "Child" : "—";

                  return (
                    <div key={`role-${field}`} className="contents">
                      <div className="col-span-6 truncate border-t py-1" title={field}>
                        {field}
                      </div>
                      <div className="col-span-6 border-t py-1">
                        <span className="inline-flex items-center rounded border px-2 py-0.5">
                          {roleLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />
            <div className="p-2 text-xs flex flex-wrap gap-2">
              <span className="rounded-full border px-2 py-0.5">Keys: {groupKeys.length}</span>
              <span className="rounded-full border px-2 py-0.5">Parent: {derivedRoles.parentFields.length}</span>
              <span className="rounded-full border px-2 py-0.5">Child: {derivedRoles.childFields.length}</span>
            </div>
          </CardContent>
        </Card>

        {/* JSON PREVIEWS (right, stacked) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3 min-h-0 overflow-hidden">
          <Card className="flex-1 min-h-0 overflow-hidden">
            <CardContent className="p-2 flex flex-col min-h-0">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium">Parents ({showAllParents ? "all" : "first 5"})</div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground">
                    {groupKeys.length ? `total: ${previewData.stats.parents}` : "—"}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    disabled={!groupKeys.length}
                    onClick={() => setShowAllParents((v) => !v)}
                  >
                    {showAllParents ? "Show 5" : "Show all"}
                  </Button>
                </div>
              </div>
              <pre className="text-xs overflow-auto mt-1 flex-1 min-h-0">
                {groupKeys.length
                  ? JSON.stringify(parentsPreview, null, 2)
                  : "Pick one or more keys to preview"}
              </pre>
            </CardContent>
          </Card>

          <Card className="flex-1 min-h-0 overflow-hidden">
            <CardContent className="p-2 flex flex-col min-h-0">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium">Children ({showAllChildren ? "all" : "first 5"})</div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground">
                    {groupKeys.length ? `total: ${previewData.stats.children}` : "—"}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    disabled={!groupKeys.length}
                    onClick={() => setShowAllChildren((v) => !v)}
                  >
                    {showAllChildren ? "Show 5" : "Show all"}
                  </Button>
                </div>
              </div>
              <pre className="text-xs overflow-auto mt-1 flex-1 min-h-0">
                {groupKeys.length
                  ? JSON.stringify(childrenPreview, null, 2)
                  : "Pick one or more keys to preview"}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
