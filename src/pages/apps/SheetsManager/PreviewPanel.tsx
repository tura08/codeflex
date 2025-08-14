// src/pages/apps/SheetsManager/components/PreviewPane.tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { QualityBar, IssuesPanel } from "./Quality";
import { PreviewTable } from "@/integrations/google/components/SheetsWidgets";

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
    <Card>
      <CardHeader>
        <CardTitle>Preview</CardTitle>
        <CardDescription>
          First {rows.length} rows — {headers.length} columns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <QualityBar {...stats} />
        <PreviewTable headers={headers} rows={rows} />
        <IssuesPanel issues={issues} />
      </CardContent>
    </Card>
  );
}
