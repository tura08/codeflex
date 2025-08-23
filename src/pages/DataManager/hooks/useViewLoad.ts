import { useCallback, useEffect, useState } from "react";
import { listDatasets, type DatasetSummary } from "@/lib/datamanager/api";

export function useViewLoad() {
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listDatasets();
      setDatasets(list);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load datasets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { loading, datasets, error, refresh };
}
