import { NextResponse } from "next/server";
import { canUse, getViewer } from "@/lib/access";
import { CompositionBody } from "@/lib/composition";
import { countProjects, createProject, listProjects, MAX_PROJECTS_PER_USER } from "@/lib/projects";

export async function GET() {
  const { user } = await getViewer();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ projects: await listProjects(user.id) });
}

export async function POST(request: Request) {
  const { user, plan } = await getViewer();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canUse(plan, "pro")) return NextResponse.json({ error: "upgrade_required", plan }, { status: 402 });

  const parsed = CompositionBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });
  if ((await countProjects(user.id)) >= MAX_PROJECTS_PER_USER) {
    return NextResponse.json({ error: "project_limit", limit: MAX_PROJECTS_PER_USER }, { status: 409 });
  }
  return NextResponse.json({ project: await createProject(user.id, parsed.data) }, { status: 201 });
}
