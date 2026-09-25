import { NextResponse } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/access";
import { grantPlan, PlanGrant, setRole } from "@/lib/admin-users";

const Patch = z.object({
  grant: PlanGrant.optional(),
  role: z.enum(["user", "admin"]).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await getViewer();
  if (user?.role !== "admin") return NextResponse.json({ error: "not_found" }, { status: 404 });

  const parsed = Patch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });

  const { id } = await params;
  const { grant, role } = parsed.data;
  // Removing your own admin role would lock you out of this page.
  if (role === "user" && id === user.id) return NextResponse.json({ error: "cannot_demote_self" }, { status: 400 });

  if (grant) await grantPlan(id, grant.plan, grant.until ?? null);
  if (role) await setRole(id, role);
  return NextResponse.json({ ok: true });
}
