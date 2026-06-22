import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actionLabel,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-3">
        <Badge variant="outline">{eyebrow}</Badge>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
      </div>
      {actionLabel ? (
        <Button className="min-w-[180px] self-start lg:self-auto">{actionLabel}</Button>
      ) : null}
    </div>
  );
}
