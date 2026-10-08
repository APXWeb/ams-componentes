import { can, type Permission } from "@/lib/permissions";
import { fail, type ActionState } from "@/lib/action";
import { currentUser, getData } from "../store";
import type { CurrentUser } from "../types";

/** Usuário da demo e checagem de perfil, no papel que a autorização do backend teria. */
export function authorize(...anyOf: Permission[]): { user: CurrentUser; denied?: undefined } | { user: CurrentUser; denied: ActionState } {
  const user = currentUser(getData());
  if (anyOf.length && !anyOf.some((p) => can(user.role, p))) {
    return { user, denied: fail("Seu perfil não tem permissão para esta ação.") };
  }
  return { user };
}

export const nowIso = () => new Date().toISOString();

/* --------------------------------------------- arquivos da sessão (demo) */

/*
 * Arquivos escolhidos pelo usuário não saem do navegador: guardamos só nome, tipo e tamanho no
 * registro, e um link temporário (blob:) em memória para a pré-visualização nesta aba.
 */
const blobs = new Map<string, string>();

export const ACCEPT_DOCS = ".pdf,.png,.jpg,.jpeg,.webp,.docx";
export const ACCEPT_RESUME = ".pdf,.doc,.docx";
export const ACCEPT_PHOTO = ".png,.jpg,.jpeg,.webp";
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function checkFile(file: FormDataEntryValue | null, kind: "docs" | "resume" | "photo"): { file: File } | { error: string } {
  if (!(file instanceof File) || file.size === 0) return { error: kind === "photo" ? "Selecione uma foto." : kind === "resume" ? "Anexe seu currículo em PDF ou DOCX." : "Selecione o arquivo." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "O arquivo excede o limite de 8 MB." };
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const ok = kind === "photo" ? ["png", "jpg", "jpeg", "webp"].includes(ext) : kind === "resume" ? ["pdf", "doc", "docx"].includes(ext) : ["pdf", "png", "jpg", "jpeg", "webp", "docx"].includes(ext);
  if (!ok) return { error: kind === "photo" ? "Envie a foto em JPG, PNG ou WEBP." : kind === "resume" ? "Envie o currículo em PDF ou DOCX." : "Formato não aceito. Use PDF, DOCX, JPG, PNG ou WEBP." };
  return { file };
}

export function keepFile(file: File) {
  const key = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  try {
    blobs.set(key, URL.createObjectURL(file));
  } catch {
    // sem URL.createObjectURL: a pré-visualização usa o modelo de documento
  }
  return { storageKey: key, originalName: file.name.slice(0, 120), mimeType: file.type || "application/octet-stream", sizeBytes: file.size };
}

export const fileUrl = (storageKey: string | null) => (storageKey ? blobs.get(storageKey) : undefined);

/** Reduz a foto para um avatar leve (data URL), que cabe no armazenamento local da demo. */
export async function photoDataUrl(file: File, size = 240): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    canvas.getContext("2d")!.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.84);
  } finally {
    URL.revokeObjectURL(url);
  }
}
