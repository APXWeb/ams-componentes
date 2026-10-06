"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useTransition } from "react";

/**
 * Formulário GET de filtros que se aplica sozinho (selects na hora, busca com debounce).
 * Sem JavaScript continua funcionando como formulário comum.
 */
export function FilterForm({ children, className = "toolbar" }: { children: React.ReactNode; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const apply = (form: HTMLFormElement) => {
    const sp = new URLSearchParams();
    new FormData(form).forEach((v, k) => {
      if (typeof v === "string" && v.trim()) sp.set(k, v.trim());
    });
    start(() => router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false }));
  };

  return (
    <form
      className={className}
      role="search"
      aria-busy={pending}
      style={{ opacity: pending ? 0.75 : 1, transition: "opacity 160ms" }}
      onSubmit={(e) => {
        e.preventDefault();
        apply(e.currentTarget);
      }}
      onChange={(e) => {
        const form = e.currentTarget;
        const target = e.target as HTMLElement;
        clearTimeout(timer.current);
        if (target instanceof HTMLInputElement && (target.type === "search" || target.type === "text")) {
          timer.current = setTimeout(() => apply(form), 280);
        } else apply(form);
      }}
    >
      {children}
    </form>
  );
}
