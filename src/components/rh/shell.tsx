"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ViewTransition, useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  Briefcase,
  CalendarClock,
  Check,
  ChevronsUpDown,
  CornerDownLeft,
  FileText,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  Palmtree,
  RotateCcw,
  Search,
  ShieldCheck,
  SquareKanban,
  User,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { relative } from "@/lib/format";
import { Avatar } from "@/components/ui/bits";
import { useToast } from "@/components/ui/toast";
import { DEMO_PERSONAS } from "@/lib/demo/seed";
import { currentUser, getData, resetDemo, signIn, signOut } from "@/lib/demo/store";
import { globalSearch, type Notice, type SearchHit } from "@/lib/demo/queries";
import { markNotificationsSeen } from "@/lib/demo/actions/admin";
import { asset } from "@/lib/asset";

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

const NOTICE_ICON: Record<Notice["icon"], LucideIcon> = {
  candidate: UserRound,
  vacation: Palmtree,
  request: Inbox,
  document: FileText,
  announcement: Megaphone,
  interview: CalendarClock,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; count?: number };
export type NavGroup = { label: string; items: NavItem[] };

/** Fecha um menu suspenso ao clicar fora ou apertar Esc. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

export function RhShell({
  groups,
  user,
  notices,
  seen,
  children,
}: {
  groups: NavGroup[];
  user: { id: number; name: string; role: string; photo: string | null; canSearchPeople: boolean };
  notices: Notice[];
  seen: string[];
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
          <img src={asset("/img/logo-ams.png")} alt="" width={34} height={30} />
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
        <UserMenu user={user} />
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
          <span className="demo-pill" title="Sistema de demonstração: dados fictícios, nada é enviado para fora do navegador">
            Demonstração
          </span>
          <NotificationBell userId={user.id} notices={notices} seen={seen} />
          <Link href="/" className="btn btn--ghost btn--sm topbar__site" target="_blank">
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

/* ------------------------------------------------------------ menu do usuário */

function UserMenu({ user }: { user: { id: number; name: string; role: string; photo: string | null } }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const ref = useDismiss(open, () => setOpen(false));

  const switchTo = (id: number, label: string) => {
    setOpen(false);
    if (id === user.id) return;
    signIn(id);
    toast(`Agora você vê o sistema como ${label}.`);
    router.push("/rh");
  };

  return (
    <div className="sidebar__user" ref={ref}>
      <button type="button" className="user-trigger" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Avatar name={user.name} photo={user.photo} size="sm" />
        <span className="sidebar__user-info">
          <strong>{user.name}</strong>
          <span>{user.role}</span>
        </span>
        <ChevronsUpDown aria-hidden className="user-trigger__chev" />
      </button>
      {open ? (
        <div className="popover popover--up" role="menu" aria-label="Conta e perfil de demonstração">
          <div className="popover__section">
            <span className="popover__label">Ver o sistema como</span>
            {DEMO_PERSONAS.map((p) => (
              <button key={p.userId} type="button" role="menuitemradio" aria-checked={p.userId === user.id} className="popover__item" onClick={() => switchTo(p.userId, p.title)}>
                <Avatar name={p.person} size="sm" />
                <span className="popover__item-main">
                  <strong>{p.title}</strong>
                  <span>{p.person}</span>
                </span>
                {p.userId === user.id ? <Check aria-hidden className="popover__check" /> : null}
              </button>
            ))}
          </div>
          <div className="popover__section">
            <Link href="/rh/conta" role="menuitem" className="popover__item popover__item--plain" onClick={() => setOpen(false)}>
              <KeyRound aria-hidden /> Minha conta
            </Link>
            <button
              type="button"
              role="menuitem"
              className="popover__item popover__item--plain"
              onClick={() => {
                setOpen(false);
                resetDemo();
                toast("Dados de demonstração restaurados ao estado inicial.");
              }}
            >
              <RotateCcw aria-hidden /> Restaurar dados da demonstração
            </button>
            <button
              type="button"
              role="menuitem"
              className="popover__item popover__item--plain"
              onClick={() => {
                signOut();
                router.push("/rh/login?saiu=1");
              }}
            >
              <LogOut aria-hidden /> Sair
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------- notificações */

function NotificationBell({ userId, notices, seen }: { userId: number; notices: Notice[]; seen: string[] }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const unseen = notices.filter((n) => !seen.includes(n.id));
  return (
    <div className="bell" ref={ref}>
      <button type="button" className="btn btn--ghost btn--icon bell__btn" aria-label={`Notificações${unseen.length ? `: ${unseen.length} novas` : ""}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((v) => !v)}>
        <Bell aria-hidden />
        {unseen.length ? <span className="bell__dot">{unseen.length > 9 ? "9+" : unseen.length}</span> : null}
      </button>
      {open ? (
        <div className="popover popover--down bell__panel" role="dialog" aria-label="Notificações">
          <div className="bell__head">
            <strong>Notificações</strong>
            {unseen.length ? (
              <button type="button" className="link xsmall" onClick={() => markNotificationsSeen(notices.map((n) => n.id), userId)}>
                Marcar todas como lidas
              </button>
            ) : (
              <span className="xsmall subtle">Tudo em dia</span>
            )}
          </div>
          {notices.length ? (
            <ul className="bell__list">
              {notices.slice(0, 9).map((n) => {
                const Icon = NOTICE_ICON[n.icon];
                const isNew = !seen.includes(n.id);
                return (
                  <li key={n.id}>
                    <Link
                      href={n.href}
                      className={`bell__item ${isNew ? "is-new" : ""}`}
                      onClick={() => {
                        markNotificationsSeen([n.id], userId);
                        setOpen(false);
                      }}
                    >
                      <span className={`bell__icon bell__icon--${n.tone}`} aria-hidden>
                        <Icon />
                      </span>
                      <span className="bell__text">
                        <strong>{n.title}</strong>
                        <span>{n.detail}</span>
                        <small>{relative(n.at)}</small>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="small muted" style={{ padding: "18px 16px" }}>
              Nenhuma notificação por enquanto.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------ busca rápida */

function CommandPalette({ onClose, pages }: { onClose: () => void; pages: NavItem[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const pageHits: SearchHit[] = pages
    .filter((p) => !q.trim() || norm(p.label).includes(norm(q.trim())))
    .map((p) => ({ group: "Páginas", label: p.label, href: p.href, kind: "page" }));
  const data = getData();
  const results = [...pageHits, ...(q.trim().length >= 2 ? globalSearch(data, currentUser(data), q) : [])];

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
