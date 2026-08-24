import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { ProcedureDetail } from "@/components/procedure-detail";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getProcedureByReference,
  isPlausibleReference,
  safeDecodeReference,
} from "@/lib/procedure";
import { explain } from "@/lib/explainer";
import { siteUrl } from "@/lib/site";
import { serializeJsonLd } from "@/lib/json-ld";
import { parseLocale } from "@/lib/locale";

interface ProcedurePageProps {
  params: Promise<{
    reference: string;
  }>;
  searchParams: Promise<{ lang?: string }>;
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

export default async function ProcedurePage({
  params,
  searchParams,
}: ProcedurePageProps) {
  const [{ reference }, { lang }] = await Promise.all([params, searchParams]);
  const locale = parseLocale(lang);
  const decodedReference = safeDecodeReference(reference);

  // Reject anything that is not reference-shaped before it reaches the
  // upstream API or the page's own metadata. A reference we have no record of
  // still renders — only malformed input is turned away.
  if (!decodedReference || !isPlausibleReference(decodedReference)) {
    notFound();
  }

  const procedure = await getProcedureByReference(decodedReference, locale);

  // schema.org/Legislation gives search engines and civic-data aggregators a
  // machine-readable handle on the file, which plain prose cannot provide.
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Legislation",
    name: procedure.title,
    legislationIdentifier: procedure.reference,
    legislationType: procedure.type,
    legislationJurisdiction: "European Union",
    url: `${siteUrl()}/procedure/${encodeURIComponent(procedure.reference)}`,
    ...(procedure.summary ? { abstract: procedure.summary } : {}),
    ...(procedure.lastActivity ? { dateModified: procedure.lastActivity.date } : {}),
    ...(procedure.sourceUrl ? { sameAs: procedure.sourceUrl } : {}),
  };

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      <script
        type="application/ld+json"
        // Escaped rather than plain JSON.stringify: the title can contain
        // attacker-controlled text on the not-found path. See lib/json-ld.ts.
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />

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
              <p className="text-sm font-mono text-muted-foreground mb-1">
                {decodedReference}
              </p>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                Procedure Details
              </h1>
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={<ProcedureDetailSkeleton />}>
        <ProcedureDetail reference={decodedReference} locale={locale} />
      </Suspense>
    </main>
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: ProcedurePageProps): Promise<Metadata> {
  const [{ reference }, { lang }] = await Promise.all([params, searchParams]);
  const locale = parseLocale(lang);
  const decodedReference = safeDecodeReference(reference);

  if (!decodedReference || !isPlausibleReference(decodedReference)) {
    return { title: "Procedure not found | EuroLens" };
  }

  const procedure = await getProcedureByReference(decodedReference, locale);
  const explanation = explain({
    id: procedure.reference,
    reference: procedure.reference,
    title: procedure.title,
    type: procedure.type,
    status: procedure.status,
    subjects: [],
    summary: procedure.summary,
  });

  const title = procedure.isFallback
    ? `${decodedReference} | EuroLens`
    : `${procedure.title} (${decodedReference}) | EuroLens`;

  // Lead the description with the plain-English reading rather than the
  // reference: this is the snippet a search result or a shared link shows.
  const description = [explanation.what, explanation.stage]
    .join(" ")
    .slice(0, 300);

  const url = `${siteUrl()}/procedure/${encodeURIComponent(decodedReference)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      siteName: "EuroLens",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
