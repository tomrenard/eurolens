import { getLegislativeProcedures, getUpcomingPlenarySessions } from "@/lib/europarl";
import { Dashboard } from "@/components/dashboard";
import { HeroSection } from "@/components/hero-section";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [proceduresResult, sessionsResult] = await Promise.all([
    getLegislativeProcedures(),
    getUpcomingPlenarySessions(),
  ]);

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      <HeroSection />

      <Dashboard
        inProgressProcedures={proceduresResult.data.inProgress}
        completedProcedures={proceduresResult.data.completed}
        sessions={sessionsResult.data}
        proceduresError={proceduresResult.error}
        sessionsError={sessionsResult.error}
      />

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
          AI summaries are generated for educational purposes and should not be
          considered official interpretations.
        </p>
      </footer>
    </main>
  );
}
