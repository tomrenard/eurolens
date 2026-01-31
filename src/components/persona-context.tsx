"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Persona, Country } from "@/types/europarl";

export type SummaryLocale = "en" | "fr" | "de";

interface PersonaContextValue {
  persona: Persona;
  country: Country;
  summaryLocale: SummaryLocale;
  setPersona: (persona: Persona) => void;
  setCountry: (country: Country) => void;
  setSummaryLocale: (locale: SummaryLocale) => void;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersona] = useState<Persona>("general");
  const [country, setCountry] = useState<Country>("general");
  const [summaryLocale, setSummaryLocale] = useState<SummaryLocale>("en");

  return (
    <PersonaContext.Provider
      value={{
        persona,
        country,
        summaryLocale,
        setPersona,
        setCountry,
        setSummaryLocale,
      }}
    >
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona() {
  const context = useContext(PersonaContext);
  if (!context) {
    throw new Error("usePersona must be used within a PersonaProvider");
  }
  return context;
}
