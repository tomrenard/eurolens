"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function DossierSkeleton() {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-label="Loading AI summary"
      aria-busy="true"
    >
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}
