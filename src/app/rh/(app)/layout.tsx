import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { can, ROLE_LABEL } from "@/lib/permissions";
import { db, schema } from "@/db";
import { isDemoEnvironment } from "@/lib/public-data";
import { RhShell, type NavGroup } from "@/components/rh/shell";
import { visibleAnnouncementsWhere } from "@/lib/rh-scope";

export const dynamic = "force-dynamic";

export default async function RhAppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const isHr = can(user.role, "requests.manage");

  const pendingRequests = isHr
    ? db.select({ n: count() }).from(schema.requests).where(inArray(schema.requests.status, ["PENDENTE", "EM_ANALISE"])).get()!.n
    : 0;
  const pendingVacations = isHr ? db.select({ n: count() }).from(schema.vacations).where(eq(schema.vacations.status, "PENDENTE")).get()!.n : 0;
  const newCandidates = can(user.role, "recruitment.manage")
    ? db
        .select({ n: count() })
        .from(schema.applications)
        .where(and(eq(schema.applications.stage, "CANDIDATO"), eq(schema.applications.outcome, "EM_ANDAMENTO")))
        .get()!.n
    : 0;
  const myPendingDocs = user.employeeId
    ? db
        .select({ n: count() })
        .from(schema.documents)
        .where(and(eq(schema.documents.employeeId, user.employeeId), eq(schema.documents.status, "PENDENTE")))
        .get()!.n
    : 0;
  const unread = db
    .select({ n: count() })
    .from(schema.announcements)
    .leftJoin(schema.announcementReads, and(eq(schema.announcementReads.announcementId, schema.announcements.id), eq(schema.announcementReads.userId, user.id)))
    .where(and(visibleAnnouncementsWhere(user), isNull(schema.announcementReads.userId)))
    .get()!.n;

  const groups: NavGroup[] = [
    {
      label: "Visão geral",
      items: [
        { href: "/rh", label: "Painel", icon: "dashboard" },
        ...(can(user.role, "indicators.view") ? [{ href: "/rh/indicadores", label: "Indicadores", icon: "chart" as const }] : []),
      ],
    },
  ];
  const people = [];
  if (can(user.role, "employees.view_all")) people.push({ href: "/rh/funcionarios", label: "Funcionários", icon: "users" as const });
  else if (can(user.role, "employees.view_team")) people.push({ href: "/rh/funcionarios", label: "Minha equipe", icon: "users" as const });
  if (can(user.role, "recruitment.view")) people.push({ href: "/rh/recrutamento", label: "Recrutamento", icon: "kanban" as const, count: newCandidates || undefined });
  if (people.length) groups.push({ label: "Pessoas", items: people });

  groups.push({
    label: isHr ? "Gestão" : "Meu espaço",
    items: [
      { href: "/rh/solicitacoes", label: "Solicitações", icon: "inbox", count: isHr ? pendingRequests || undefined : undefined },
      { href: "/rh/ferias", label: "Férias", icon: "palm", count: isHr ? pendingVacations || undefined : undefined },
      { href: "/rh/documentos", label: "Documentos", icon: "file", count: !isHr && myPendingDocs ? myPendingDocs : undefined },
      { href: "/rh/comunicados", label: "Comunicados", icon: "megaphone", count: unread || undefined },
      ...(user.employeeId ? [{ href: "/rh/perfil", label: "Meu perfil", icon: "user" as const }] : []),
    ],
  });

  const admin = [];
  if (can(user.role, "users.manage")) admin.push({ href: "/rh/usuarios", label: "Usuários e acessos", icon: "key" as const });
  if (can(user.role, "audit.view")) admin.push({ href: "/rh/auditoria", label: "Auditoria", icon: "shield" as const });
  if (can(user.role, "messages.view")) {
    const newMsgs = db.select({ n: count() }).from(schema.contactMessages).where(eq(schema.contactMessages.status, "NOVA")).get()!.n;
    admin.push({ href: "/rh/mensagens", label: "Mensagens do site", icon: "mail" as const, count: newMsgs || undefined });
  }
  if (admin.length) groups.push({ label: "Administração", items: admin });

  return (
    <RhShell groups={groups} user={{ name: user.name, role: ROLE_LABEL[user.role], canSearchPeople: can(user.role, "employees.view_all") || can(user.role, "employees.view_team") }} demo={isDemoEnvironment()}>
      {children}
    </RhShell>
  );
}
