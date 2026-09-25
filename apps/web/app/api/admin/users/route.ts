import { NextResponse } from "next/server";
import { getViewer } from "@/lib/access";
import { createAccount, NewAccount } from "@/lib/admin-users";

export async function POST(request: Request) {
  const { user } = await getViewer();
  if (user?.role !== "admin") return NextResponse.json({ error: "not_found" }, { status: 404 });

  const parsed = NewAccount.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });

  const result = await createAccount(parsed.data);
  if ("error" in result) return NextResponse.json(result, { status: 409 });
  return NextResponse.json({ user: result }, { status: 201 });
}
