"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const formInputClassName =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
export const compactInputClassName =
  "h-8 w-full rounded-md border border-input bg-background px-2 text-xs";

export function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}
