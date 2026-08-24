/**
 * Serialises a value for embedding in a `<script type="application/ld+json">`
 * block.
 *
 * `JSON.stringify` does not escape `<`, so any string containing the literal
 * text `</script>` terminates the block early and everything after it is
 * parsed as HTML. Procedure titles come from an upstream API, and the
 * not-found path put the raw URL segment into the title, so this input is
 * attacker-controlled: `/procedure/</script><img src=x onerror=...>` was a
 * working reflected XSS before this escaping existed.
 *
 * U+2028 and U+2029 are also escaped: they are valid inside a JSON string but
 * are line terminators in JavaScript source, so an unescaped one is a syntax
 * error in the embedded block.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(
    /[<>&\u2028\u2029]/g,
    (character) =>
      `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
}
