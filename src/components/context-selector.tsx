"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePersona } from "@/components/persona-context";
import {
  CONTENT_LOCALES,
  LOCALE_LABELS,
  parseLocale,
  type ContentLocale,
} from "@/lib/locale";
import type { Persona, Country } from "@/types/europarl";
import { PERSONA_LABELS, COUNTRY_LABELS } from "@/types/europarl";

export function ContextSelector() {
  const { persona, country, setPersona, setCountry } = usePersona();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const locale = parseLocale(searchParams.get("lang"));

  /**
   * Language is a server concern: it selects which of the European
   * Parliament's own translations we read, so it travels in the URL and
   * triggers a server re-render rather than living in client state.
   */
  const handleLocaleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "en") params.delete("lang");
    else params.set("lang", value);

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

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
          Document language
        </label>
        <Select value={locale} onValueChange={handleLocaleChange}>
          <SelectTrigger
            id="locale-select"
            className="w-full"
            aria-busy={isPending}
          >
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            {CONTENT_LOCALES.map((key: ContentLocale) => (
              <SelectItem key={key} value={key}>
                {LOCALE_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end">
        <p className="text-sm text-muted-foreground">
          {persona === "general"
            ? "Pick a role to surface the files that affect you first."
            : `Showing ${PERSONA_LABELS[
                persona
              ].toLowerCase()} matches first. Titles and summaries come from the Parliament in ${
                LOCALE_LABELS[locale]
              }.`}
        </p>
      </div>
    </div>
  );
}
