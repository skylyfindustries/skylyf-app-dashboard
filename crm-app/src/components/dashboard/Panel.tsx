import { cn } from "@/lib/utils";

// The one card shape used across dashboards: hairline border, 20px padding, title row.
export function Panel({
  delay = 0,
  title,
  subtitle,
  action,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn("bg-card rounded-xl border border-border card-shadow p-5 flex flex-col animate-fade-in transition-shadow duration-300 hover:card-shadow-hover", className)}
      style={{ animationDelay: `${delay * 70}ms` }}
    >
      <header className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="flex-1 min-h-[160px] flex items-center justify-center text-sm text-muted-foreground">{text}</div>;
}
