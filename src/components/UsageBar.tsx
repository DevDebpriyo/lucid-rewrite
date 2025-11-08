import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export function UsageBar({
  used,
  limit,
  plan,
  resetsAt,
}: {
  used: number;
  limit: number;
  plan: string;
  resetsAt?: string;
}) {
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const remaining = Math.max(0, limit - used);
  const nearCap = pct >= 80;
  const overCap = used >= limit;
  const resetText = resetsAt ? new Date(resetsAt).toLocaleDateString() : undefined;

  return (
    <Card className="border-muted/60">
      <CardContent className="py-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">
              {plan?.toUpperCase() || "FREE"} usage
              {/* {resetText ? <span> • resets {resetText}</span> : null} */}
            </div>
            <div className="font-medium tabular-nums">
              {Intl.NumberFormat().format(used)} / {Intl.NumberFormat().format(limit)} chars
            </div>
          </div>
          <Progress value={pct} className={nearCap ? "bg-muted" : undefined} />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {overCap
                ? "Limit reached."
                : `${Intl.NumberFormat().format(remaining)} characters remaining`}
            </span>
            <Button asChild size="sm" variant={overCap ? "default" : "outline"}>
              <a href="/pricing">{overCap ? "Upgrade to continue" : "Upgrade"}</a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
