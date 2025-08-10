import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnalysisResultProps {
  score: number;
  rationale: string;
}

export function AnalysisResult({ score, rationale }: AnalysisResultProps) {
  return (
    <Card className="mt-4 bg-card-foreground text-card">
      <CardHeader>
        <CardTitle>Analysis Result</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p>
          <span className="font-semibold">Score:</span>{" "}
          <span className="px-2 py-1 bg-accent text-accent-foreground rounded">
            {score}
          </span>
        </p>
        <p>
          <span className="font-semibold">Why:</span> {rationale}
        </p>
      </CardContent>
    </Card>
  );
}
