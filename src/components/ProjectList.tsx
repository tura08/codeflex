// src/components/ProjectList.tsx

import { ProjectCard, type ProjectCardProps } from './ProjectCard'

export interface ProjectListProps {
  projects: ProjectCardProps[]
}

export function ProjectList({ projects }: ProjectListProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((p) => (
        <ProjectCard key={p.id} {...p} />
      ))}
    </div>
  )
}
