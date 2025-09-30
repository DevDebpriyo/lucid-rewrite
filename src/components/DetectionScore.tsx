import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

interface DetectionScoreProps {
  score: number;
  analyzing?: boolean;
}

export const DetectionScore = ({ score, analyzing = false }: DetectionScoreProps) => {
  const getScoreColor = (score: number) => {
    if (score < 30) return "text-success";
    if (score < 70) return "text-warning";
    return "text-destructive";
  };

  const getScoreIcon = (score: number) => {
    if (score < 30) return <CheckCircle className="h-5 w-5 text-success" />;
    if (score < 70) return <AlertTriangle className="h-5 w-5 text-warning" />;
    return <AlertCircle className="h-5 w-5 text-destructive" />;
  };

  const getScoreLabel = (score: number) => {
    if (score < 30) return "Likely Human";
    if (score < 70) return "Mixed Content";
    return "Likely AI";
  };

  const getProgressColor = (score: number) => {
    if (score < 30) return "bg-success";
    if (score < 70) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <Card className="shadow-medium">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          AI Detection Score
          {!analyzing && getScoreIcon(score)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <span className={`text-5xl font-bold ${getScoreColor(score)}`}>
            {analyzing ? "--" : score}
          </span>
          <span className="text-muted-foreground mb-2">/ 100</span>
        </div>

        <div className="space-y-2">
          <Progress
            value={analyzing ? 0 : score}
            className="h-3"
            indicatorClassName={getProgressColor(score)}
          />
          <p className="text-sm font-medium text-muted-foreground">
            {analyzing ? "Analyzing content..." : getScoreLabel(score)}
          </p>
        </div>

        <div className="pt-2 space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>0-30</span>
            <span className="text-success">Human Content</span>
          </div>
          <div className="flex justify-between">
            <span>30-70</span>
            <span className="text-warning">Mixed Content</span>
          </div>
          <div className="flex justify-between">
            <span>70-100</span>
            <span className="text-destructive">AI Generated</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
