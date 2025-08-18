import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleConnect, SpreadsheetSelect, SheetTabSelect } from "@/pages/apps/SheetsManager/import/SheetsWidgets";

export function SourceControls(props: {
  spreadsheetId: string; setSpreadsheetId: (v: string) => void;
  sheetName: string; setSheetName: (v: string) => void;
  headerRow: number; setHeaderRow: (n: number) => void;
  maxRows: number; setMaxRows: (n: number) => void;
  onPreview: () => void;
  onSaveSource: () => void;
  loading?: boolean;
  compact?: boolean;
  showActions?: boolean; // NEW
}) {
  const {
    spreadsheetId, setSpreadsheetId,
    sheetName, setSheetName,
    headerRow, setHeaderRow,
    maxRows, setMaxRows,
    onPreview, onSaveSource,
    loading, compact, showActions = true,
  } = props;

  return (
    <div className={`grid gap-4 ${compact ? "" : ""}`}>
      <GoogleConnect />

      <div className="grid gap-2">
        <label className="text-sm font-medium">Spreadsheet</label>
        <SpreadsheetSelect value={spreadsheetId} onChange={setSpreadsheetId} />
      </div>

      {spreadsheetId && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Tab</label>
            <SheetTabSelect spreadsheetId={spreadsheetId} value={sheetName} onChange={setSheetName} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Header row</label>
              <Input
                type="number"
                min={1}
                value={headerRow}
                onChange={(e) => setHeaderRow(Number(e.target.value) || 1)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Max rows</label>
              <Input
                type="number"
                min={1}
                value={maxRows}
                onChange={(e) => setMaxRows(Number(e.target.value) || 200)}
              />
            </div>
          </div>

          {showActions && (
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end sm:col-span-2">
              <Button className="cursor-pointer sm:w-auto w-full" onClick={onPreview} disabled={!sheetName || !!loading}>
                {loading ? "Loading…" : "Load Preview"}
              </Button>
              <Button
                variant="outline"
                className="cursor-pointer sm:w-auto w-full"
                onClick={onSaveSource}
                disabled={!sheetName}
              >
                Save as Source
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
