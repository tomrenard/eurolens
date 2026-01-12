"use client";

import { Trophy } from "lucide-react";
import { ProceduresList } from "@/components/procedures-list";
import { usePersona } from "@/components/persona-context";
import type { LegislativeProcedure } from "@/types/europarl";

interface CompletedSectionProps {
  procedures: LegislativeProcedure[];
}

export function CompletedSection({ procedures }: CompletedSectionProps) {
  const { persona, country } = usePersona();

  return (
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
        procedures={procedures}
        persona={persona}
        country={country}
        showFilters={false}
      />
    </section>
  );
}
