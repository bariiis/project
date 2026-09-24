import { schema } from "@promptsite/db";
import { getViewer } from "@/lib/access";
import { db } from "@/lib/db";
import { describeFile, objectKey, putObject, storageConfigured } from "@/lib/storage";

const MAX_BYTES = 200 * 1024 * 1024;

export async function POST(request: Request) {
  const { user } = await getViewer();
  if (user?.role !== "admin") return Response.json({ error: "not_found" }, { status: 404 });
  if (!storageConfigured()) return Response.json({ error: "storage_not_configured" }, { status: 503 });

  const form = await request.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return Response.json({ error: "no_files" }, { status: 400 });

  const uploaded = [];
  for (const file of files) {
    if (file.size > MAX_BYTES) return Response.json({ error: "too_large", file: file.name }, { status: 413 });
    const { contentType, kind } = describeFile(file.name, file.type);
    if (!kind) return Response.json({ error: "unsupported_type", file: file.name, contentType }, { status: 415 });

    const key = objectKey(file.name);
    const url = await putObject(key, new Uint8Array(await file.arrayBuffer()), contentType);
    const [row] = await db()
      .insert(schema.assets)
      .values({ key, kind, url, bytes: file.size, contentType })
      .returning();
    uploaded.push(row);
  }
  return Response.json({ assets: uploaded });
}
