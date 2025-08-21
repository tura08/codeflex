// src/pages/DataManager/import/MappingEditor.tsx
import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { SimpleType } from "@/lib/google/infer";
import { useImport } from "../context/ImportContext";
import { useValidation } from "../hooks/useValidation";
import type { Issue } from "@/lib/google/validate";

export default function MappingEditor() {
  const { state, setMapping, setDatasetName } = useImport();
  const { headers, mapping, datasetName } = state;
  const { issues } = useValidation();

  // issues per header
  const countsByHeader = useMemo(() => {
    const acc: Record<string, { e: number; w: number }> = {};
    for (const h of headers) acc[h] = { e: 0, w: 0 };
    for (const it of issues as Issue[]) {
      const c = acc[it.column] ?? (acc[it.column] = { e: 0, w: 0 });
      if (it.level === "error") c.e += 1;
      else if (it.level === "warning") c.w += 1;
    }
    return acc;
  }, [issues, headers]);

  const changeType = (idx: number, t: SimpleType) =>
    setMapping(mapping.map((m, i) => (i === idx ? { ...m, type: t } : m)));

  return (
    <Card className="h-[68vh] flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">Mapping</CardTitle>
        <CardDescription className="text-xs">Pick the correct type for each field.</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 flex flex-col gap-3 pt-0">
        {/* Dataset name */}
        <div className="flex items-center gap-2">
          <span className="text-sm">Dataset name:</span>
          <Input
            className="w-[260px] h-8"
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
            placeholder="e.g., supplier_orders"
          />
        </div>

        {/* Compact table */}
        <div className="flex-1 min-h-0 overflow-auto rounded-md border">
          {mapping.length ? (
            <table className="w-full text-xs">
              {/* Solid, non-transparent sticky header */}
              <thead className="sticky top-0 bg-background z-10 shadow-sm">
                <tr>
                  <th className="px-2 py-2 border-b text-left">Field</th>
                  <th className="px-2 py-2 border-b text-left w-32">Type</th>
                  <th className="px-2 py-2 border-b text-left w-36">Status</th>
                </tr>
              </thead>
              <tbody>
                {mapping.map((m, idx) => {
                  const c = countsByHeader[m.map_from] ?? { e: 0, w: 0 };
                  return (
                    <tr key={`${m.map_from}-${idx}`} className="align-middle">
                      {/* read-only normalized name — vertically centered */}
                      <td className="px-2 py-2 border-b align-middle leading-tight">
                        <div className="truncate font-medium">{m.name}</div>
                      </td>

                      {/* type selector */}
                      <td className="px-2 py-2 border-b align-middle">
                        <Select value={m.type} onValueChange={(v) => changeType(idx, v as SimpleType)}>
                          <SelectTrigger className="h-8 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="string">string</SelectItem>
                            <SelectItem value="number">number</SelectItem>
                            <SelectItem value="boolean">boolean</SelectItem>
                            <SelectItem value="date">date</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>

                      {/* minimal status chips */}
                      <td className="px-2 py-2 border-b align-middle">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-[2px] border text-[11px] ${
                              c.e ? "border-destructive/50 text-destructive" : "text-muted-foreground"
                            }`}
                            title="Errors"
                          >
                            {c.e} err
                          </span>
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-[2px] border text-[11px] ${
                              c.w ? "border-amber-300/60 text-amber-700" : "text-muted-foreground"
                            }`}
                            title="Warnings"
                          >
                            {c.w} warn
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground p-3">Load a preview to configure mapping.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
