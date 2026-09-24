import { NextResponse } from "next/server";
import { canUse, getViewer } from "@/lib/access";
import { CompositionBody } from "@/lib/composition";
import { deleteProject, getProject, updateProject } from "@/lib/projects";

type Context = { params: Promise<{ id: string }> };
const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 });

export async function GET(_request: Request, { params }: Context) {
  const { user } = await getViewer();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const project = await getProject(user.id, (await params).id);
  return project ? NextResponse.json({ project }) : notFound();
}

export async function PUT(request: Request, { params }: Context) {
  const { user, plan } = await getViewer();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canUse(plan, "pro")) return NextResponse.json({ error: "upgrade_required", plan }, { status: 402 });

  const parsed = CompositionBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });
  const project = await updateProject(user.id, (await params).id, parsed.data);
  return project ? NextResponse.json({ project }) : notFound();
}

// Deleting stays allowed after a subscription lapses: people can always clean up their data.
export async function DELETE(_request: Request, { params }: Context) {
  const { user } = await getViewer();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return (await deleteProject(user.id, (await params).id)) ? new Response(null, { status: 204 }) : notFound();
}
