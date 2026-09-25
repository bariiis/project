/**
 * The public site address, read at request time. `NEXT_PUBLIC_*` values are inlined by
 * `next build`, and the Docker build has no env, so containers configure `SITE_URL` instead.
 */
export function siteUrl(fallback?: string): string | undefined {
  const env = process.env;
  const value = env["SITE_URL"] || env["NEXT_PUBLIC_SITE_URL"] || fallback;
  return value?.replace(/\/+$/, "");
}
