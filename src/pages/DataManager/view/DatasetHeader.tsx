// src/pages/DataManager/DatasetHeader.tsx
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Batch } from "@/lib/datamanager/api";

type Props = {
  groupingEnabled: boolean;
  batches: Batch[];
  batchId: string | null;
  onBatchChange: (id: string) => void;
  q: string;
  onSearch: (q: string) => void;
  loading: boolean;
};

export default function DatasetHeader({
  groupingEnabled,
  batches,
  batchId,
  onBatchChange,
  q,
  onSearch,
  loading,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 justify-between border rounded-xl p-3">
      <div className="text-sm">
        <span className="mr-2">Structure:</span>
        <span className="inline-flex px-2 py-0.5 rounded-full border">
          {groupingEnabled ? "Grouping ON" : "Grouping OFF"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <select
          className="border rounded-md px-2 py-1 text-sm bg-background"
          value={batchId ?? ""}
          onChange={(e) => onBatchChange(e.target.value)}
          disabled={loading || !batches.length}
        >
          {!batches.length && <option>No batches</option>}
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {new Date(b.imported_at).toLocaleString()} — {b.id.slice(0, 8)}
            </option>
          ))}
        </select>

        <Input
          placeholder="Search…"
          className="w-48"
          defaultValue={q}
          onKeyDown={(e) => {
            if (e.key === "Enter")
              onSearch((e.target as HTMLInputElement).value);
          }}
        />
        <Button variant="outline" onClick={() => onSearch("")}>
          Clear
        </Button>
      </div>
    </div>
  );
}
