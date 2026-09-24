/** Only same-site paths are allowed as post-login destinations (no open redirects). */
export function safeNext(value: string | undefined | null, fallback = "/hesap"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
