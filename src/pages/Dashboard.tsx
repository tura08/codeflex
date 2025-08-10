import { Link } from "react-router-dom"
import { useMemo } from "react"
import { useProjects } from "@/context/ProjectContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { ArrowRight, Plus, LineChart, Box, Database, Rocket } from "lucide-react"

type Item = { id: string; name: string; score: number; createdAt: string }

// Fallback demo data if Supabase is empty (or while it loads)
const SAMPLE: Item[] = [
  { id: "s1", name: "Inventory Tracker MVP", score: 2.1, createdAt: new Date().toISOString() },
  { id: "s2", name: "Marketing Microsite",   score: 1.4, createdAt: new Date(Date.now()-864e5*3).toISOString() },
  { id: "s3", name: "Quote Generator",       score: 2.9, createdAt: new Date(Date.now()-864e5*8).toISOString() },
]

// quick helpers
const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })

export default function Dashboard() {
  const { projects } = useProjects()

  // normalize to the shape we need here
  const data: Item[] = (projects?.length ? projects : SAMPLE).map(p => ({
    id: (p as any).id,
    name: (p as any).name,
    score: Number((p as any).score ?? 0),
    createdAt: (p as any).createdAt ?? new Date().toISOString(),
  }))

  // define your own notion of "completed" vs "ongoing"
  // (you used ≥3 as completed elsewhere; keeping that)
  const { total, completed, ongoing, ongoingList } = useMemo(() => {
    const total = data.length
    const completed = data.filter(p => p.score >= 3).length
    const ongoingList = data.filter(p => p.score < 3).sort((a, b) => b.score - a.score)
    const ongoing = ongoingList.length
    return { total, completed, ongoing, ongoingList }
  }, [data])

  const patterns = [
    {
      title: "Auth + Roles",
      blurb: "Supabase Auth with RLS, session context, route guards.",
      icon: <ShieldDotIcon />,
      link: "/docs/patterns/auth", // change later
      tags: ["supabase", "rls", "router"],
    },
    {
      title: "Form + Zod + React Hook Form",
      blurb: "Shadcn forms with RHF + zod validation & server-safe submission.",
      icon: <Box className="h-4 w-4" />,
      link: "/docs/patterns/forms",
      tags: ["shadcn", "zod", "rhf"],
    },
    {
      title: "Table + Filters",
      blurb: "Data table with column filters, pagination, and CSV export.",
      icon: <LineChart className="h-4 w-4" />,
      link: "/docs/patterns/table",
      tags: ["table", "filters", "export"],
    },
    {
      title: "Supabase CRUD",
      blurb: "Typed CRUD hooks, optimistic UI, error toasts.",
      icon: <Database className="h-4 w-4" />,
      link: "/docs/patterns/crud",
      tags: ["supabase", "hooks"],
    },
  ]

  return (
    <div className="space-y-6">
      {/* page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Track ongoing apps, spot patterns, and reuse what works.
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
          <CardHeader><CardTitle>Total Projects</CardTitle></CardHeader>
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ongoing Projects */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ongoing Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {ongoingList.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nothing ongoing. Nice! ✨</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[160px]">Score</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="w-[130px]">Created</TableHead>
                    <TableHead className="w-[100px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ongoingList.map((p) => {
                    const pct = Math.min(100, Math.round((p.score / 5) * 100))
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.score.toFixed(1)} / 5</TableCell>
                        <TableCell>
                          <Progress value={pct} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{fmt(p.createdAt)}</TableCell>
                        <TableCell>
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/apps/${p.id}`}>Open</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Reusable Patterns */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Reusable Patterns</CardTitle>
            <Rocket className="h-4 w-4" />
          </CardHeader>
          <CardContent className="space-y-4">
            {patterns.map((pt) => (
              <div key={pt.title} className="rounded-xl border p-3">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground">
                    {pt.icon}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{pt.title}</div>
                      <Button asChild size="sm" variant="ghost">
                        <Link to={pt.link}>
                          View
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{pt.blurb}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {pt.tags.map(t => (
                        <span
                          key={t}
                          className="rounded-full px-2 py-0.5 text-xs bg-muted text-foreground/80"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <Separator />
            <div className="text-xs text-muted-foreground">
              Tip: as you standardize flows, add them here and link to code/notes.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/** tiny icon for "Auth + Roles" pattern without importing another package */
function ShieldDotIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l7 3v6c0 5-3.4 9.7-7 11-3.6-1.3-7-6-7-11V5l7-3z"></path>
      <circle cx="12" cy="11" r="2" className="opacity-90"></circle>
    </svg>
  )
}
