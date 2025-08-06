'use client'

import { useProjects } from '@/context/ProjectContext'
import { ProjectList } from '@/components/ProjectList'
import type { ProjectCardProps } from '@/components/ProjectCard'

export default function ProjectsPage() {
  const { projects } = useProjects()

  // Mock stats: count, completed vs ongoing
  const total = projects.length
  const completed = projects.filter(p => p.score >= 3).length
  const ongoing = total - completed

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">All Apps</h1>
      <div className="flex space-x-8">
        <div className="p-4 bg-[var(--card)] rounded shadow">
          <p className="text-sm">Total Apps</p>
          <p className="text-xl font-semibold">{total}</p>
        </div>
        <div className="p-4 bg-[var(--card)] rounded shadow">
          <p className="text-sm">Completed (score ≥ 3)</p>
          <p className="text-xl font-semibold">{completed}</p>
        </div>
        <div className="p-4 bg-[var(--card)] rounded shadow">
          <p className="text-sm">Ongoing</p>
          <p className="text-xl font-semibold">{ongoing}</p>
        </div>
      </div>
      <ProjectList projects={projects as ProjectCardProps[]} />
    </div>
  )
}
