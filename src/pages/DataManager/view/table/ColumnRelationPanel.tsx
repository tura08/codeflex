import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link2, X } from "lucide-react";
import type { ReferenceDatasetOption, ReferenceMeta } from "./types";

export default function ColumnRelationPanel(props: {
  filteredAllColumns: string[];
  references: Record<string, ReferenceMeta | undefined>;
  referenceDatasets: ReferenceDatasetOption[];
  onSaveReference: (columnId: string, targetDatasetId?: string) => void;
  onClearReference: (columnId: string) => void;
}) {
  const {
    filteredAllColumns,
    references,
    referenceDatasets,
    onSaveReference,
    onClearReference,
  } = props;

  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [draftTargetDatasetId, setDraftTargetDatasetId] = useState<string>("");

  const referenceLabelFor = (columnId: string) => {
    const reference = references[columnId];
    if (!reference?.targetDatasetId) return null;
    const option = referenceDatasets.find(
      (dataset) => dataset.id === reference.targetDatasetId
    );
    return option?.label ?? reference.targetDatasetId;
  };

  const startEdit = (columnId: string) => {
    setEditingColumnId(columnId);
    const current = references[columnId];
    setDraftTargetDatasetId(current?.targetDatasetId ?? "");
  };

  const saveEdit = (columnId: string) => {
    const value = draftTargetDatasetId.trim();
    onSaveReference(columnId, value || undefined);
    setEditingColumnId(null);
  };

  return (
    <div className="rounded-md border">
      <div className="max-h-[48vh] overflow-auto">
        <div className="sticky top-0 z-10 border-b bg-background p-2 text-xs font-medium">
          Column ⇢ Target dataset
        </div>

        <div className="p-2">
          {filteredAllColumns.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No columns match your filter.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAllColumns.map((columnName) => {
                const currentLabel = referenceLabelFor(columnName);
                const isEditing = editingColumnId === columnName;

                return (
                  <div
                    key={columnName}
                    className="bg-background border rounded p-2 flex flex-col gap-2"
                  >
                    {/* Card header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{columnName}</div>
                        {currentLabel ? (
                          <div className="text-[11px] text-muted-foreground truncate">
                            Linked to: {currentLabel}
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground">
                            No reference
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {references[columnName]?.targetDatasetId ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            onClick={() => onClearReference(columnName)}
                            title="Clear reference"
                          >
                            Clear
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          title={currentLabel ? "Edit reference" : "Add reference"}
                          onClick={() => startEdit(columnName)}
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Inline editor inside card */}
                    {isEditing && (
                      <div className="rounded-md border bg-muted/20 p-2">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-xs font-medium">
                            Reference for{" "}
                            <span className="text-muted-foreground">{columnName}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setEditingColumnId(null)}
                            title="Close"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-muted-foreground">
                            Target dataset
                          </label>
                          <select
                            className="h-9 rounded-md border bg-background px-2 text-sm"
                            value={draftTargetDatasetId}
                            onChange={(event) =>
                              setDraftTargetDatasetId(event.target.value)
                            }
                          >
                            <option value="">None</option>
                            {referenceDatasets.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="mt-2 flex items-center justify-end gap-2">
                          <Button size="sm" onClick={() => saveEdit(columnName)}>
                            Save reference
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
