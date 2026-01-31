"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePersona, type SummaryLocale } from "@/components/persona-context";
import type { Persona, Country } from "@/types/europarl";
import { PERSONA_LABELS, COUNTRY_LABELS } from "@/types/europarl";

const LOCALE_LABELS: Record<SummaryLocale, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
};

export function ContextSelector() {
  const {
    persona,
    country,
    summaryLocale,
    setPersona,
    setCountry,
    setSummaryLocale,
  } = usePersona();

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
          onValueChange={(value) => setPersona(value as Persona)}
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
          onValueChange={(value) => setCountry(value as Country)}
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
      <div className="flex-1">
        <label
          htmlFor="locale-select"
          className="block text-sm font-medium text-muted-foreground mb-2"
        >
          Summary language
        </label>
        <Select
          value={summaryLocale}
          onValueChange={(value) => setSummaryLocale(value as SummaryLocale)}
        >
          <SelectTrigger id="locale-select" className="w-full">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(LOCALE_LABELS) as SummaryLocale[]).map((key) => (
              <SelectItem key={key} value={key}>
                {LOCALE_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {(persona !== "general" ||
        country !== "general" ||
        summaryLocale !== "en") && (
        <div className="flex items-end">
          <p className="text-sm text-muted-foreground italic">
            AI summaries will be tailored to your context
          </p>
        </div>
      )}
    </div>
  );
}
