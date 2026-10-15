import "server-only";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/authorization";
import { isCmsWriteEnabled } from "@/config/env";
import { governanceEnabled } from "@/data/project-disclosure";
import { getPrisma } from "@/lib/prisma";
import { uploadMedia, deleteMedia } from "@/lib/projects/storage";

export async function storeProjectMedia(projectId: string, file: File) {
  await requireAdmin();
  if (!isCmsWriteEnabled() || !governanceEnabled()) throw new Error("Media writes disabled");
  z.uuid().parse(projectId);
  if (!file || file.size < 1 || file.size > 3_000_000 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Invalid image");
  await getPrisma().project.findUniqueOrThrow({ where: { id: projectId }, select: { id: true } });
  const data = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 }).rotate().resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
  const id = randomUUID(); const objectKey = `${id}.webp`;
  // Sharp omits source EXIF/XMP and filenames; only neutral object keys survive.
  await uploadMedia(objectKey, data.data);
  try { await getPrisma().projectMedia.create({ data: { id, projectId, objectKey, width: data.info.width, height: data.info.height } }); }
  catch (error) { await deleteMedia(objectKey).catch(() => {}); throw error; }
  return { id };
}
