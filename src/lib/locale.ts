/**
 * Content locales.
 *
 * The European Parliament publishes procedure titles and summaries as
 * language-keyed maps, so switching language is a matter of reading a
 * different key — no translation service and no model involved. These are the
 * languages we surface in the UI; the upstream payload carries more.
 */
export const CONTENT_LOCALES = [
  "en",
  "fr",
  "de",
  "es",
  "it",
  "pl",
  "nl",
] as const;

export type ContentLocale = (typeof CONTENT_LOCALES)[number];

export const DEFAULT_LOCALE: ContentLocale = "en";

export const LOCALE_LABELS: Record<ContentLocale, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  it: "Italiano",
  pl: "Polski",
  nl: "Nederlands",
};

/** Narrows an untrusted value (a query string, a cookie) to a supported locale. */
export function parseLocale(value: unknown): ContentLocale {
  return CONTENT_LOCALES.includes(value as ContentLocale)
    ? (value as ContentLocale)
    : DEFAULT_LOCALE;
}
