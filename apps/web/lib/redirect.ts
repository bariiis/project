const PROBE = "https://same-site.invalid";

/**
 * Only same-site paths are allowed as post-login destinations (no open redirects). The value is
 * parsed the way a browser would, so tricks like "/\t/evil.com" (tabs and newlines are stripped,
 * leaving "//evil.com") resolve to another origin and are rejected.
 */
export function safeNext(value: string | undefined | null, fallback = "/hesap"): string {
  if (!value || !value.startsWith("/")) return fallback;
  let url: URL;
  try {
    url = new URL(value, PROBE);
  } catch {
    return fallback;
  }
  if (url.origin !== PROBE) return fallback;
  return url.pathname + url.search + url.hash;
}
