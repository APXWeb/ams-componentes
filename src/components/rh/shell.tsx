"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ViewTransition, useEffect, useRef, useState, useTransition } from "react";
import {
  BarChart3,
  Briefcase,
  FileText,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  Palmtree,
  Search,
  ShieldCheck,
  SquareKanban,
  User,
  Users,
  X,
  CornerDownLeft,
  type LucideIcon,
} from "lucide-react";
import { initials } from "@/lib/format";
import { logout } from "@/app/rh/auth-actions";
import { globalSearch, type SearchHit } from "@/app/rh/(app)/search-action";

const ICONS = {
  dashboard: LayoutDashboard,
  chart: BarChart3,
  users: Users,
  kanban: SquareKanban,
  inbox: Inbox,
  palm: Palmtree,
  file: FileText,
  megaphone: Megaphone,
  user: User,
  key: KeyRound,
  shield: ShieldCheck,
  mail: Mail,
  briefcase: Briefcase,
} satisfies Record<string, LucideIcon>;

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; count?: number };
export type NavGroup = { label: string; items: NavItem[] };

export function RhShell({
  groups,
  user,
  demo,
  children,
}: {
  groups: NavGroup[];
  user: { name: string; role: string; canSearchPeople: boolean };
  demo: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setNavOpen(false);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) => (href === "/rh" ? pathname === "/rh" : pathname === href || pathname.startsWith(href + "/"));
  const allItems = groups.flatMap((g) => g.items);

  return (
    <div className={`rh ${navOpen ? "nav-open" : ""}`}>
      <a href="#rh-conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <aside className="sidebar" aria-label="Navegação do RH">
        <Link href="/rh" className="sidebar__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-ams.png" alt="" width={34} height={30} />
          <div>
            <strong>AMS Componentes</strong>
            <span>RH · ÁREA PRIVADA</span>
          </div>
        </Link>
        <nav className="sidebar__nav">
          {groups.map((g) => (
            <div key={g.label} className="sidebar__group">
              <span className="sidebar__label">{g.label}</span>
              <ul>
                {g.items.map((it) => {
                  const Icon = ICONS[it.icon];
                  return (
                    <li key={it.href}>
                      <Link href={it.href} className="side-link" aria-current={isActive(it.href) ? "page" : undefined}>
                        <Icon aria-hidden />
                        {it.label}
                        {it.count ? (
                          <span className="side-link__count" aria-label={`${it.count} pendentes`}>
                            {it.count > 99 ? "99+" : it.count}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="sidebar__user">
          <span className="avatar avatar--sm" aria-hidden>
            {initials(user.name)}
          </span>
          <Link href="/rh/conta" className="sidebar__user-info" title="Minha conta e senha">
            <strong>{user.name}</strong>
            <span>{user.role} · Minha conta</span>
          </Link>
          <form action={logout}>
            <button type="submit" className="btn btn--ghost btn--icon btn--sm" aria-label="Sair do sistema" title="Sair">
              <LogOut aria-hidden />
            </button>
          </form>
        </div>
      </aside>
      <div className="scrim" onClick={() => setNavOpen(false)} aria-hidden />

      <div className="rh-main">
        <header className="topbar">
          <button type="button" className="btn btn--ghost btn--icon topbar__menu" aria-label="Abrir menu" aria-expanded={navOpen} onClick={() => setNavOpen(true)}>
            <Menu aria-hidden />
          </button>
          <button type="button" className="cmd-trigger" onClick={() => setCmdOpen(true)} aria-label="Buscar no sistema (Ctrl+K)">
            <Search aria-hidden />
            <span>{user.canSearchPeople ? "Buscar pessoas, vagas, páginas…" : "Ir para…"}</span>
            <span className="kbd">Ctrl K</span>
          </button>
          <span className="grow" />
          {demo ? (
            <span className="demo-pill" title="Os dados exibidos são fictícios">
              Dados de demonstração
            </span>
          ) : null}
          <Link href="/" className="btn btn--ghost btn--sm" target="_blank">
            Ver site
          </Link>
        </header>
        <ViewTransition default="page">
          <main id="rh-conteudo" className="rh-content" tabIndex={-1}>
            {children}
          </main>
        </ViewTransition>
      </div>

      {cmdOpen ? <CommandPalette onClose={() => setCmdOpen(false)} pages={allItems} /> : null}
    </div>
  );
}

function CommandPalette({ onClose, pages }: { onClose: () => void; pages: NavItem[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [sel, setSel] = useState(0);
  const [, start] = useTransition();

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(() => start(async () => setHits(await globalSearch(q))), 160);
    return () => clearTimeout(t);
  }, [q]);

  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const pageHits: SearchHit[] = pages
    .filter((p) => !q.trim() || norm(p.label).includes(norm(q.trim())))
    .map((p) => ({ group: "Páginas", label: p.label, href: p.href, kind: "page" }));
  const results = [...pageHits, ...(q.trim().length >= 2 ? hits : [])];

  const go = (h?: SearchHit) => {
    if (!h) return;
    onClose();
    router.push(h.href);
  };

  let lastGroup = "";
  return (
    <dialog ref={ref} className="modal cmd" onClose={onClose} onClick={(e) => e.target === e.currentTarget && onClose()} aria-label="Busca rápida">
      <div className="cmd__input">
        <Search aria-hidden />
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSel(0);
            if (e.target.value.trim().length < 2) setHits([]);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSel((s) => Math.min(s + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSel((s) => Math.max(s - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(results[sel]);
            }
          }}
          placeholder="Digite um nome, vaga ou página"
          aria-label="Buscar"
          role="combobox"
          aria-expanded
          aria-controls="cmd-list"
          aria-activedescendant={results[sel] ? `cmd-${sel}` : undefined}
        />
        <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={onClose} aria-label="Fechar busca">
          <X aria-hidden />
        </button>
      </div>
      <div className="cmd__results" id="cmd-list" role="listbox">
        {results.length === 0 ? <p className="small muted" style={{ padding: 16 }}>Nada encontrado para “{q}”.</p> : null}
        {results.map((r, i) => {
          const header = r.group !== lastGroup ? <div className="cmd__group">{r.group}</div> : null;
          lastGroup = r.group;
          const Icon = r.kind === "page" ? CornerDownLeft : r.kind === "vacancy" ? Briefcase : User;
          return (
            <div key={r.href + i}>
              {header}
              <Link
                id={`cmd-${i}`}
                href={r.href}
                className="cmd__item"
                role="option"
                aria-selected={i === sel}
                onMouseEnter={() => setSel(i)}
                onClick={(e) => {
                  e.preventDefault();
                  go(r);
                }}
              >
                <Icon aria-hidden />
                {r.label}
                {r.meta ? <small>{r.meta}</small> : null}
              </Link>
            </div>
          );
        })}
      </div>
    </dialog>
  );
}
