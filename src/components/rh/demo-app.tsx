"use client";

import Link from "next/link";
import { SearchX, ShieldX } from "lucide-react";
import { can, ROLE_LABEL, type Permission } from "@/lib/permissions";
import { useDemoData, useDemoUser } from "@/lib/demo/store";
import { employee, notifications, visibleAnnouncements, isRead } from "@/lib/demo/queries";
import { PageSkeleton } from "@/components/ui/bits";
import { RhShell, type NavGroup } from "./shell";
import type { CurrentUser, DemoData } from "@/lib/demo/types";
import { asset } from "@/lib/asset";

/** Dados e usuário da demo dentro das telas do RH (já carregados pelo DemoRhApp). */
export function useRh(): { d: DemoData; user: CurrentUser } {
  const d = useDemoData();
  const user = useDemoUser();
  return { d: d!, user: user! };
}

/**
 * Moldura do RH: carrega a demonstração no navegador e monta o menu conforme o perfil.
 * Sem sessão de demonstração, entra como RH, para que links diretos sempre funcionem.
 */
export function DemoRhApp({ children }: { children: React.ReactNode }) {
  const d = useDemoData();
  const user = useDemoUser();
  if (!d || !user) return <ShellSkeleton />;

  const isHr = can(user.role, "requests.manage");
  const pendingRequests = isHr ? d.requests.filter((r) => r.status === "PENDENTE" || r.status === "EM_ANALISE").length : 0;
  const pendingVacations = isHr ? d.vacations.filter((v) => v.status === "PENDENTE").length : 0;
  const newCandidates = can(user.role, "recruitment.manage") ? d.applications.filter((a) => a.stage === "CANDIDATO" && a.outcome === "EM_ANDAMENTO").length : 0;
  const myPendingDocs = user.employeeId ? d.documents.filter((x) => x.employeeId === user.employeeId && (x.status === "PENDENTE" || x.status === "RECUSADO")).length : 0;
  const unread = visibleAnnouncements(d, user).filter((a) => !isRead(d, a.id, user.id)).length;

  const groups: NavGroup[] = [
    {
      label: "Visão geral",
      items: [{ href: "/rh", label: "Painel", icon: "dashboard" }, ...(can(user.role, "indicators.view") ? [{ href: "/rh/indicadores", label: "Indicadores", icon: "chart" as const }] : [])],
    },
  ];
  const people: NavGroup["items"] = [];
  if (can(user.role, "employees.view_all")) people.push({ href: "/rh/funcionarios", label: "Funcionários", icon: "users" });
  else if (can(user.role, "employees.view_team")) people.push({ href: "/rh/funcionarios", label: "Minha equipe", icon: "users" });
  if (can(user.role, "recruitment.view")) people.push({ href: "/rh/recrutamento", label: "Recrutamento", icon: "kanban", count: newCandidates || undefined });
  if (people.length) groups.push({ label: "Pessoas", items: people });

  groups.push({
    label: isHr ? "Gestão" : "Meu espaço",
    items: [
      { href: "/rh/ferias", label: "Férias", icon: "palm", count: isHr ? pendingVacations || undefined : undefined },
      { href: "/rh/solicitacoes", label: "Solicitações", icon: "inbox", count: isHr ? pendingRequests || undefined : undefined },
      { href: "/rh/comunicados", label: "Comunicados", icon: "megaphone", count: unread || undefined },
      { href: "/rh/documentos", label: "Documentos", icon: "file", count: !isHr && myPendingDocs ? myPendingDocs : undefined },
      ...(user.employeeId ? [{ href: "/rh/perfil", label: "Meu perfil", icon: "user" as const }] : []),
    ],
  });

  const admin: NavGroup["items"] = [];
  if (can(user.role, "users.manage")) admin.push({ href: "/rh/usuarios", label: "Usuários e acessos", icon: "key" });
  if (can(user.role, "audit.view")) admin.push({ href: "/rh/auditoria", label: "Auditoria", icon: "shield" });
  if (can(user.role, "messages.view")) {
    const newMsgs = d.contactMessages.filter((m) => m.status === "NOVA").length;
    admin.push({ href: "/rh/mensagens", label: "Mensagens do site", icon: "mail", count: newMsgs || undefined });
  }
  if (admin.length) groups.push({ label: "Administração", items: admin });

  return (
    <RhShell
      groups={groups}
      user={{ id: user.id, name: user.name, role: ROLE_LABEL[user.role], photo: employee(d, user.employeeId)?.photo ?? null, canSearchPeople: can(user.role, "employees.view_all") || can(user.role, "employees.view_team") }}
      notices={notifications(d, user)}
      seen={d.seenNotifications[user.id] ?? []}
    >
      {children}
    </RhShell>
  );
}

function ShellSkeleton() {
  return (
    <div className="rh">
      <aside className="sidebar" aria-hidden>
        <div className="sidebar__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/img/logo-ams.png")} alt="" width={34} height={30} />
          <div>
            <strong>AMS Componentes</strong>
            <span>RH · ÁREA PRIVADA</span>
          </div>
        </div>
      </aside>
      <div className="rh-main">
        <header className="topbar" />
        <main className="rh-content">
          <PageSkeleton />
        </main>
      </div>
    </div>
  );
}

/** Bloqueia a tela quando o perfil da demonstração não tem a permissão. */
export function Guard({ anyOf, children }: { anyOf: Permission[]; children: React.ReactNode }) {
  const { user } = useRh();
  if (!anyOf.some((p) => can(user.role, p))) return <Forbidden />;
  return children;
}

export function Forbidden() {
  return (
    <div className="panel empty" style={{ marginTop: 40, padding: 56 }}>
      <span className="empty__icon">
        <ShieldX aria-hidden />
      </span>
      <strong>Acesso não permitido para este perfil</strong>
      <p>Esta área é restrita a outros perfis. Na demonstração, troque de perfil pelo menu do usuário, no rodapé da barra lateral.</p>
      <Link href="/rh" className="btn btn--outline" style={{ marginTop: 10 }}>
        Voltar ao painel
      </Link>
    </div>
  );
}

export function NotFoundState({ what = "Registro" }: { what?: string }) {
  return (
    <div className="panel empty" style={{ marginTop: 40, padding: 56 }}>
      <span className="empty__icon">
        <SearchX aria-hidden />
      </span>
      <strong>{what} não encontrado</strong>
      <p>O item pode ter sido removido ou não está disponível para o seu perfil.</p>
      <Link href="/rh" className="btn btn--outline" style={{ marginTop: 10 }}>
        Voltar ao painel
      </Link>
    </div>
  );
}
