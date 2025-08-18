// src/pages/apps/SheetsManager/datasets/Datasets.tsx
import { useDatasetsList } from "@/integrations/google/hooks/useDatasetBrowser";
import DatasetList from "./DatasetList";

export default function Datasets() {
  const { loading, datasets, error } = useDatasetsList();

  return (
    <div className="space-y-4">

      {error && <p className="text-destructive text-sm">{error}</p>}
      <DatasetList loading={loading} datasets={datasets} />
    </div>
  );
}
