"use client";

import { TrendingUp } from "lucide-react";
import { ProceduresList } from "@/components/procedures-list";
import { usePersona } from "@/components/persona-context";
import type { LegislativeProcedure } from "@/types/europarl";

interface InProgressSectionProps {
  procedures: LegislativeProcedure[];
}

export function InProgressSection({ procedures }: InProgressSectionProps) {
  const { persona, country } = usePersona();

  return (
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
      <ProceduresList procedures={procedures} persona={persona} country={country} />
    </section>
  );
}
