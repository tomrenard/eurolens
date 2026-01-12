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

export default function Loading() {
  return (
    <main className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8 text-center md:text-left">
        <Skeleton className="h-10 w-48 mb-2 mx-auto md:mx-0" />
        <Skeleton className="h-6 w-96 max-w-full mx-auto md:mx-0" />
      </header>

      <div className="space-y-8">
        <Skeleton className="h-24 w-full rounded-lg" />

        <section>
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card rounded-lg border">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </section>

        <section>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-5 w-96 max-w-full mb-6" />
          <Skeleton className="h-10 w-full mb-4 rounded-md" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </section>

        <section>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-5 w-64 max-w-full mb-6" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
