// src/pages/apps/SheetsManager/datasets/components/DatasetList.tsx
import { Link } from "react-router-dom";

export default function DatasetList({ loading, datasets }: { loading: boolean; datasets: any[] }) {
  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!datasets?.length) return <p className="text-sm text-muted-foreground">No datasets yet.</p>;

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {datasets.map((d) => (
        <Link
          key={d.id}
          to={`/apps/sheetsmanager/datasets/${d.id}`}
          className="rounded-xl border p-4 hover:bg-muted/40 transition"
        >
          <div className="font-medium">{d.name}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {d.grouping_enabled ? "Grouping: ON" : "Grouping: OFF"}
          </div>
          <div className="text-xs text-muted-foreground">Updated: {new Date(d.updated_at).toLocaleString()}</div>
        </Link>
      ))}
    </div>
  );
}
