'use client'

import { useState } from 'react'
import { VariableForm } from '@/components/VariableForm'
import { VariableTable } from '@/components/VariableTable'

export default function HomePage() {
  const [vars, setVars] = useState<any[]>([])
  return (
    <main className="space-y-8">
      <VariableForm onAdd={(v) => setVars((a) => [...a, v])} />
      <VariableTable vars={vars} onRemove={(id) => setVars((a) => a.filter((v) => v.id !== id))} />
    </main>
  )
}