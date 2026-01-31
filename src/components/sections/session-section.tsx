import { getUpcomingPlenarySessions } from "@/lib/europarl";
import { CountdownTimer } from "@/components/countdown-timer";
import { Card, CardContent } from "@/components/ui/card";

export async function SessionSection() {
  const { data: sessions, error } = await getUpcomingPlenarySessions();

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 text-destructive shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h3 className="font-semibold text-destructive">
                Could not load plenary sessions
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const nextSession = sessions[0];

  if (!nextSession) {
    return null;
  }

  return (
    <section className="h-full" aria-labelledby="countdown-heading">
      <h2 id="countdown-heading" className="sr-only">
        Next Plenary Session
      </h2>
      <CountdownTimer session={nextSession} />
    </section>
  );
}
