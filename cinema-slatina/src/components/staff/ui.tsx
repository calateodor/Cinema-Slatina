import Link from "next/link";
import type { ComponentType } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export function PageTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold sm:text-2xl">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  href,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const body = (
    <CardContent className="flex flex-col gap-0.5">
      <Icon className="mb-2 size-4 text-primary" aria-hidden="true" />
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {hint ? <p className="mt-1 text-xs text-warning">{hint}</p> : null}
    </CardContent>
  );

  return (
    <Card
      className={cn(
        "transition-shadow motion-reduce:transition-none",
        href && "hover:ring-primary/50",
      )}
    >
      {href ? (
        <Link href={href} className="block">
          {body}
        </Link>
      ) : (
        body
      )}
    </Card>
  );
}

export function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <Empty className="border bg-card/50">
      <EmptyHeader>
        <EmptyDescription>{children}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
