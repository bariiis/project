import "server-only";
import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

let client: S3Client | undefined;

function s3(): S3Client {
  const { S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_REGION } = process.env;
  if (!S3_ENDPOINT || !S3_ACCESS_KEY || !S3_SECRET_KEY) throw new Error("S3 storage is not configured");
  client ??= new S3Client({
    endpoint: S3_ENDPOINT,
    region: S3_REGION ?? "us-east-1",
    forcePathStyle: true, // MinIO serves buckets by path
    credentials: { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY },
  });
  return client;
}

export function storageConfigured(): boolean {
  return Boolean(process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_PUBLIC_URL);
}

/** `assets/2026/09/<uuid>-hero-loop.mp4`: unique, sortable, readable. */
export function objectKey(filename: string, now = new Date()): string {
  const dot = filename.lastIndexOf(".");
  const ext = dot > 0 ? filename.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const stem = (dot > 0 ? filename.slice(0, dot) : filename)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "file";
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `assets/${now.getUTCFullYear()}/${month}/${randomUUID().slice(0, 8)}-${stem}${ext ? `.${ext}` : ""}`;
}

/**
 * The only file types that may be uploaded, keyed by extension. The browser's type is ignored:
 * it is empty for 3D/HDR files and spoofable, and anything scriptable (SVG, HTML) must never be
 * served from the public bucket.
 */
const EXT_TYPES: Record<string, string> = {
  glb: "model/gltf-binary",
  gltf: "model/gltf+json",
  hdr: "image/vnd.radiance",
  exr: "image/x-exr",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  webp: "image/webp",
  avif: "image/avif",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
};

export function describeFile(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const contentType = EXT_TYPES[ext] ?? "application/octet-stream";
  let kind: "video" | "image" | "model" | "hdr" | "audio" | null = null;
  if (ext === "hdr" || ext === "exr") kind = "hdr";
  else if (contentType.startsWith("model/")) kind = "model";
  else if (contentType.startsWith("video/")) kind = "video";
  else if (contentType.startsWith("image/")) kind = "image";
  else if (contentType.startsWith("audio/")) kind = "audio";
  return { contentType, kind };
}

export async function putObject(key: string, body: Uint8Array, contentType: string): Promise<string> {
  await s3().send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return `${process.env.S3_PUBLIC_URL!.replace(/\/$/, "")}/${key}`;
}
