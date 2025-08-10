// src/pages/AnalysePage.tsx
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase-client"

import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AnalysisInput } from "@/components/AnslysisInput"

type Difficulty = "Easy" | "Medium" | "Hard"

type Result = {
  score: number
  rationale: string
  suggestedTools?: string[]
  difficulty?: Difficulty
}

const MOCK_PATTERNS = [
  { id: "auth-supabase", title: "Supabase Auth Setup", category: "Auth" },
  { id: "crud-hooks", title: "Typed CRUD Hooks", category: "Data" },
  { id: "ws-realtime", title: "WebSocket Realtime Feed", category: "Real-time" },
  { id: "ai-helper", title: "OpenAI Content Helper", category: "AI" },
]

export default function AnalysePage() {
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([])
  const navigate = useNavigate()

  const handleAnalyze = async (description: string) => {
    setError(null)
    setResult(null)
    setSelectedPatterns([])
    setLoading(true)

    // ---- MOCK for now (keep your real call commented) ----
    setTimeout(() => {
      setResult({
        score: 3.8,
        difficulty: "Medium",
        rationale:
          "Real-time collaboration with AI assistance and persistence. Needs auth, realtime infra, and OpenAI integration. Medium difficulty, with many reusable patterns available.",
        suggestedTools: [
          "React + Vite (frontend)",
          "Supabase (auth & DB)",
          "WebSocket server (real-time)",
          "Shadcn UI (components)",
          "OpenAI API",
        ],
      })
      setLoading(false)
    }, 700)

    // --- REAL API CALL (later) ---
    // try {
    //   const res = await fetch("/api/analyse", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ description }),
    //   })
    //   const data = await res.json()
    //   if (!res.ok) throw new Error(data.error || "Analysis failed")
    //   setResult({
    //     score: data.score,
    //     rationale: data.rationale,
    //     suggestedTools: data.tools,
    //     difficulty: data.difficulty as Difficulty,
    //   })
    //   setName("")
    // } catch (e: any) {
    //   setError(e.message)
    // } finally {
    //   setLoading(false)
    // }
  }

  const handleSave = async () => {
    if (!result || !name.trim()) return
    try {
      const { error: insertError } = await supabase.from("projects").insert({
        name: name.trim(),
        score: result.score,
        // NOTE: keeping DB structure unchanged (only name & score)
        // patterns/difficulty/tools are local for now
      })
      if (insertError) throw new Error(insertError.message)
      navigate("/")
    } catch (err: any) {
      setError(err.message)
    }
  }

  const togglePattern = (id: string) => {
    setSelectedPatterns((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const difficultyBadge = (d?: Difficulty) => {
    if (!d) return null
    if (d === "Easy")
      return <Badge variant="secondary" className="bg-green-500 text-white">Easy</Badge>
    if (d === "Medium")
      return <Badge variant="default" className="bg-yellow-500 text-black">Medium</Badge>
    return <Badge variant="destructive">Hard</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Page header matches your other pages */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Project Analyzer</h1>
          <p className="text-sm text-muted-foreground">
            Describe your project. The AI suggests difficulty, tools, and reusable patterns.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {loading ? "Analyzing…" : result ? "Result ready" : "Idle"}
        </div>
      </div>

      {/* Input card */}
      <Card>
        <CardHeader>
          <CardTitle>Project Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AnalysisInput onAnalyze={handleAnalyze} />
          {error && (
            <div className="p-3 rounded bg-destructive text-destructive-foreground">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results section (wide like the rest of your pages) */}
      {result && (
        <Card className="bg-[var(--card)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Analysis Results</CardTitle>
            {difficultyBadge(result.difficulty)}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Difficulty Score</p>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold">{result.score.toFixed(1)} / 5</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(result.score / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Rationale */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Reasoning</p>
              <p className="leading-relaxed">{result.rationale}</p>
            </div>

            <Separator />

            {/* Suggested Tools */}
            {result.suggestedTools && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Suggested Tools</p>
                <div className="flex flex-wrap gap-2">
                  {result.suggestedTools.map((tool) => (
                    <Badge
                      key={tool}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      title={tool}
                    >
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Reusable Patterns (mock, selectable) */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Recommended Reusable Patterns</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {MOCK_PATTERNS.map((p) => {
                  const active = selectedPatterns.includes(p.id)
                  return (
                    <div
                      key={p.id}
                      onClick={() => togglePattern(p.id)}
                      className={[
                        "border rounded-lg p-3 cursor-pointer transition",
                        "hover:shadow-sm",
                        active ? "bg-accent text-accent-foreground border-accent" : "bg-background",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{p.title}</div>
                        <Badge variant="outline">{p.category}</Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                (Selection is local for now — we’ll store patterns with the project later.)
              </p>
            </div>

            <Separator />

            {/* Save */}
            <div className="space-y-2">
              <label className="font-medium" htmlFor="project-name">
                Project Name
              </label>
              <input
                id="project-name"
                className="border p-2 rounded w-full"
                placeholder="Enter a name for this project"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={!name.trim()}
                  className="cursor-pointer"
                >
                  Save Project
                </Button>
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => navigate("/apps")}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
