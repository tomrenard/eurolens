"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Persona, Country } from "@/types/europarl";
import { PERSONA_LABELS, COUNTRY_LABELS } from "@/types/europarl";

interface ContextSelectorProps {
  persona: Persona;
  country: Country;
  onPersonaChange: (persona: Persona) => void;
  onCountryChange: (country: Country) => void;
}

export function ContextSelector({
  persona,
  country,
  onPersonaChange,
  onCountryChange,
}: ContextSelectorProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card rounded-lg border">
      <div className="flex-1">
        <label
          htmlFor="persona-select"
          className="block text-sm font-medium text-muted-foreground mb-2"
        >
          I am a...
        </label>
        <Select
          value={persona}
          onValueChange={(value) => onPersonaChange(value as Persona)}
        >
          <SelectTrigger id="persona-select" className="w-full">
            <SelectValue placeholder="Select your role" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PERSONA_LABELS) as Persona[]).map((key) => (
              <SelectItem key={key} value={key}>
                {PERSONA_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1">
        <label
          htmlFor="country-select"
          className="block text-sm font-medium text-muted-foreground mb-2"
        >
          Living in...
        </label>
        <Select
          value={country}
          onValueChange={(value) => onCountryChange(value as Country)}
        >
          <SelectTrigger id="country-select" className="w-full">
            <SelectValue placeholder="Select your country" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(COUNTRY_LABELS) as Country[]).map((key) => (
              <SelectItem key={key} value={key}>
                {COUNTRY_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {(persona !== "general" || country !== "general") && (
        <div className="flex items-end">
          <p className="text-sm text-muted-foreground italic">
            AI summaries will be tailored to your context
          </p>
        </div>
      )}
    </div>
  );
}
