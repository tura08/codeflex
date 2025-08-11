import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleConnect } from "@/integrations/google/components/GoogleConnect";
import { SpreadsheetSelect } from "@/integrations/google/components/SpreadsheetSelect";
import { SheetTabSelect } from "@/integrations/google/components/SheetTabSelect";

export function SourceControls(props: {
  spreadsheetId: string; setSpreadsheetId: (v: string) => void;
  sheetName: string; setSheetName: (v: string) => void;
  headerRow: number; setHeaderRow: (n: number) => void;
  maxRows: number; setMaxRows: (n: number) => void;
  onPreview: () => void;
  onSaveSource: () => void;
  loading?: boolean;
}) {
  const {
    spreadsheetId, setSpreadsheetId,
    sheetName, setSheetName,
    headerRow, setHeaderRow,
    maxRows, setMaxRows,
    onPreview, onSaveSource,
    loading
  } = props;

  return (
    <div className="grid gap-4">
      <GoogleConnect />

      <div className="grid gap-2">
        <label className="text-sm font-medium">Spreadsheet</label>
        <SpreadsheetSelect value={spreadsheetId} onChange={setSpreadsheetId} />
      </div>

      {spreadsheetId && (
        <div className="flex flex-wrap items-end gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Tab</label>
            <SheetTabSelect spreadsheetId={spreadsheetId} value={sheetName} onChange={setSheetName} />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Header row</label>
            <Input className="w-24" type="number" min={1} value={headerRow}
              onChange={(e)=>setHeaderRow(Number(e.target.value) || 1)} />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Preview rows</label>
            <Input className="w-24" type="number" min={1} value={maxRows}
              onChange={(e)=>setMaxRows(Number(e.target.value) || 50)} />
          </div>

          <Button className="cursor-pointer" onClick={onPreview} disabled={!sheetName || !!loading}>
            {loading ? "Loading…" : "Load Preview"}
          </Button>

          <Button variant="outline" className="cursor-pointer" onClick={onSaveSource} disabled={!sheetName}>
            Save as Source
          </Button>
        </div>
      )}
    </div>
  );
}
