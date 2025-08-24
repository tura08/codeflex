import { useState } from "react";
import {
  Settings,
  Database,
  Activity,
  Link as LinkIcon,
  AlertTriangle,
  Users,
  Clock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import { useViewController } from "@/pages/DataManager/context/ViewContext";
import { deleteDatasetDeep } from "@/lib/datamanager/api";

/**
 * Settings modal for a dataset.
 * - Reads real data from ViewController (no props needed).
 * - One wide modal; tabs: Overview / Relationships / Actions (Danger Zone).
 * - Relationships are mock until you wire them up later.
 */
export default function DatasetSettings() {
  const { state } = useViewController();
  const { dataset, total, mode, loading, error } = state;

  const datasetId = dataset?.id ?? "";
  const datasetName = dataset?.name ?? "Dataset";
  const lastUpdated = dataset?.updated_at
    ? new Date(dataset.updated_at).toLocaleString()
    : "—";
  const groupingEnabled = !!dataset?.grouping_enabled;

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"overview" | "relations" | "actions">("overview");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  // Mock relations for now (shown only as examples)
  const mockRelations = [
    { from: "Orders", to: "Clients" },
    { from: "Orders", to: "Products" },
  ];

  const handleDelete = async () => {
    if (!datasetId) return;
    try {
      setBusy(true);
      await deleteDatasetDeep(datasetId);
      toast.success("Dataset deleted");
      window.location.assign("/datamanager/view/datasets");
    } catch (e: any) {
      toast.error("Delete failed", { description: e?.message ?? "Unknown error" });
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </DialogTrigger>

      <DialogContent className="min-w-[50vw] max-w-[80vw] p-0">
        {/* Header (single row, horizontal) */}
        <DialogHeader className="p-6 pb-2 flex items-center justify-between gap-4 border-b w-full">
          <div className="flex items-center justify-between gap-4 px-6 py-4 border-b">
            {/* Left: Icon + Title + Meta */}
            <div className="flex items-center gap-3 min-w-0">
                <Database className="h-6 w-6 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                <DialogTitle className="text-xl font-semibold truncate">
                    {datasetName}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                    Last updated {lastUpdated} • Mode: {mode === "grouped" ? "Grouped" : "Flat"}
                    {loading ? " • Loading…" : ""}
                    {error ? " • Error loading" : ""}
                </p>
                </div>
            </div>

            {/* Right: Status Badge */}
            <span className="shrink-0 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                Active
            </span>
            </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b px-6 bg-muted/10">
          {[
            { key: "overview", label: "Overview" },
            { key: "relations", label: "Relationships" },
            { key: "actions", label: "Actions" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className={[
                "px-4 py-2 text-sm rounded-t-md transition-colors",
                tab === key
                  ? "bg-background border border-b-transparent border-muted-foreground/30 font-medium"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 min-h-[360px] space-y-6">
          {/* OVERVIEW */}
          {tab === "overview" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <MetricCard
                icon={<Database className="h-4 w-4 text-muted-foreground" />}
                title="Total Rows"
                value={String(total ?? 0)}
                desc="Total records in this dataset"
              />
              <MetricCard
                icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                title="Last Updated"
                value={lastUpdated}
                desc="Data freshness"
              />
              <MetricCard
                icon={<Layers className="h-4 w-4 text-muted-foreground" />}
                title="Grouping Enabled"
                value={groupingEnabled ? "Yes" : "No"}
                desc="Hierarchical data"
              />
              <MetricCard
                icon={<Activity className="h-4 w-4 text-muted-foreground" />}
                title="Status"
                value={error ? "Error" : loading ? "Loading…" : "Active"}
                desc="Dataset status"
              />
            </div>
          )}

          {/* RELATIONSHIPS (mock for now) */}
          {tab === "relations" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Define relationships between datasets (e.g., Order → Client). Coming soon.
              </p>

              <div className="border rounded-md bg-muted/20 p-3 space-y-2">
                {mockRelations.map((rel, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-background rounded border"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      {rel.from} → {rel.to}
                    </span>
                    <Button size="sm" variant="ghost">Manage</Button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary">Add Relationship</Button>
                <Button size="sm" variant="outline">Preview Matches</Button>
              </div>
            </div>
          )}

          {/* ACTIONS (Danger Zone) */}
          {tab === "actions" && (
            <div className="border rounded-md p-4 bg-red-50 border-red-200 space-y-4">
              <h3 className="text-red-600 font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Danger Zone
              </h3>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone. Type the dataset name to confirm deletion.
              </p>

              <Label htmlFor="confirmName">Dataset Name</Label>
              <Input
                id="confirmName"
                placeholder={datasetName}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
              />

              <Button
                variant="destructive"
                disabled={!datasetId || confirmText.trim() !== datasetName || busy}
                onClick={handleDelete}
              >
                {busy ? "Deleting…" : "Delete Dataset"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Reusable Metric Card */
function MetricCard({
  icon,
  title,
  value,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  desc: string;
}) {
  return (
    <div className="bg-background rounded-lg p-4 border shadow-sm hover:shadow transition-shadow h-full flex flex-col justify-between">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-muted-foreground">{title}</span>
        {icon}
      </div>
      <p className="text-xl font-semibold truncate">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}
