import "server-only";
import { GridFSBucket, ObjectId } from "mongodb";
import { db } from "./db";
import type { Classification } from "./types";

/** مستند مرفوع — البيانات الوصفية في «documents»، والمحتوى في GridFS داخل القاعدة نفسها */
export interface DocumentMeta {
  id: string;
  fileId: string;
  name: string;
  size: number;
  mime: string;
  folderId?: string;
  assignmentId?: string;
  uploadedBy: string;
  at: string;
  classification: Classification;
}

export const MAX_UPLOAD = 8 * 1024 * 1024;

export const ALLOWED = new Map<string, string>([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"], ["image/heic", "heic"],
  ["application/msword", "doc"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
  ["application/vnd.ms-excel", "xls"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
  ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx"],
  ["text/plain", "txt"],
]);

export async function bucket() {
  return new GridFSBucket(await db(), { bucketName: "uploads" });
}

export async function documentsCol() {
  return (await db()).collection<DocumentMeta>("documents");
}

export async function storeFile(file: File): Promise<string> {
  const b = await bucket();
  const stream = b.openUploadStream(file.name, { metadata: { mime: file.type } });
  const buf = Buffer.from(await file.arrayBuffer());
  await new Promise<void>((resolve, reject) => {
    stream.on("error", reject);
    stream.on("finish", () => resolve());
    stream.end(buf);
  });
  return String(stream.id);
}

export async function readFile(fileId: string): Promise<Buffer> {
  const b = await bucket();
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    b.openDownloadStream(new ObjectId(fileId))
      .on("data", (c: Buffer) => chunks.push(c))
      .on("error", reject)
      .on("end", () => resolve());
  });
  return Buffer.concat(chunks);
}
