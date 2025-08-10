'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'

export function VariableForm({ onAdd }: { onAdd: (v: any) => void }) {
  const [name, setName] = useState('')
  const [weight, setWeight] = useState(1)
  const [score, setScore] = useState(3)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onAdd({ name, weight, score, id: Date.now().toString() })
        setName('')
        setWeight(1)
        setScore(3)
      }}
      className="space-y-4 p-4 border rounded"
    >
      <div>
        <Label htmlFor="name">Variable Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. UI Complexity"
        />
      </div>

      <div>
        <Label htmlFor="weight">Weight (1–5)</Label>
        <Slider
          id="weight"
          min={1}
          max={5}
          step={1}
          value={[weight]}
          onValueChange={(val) => setWeight(val[0])}
        />
      </div>

      <div>
        <Label htmlFor="score">Score (1–5)</Label>
        <Select onValueChange={(val) => setScore(Number(val))}>
          <SelectTrigger id="score" className="w-full">
            <SelectValue placeholder={score.toString()} />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5].map((n) => (
              <SelectItem key={n} value={n.toString()}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit">Add Variable</Button>
    </form>
  )
}
