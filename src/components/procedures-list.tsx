"use client";

import { DossierCard } from "@/components/dossier-card";
import type { LegislativeProcedure, Persona, Country } from "@/types/europarl";

interface ProceduresListProps {
  procedures: LegislativeProcedure[];
  persona: Persona;
  country: Country;
}

export function ProceduresList({
  procedures,
  persona,
  country,
}: ProceduresListProps) {
  if (procedures.length === 0) {
    return (
      <p className="text-muted-foreground">No legislative procedures found.</p>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {procedures.slice(0, 6).map((procedure) => (
        <DossierCard
          key={procedure.id}
          procedure={procedure}
          persona={persona}
          country={country}
        />
      ))}
    </div>
  );
}
