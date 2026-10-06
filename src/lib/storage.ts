import "server-only";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/*
 * Arquivos privados (currículos, documentos, fotos) ficam em storage/, fora de public/.
 * Só são entregues pela rota /rh/arquivos/[id], que verifica sessão e permissão a cada acesso.
 * O nome no disco é aleatório; o nome original fica apenas no banco.
 */
export const STORAGE_DIR = process.env.STORAGE_PATH ?? path.join(process.cwd(), "storage");
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: "application/pdf", ext: "pdf", test: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-" },
  {
    mime: "image/png",
    ext: "png",
    test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/webp",
    ext: "webp",
    test: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  },
  {
    // .docx é um zip: conferimos a assinatura e a extensão declarada
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ext: "docx",
    test: (b) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04,
  },
];

export const ACCEPT_DOCS = ".pdf,.png,.jpg,.jpeg,.webp,.docx";
export const ACCEPT_RESUME = ".pdf,.docx";
export const ACCEPT_PHOTO = ".png,.jpg,.jpeg,.webp";

export type StoredFile = { storageKey: string; mimeType: string; sizeBytes: number; originalName: string };

export class UploadError extends Error {}

export async function saveUpload(file: File, allowed: "docs" | "resume" | "photo"): Promise<StoredFile> {
  if (!file || typeof file === "string" || file.size === 0) throw new UploadError("Selecione um arquivo.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("O arquivo excede o limite de 8 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const sig = SIGNATURES.find((s) => s.test(buf));
  const declaredExt = file.name.split(".").pop()?.toLowerCase() ?? "";
  const ok =
    sig &&
    (sig.ext !== "docx" || declaredExt === "docx") &&
    (allowed === "docs" ||
      (allowed === "resume" && (sig.ext === "pdf" || sig.ext === "docx")) ||
      (allowed === "photo" && ["png", "jpg", "webp"].includes(sig.ext)));
  if (!ok || !sig) {
    throw new UploadError(
      allowed === "resume"
        ? "Envie o currículo em PDF ou DOCX."
        : allowed === "photo"
          ? "Envie a foto em JPG, PNG ou WEBP."
          : "Formato não aceito. Use PDF, DOCX, JPG, PNG ou WEBP.",
    );
  }
  await mkdir(STORAGE_DIR, { recursive: true });
  const storageKey = `${randomUUID()}.${sig.ext}`;
  await writeFile(path.join(STORAGE_DIR, storageKey), buf, { flag: "wx" });
  const originalName = file.name.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 120) || `arquivo.${sig.ext}`;
  return { storageKey, mimeType: sig.mime, sizeBytes: file.size, originalName };
}

const KEY_RE = /^[0-9a-f-]{36}\.(pdf|png|jpg|webp|docx)$/;

export async function readStored(storageKey: string) {
  if (!KEY_RE.test(storageKey)) throw new Error("chave inválida");
  return readFile(path.join(STORAGE_DIR, storageKey));
}

export async function removeStored(storageKey: string) {
  if (!KEY_RE.test(storageKey)) return;
  await unlink(path.join(STORAGE_DIR, storageKey)).catch(() => {});
}
