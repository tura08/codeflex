"use client";

import { useState } from "react";
import { AnalysisInput } from "@/components/AnalysisInput";
import { AnalysisResult } from "@/components/AnalysisResult";
import { useProjects } from "@/context/ProjectContext";

export default function AnalysePage() {
  const { addProject } = useProjects();
  const [result, setResult] = useState<{
    score: number;
    rationale: string;
    // include breakdown if you want later
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string>("");

  const handleAnalyze = async (description: string) => {
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResult({ score: data.score, rationale: data.rationale });
      setName(""); // reset name field
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleSave = async () => {
    if (result && name.trim()) {
      await addProject({ name: name.trim(), score: result.score });
      // Optionally clear
      setResult(null);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">AI Project Analyzer</h1>

      <AnalysisInput onAnalyze={handleAnalyze} />

      {error && (
        <div className="p-4 bg-destructive text-destructive-foreground rounded">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <AnalysisResult score={result.score} rationale={result.rationale} />

          <div className="flex flex-col space-y-2">
            <label className="font-medium" htmlFor="project-name">
              Project Name
            </label>
            <input
              id="project-name"
              className="border p-2 rounded"
              placeholder="Enter a name for this project"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
              onClick={handleSave}
              disabled={!name.trim()}
            >
              Save Project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
