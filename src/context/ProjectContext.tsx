import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase-client';
import type { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';
import type { ProjectCardProps } from '@/components/ProjectCard';

interface ProjectRow {
  id: string;
  name: string;
  score: number;
  created_at: string;
}

interface ProjectContextType {
  projects: ProjectCardProps[];
  addProject: (proj: Omit<ProjectCardProps, 'id' | 'createdAt'>) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ProjectCardProps[]>([]);

  useEffect(() => {
    supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }: PostgrestResponse<ProjectRow>) => {
        if (error) {
          console.error('Fetch error:', error.message);
          return;
        }
        if (data) {
          const mapped = data.map((row) => ({
            id: row.id,
            name: row.name,
            score: row.score,
            createdAt: row.created_at,
          }));
          setProjects(mapped);
        }
      });
  }, []);

  const addProject = async (proj: Omit<ProjectCardProps, 'id' | 'createdAt'>) => {
    const { data, error }: PostgrestSingleResponse<ProjectRow> = await supabase
      .from('projects')
      .insert({ name: proj.name, score: proj.score })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error.message);
      return;
    }
    if (data) {
      setProjects((prev) => [
        {
          id: data.id,
          name: data.name,
          score: data.score,
          createdAt: data.created_at,
        },
        ...prev,
      ]);
    }
  };

  return (
    <ProjectContext.Provider value={{ projects, addProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProjects must be used inside ProjectProvider');
  return ctx;
}
