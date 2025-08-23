import { useViewLoad } from "../hooks/useViewLoad";
import DatasetList from "./DatasetList";

export default function Datasets() {
  // empty datasetId ⇒ list mode handled by the same reducer
  const { loading, datasets, error } = useViewLoad();

  return (
    <div className="space-y-4">
      {error && <p className="text-destructive text-sm">{error}</p>}
      <DatasetList loading={loading} datasets={datasets} />
    </div>
  );
}
