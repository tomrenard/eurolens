import { getLegislativeProcedures, getUpcomingPlenarySessions } from "@/lib/europarl";
import { Dashboard } from "@/components/dashboard";

export default async function Home() {
  const [proceduresResult, sessionsResult] = await Promise.all([
    getLegislativeProcedures(),
    getUpcomingPlenarySessions(),
  ]);

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8 text-center md:text-left">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">
          EuroLens
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Brussels, Briefed. Understand the laws shaping Europe before they pass.
        </p>
      </header>

      <Dashboard
        procedures={proceduresResult.data}
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
