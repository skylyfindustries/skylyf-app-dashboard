import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { CountUp } from "@/components/ui/count-up";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  /** @deprecated stat cards no longer colour their icon; kept so existing callers compile */
  iconColor?: string;
  /** stagger index for the entrance animation */
  delay?: number;
}

// A label, one figure, and what it compares to. Enters with a stagger; the figure counts up.
export function StatCard({ title, value, change, changeType = "neutral", icon: Icon, delay = 0 }: StatCardProps) {
  return (
    <div
      className="group bg-card rounded-xl border border-border card-shadow p-5 animate-fade-in transition-all duration-300 hover:-translate-y-0.5 hover:card-shadow-hover hover:border-primary/30"
      style={{ animationDelay: `${delay * 70}ms` }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{title}</p>
        {Icon && (
          <Icon
            strokeWidth={1.5}
            className="w-4 h-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
          />
        )}
      </div>
      <p className="mt-3 text-[28px] leading-none font-medium text-foreground tabular-nums">
        <CountUp value={value} />
      </p>
      {change && (
        <p
          className={cn(
            "mt-2 text-xs",
            changeType === "positive" && "text-success",
            changeType === "negative" && "text-destructive",
            changeType === "neutral" && "text-muted-foreground",
          )}
        >
          {change}
        </p>
      )}
    </div>
  );
}
