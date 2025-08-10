// src/pages/NewProjectPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects } from "@/context/ProjectContext";
import { computeWeightedScore } from "@/lib/score";
import { VariableForm } from "@/components/VariableForm";
import { VariableTable } from "@/components/VariableTable";

export default function NewApp() {
  const [vars, setVars] = useState<
    { name: string; weight: number; score: number; id: string }[]
  >([]);
  const [projectName, setProjectName] = useState("");
  const { addProject } = useProjects();
  const navigate = useNavigate();

  const handleSave = async () => {
    if (!projectName) return alert("Please enter a project name");
    const score = computeWeightedScore(vars);

    await addProject({ name: projectName, score });

    navigate("/apps"); // redirect to projects list
  };

  return (
    <main className="space-y-8">
      <div>
        <label htmlFor="projectName" className="block mb-1 font-medium">
          Project Name
        </label>
        <input
          id="projectName"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Enter project name"
        />
      </div>

      <VariableForm onAdd={(v) => setVars((a) => [...a, v])} />
      <VariableTable
        vars={vars}
        onRemove={(id) => setVars((a) => a.filter((v) => v.id !== id))}
      />

      <div className="mt-4">
        <p>
          Total Score: <strong>{computeWeightedScore(vars)}</strong>
        </p>
        <button
          onClick={handleSave}
          className="mt-2 inline-flex items-center px-4 py-2 bg-[var(--accent)] text-[var(--accent-foreground)] rounded"
        >
          Save Project
        </button>
      </div>
    </main>
  );
}
