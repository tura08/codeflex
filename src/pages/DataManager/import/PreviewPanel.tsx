// src/pages/DataManager/import/PreviewPanel.tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PreviewTable } from "@/pages/DataManager/import/SheetsWidgets";
import { IssuesPanel, QualityBar } from "./Quality";

type Stats = { rows: number; columns: number; cells: number; errors: number; warnings: number };

export default function PreviewPane({
  headers,
  rows,
  stats,
  issues,
}: {
  headers: string[];
  rows: any[][];
  stats: Stats;
  issues: any[];
}) {
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
