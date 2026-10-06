"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CircleCheck, CircleAlert, X } from "lucide-react";
import type { ActionState } from "@/lib/action";

type Toast = { id: number; message: string; tone: "success" | "error" };
const ToastCtx = createContext<(message: string, tone?: Toast["tone"], ms?: number) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "success", ms?: number) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms ?? (tone === "error" ? 7000 : 4500));
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="region" aria-label="Notificações" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone === "error" ? "toast--error" : ""}`} role={t.tone === "error" ? "alert" : "status"}>
            {t.tone === "error" ? <CircleAlert aria-hidden /> : <CircleCheck aria-hidden />}
            <span>{t.message}</span>
            <button type="button" aria-label="Fechar notificação" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
              <X size={16} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

/** Mostra um toast sempre que uma Server Action devolve um novo resultado. */
export function useActionFeedback(state: ActionState, opts?: { onSuccess?: () => void; silentSuccess?: boolean }) {
  const toast = useToast();
  const last = useRef<number | undefined>(undefined);
  const onSuccess = opts?.onSuccess;
  const silent = opts?.silentSuccess;
  useEffect(() => {
    if (!state.at || state.at === last.current) return;
    last.current = state.at;
    if (state.message && (!state.ok || !silent)) toast(state.message, state.ok ? "success" : "error", state.sticky ? 60000 : undefined);
    if (state.ok) onSuccess?.();
  }, [state, toast, onSuccess, silent]);
}
