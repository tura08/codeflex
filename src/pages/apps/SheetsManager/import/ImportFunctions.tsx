import { Button } from "@/components/ui/button";
import { useImportController } from "./ImportControllerContext";

export default function ImportFunctions() {
  const controller = useImportController();

  // Source info used to enable/disable UI
  const { sheetName } = controller.source;

  // Pipeline bits
  const { headers, rawRows } = controller.pipeline.data;
  const { loading } = controller.pipeline;

  const {
    normalizeDates,
    normalizeCurrency,
    removeEmptyRows,
    removeMostlyEmptyRows,
    mostlyThreshold,
  } = controller.pipeline.rules;

  const {
    setNormalizeDates,
    setNormalizeCurrency,
    setRemoveEmptyRows,
    setRemoveMostlyEmptyRows,
    setMostlyThreshold,
  } = controller.pipeline.setRules;

  const { recompute } = controller.pipeline.actions;

  const disabled = !sheetName || !!loading || !headers.length;

  return (
    <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
      {/* Normalize dates */}
      <label className="flex items-center gap-1 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={normalizeDates}
          onChange={(e) => {
            setNormalizeDates(e.target.checked);
            // optional: recompute kept for UX; derived pipeline updates automatically
            recompute(rawRows, { keepMapping: true });
          }}
        />
        Dates
      </label>

      {/* Parse currency */}
      <label className="flex items-center gap-1 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={normalizeCurrency}
          onChange={(e) => {
            setNormalizeCurrency(e.target.checked);
            recompute(rawRows, { keepMapping: true });
          }}
        />
        Currency
      </label>

      {/* Divider */}
      <div className="w-px h-5 bg-border mx-1" />

      {/* Remove empty rows */}
      <label
        className="flex items-center gap-1 text-sm cursor-pointer"
        title="Remove rows where all cells are blank"
      >
        <input
          type="checkbox"
          checked={removeEmptyRows}
          onChange={(e) => {
            setRemoveEmptyRows(e.target.checked);
            recompute(rawRows, { keepMapping: true });
          }}
        />
        Remove empty
      </label>

      {/* Remove mostly-empty rows */}
      <label
        className="flex items-center gap-1 text-sm cursor-pointer"
        title="Remove rows where ≥80% cells are blank"
      >
        <input
          type="checkbox"
          checked={removeMostlyEmptyRows}
          onChange={(e) => {
            setRemoveMostlyEmptyRows(e.target.checked);
            recompute(rawRows, { keepMapping: true });
          }}
        />
        Remove mostly-empty
      </label>

      {/* Threshold */}
      <input
        type="number"
        step={0.05}
        min={0.5}
        max={0.95}
        value={mostlyThreshold}
        onChange={(e) => {
          const val = Number(e.target.value || 0.8);
          const clamped = Math.min(0.95, Math.max(0.5, val));
          setMostlyThreshold(clamped);
          if (removeMostlyEmptyRows) recompute(rawRows, { keepMapping: true });
        }}
        className="w-16 text-xs border rounded px-1 py-0.5"
        title="Threshold for mostly-empty (default 0.8)"
      />

      {/* Divider */}
      <div className="w-px h-5 bg-border mx-1" />

      {/* Recalculate (no toast by request) */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => recompute(rawRows, { keepMapping: true })}
        disabled={disabled}
      >
        Recalculate
      </Button>
    </div>
  );
}
