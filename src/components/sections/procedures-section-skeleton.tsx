import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="border-t pt-4">
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex items-center justify-between pt-3 border-t">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

interface ProceduresSectionSkeletonProps {
  count?: number;
  showFilters?: boolean;
}

export function ProceduresSectionSkeleton({
  count = 6,
  showFilters = true,
}: ProceduresSectionSkeletonProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {showFilters && (
        <div className="space-y-4">
          <Skeleton className="h-12 sm:h-10 w-full rounded-lg sm:rounded-md" />
          <div className="flex flex-col sm:flex-row gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
