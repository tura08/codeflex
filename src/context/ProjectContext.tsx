'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import type { ProjectCardProps } from '@/components/ProjectCard'

interface ProjectContextType {
  projects: ProjectCardProps[]
  addProject: (proj: Omit<ProjectCardProps, 'id' | 'createdAt'>) => void
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ProjectCardProps[]>([])

  // load initial mock data
  useEffect(() => {
    fetch('/projects.json')
      .then((res) => res.json())
      .then((data: ProjectCardProps[]) => setProjects(data))
  }, [])

  const addProject = (proj: Omit<ProjectCardProps, 'id' | 'createdAt'>) => {
    const newProj: ProjectCardProps = {
      ...proj,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
    }
    // prepend for visibility
    setProjects((prev) => [newProj, ...prev])
  }

  return (
    <ProjectContext.Provider value={{ projects, addProject }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProjects() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProjects must be used inside ProjectProvider')
  return ctx
}
