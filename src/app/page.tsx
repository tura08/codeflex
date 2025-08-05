'use client'

import { ProjectList } from '@/components/ProjectList'
import type { ProjectCardProps } from '@/components/ProjectCard'
import { useProjects } from '@/context/ProjectContext'

export default function DashboardPage() {
  const { projects } = useProjects()

  return (
    <div>
      {projects.length === 0 ? (
        <p>No projects yet. Click “New Project” to get started.</p>
      ) : (
        <ProjectList projects={projects} />
      )}
    </div>
  )
}
