"use client";

import { useState } from "react";
import { ProceduresList } from "@/components/procedures-list";
import { ContextSelector } from "@/components/context-selector";
import { CountdownTimer } from "@/components/countdown-timer";
import { Card, CardContent } from "@/components/ui/card";
import type {
  LegislativeProcedure,
  PlenarySession,
  Persona,
  Country,
} from "@/types/europarl";

interface DashboardProps {
  procedures: LegislativeProcedure[];
  sessions: PlenarySession[];
  proceduresError: string | null;
  sessionsError: string | null;
}

function ErrorAlert({ title, message }: { title: string; message: string }) {
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
            <h3 className="font-semibold text-destructive">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard({
  procedures,
  sessions,
  proceduresError,
  sessionsError,
}: DashboardProps) {
  const [persona, setPersona] = useState<Persona>("general");
  const [country, setCountry] = useState<Country>("general");

  const nextSession = sessions[0];

  return (
    <div className="space-y-8">
      {sessionsError && (
        <ErrorAlert
          title="Could not load plenary sessions"
          message={sessionsError}
        />
      )}

      {nextSession && (
        <section aria-labelledby="countdown-heading">
          <h2 id="countdown-heading" className="sr-only">
            Next Plenary Session
          </h2>
          <CountdownTimer session={nextSession} />
        </section>
      )}

      <section aria-labelledby="context-heading">
        <h2
          id="context-heading"
          className="text-xl font-semibold mb-4 text-foreground"
        >
          Personalize Your View
        </h2>
        <ContextSelector
          persona={persona}
          country={country}
          onPersonaChange={setPersona}
          onCountryChange={setCountry}
        />
      </section>

      <section aria-labelledby="procedures-heading">
        <h2
          id="procedures-heading"
          className="text-2xl font-semibold mb-4 text-foreground"
        >
          Legislative Procedures
        </h2>
        <p className="text-muted-foreground mb-6">
          Click &quot;Generate AI Summary&quot; on any card to get a plain-language explanation.
        </p>

        {proceduresError ? (
          <ErrorAlert
            title="Could not load legislative procedures"
            message={proceduresError}
          />
        ) : (
          <ProceduresList
            procedures={procedures}
            persona={persona}
            country={country}
          />
        )}
      </section>
    </div>
  );
}
