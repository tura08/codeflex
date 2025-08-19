import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PreviewTable } from "@/pages/DataManager/import/SheetsWidgets";
import { IssuesPanel, QualityBar } from "./Quality";
import { validate, qualityFromIssues } from "@/lib/google/sheets-import";
import type { Mapping } from "@/integrations/google/types";

export default function PreviewPanel({
  headers,
  rows,
  mapping,
}: {
  headers: string[];
  rows: any[][];
  mapping: Mapping[];
}) {
  // derive column types from mapping
  const types = useMemo(() => mapping.map((c) => c.type), [mapping]);

  const issues = useMemo(() => {
    if (!headers.length || !rows.length) return [];
    return validate(rows, headers, types);
  }, [rows, headers, types]);

  const stats = useMemo(
    () => qualityFromIssues(rows.length, headers.length, issues),
    [rows.length, headers.length, issues]
  );

  return (
    <Card className="h-[68vh] flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">Preview</CardTitle>
        <CardDescription className="text-xs">
          First {rows.length} rows — {headers.length} columns
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 flex flex-col gap-3 pt-0">
        <QualityBar {...stats} />

        <div className="flex-1 min-h-0 overflow-auto rounded-md border">
          <PreviewTable headers={headers} rows={rows} />
        </div>

        <div className="min-h-0 overflow-auto border rounded-md p-2">
          <IssuesPanel issues={issues} />
        </div>
      </CardContent>
    </Card>
  );
}
