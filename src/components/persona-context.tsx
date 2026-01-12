"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Persona, Country } from "@/types/europarl";

interface PersonaContextValue {
  persona: Persona;
  country: Country;
  setPersona: (persona: Persona) => void;
  setCountry: (country: Country) => void;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersona] = useState<Persona>("general");
  const [country, setCountry] = useState<Country>("general");

  return (
    <PersonaContext.Provider value={{ persona, country, setPersona, setCountry }}>
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
