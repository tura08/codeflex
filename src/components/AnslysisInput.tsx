import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface AnalysisInputProps {
  onAnalyze: (description: string) => Promise<void>;
}

export function AnalysisInput({ onAnalyze }: AnalysisInputProps) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!description.trim()) return;
    setLoading(true);
    try {
      await onAnalyze(description.trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Textarea
          id="project-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your idea—e.g. a Todo app with auth, real-time updates…"
          rows={6}
          className="bg-card text-card-foreground"
        />
      </div>
      <Button
        onClick={handleAnalyze}
        disabled={!description || loading}
        className="w-32"
      >
        {loading ? "Analyzing…" : "Analyze"}
      </Button>
    </div>
  );
}
