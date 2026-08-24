/**
 * Decodes a `[reference]` route segment.
 *
 * `decodeURIComponent` throws a URIError on malformed input (`%E0%A4%A`),
 * which surfaced as a 500 on every such path. References containing `/` also
 * arrive double-encoded through some Next entry points, so decode until the
 * value stops changing.
 *
 * Returns null for input that cannot be decoded.
 */
export function safeDecodeReference(raw: string): string | null {
  let value = raw;

  for (let i = 0; i < 3; i++) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      return null;
    }
  }

  return value.trim() || null;
}

/**
 * Whether a string looks like an EP reference at all.
 *
 * Used to reject junk paths before they reach the upstream API or the page's
 * metadata. Deliberately shape-based rather than existence-based: a reference
 * we simply have no record of yet should still render, but
 * `</script><img src=x onerror=...>` should not.
 */
export function isPlausibleReference(reference: string): boolean {
  if (reference.length > 64) return false;

  return (
    /^[A-Z]\d{1,2}-\d{1,4}\/\d{4}$/.test(reference) ||
    /^\d{4}\/\d{1,4}\([A-Z]{3}\)$/.test(reference) ||
    /^[A-Z]\d{1,2}-\d{4}-\d{1,4}$/.test(reference) ||
    /^\d{4}[-_]\d{1,4}([-_][A-Z]{3})?$/.test(reference)
  );
}
