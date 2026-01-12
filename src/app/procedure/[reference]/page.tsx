import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { ProcedureDetail } from "@/components/procedure-detail";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ProcedurePageProps {
  params: Promise<{
    reference: string;
  }>;
}

function ProcedureDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-1/4" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export default async function ProcedurePage({ params }: ProcedurePageProps) {
  const { reference } = await params;
  const decodedReference = decodeURIComponent(reference);

  if (!decodedReference) {
    notFound();
  }

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <Button variant="ghost" asChild className="gap-2 -ml-2 mb-4">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-blue-500/5 to-indigo-500/5 border border-primary/20 p-6 md:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-sm font-mono text-muted-foreground mb-1">{decodedReference}</p>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Procedure Details</h1>
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={<ProcedureDetailSkeleton />}>
        <ProcedureDetail reference={decodedReference} />
      </Suspense>
    </main>
  );
}

export async function generateMetadata({ params }: ProcedurePageProps) {
  const { reference } = await params;
  const decodedReference = decodeURIComponent(reference);

  return {
    title: `${decodedReference} | EuroLens`,
    description: `Details for European Parliament procedure ${decodedReference}`,
  };
}
