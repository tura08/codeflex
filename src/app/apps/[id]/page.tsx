// File: src/app/apps/[id]/page.tsx
import { supabase } from '@/lib/supabase-client'
import { notFound } from 'next/navigation'
import { ReactNode } from 'react'

interface PageProps {
  params: { id: string }
}

export default async function AppDetailPage({ params: { id } }: PageProps) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, score, created_at')
    .eq('id', id)
    .single()

  if (error || !data) return notFound()

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">{data.name}</h1>
      <div className="space-y-4 p-4 border rounded">
        <div>
          <h2 className="text-lg font-semibold">Overview</h2>
          <p className="text-sm text-muted-foreground">
            Created on{' '}
            {new Date(data.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Difficulty Score</h2>
          <div className="flex items-center space-x-4">
            <span className="text-2xl font-bold">{data.score.toFixed(1)} / 5</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-width"
                style={{ width: `${(data.score / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>
        {/* future: render variables list or other details here */}
        <div>
          <h2 className="text-lg font-semibold">Next Steps</h2>
          <p className="text-sm text-muted-foreground">
            {/* placeholder text */}
            Define project variables and start iterating on your MVP.
          </p>
        </div>
      </div>
    </div>
  )
}
