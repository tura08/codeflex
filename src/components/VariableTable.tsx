'use client'

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

export function VariableTable({
  vars,
  onRemove,
}: {
  vars: Array<{ id: string; name: string; weight: number; score: number }>;
  onRemove: (id: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Weight</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vars.map((v) => (
          <TableRow key={v.id}>
            <TableCell>{v.name}</TableCell>
            <TableCell>{v.weight}</TableCell>
            <TableCell>{v.score}</TableCell>
            <TableCell>
              <Button variant="destructive" size="sm" onClick={() => onRemove(v.id)}>
                Remove
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}