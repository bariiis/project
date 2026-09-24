import { getLibrary } from "@/lib/library";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true, blocks: getLibrary().length });
}
