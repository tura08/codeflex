import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Link } from 'react-router-dom'

export interface ProjectCardProps {
  id: string
  name: string
  createdAt: string
  score: number
}

export function ProjectCard({ id, name, createdAt, score }: ProjectCardProps) {
  const percent = Math.round((score / 5) * 100)

  return (
    <Link to={`/apps/${id}`}>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>{name}</CardTitle>
          <CardDescription>Score: {score.toFixed(1)}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 mb-2">
            Created: {new Date(createdAt).toLocaleDateString()}
          </p>
          <Progress value={percent} className="h-2 rounded-full" />
          <p className="text-xs mt-1">{percent}% difficulty</p>
        </CardContent>
      </Card>
    </Link>
  )
}
