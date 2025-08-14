// src/pages/apps/SheetsManager/components/MappingPanel.tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MappingEditor } from "./MappingEditor";
import type { Mapping } from "./index";

type Props = {
  mapping: Mapping[];
  setMapping: (m: Mapping[]) => void;
  datasetName: string;
  setDatasetName: (v: string) => void;
  rows: any[][];
  headers: string[];
  issues: any[];
  spreadsheetId: string;
  sheetName: string;
  headerRow: number;
  onCheckData: () => void;
};

export default function MappingPanel(props: Props) {
  const { mapping } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapping & Import</CardTitle>
        <CardDescription>Rename, type, then import</CardDescription>
      </CardHeader>
      <CardContent>
        {mapping.length > 0 ? (
          <MappingEditor {...props} />
        ) : (
          <p className="text-sm text-muted-foreground">Load a preview to configure mapping.</p>
        )}
      </CardContent>
    </Card>
  );
}
