"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, TrendingUp, Trophy, ChevronRight } from "lucide-react";
import { ProceduresList } from "@/components/procedures-list";
import { ContextSelector } from "@/components/context-selector";
import { CountdownTimer } from "@/components/countdown-timer";
import { UserProfile } from "@/components/user-profile";
import { Card, CardContent } from "@/components/ui/card";
import type {
  LegislativeProcedure,
  PlenarySession,
  Persona,
  Country,
} from "@/types/europarl";

interface DashboardProps {
  inProgressProcedures: LegislativeProcedure[];
  completedProcedures: LegislativeProcedure[];
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
  inProgressProcedures,
  completedProcedures,
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {nextSession && (
            <section aria-labelledby="countdown-heading">
              <h2 id="countdown-heading" className="sr-only">
                Next Plenary Session
              </h2>
              <CountdownTimer session={nextSession} />
            </section>
          )}
        </div>
        <div className="lg:col-span-1 space-y-2">
          <UserProfile />
          <Link
            href="/leaderboard"
            className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors py-2"
          >
            View your civic action history
            <ChevronRight className="h-3 w-3" />
          </Link>
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
        <ContextSelector
          persona={persona}
          country={country}
          onPersonaChange={setPersona}
          onCountryChange={setCountry}
        />
      </section>

      {proceduresError ? (
        <ErrorAlert
          title="Could not load legislative procedures"
          message={proceduresError}
        />
      ) : (
        <>
          <section id="procedures" aria-labelledby="in-progress-heading">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <TrendingUp className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h2
                  id="in-progress-heading"
                  className="text-2xl font-bold text-foreground"
                >
                  In Progress
                </h2>
                <p className="text-muted-foreground text-sm">
                  Take action and make your voice heard
                </p>
              </div>
            </div>
            <ProceduresList
              procedures={inProgressProcedures}
              persona={persona}
              country={country}
            />
          </section>

          <section aria-labelledby="completed-heading">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Trophy className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h2
                  id="completed-heading"
                  className="text-2xl font-bold text-foreground"
                >
                  Recently Voted
                </h2>
                <p className="text-muted-foreground text-sm">
                  See how the Parliament voted
                </p>
              </div>
            </div>
            <ProceduresList
              procedures={completedProcedures}
              persona={persona}
              country={country}
              showFilters={false}
            />
          </section>
        </>
      )}
    </div>
  );
}
