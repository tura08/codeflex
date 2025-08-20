// src/pages/DataManager/import/MappingEditor.tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { SimpleType } from "@/lib/google/infer";
import { useImport } from "../context/ImportContext";
import { useValidation } from "../hooks/useValidation";

export default function MappingEditor() {
  const { state, setMapping, setDatasetName } = useImport();
  const { mapping, datasetName } = state;
  const { stats } = useValidation();

  return (
    <Card className="h-[68vh] flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">Mapping</CardTitle>
        <CardDescription className="text-xs">
          Rename columns and set types. Validation updates automatically.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 flex flex-col gap-3 pt-0">
        {(stats.errors > 0 || stats.warnings > 0) && (
          <div
            className={`rounded-md border p-3 text-sm ${
              stats.errors
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : "border-amber-300/60 bg-amber-50 text-amber-800"
            }`}
          >
            {stats.errors > 0
              ? `${stats.errors} error${stats.errors === 1 ? "" : "s"} detected. Fix mapping or data.`
              : `${stats.warnings} warning${stats.warnings === 1 ? "" : "s"} detected.`}
          </div>
        )}

        {/* Dataset label */}
        <div className="flex items-center gap-2">
          <span className="text-sm">Dataset name:</span>
          <Input
            className="w-[300px]"
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
            placeholder="e.g., supplier_orders"
          />
        </div>

        {/* Mapping list */}
        <div className="flex-1 min-h-0 overflow-auto">
          {mapping.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {mapping.map((m, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    className="w-44"
                    value={m.name}
                    onChange={(e) =>
                      setMapping(mapping.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))
                    }
                  />
                  <Select
                    value={m.type}
                    onValueChange={(v) =>
                      setMapping(
                        mapping.map((x, i) => (i === idx ? { ...x, type: v as SimpleType } : x))
                      )
                    }
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">string</SelectItem>
                      <SelectItem value="number">number</SelectItem>
                      <SelectItem value="boolean">boolean</SelectItem>
                      <SelectItem value="date">date</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground truncate">
                    mapped from: <code>{m.map_from}</code>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Load a preview to configure mapping.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
