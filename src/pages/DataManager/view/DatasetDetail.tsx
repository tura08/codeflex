import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";

import { useViewReducer } from "@/pages/DataManager/hooks/useViewReducer";
import DataTable from "./DataTable";
import { ViewControllerProvider } from "@/pages/DataManager/context/ViewContext"; // <-- context
import DatasetSettings from "./DatasetSettings";

export default function DatasetDetail() {
  const { id: routeId } = useParams();
  const id = routeId ?? "";

  const view = useViewReducer(id);
  const { state } = view;
  const { loading, dataset, mode, total, error } = state;

  return (
    <ViewControllerProvider value={view}>
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

          <DatasetSettings />
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <Card className="h-[66vh] p-3">
          <DataTable />
        </Card>
      </div>
    </ViewControllerProvider>
  );
}
