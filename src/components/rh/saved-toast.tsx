"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";

/** Mostra um aviso após redirecionamentos de Server Actions (?salvo=1) e limpa o parâmetro da URL. */
export function SavedToast({ flags }: { flags: Record<string, string> }) {
  const sp = useSearchParams();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    const hit = Object.keys(flags).find((k) => sp.has(k));
    if (!hit) return;
    toast(flags[hit]);
    const next = new URLSearchParams(sp);
    Object.keys(flags).forEach((k) => next.delete(k));
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }, [sp, flags, toast, router, pathname]);
  return null;
}
