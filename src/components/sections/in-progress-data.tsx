import { getInProgressProcedures } from "@/lib/europarl";
import { DEFAULT_LOCALE, type ContentLocale } from "@/lib/locale";
import { getStoredInProgressProcedures } from "@/lib/store";
import { InProgressSection } from "./in-progress-section";
import { Card, CardContent } from "@/components/ui/card";

export async function InProgressData({
  locale = DEFAULT_LOCALE,
}: {
  locale?: ContentLocale;
}) {
  // Prefer the mirror the ingest job fills; fall back to the live EP API when
  // it is unavailable, so the app works with no configuration at all.
  const stored = await getStoredInProgressProcedures({ locale });

  const { data: procedures, error } = stored
    ? { data: stored, error: null }
    : await getInProgressProcedures(locale);

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
                Could not load procedures
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <InProgressSection procedures={procedures} />;
}
