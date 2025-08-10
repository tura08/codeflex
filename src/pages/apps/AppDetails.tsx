// src/pages/ProjectDetailPage.tsx
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Project {
  id: string;
  name: string;
  score: number;
  created_at: string;
}

interface Pattern {
  id: string;
  title: string;
  description: string;
  tags: string[];
}

export default function AppDetails() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);

  // Mock patterns for now
  const patterns: Pattern[] = [
    {
      id: "1",
      title: "Auth + User Profiles",
      description:
        "Pre-built authentication with Supabase and profile management using RLS policies.",
      tags: ["Supabase", "Auth", "Database"],
    },
    {
      id: "2",
      title: "Realtime Chat",
      description:
        "WebSocket-powered chat component with message history and typing indicators.",
      tags: ["WebSockets", "UI", "Messaging"],
    },
    {
      id: "3",
      title: "AI Content Generator",
      description:
        "Integrates with OpenAI API to generate content templates based on user input.",
      tags: ["AI", "OpenAI", "Automation"],
    },
  ];

  useEffect(() => {
    if (!id) return;
    supabase
      .from("projects")
      .select("id, name, score, created_at")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) console.error("Error loading project:", error.message);
        else setProject(data);
      });
  }, [id]);

  if (!project) return <p>Loading...</p>;

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div>
        <h1 className="text-3xl font-bold">{project.name}</h1>
        <p className="text-sm text-muted-foreground">
          Created on{" "}
          {new Date(project.created_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Score */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Difficulty Score</h2>
        <div className="flex items-center space-x-4">
          <span className="text-2xl font-bold">
            {project.score.toFixed(1)} / 5
          </span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{ width: `${(project.score / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Next Steps</h2>
        <p className="text-sm text-muted-foreground">
          Define project variables and start iterating on your MVP.
        </p>
      </div>

      {/* Reusable Patterns */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Reusable Patterns</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {patterns.map((pattern) => (
            <Card
              key={pattern.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardHeader>
                <CardTitle>{pattern.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {pattern.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {pattern.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
