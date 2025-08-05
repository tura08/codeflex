import { Button } from "@/components/ui/button"
import { CirclePlus } from "lucide-react"

export default function Home() {
  return (
    <div className="h-screen flex items-center justify-center">
      <Button size="lg"><CirclePlus />Click me</Button>
    </div>
  )
}