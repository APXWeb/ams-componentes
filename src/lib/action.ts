import type { ZodError } from "zod";

/** Resultado padrão das ações (hoje simuladas no navegador; amanhã, chamadas à API). */
export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** muda a cada envio para o cliente disparar o aviso mesmo com mensagem repetida */
  at?: number;
  /** mensagens que o usuário precisa copiar (ex.: senha provisória) ficam mais tempo na tela */
  sticky?: boolean;
  /** rota para onde a tela navega após o sucesso */
  redirect?: string;
};

export const initialState: ActionState = { ok: false };

export function fail(message: string, fieldErrors?: Record<string, string>): ActionState {
  return { ok: false, message, fieldErrors, at: Date.now() };
}

export function done(message: string, opts: { sticky?: boolean; redirect?: string } = {}): ActionState {
  return { ok: true, message, at: Date.now(), ...opts };
}

export function zodFail(err: ZodError, message = "Revise os campos destacados."): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = String(issue.path[0] ?? "form");
    if (!fieldErrors[k]) fieldErrors[k] = issue.message;
  }
  return fail(message, fieldErrors);
}

export function formObject(fd: FormData) {
  const o: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") o[k] = v.trim();
  return o;
}
