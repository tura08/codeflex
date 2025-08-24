// src/pages/DataManager/view/DatasetDetail.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import DeleteDatasetDialog from "./DeleteDatasetDialog";

import { useViewReducer } from "@/pages/DataManager/hooks/useViewReducer";
import DataTable from "./DataTable";

export default function DatasetDetail() {
  const { id: routeId } = useParams();
  const id = routeId ?? "";

  const view = useViewReducer(id);
  const { state, updateParams } = view;
  const { loading, dataset, mode, total, error, q } = state;

  // Restore your previous search behavior: controlled input + onChange → updateParams
  const [searchInput, setSearchInput] = useState(q);
  useEffect(() => setSearchInput(q), [q]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{dataset?.name ?? "Dataset"}</h1>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {mode === "grouped"
                ? "Grouped view (parents with inline children preview)"
                : "Flat view"}
            </span>
            <span>•</span>
            <span>Rows: {loading ? "…" : total}</span>
          </div>
        </div>

        <DeleteDatasetDialog datasetId={id} datasetName={dataset?.name} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <Input
          placeholder="Search…"
          className="h-8 w-64"
          value={searchInput}
          onChange={(e) => {
            const val = e.target.value;
            setSearchInput(val);
            updateParams({ q: val, page: 1 });
          }}
        />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Card className="h-[62vh] p-3">
        <DataTable view={view} />
      </Card>
    </div>
  );
}

