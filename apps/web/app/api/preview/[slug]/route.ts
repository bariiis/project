import { readFile } from "node:fs/promises";
import { getEntry } from "@/lib/library";
import { injectPreview } from "@/lib/preview";
import { decodeSlots } from "@/lib/slot-encoding";

// Reference implementations are public demos; they are rendered in a sandboxed iframe.
// `?s=<base64url JSON>` swaps in the builder's slot values and turns on height reporting.
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = getEntry(slug);
  if (!entry?.referencePath) return new Response("Not found", { status: 404 });

  const allowed = new Set(entry.block.slots.map((s) => s.key));
  const values = Object.fromEntries(
    Object.entries(decodeSlots(new URL(request.url).searchParams.get("s"))).filter(([key]) => allowed.has(key)),
  );

  return new Response(injectPreview(await readFile(entry.referencePath, "utf8"), slug, values), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
      // Opaque origin: the demo cannot read cookies or call our API as the viewer.
      "content-security-policy": "sandbox allow-scripts",
      "x-content-type-options": "nosniff",
    },
  });
}
