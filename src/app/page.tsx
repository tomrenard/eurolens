import { Suspense } from "react";
import Link from "next/link";
import { Sparkles, ChevronRight } from "lucide-react";
import { HeroSection } from "@/components/hero-section";
import { ContextSelector } from "@/components/context-selector";
import { UserProfile } from "@/components/user-profile";
import { SessionSection } from "@/components/sections/session-section";
import { InProgressData } from "@/components/sections/in-progress-data";
import { CompletedData } from "@/components/sections/completed-data";
import { SessionSectionSkeleton } from "@/components/sections/session-section-skeleton";
import { ProceduresSectionSkeleton } from "@/components/sections/procedures-section-skeleton";
import { parseLocale } from "@/lib/locale";

export const revalidate = 300;

interface HomeProps {
  searchParams: Promise<{ lang?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  // Content language lives in the URL rather than client state so that the
  // European Parliament's own translations can be selected during server
  // rendering — no translation service, and the result stays cacheable.
  const { lang } = await searchParams;
  const locale = parseLocale(lang);

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      <HeroSection />

      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="min-h-0">
            <Suspense fallback={<SessionSectionSkeleton />}>
              <SessionSection locale={locale} />
            </Suspense>
          </div>
          <div className="min-h-0 h-full flex flex-col gap-4">
            <div className="h-full min-h-0">
              <UserProfile />
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <Link
                href="/leaderboard"
                className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors py-2"
              >
                View your civic action history
                <ChevronRight className="h-3 w-3" />
              </Link>
              <Link
                href="/national"
                className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
              >
                National parliaments
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        <section aria-labelledby="context-heading">
          <h2
            id="context-heading"
            className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2"
          >
            <Sparkles className="h-5 w-5 text-primary" />
            Personalize Your View
          </h2>
          <ContextSelector />
        </section>

        <Suspense fallback={<ProceduresSectionSkeleton count={6} />}>
          <InProgressData locale={locale} />
        </Suspense>

        <Suspense
          fallback={<ProceduresSectionSkeleton count={3} showFilters={false} />}
        >
          <CompletedData locale={locale} />
        </Suspense>
      </div>

      <footer className="mt-16 pt-8 border-t text-center text-sm text-muted-foreground">
        <p>
          Data sourced from the{" "}
          <a
            href="https://data.europarl.europa.eu"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
          >
            European Parliament Open Data Portal
          </a>
        </p>
        <p className="mt-2">
          <Link
            href="/learn"
            className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
          >
            Learn
          </Link>
          {" · "}
          <Link
            href="/national"
            className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
          >
            National parliaments
          </Link>
          {" · "}
          <Link
            href="/meps"
            className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
          >
            Your MEPs
          </Link>
        </p>
        <p className="mt-2">
          Roll-call votes from{" "}
          <a
            href="https://howtheyvote.eu"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
          >
            HowTheyVote.eu
          </a>
          , licensed under the Open Database License.
        </p>
        <p className="mt-2">
          Explanations are generated from official records by a fixed glossary,
          not by a language model. They are an aid to reading the source
          documents, not an official interpretation.
        </p>
      </footer>
    </main>
  );
}
