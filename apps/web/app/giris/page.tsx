import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { safeNext } from "@/lib/redirect";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Giriş" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ sonra?: string; mod?: string }> }) {
  const { sonra, mod } = await searchParams;
  const next = safeNext(sonra);
  if ((await getViewer()).user) redirect(next);
  return (
    <main className="mx-auto grid min-h-[calc(100svh-3.5rem)] max-w-md content-center px-4 py-16">
      <SignInForm next={next} google={googleEnabled} initialMode={mod === "kayit" ? "signup" : "signin"} />
    </main>
  );
}
