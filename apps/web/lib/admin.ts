import "server-only";
import { notFound } from "next/navigation";
import { getViewer } from "./access";

/** Admin pages 404 for everyone else, so their existence is not advertised. */
export async function requireAdmin() {
  const { user } = await getViewer();
  if (user?.role !== "admin") notFound();
  return user;
}
