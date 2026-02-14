import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function SessionSectionSkeleton() {
  return (
    <Card className="h-full overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/5 via-blue-500/5 to-purple-500/5">
      <CardContent className="pt-6">
        <div className="text-center">
          <Skeleton className="h-8 w-48 mx-auto mb-4 rounded-full" />
          <Skeleton className="h-8 w-64 mx-auto mb-2" />
          <Skeleton className="h-5 w-48 mx-auto mb-6" />
          <div className="flex flex-wrap justify-center items-center gap-1 sm:gap-2 md:gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <Skeleton className="w-14 h-14 md:w-[4.5rem] md:h-[4.5rem] rounded-xl" />
                <Skeleton className="h-3 w-10 mt-2" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
