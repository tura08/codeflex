// src/pages/apps/SheetsManager/datasets/Datasets.tsx
import { Link } from "react-router-dom";
import { useDatasetsList } from "@/integrations/google/hooks/useDatasetBrowser";
import { Button } from "@/components/ui/button";
import DatasetList from "./components/DatasetList";

export default function Datasets() {
  const { loading, datasets, error } = useDatasetsList();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dataset Browser</h1>
        <div className="flex gap-2">
          <Link to="/apps/sheetsmanager"><Button variant="outline">Import Workbench</Button></Link>
          <Link to="/apps/sheetsmanager/datasets"><Button>Dataset Browser</Button></Link>
        </div>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      <DatasetList loading={loading} datasets={datasets} />
    </div>
  );
}
