import "server-only";
import { and, count, desc, eq, schema } from "@promptsite/db";
import type { Composition } from "./composition";
import { db } from "./db";

export const MAX_PROJECTS_PER_USER = 100;

const columns = {
  id: schema.projects.id,
  title: schema.projects.title,
  target: schema.projects.target,
  lang: schema.projects.lang,
  blocks: schema.projects.blocks,
  slots: schema.projects.slots,
  updatedAt: schema.projects.updatedAt,
};

export type Project = Omit<Composition, "target"> & { id: string; target: string; updatedAt: Date };

export async function listProjects(userId: string): Promise<Project[]> {
  const rows = await db().select(columns).from(schema.projects).where(eq(schema.projects.userId, userId)).orderBy(desc(schema.projects.updatedAt));
  return rows as Project[];
}

/** Scoped by owner: another user's id behaves exactly like a missing one. */
export async function getProject(userId: string, id: string): Promise<Project | null> {
  if (!isUuid(id)) return null;
  const [row] = await db().select(columns).from(schema.projects).where(and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)));
  return (row as Project | undefined) ?? null;
}

export async function countProjects(userId: string): Promise<number> {
  const [row] = await db().select({ n: count() }).from(schema.projects).where(eq(schema.projects.userId, userId));
  return row?.n ?? 0;
}

export async function createProject(userId: string, body: Composition): Promise<Project> {
  const [row] = await db().insert(schema.projects).values({ ...body, userId }).returning(columns);
  return row as Project;
}

export async function updateProject(userId: string, id: string, body: Composition): Promise<Project | null> {
  if (!isUuid(id)) return null;
  const [row] = await db()
    .update(schema.projects)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)))
    .returning(columns);
  return (row as Project | undefined) ?? null;
}

export async function deleteProject(userId: string, id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  const rows = await db()
    .delete(schema.projects)
    .where(and(eq(schema.projects.id, id), eq(schema.projects.userId, userId)))
    .returning({ id: schema.projects.id });
  return rows.length > 0;
}

// Ids are gen_random_uuid(); rejecting other shapes avoids a Postgres cast error on bad input.
function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
