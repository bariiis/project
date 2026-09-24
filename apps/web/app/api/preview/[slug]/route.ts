import { readFile } from "node:fs/promises";
import { getEntry } from "@/lib/library";

// Reference implementations are public demos; they are rendered in a sandboxed iframe.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = getEntry(slug);
  if (!entry?.referencePath) return new Response("Not found", { status: 404 });

  return new Response(await readFile(entry.referencePath, "utf8"), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
      // Opaque origin: the demo cannot read cookies or call our API as the viewer.
      "content-security-policy": "sandbox allow-scripts",
      "x-content-type-options": "nosniff",
    },
  });
}
