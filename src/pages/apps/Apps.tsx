import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useProjects } from "@/context/ProjectContext"
import { ProjectList } from "@/components/ProjectList"
import type { ProjectCardProps } from "@/components/ProjectCard"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Plus, ArrowRight, Filter } from "lucide-react"

export default function Apps() {
  const { projects } = useProjects()

  // original stats (unfiltered)
  const total = projects.length
  const completed = projects.filter((p) => p.score >= 3).length
  const ongoing = total - completed

  // UI state (client-side only)
  const [q, setQ] = useState("")
  const [sort, setSort] = useState<"recent" | "name" | "score">("recent")

  const visible: ProjectCardProps[] = useMemo(() => {
    const base = (projects as ProjectCardProps[]).filter((p) =>
      p.name.toLowerCase().includes(q.toLowerCase())
    )
    switch (sort) {
      case "name":
        return [...base].sort((a, b) => a.name.localeCompare(b.name))
      case "score":
        return [...base].sort((a, b) => b.score - a.score)
      default: // recent (createdAt desc)
        return [...base].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
    }
  }, [projects, q, sort])

  return (
    <div className="space-y-6">
      {/* page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">All Apps</h1>
          <p className="text-sm text-muted-foreground">
            Browse, launch, and iterate on your apps.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/analyse">
              Analyse idea
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild>
            <Link to="/apps/new">
              <Plus className="mr-2 h-4 w-4" />
              New App
            </Link>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Total Apps</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{total}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Ongoing</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{ongoing}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Completed (≥3)</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{completed}</CardContent>
        </Card>
      </div>

      {/* toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search apps…"
                className="w-[260px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by</span>
              <Select value={sort} onValueChange={(v) => setSort(v as any)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most recent</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="score">Score</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* list */}
      {visible.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No apps match your filters. Try clearing the search or{" "}
            <Button asChild variant="link" className="px-1">
              <Link to="/apps/new">create a new app</Link>
            </Button>
            .
          </CardContent>
        </Card>
      ) : (
        <ProjectList projects={visible} />
      )}

      <Separator />
      <p className="text-xs text-muted-foreground">
        Tip: later you can expose apps to collaborators via per-app API keys or
        OAuth to services like Google Drive, GitHub, Firebase, or Supabase.
        Configure those under <Link to="/settings" className="underline">Settings</Link>.
      </p>
    </div>
  )
}
