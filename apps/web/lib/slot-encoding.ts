// Slot values travel to the preview route as `?s=<base64url(JSON)>`. Works in browsers and Node.

export type SlotValues = Record<string, string>;

const MAX_ENCODED = 12_000;
const MAX_VALUE = 2_000;

export function encodeSlots(values: SlotValues): string {
  const bytes = new TextEncoder().encode(JSON.stringify(values));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Returns only well-formed string values; anything malformed decodes to `{}`. */
export function decodeSlots(param: string | null | undefined): SlotValues {
  if (!param || param.length > MAX_ENCODED) return {};
  try {
    const binary = atob(param.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0))));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: SlotValues = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (/^[a-z][a-z0-9_]*$/.test(key) && typeof value === "string") out[key] = value.slice(0, MAX_VALUE);
    }
    return out;
  } catch {
    return {};
  }
}
