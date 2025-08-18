// src/pages/apps/SheetsManager/MappingEditor.tsx
import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { type SimpleType } from "@/lib/google/infer";
import type { Mapping } from "@/integrations/google/hooks/usePreviewPipeline";
import type { Issue } from "@/lib/google/sheets-import";

type Props = {
  mapping: Mapping[];
  setMapping: (m: Mapping[]) => void;
  datasetName: string;
  setDatasetName: (v: string) => void;
  rows: any[][];
  headers: string[];
  issues: Issue[];
  onCheckData: () => void; // triggers re-validate w/ current mapping
};

export default function MappingEditor({
  mapping,
  setMapping,
  datasetName,
  setDatasetName,
  issues,
  onCheckData,
}: Props) {
  const errorCount = useMemo(() => issues.filter((i) => i.level === "error").length, [issues]);
  const warningCount = useMemo(() => issues.filter((i) => i.level === "warning").length, [issues]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapping</CardTitle>
        <CardDescription>
          Rename columns and set types. Use “Check Data” to re-validate.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button className="cursor-pointer" onClick={onCheckData}>
            Check Data (re-validate)
          </Button>
        </div>

        {/* Error / warning banner */}
        {(errorCount > 0 || warningCount > 0) && (
          <div
            className={`rounded-md border p-3 text-sm ${
              errorCount
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : "border-amber-300/60 bg-amber-50 text-amber-800"
            }`}
          >
            {errorCount > 0
              ? `${errorCount} error${errorCount === 1 ? "" : "s"} detected. Fix mapping or data.`
              : `${warningCount} warning${warningCount === 1 ? "" : "s"} detected.`}
          </div>
        )}

        {/* Dataset/Table label (UX label only) */}
        <div className="flex items-center gap-2">
          <span className="text-sm">Dataset label:</span>
          <Input
            className="w-[360px]"
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
            placeholder="e.g., supplier_orders"
          />
        </div>

        {/* Column mapping */}
        {mapping.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mapping.map((m, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  className="w-48"
                  value={m.name}
                  onChange={(e) =>
                    setMapping(
                      mapping.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x))
                    )
                  }
                />
                <Select
                  value={m.type}
                  onValueChange={(v) =>
                    setMapping(
                      mapping.map((x, i) =>
                        i === idx ? { ...x, type: v as SimpleType } : x
                      )
                    )
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">string</SelectItem>
                    <SelectItem value="number">number</SelectItem>
                    <SelectItem value="boolean">boolean</SelectItem>
                    <SelectItem value="date">date</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                  mapped from: <code>{m.map_from}</code>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Load a preview to configure mapping.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
