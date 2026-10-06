/*
 * Cria o banco (migrations em ./drizzle) e popula com DADOS DE DEMONSTRAÇÃO.
 *
 *   npm run db:setup          -> recria do zero (apaga data/ams.db e storage/)
 *   npm run db:setup -- --empty  -> recria apenas com o usuário administrador
 *
 * ATENÇÃO: todas as pessoas, vagas, candidaturas, documentos e números gerados aqui são
 * FICTÍCIOS e servem apenas para apresentar o sistema. Nenhum dado institucional da AMS é
 * inventado: departamentos e cargos são genéricos de uma indústria e devem ser substituídos
 * pelos reais antes da implantação. Registros de demo têm is_demo = 1.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import * as schema from "../src/db/schema";
import { hashPassword } from "../src/lib/password";
import type { Stage } from "../src/db/schema";

const ROOT = process.cwd();
const DB_PATH = process.env.DATABASE_PATH ?? path.join(ROOT, "data", "ams.db");
const STORAGE = process.env.STORAGE_PATH ?? path.join(ROOT, "storage");
const EMPTY = process.argv.includes("--empty");
export const DEMO_PASSWORD = "Ams@demo2026";

for (const f of [DB_PATH, DB_PATH + "-wal", DB_PATH + "-shm"]) if (existsSync(f)) rmSync(f);
rmSync(STORAGE, { recursive: true, force: true });
mkdirSync(path.dirname(DB_PATH), { recursive: true });
mkdirSync(STORAGE, { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });
migrate(db, { migrationsFolder: path.join(ROOT, "drizzle") });

/* ------------------------------------------------------------ utilidades */
let seed = 1977;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const today = new Date();
today.setHours(12, 0, 0, 0);
const day = (offset: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("sv-SE");
};
const at = (offsetDays: number, hour = 10, min = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
};
const workday = (offset: number) => {
  // aproxima para o próximo dia útil
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
};
const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** PDF mínimo válido (1 página com texto) para os arquivos de demonstração. */
function demoPdf(lines: string[]) {
  const esc = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[()\\]/g, "\\$&");
  const text = lines.map((l, i) => `BT /F1 ${i === 0 ? 16 : 11} Tf 60 ${760 - i * 22} Td (${esc(l)}) Tj ET`).join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const key = `${randomUUID()}.pdf`;
  writeFileSync(path.join(STORAGE, key), out, "latin1");
  return { storageKey: key, sizeBytes: Buffer.byteLength(out, "latin1"), mimeType: "application/pdf" };
}

async function main() {
  const pw = await hashPassword(DEMO_PASSWORD);

  if (EMPTY) {
    db.insert(schema.users)
      .values({ email: "admin@ams.example", name: "Administrador", passwordHash: pw, role: "ADMIN" })
      .run();
    console.log("Banco vazio criado. Login: admin@ams.example /", DEMO_PASSWORD);
    return;
  }

  /* ------------------------------------------------ departamentos e cargos */
  const DEPTS: { name: string; desc: string; positions: string[] }[] = [
    {
      name: "Produção",
      desc: "Estamparia, montagem e acabamento das linhas de fusíveis, cordoalhas e terminais.",
      positions: ["Supervisor de Produção", "Líder de Produção", "Operador de Máquinas", "Montador", "Auxiliar de Produção"],
    },
    {
      name: "Qualidade e Laboratório",
      desc: "Laboratório de testes e controle de qualidade dos produtos.",
      positions: ["Coordenador da Qualidade", "Técnico de Laboratório", "Inspetor de Qualidade"],
    },
    {
      name: "Engenharia e Manutenção",
      desc: "Ferramentaria, manutenção de máquinas e desenvolvimento de novos produtos.",
      positions: ["Coordenador de Engenharia", "Ferramenteiro", "Eletricista de Manutenção", "Projetista"],
    },
    {
      name: "Comercial",
      desc: "Atendimento a distribuidores, indústria e rede de representantes.",
      positions: ["Gerente Comercial", "Assistente Comercial", "Analista de Vendas"],
    },
    {
      name: "Exportação",
      desc: "Atendimento a clientes internacionais.",
      positions: ["Analista de Exportação", "Assistente de Exportação"],
    },
    {
      name: "Logística e Expedição",
      desc: "Almoxarifado, separação, embalagem e expedição de pedidos.",
      positions: ["Coordenador de Logística", "Conferente", "Auxiliar de Expedição", "Almoxarife"],
    },
    {
      name: "Administrativo e Financeiro",
      desc: "Financeiro, faturamento, compras e fiscal.",
      positions: ["Gerente Administrativo", "Analista Financeiro", "Assistente Administrativo", "Comprador"],
    },
    {
      name: "Recursos Humanos",
      desc: "Gestão de pessoas, recrutamento e departamento pessoal.",
      positions: ["Analista de RH", "Assistente de Departamento Pessoal"],
    },
  ];
  const deptId: Record<string, number> = {};
  const posId: Record<string, number> = {};
  for (const d of DEPTS) {
    const r = db
      .insert(schema.departments)
      .values({ name: d.name, slug: slug(d.name), description: d.desc })
      .returning({ id: schema.departments.id })
      .get();
    deptId[d.name] = r.id;
    for (const p of d.positions) {
      posId[p] = db
        .insert(schema.positions)
        .values({ title: p, departmentId: r.id })
        .returning({ id: schema.positions.id })
        .get().id;
    }
  }

  /* ------------------------------------------------------- funcionários */
  const FIRST_F = ["Ana", "Beatriz", "Camila", "Daniela", "Fernanda", "Gabriela", "Juliana", "Larissa", "Mariana", "Patrícia", "Renata", "Sabrina", "Tatiane", "Vanessa", "Aline", "Bruna", "Carla", "Débora", "Elaine", "Priscila"];
  const FIRST_M = ["André", "Bruno", "Carlos", "Diego", "Eduardo", "Felipe", "Gustavo", "Henrique", "Igor", "João", "Leandro", "Marcelo", "Nelson", "Otávio", "Paulo", "Rafael", "Rodrigo", "Sérgio", "Thiago", "Vinícius", "Wagner", "Alexandre", "Fábio", "Márcio"];
  const LAST = ["Almeida", "Barbosa", "Cardoso", "Carvalho", "Costa", "Dias", "Ferreira", "Gomes", "Lima", "Martins", "Mendes", "Moreira", "Nascimento", "Oliveira", "Pereira", "Ribeiro", "Rocha", "Santos", "Silva", "Souza", "Teixeira", "Vieira", "Araújo", "Campos", "Freitas", "Monteiro", "Nunes", "Pires", "Ramos", "Rezende"];
  const CITIES = ["Cotia", "Cotia", "Cotia", "Vargem Grande Paulista", "Itapevi", "Carapicuíba", "Embu das Artes", "Osasco", "São Paulo", "Jandira"];
  const usedNames = new Set<string>();
  const personName = () => {
    for (;;) {
      const n = `${rnd() < 0.5 ? pick(FIRST_F) : pick(FIRST_M)} ${pick(LAST)}`;
      if (!usedNames.has(n)) {
        usedNames.add(n);
        return n;
      }
    }
  };
  const emailOf = (n: string) => `${slug(n).replace(/-/g, ".")}@ams.example`;
  const phone = () => `(11) 9${int(1000, 9999)}-${int(1000, 9999)}`;

  type Emp = { id: number; name: string; dept: string; position: string; managerId: number | null; hiredAt: string };
  const emps: Emp[] = [];
  const addEmp = (
    name: string,
    dept: string,
    position: string,
    managerId: number | null,
    hiredAt: string,
    extra: Partial<typeof schema.employees.$inferInsert> = {},
  ) => {
    const r = db
      .insert(schema.employees)
      .values({
        name,
        positionId: posId[position],
        departmentId: deptId[dept],
        managerId,
        corporateEmail: emailOf(name),
        phone: phone(),
        city: pick(CITIES),
        hiredAt,
        employmentType: position.startsWith("Auxiliar") && rnd() < 0.15 ? "TEMPORARIO" : "CLT",
        vacationBalance: int(0, 30),
        isDemo: true,
        ...extra,
      })
      .returning({ id: schema.employees.id })
      .get();
    const e = { id: r.id, name, dept, position, managerId, hiredAt };
    emps.push(e);
    db.insert(schema.employeeHistory)
      .values({ employeeId: r.id, type: "ADMISSAO", description: `Admissão como ${position} em ${dept}.`, occurredAt: `${hiredAt}T12:00:00.000Z` })
      .run();
    return e;
  };

  // gestores (um por departamento)
  const managers: Record<string, Emp> = {};
  const mgrTitle: Record<string, string> = {
    Produção: "Supervisor de Produção",
    "Qualidade e Laboratório": "Coordenador da Qualidade",
    "Engenharia e Manutenção": "Coordenador de Engenharia",
    Comercial: "Gerente Comercial",
    Exportação: "Analista de Exportação",
    "Logística e Expedição": "Coordenador de Logística",
    "Administrativo e Financeiro": "Gerente Administrativo",
    "Recursos Humanos": "Analista de RH",
  };
  managers["Produção"] = addEmp("Ricardo Moreira", "Produção", "Supervisor de Produção", null, "2009-03-02");
  managers["Recursos Humanos"] = addEmp("Mariana Campos", "Recursos Humanos", "Analista de RH", null, "2014-08-11");
  usedNames.add("Ricardo Moreira");
  usedNames.add("Mariana Campos");
  for (const d of DEPTS) {
    if (managers[d.name]) continue;
    managers[d.name] = addEmp(personName(), d.name, mgrTitle[d.name], null, day(-int(2200, 6800)));
  }

  // equipe: distribuição típica de uma fábrica (a maior parte na produção)
  const TEAM: Record<string, [string, number][]> = {
    Produção: [["Líder de Produção", 2], ["Operador de Máquinas", 9], ["Montador", 7], ["Auxiliar de Produção", 5]],
    "Qualidade e Laboratório": [["Técnico de Laboratório", 2], ["Inspetor de Qualidade", 3]],
    "Engenharia e Manutenção": [["Ferramenteiro", 2], ["Eletricista de Manutenção", 1], ["Projetista", 1]],
    Comercial: [["Assistente Comercial", 2], ["Analista de Vendas", 2]],
    Exportação: [["Assistente de Exportação", 1]],
    "Logística e Expedição": [["Conferente", 2], ["Auxiliar de Expedição", 3], ["Almoxarife", 1]],
    "Administrativo e Financeiro": [["Analista Financeiro", 1], ["Assistente Administrativo", 2], ["Comprador", 1]],
    "Recursos Humanos": [["Assistente de Departamento Pessoal", 1]],
  };
  let funcionario: Emp | null = null;
  for (const [dept, list] of Object.entries(TEAM)) {
    for (const [pos, n] of list) {
      for (let i = 0; i < n; i++) {
        const name = !funcionario && pos === "Operador de Máquinas" ? "Lucas Pereira" : personName();
        usedNames.add(name);
        // ~12% admitidos nos últimos 6 meses (gera "novas contratações" e o gráfico mensal)
        const hired = rnd() < 0.14 ? day(-int(5, 175)) : day(-int(200, 6000));
        const e = addEmp(name, dept, pos, managers[dept].id, hired);
        if (name === "Lucas Pereira") funcionario = e;
      }
    }
  }
  // gestor de cada departamento se reporta à diretoria (fora do sistema); RH -> Administrativo
  // afastado e desligados de demonstração
  const prodOps = emps.filter((e) => e.dept === "Produção" && e.position === "Montador");
  db.update(schema.employees).set({ status: "AFASTADO" }).where(eqId(prodOps[1].id)).run();
  const terminated = [prodOps[2], emps.find((e) => e.position === "Auxiliar de Expedição")!, emps.find((e) => e.position === "Assistente Comercial")!];
  const termDays = [-38, -96, -150];
  terminated.forEach((e, i) => {
    db.update(schema.employees)
      .set({ status: "DESLIGADO", terminatedAt: day(termDays[i]), terminationReason: i === 1 ? "Pedido de demissão" : "Término de contrato" })
      .where(eqId(e.id))
      .run();
    db.insert(schema.employeeHistory)
      .values({ employeeId: e.id, type: "DESLIGAMENTO", description: i === 1 ? "Desligamento a pedido do colaborador." : "Desligamento por término de contrato.", occurredAt: at(termDays[i]) })
      .run();
  });
  // algumas promoções no histórico
  for (const e of emps.filter((x) => x.position === "Líder de Produção")) {
    db.insert(schema.employeeHistory)
      .values({ employeeId: e.id, type: "CARGO", description: "Promoção de Operador de Máquinas para Líder de Produção.", occurredAt: at(-int(300, 900)) })
      .run();
  }

  /* --------------------------------------------------------------- usuários */
  const mkUser = (email: string, name: string, role: schema.Role, employeeId: number | null) =>
    db
      .insert(schema.users)
      .values({ email, name, passwordHash: pw, role, employeeId, lastLoginAt: at(-1, 8, 12) })
      .returning({ id: schema.users.id })
      .get().id;
  const uAdmin = mkUser("admin@ams.example", "Administrador do Sistema", "ADMIN", null);
  const uRh = mkUser("rh@ams.example", "Mariana Campos", "RH", managers["Recursos Humanos"].id);
  const uGestor = mkUser("gestor@ams.example", "Ricardo Moreira", "GESTOR", managers["Produção"].id);
  const uFunc = mkUser("funcionario@ams.example", "Lucas Pereira", "FUNCIONARIO", funcionario!.id);
  const dp = emps.find((e) => e.position === "Assistente de Departamento Pessoal")!;
  const uDp = mkUser(emailOf(dp.name), dp.name, "RH", dp.id);
  const qual = managers["Qualidade e Laboratório"];
  mkUser(emailOf(qual.name), qual.name, "GESTOR", qual.id);

  /* ---------------------------------------------------------------- vagas */
  const V = [
    {
      title: "Operador de Máquinas",
      dept: "Produção",
      pos: "Operador de Máquinas",
      type: "CLT" as const,
      status: "ABERTA" as const,
      openings: 2,
      published: -21,
      summary: "Operação de prensas e máquinas automáticas na linha de fusíveis.",
      description:
        "Operar prensas excêntricas e máquinas automáticas de montagem.\nFazer setup simples e conferência dimensional das peças com instrumentos de medição.\nRegistrar a produção e apontar paradas e não conformidades.\nZelar pela organização e segurança do posto de trabalho.",
      requirements:
        "Ensino médio completo.\nExperiência de pelo menos 1 ano em operação de prensas ou máquinas automáticas.\nLeitura de paquímetro e micrômetro.\nDisponibilidade para trabalhar em Cotia, SP.",
      extra: "Desejável curso de NR-12. Jornada de segunda a sexta.",
    },
    {
      title: "Técnico de Laboratório da Qualidade",
      dept: "Qualidade e Laboratório",
      pos: "Técnico de Laboratório",
      type: "CLT" as const,
      status: "ABERTA" as const,
      openings: 1,
      published: -14,
      summary: "Ensaios elétricos e dimensionais em fusíveis e componentes.",
      description:
        "Executar ensaios elétricos e dimensionais conforme plano de inspeção.\nCalibrar e conservar equipamentos do laboratório.\nEmitir relatórios de ensaio e apoiar a análise de não conformidades.\nParticipar da aprovação de novos produtos.",
      requirements:
        "Curso técnico em Eletrotécnica, Eletrônica, Mecânica ou Qualidade.\nVivência com instrumentos de medição e registros de qualidade.\nPacote Office intermediário.",
      extra: "Diferencial: conhecimento de normas automotivas e ferramentas da qualidade.",
    },
    {
      title: "Assistente Comercial Interno",
      dept: "Comercial",
      pos: "Assistente Comercial",
      type: "CLT" as const,
      status: "ABERTA" as const,
      openings: 1,
      published: -9,
      summary: "Atendimento a distribuidores e apoio à rede de representantes.",
      description:
        "Atender distribuidores por telefone, e-mail e WhatsApp.\nCadastrar pedidos e acompanhar faturamento e entrega.\nApoiar os representantes com tabelas, catálogo e informações técnicas de produto.\nManter o cadastro de clientes atualizado.",
      requirements: "Ensino médio completo; superior em andamento é um diferencial.\nExperiência com atendimento comercial B2B.\nBoa comunicação escrita.",
      extra: null,
    },
    {
      title: "Analista de Exportação",
      dept: "Exportação",
      pos: "Analista de Exportação",
      type: "CLT" as const,
      status: "ABERTA" as const,
      openings: 1,
      published: -30,
      summary: "Processos de exportação e atendimento a clientes internacionais.",
      description:
        "Conduzir processos de exportação: documentação, cotação de frete e acompanhamento de embarques.\nAtender clientes internacionais em inglês e espanhol.\nInteragir com despachantes e transportadoras.",
      requirements: "Superior completo em Comércio Exterior, Administração ou áreas afins.\nInglês avançado; espanhol intermediário.\nExperiência com documentos de exportação.",
      extra: "Diferencial: experiência com autopeças.",
    },
    {
      title: "Eletricista de Manutenção",
      dept: "Engenharia e Manutenção",
      pos: "Eletricista de Manutenção",
      type: "CLT" as const,
      status: "RASCUNHO" as const,
      openings: 1,
      published: null,
      summary: "Manutenção elétrica preventiva e corretiva das máquinas da fábrica.",
      description: "Executar manutenção elétrica preventiva e corretiva.\nInterpretar diagramas elétricos e de comando.\nApoiar a instalação de novos equipamentos.",
      requirements: "Curso técnico em Eletrotécnica.\nNR-10 em dia.\nExperiência em ambiente industrial.",
      extra: null,
    },
    {
      title: "Auxiliar de Expedição",
      dept: "Logística e Expedição",
      pos: "Auxiliar de Expedição",
      type: "CLT" as const,
      status: "ENCERRADA" as const,
      openings: 1,
      published: -80,
      summary: "Separação, conferência e embalagem de pedidos.",
      description: "Separar e conferir pedidos.\nEmbalar e identificar volumes para expedição.\nApoiar o inventário do almoxarifado.",
      requirements: "Ensino fundamental completo.\nExperiência com separação de pedidos é um diferencial.",
      extra: null,
    },
  ];
  const vacancyIds: Record<string, number> = {};
  for (const v of V) {
    vacancyIds[v.title] = db
      .insert(schema.vacancies)
      .values({
        slug: slug(v.title),
        title: v.title,
        departmentId: deptId[v.dept],
        positionId: posId[v.pos],
        location: "Cotia, SP",
        employmentType: v.type,
        summary: v.summary,
        description: v.description,
        requirements: v.requirements,
        additionalInfo: v.extra,
        openings: v.openings,
        status: v.status,
        publishedAt: v.published == null ? null : at(v.published, 9),
        closedAt: v.status === "ENCERRADA" ? at(-40, 17) : null,
        createdById: uRh,
        isDemo: true,
      })
      .returning({ id: schema.vacancies.id })
      .get().id;
  }

  /* --------------------------------------------- candidatos e candidaturas */
  const plan: [string, Stage, number][] = [
    // vaga, etapa, quantidade
    ["Operador de Máquinas", "CANDIDATO", 5],
    ["Operador de Máquinas", "TRIAGEM", 4],
    ["Operador de Máquinas", "ENTREVISTA", 3],
    ["Operador de Máquinas", "AVALIACAO", 2],
    ["Operador de Máquinas", "APROVADO", 1],
    ["Técnico de Laboratório da Qualidade", "CANDIDATO", 3],
    ["Técnico de Laboratório da Qualidade", "TRIAGEM", 2],
    ["Técnico de Laboratório da Qualidade", "ENTREVISTA", 2],
    ["Técnico de Laboratório da Qualidade", "AVALIACAO", 1],
    ["Assistente Comercial Interno", "CANDIDATO", 4],
    ["Assistente Comercial Interno", "TRIAGEM", 2],
    ["Assistente Comercial Interno", "ENTREVISTA", 1],
    ["Analista de Exportação", "CANDIDATO", 2],
    ["Analista de Exportação", "TRIAGEM", 1],
    ["Analista de Exportação", "ENTREVISTA", 1],
    ["Analista de Exportação", "APROVADO", 1],
  ];
  const ORDER: Stage[] = ["CANDIDATO", "TRIAGEM", "ENTREVISTA", "AVALIACAO", "APROVADO", "CONTRATADO"];
  const NOTES: Partial<Record<Stage, string[]>> = {
    TRIAGEM: ["Currículo aderente; confirmar disponibilidade de horário.", "Experiência compatível. Agendar conversa inicial."],
    ENTREVISTA: ["Boa comunicação, conhece o processo de estampagem.", "Entrevista por vídeo realizada; seguir para conversa com o gestor."],
    AVALIACAO: ["Prova prática de leitura de instrumentos: bom resultado.", "Referências confirmadas."],
    APROVADO: ["Aprovado pelo gestor. Aguardando exames admissionais.", "Proposta aceita verbalmente."],
  };
  const interviewSlots = [workday(1), workday(1), workday(2), workday(3), workday(5), workday(6), workday(8)];
  let interviewIdx = 0;
  for (const [vacancy, stage, n] of plan) {
    for (let i = 0; i < n; i++) {
      const name = personName();
      const appliedOffset = -int(1, Math.min(28, 4 + ORDER.indexOf(stage) * 6));
      const cand = db
        .insert(schema.candidates)
        .values({
          name,
          email: `${slug(name).replace(/-/g, ".")}${int(10, 99)}@example.com`,
          phone: phone(),
          city: pick(CITIES),
          consentAt: at(appliedOffset, int(7, 22)),
          consentVersion: "2026-10",
          retainUntil: day(appliedOffset + 365),
          isDemo: true,
        })
        .returning({ id: schema.candidates.id })
        .get();
      const stageIdx = ORDER.indexOf(stage);
      const isInterview = stage === "ENTREVISTA" && interviewIdx < interviewSlots.length;
      const app = db
        .insert(schema.applications)
        .values({
          candidateId: cand.id,
          vacancyId: vacancyIds[vacancy],
          stage,
          message: rnd() < 0.6 ? "Tenho interesse na vaga e disponibilidade imediata. Moro próximo a Cotia." : null,
          notes: NOTES[stage] ? pick(NOTES[stage]!) : null,
          rating: stageIdx >= 2 ? int(3, 5) : stageIdx === 1 ? int(2, 4) : null,
          interviewAt: isInterview ? at(interviewSlots[interviewIdx++], pick([9, 10, 14, 15, 16]), pick([0, 30])) : null,
          lastActivityAt: at(Math.min(-0, appliedOffset + stageIdx * 2), int(8, 17)),
          createdAt: at(appliedOffset, int(7, 22)),
        })
        .returning({ id: schema.applications.id })
        .get();
      const resume = demoPdf([`Curriculo - ${name}`, "DOCUMENTO DE DEMONSTRACAO - dados ficticios", `Vaga: ${vacancy}`, "Experiencia profissional", "Formacao", "Cursos"]);
      db.insert(schema.documents)
        .values({ applicationId: app.id, category: "CURRICULO", title: "Currículo", status: "ENVIADO", originalName: `curriculo-${slug(name)}.pdf`, uploadedAt: at(appliedOffset), ...resume })
        .run();
      db.insert(schema.applicationEvents).values({ applicationId: app.id, type: "CRIADA", toStage: "CANDIDATO", note: "Candidatura recebida pelo site.", createdAt: at(appliedOffset, 9) }).run();
      for (let s = 1; s <= stageIdx; s++) {
        db.insert(schema.applicationEvents)
          .values({ applicationId: app.id, type: "ETAPA", fromStage: ORDER[s - 1], toStage: ORDER[s], actorUserId: uRh, createdAt: at(appliedOffset + s * 2, 10 + s) })
          .run();
      }
    }
  }
  // um processo concluído (vaga encerrada): candidato contratado que virou funcionário
  {
    const name = personName();
    const cand = db
      .insert(schema.candidates)
      .values({ name, email: `${slug(name).replace(/-/g, ".")}@example.com`, phone: phone(), city: "Cotia", consentAt: at(-75), consentVersion: "2026-10", retainUntil: day(290), isDemo: true })
      .returning({ id: schema.candidates.id })
      .get();
    const hiredDay = -44;
    const e = addEmp(name, "Logística e Expedição", "Auxiliar de Expedição", managers["Logística e Expedição"].id, day(hiredDay));
    const app = db
      .insert(schema.applications)
      .values({ candidateId: cand.id, vacancyId: vacancyIds["Auxiliar de Expedição"], stage: "CONTRATADO", outcome: "CONTRATADO", rating: 4, hiredEmployeeId: e.id, lastActivityAt: at(hiredDay), createdAt: at(-75) })
      .returning({ id: schema.applications.id })
      .get();
    db.update(schema.employees).set({ sourceApplicationId: app.id }).where(eqId(e.id)).run();
    ORDER.forEach((s, i) => {
      if (i === 0) db.insert(schema.applicationEvents).values({ applicationId: app.id, type: "CRIADA", toStage: "CANDIDATO", note: "Candidatura recebida pelo site.", createdAt: at(-75) }).run();
      else db.insert(schema.applicationEvents).values({ applicationId: app.id, type: i === 5 ? "CONTRATACAO" : "ETAPA", fromStage: ORDER[i - 1], toStage: s, actorUserId: uRh, createdAt: at(-75 + i * 6) }).run();
    });
  }

  /* ------------------------------------------------------------ documentos */
  const DOCS: [schema.DocCategory, string][] = [
    ["CONTRATO", "Contrato de trabalho"],
    ["IDENTIFICACAO", "Documento de identificação"],
    ["COMPROVANTE", "Comprovante de residência"],
  ];
  for (const e of emps) {
    for (const [cat, title] of DOCS) {
      if (rnd() < 0.15 && cat === "COMPROVANTE") continue;
      const f = demoPdf([title, "DOCUMENTO DE DEMONSTRACAO - dados ficticios", e.name]);
      db.insert(schema.documents)
        .values({ employeeId: e.id, category: cat, title, status: "VALIDADO", originalName: `${slug(title)}.pdf`, uploadedById: uDp, uploadedAt: `${e.hiredAt}T13:00:00.000Z`, reviewedById: uRh, reviewedAt: `${e.hiredAt}T15:00:00.000Z`, ...f })
        .run();
    }
  }
  // pendências: comprovante atualizado, certificado NR, atestado aguardando validação
  const active = emps.filter((e) => !terminated.includes(e));
  const pendings: [Emp, schema.DocCategory, string, number][] = [
    [funcionario!, "COMPROVANTE", "Comprovante de residência atualizado", 7],
    [active[8], "CERTIFICADO", "Certificado NR-12 (reciclagem)", 12],
    [active[14], "CERTIFICADO", "Certificado NR-12 (reciclagem)", 12],
    [active[21], "IDENTIFICACAO", "CNH atualizada", 5],
    [active[30], "COMPROVANTE", "Comprovante de escolaridade", -2],
    [active[36], "CERTIFICADO", "Certificado NR-10", 20],
  ];
  for (const [e, cat, title, due] of pendings) {
    db.insert(schema.documents)
      .values({ employeeId: e.id, category: cat, title, status: "PENDENTE", dueDate: day(due), requestedById: uRh, note: "Enviar em PDF ou foto legível.", createdAt: at(-int(2, 9)) })
      .run();
  }
  for (const e of [active[5], active[19]]) {
    const f = demoPdf(["Atestado medico", "DOCUMENTO DE DEMONSTRACAO - dados ficticios", e.name]);
    db.insert(schema.documents)
      .values({ employeeId: e.id, category: "ATESTADO", title: "Atestado médico", status: "ENVIADO", originalName: "atestado.pdf", uploadedById: uRh, uploadedAt: at(-1, 15), ...f })
      .run();
  }

  /* ---------------------------------------------------------------- férias */
  const vac = (e: Emp, start: number, days: number, status: "PENDENTE" | "APROVADO" | "RECUSADO", note?: string) =>
    db
      .insert(schema.vacations)
      .values({
        employeeId: e.id,
        startDate: day(start),
        endDate: day(start + days - 1),
        days,
        status,
        note: note ?? null,
        reviewedById: status === "PENDENTE" ? null : uRh,
        reviewedAt: status === "PENDENTE" ? null : at(-int(3, 20)),
        reviewNote: status === "RECUSADO" ? "Período coincide com o inventário anual. Sugerimos remarcar para a semana seguinte." : null,
        requestedById: uRh,
        createdAt: at(-int(5, 30)),
      })
      .run();
  const pool = active.filter((e) => e.id !== funcionario!.id);
  // passadas
  for (let i = 0; i < 10; i++) vac(pool[i * 3 + 1], -int(20, 300), pick([10, 15, 20, 30]), "APROVADO");
  // em andamento e próximas aprovadas
  vac(pool[2], -4, 15, "APROVADO");
  vac(pool[7], 3, 10, "APROVADO");
  vac(pool[12], 9, 20, "APROVADO");
  vac(pool[17], 16, 15, "APROVADO");
  vac(pool[24], 27, 30, "APROVADO");
  vac(managers["Comercial"], 40, 15, "APROVADO");
  // pendentes
  vac(pool[4], 22, 15, "PENDENTE", "Gostaria de emendar com o feriado.");
  vac(pool[9], 35, 10, "PENDENTE");
  vac(pool[27], 50, 20, "PENDENTE");
  vac(funcionario!, 63, 15, "PENDENTE", "Viagem em família.");
  vac(pool[13], 12, 10, "RECUSADO");

  /* ---------------------------------------------------------- solicitações */
  const empUser: Record<number, number> = { [funcionario!.id]: uFunc, [managers["Produção"].id]: uGestor, [managers["Recursos Humanos"].id]: uRh };
  const REQ: [Emp, schema.RequestType, string, string, schema.Priority, schema.RequestStatus, number, string | null][] = [
    [funcionario!, "DOCUMENTO", "Declaração de vínculo empregatício", "Preciso de uma declaração de vínculo para abertura de conta em banco.", "MEDIA", "PENDENTE", -1, null],
    [funcionario!, "ATUALIZACAO_CADASTRAL", "Alteração de endereço", "Mudei de endereço no mês passado. O comprovante novo segue anexado pela área de documentos.", "BAIXA", "CONCLUIDO", -24, "Endereço atualizado no cadastro. Obrigada!"],
    [active[6], "JUSTIFICATIVA", "Ausência por consulta médica", "Justificativa da ausência na manhã de terça-feira; o atestado foi enviado.", "MEDIA", "EM_ANALISE", -2, null],
    [active[11], "DOCUMENTO", "Informe de rendimentos", "Solicito a segunda via do informe de rendimentos do último ano.", "BAIXA", "PENDENTE", -3, null],
    [active[15], "OUTROS", "Troca de turno", "Gostaria de avaliar a troca para o turno da manhã a partir do próximo mês.", "MEDIA", "PENDENTE", -1, null],
    [active[18], "ATUALIZACAO_CADASTRAL", "Inclusão de dependente", "Nascimento do meu filho; preciso incluir como dependente.", "ALTA", "EM_ANALISE", -4, null],
    [active[22], "DOCUMENTO", "Cópia do contrato de trabalho", "Solicito uma cópia do meu contrato.", "BAIXA", "CONCLUIDO", -15, "Cópia disponibilizada na sua área de documentos."],
    [active[25], "JUSTIFICATIVA", "Atraso por problema no transporte", "Atraso de 40 minutos por interrupção da linha de ônibus.", "BAIXA", "APROVADO", -9, "Justificativa aceita."],
    [active[29], "OUTROS", "Ajuste no banco de horas", "Acredito que faltam 2 horas extras do dia 12 no banco de horas.", "MEDIA", "RECUSADO", -12, "Conferimos o ponto: as horas já constam no fechamento seguinte."],
    [active[33], "DOCUMENTO", "Declaração para faculdade", "Preciso de declaração de horário de trabalho para a faculdade.", "MEDIA", "PENDENTE", 0, null],
    [managers["Produção"], "OUTROS", "Treinamento NR-12 para a equipe", "Solicito agendar a reciclagem de NR-12 para os operadores admitidos este ano.", "ALTA", "EM_ANALISE", -5, null],
  ];
  for (const [e, type, subject, message, priority, status, off, response] of REQ) {
    db.insert(schema.requests)
      .values({
        authorUserId: empUser[e.id] ?? uDp,
        employeeId: e.id,
        type,
        subject,
        message,
        priority,
        status,
        response,
        responderUserId: response ? uRh : null,
        respondedAt: response ? at(off + 1, 11) : null,
        createdAt: at(off, int(8, 16)),
        updatedAt: at(off + (response ? 1 : 0), 11),
      })
      .run();
  }

  /* ----------------------------------------------------------- comunicados */
  const ANN: [string, string, "NORMAL" | "IMPORTANTE" | "URGENTE", "TODOS" | "DEPARTAMENTO" | "GESTORES", string | null, number][] = [
    ["Atualização cadastral anual", "Até o fim do mês, confira seus dados na área Meu perfil e envie comprovante de residência atualizado pela área de documentos. Dúvidas: fale com o RH.", "IMPORTANTE", "TODOS", null, -2],
    ["Reciclagem de NR-12", "A reciclagem de NR-12 para operadores acontece em duas turmas na próxima semana. A lista de participantes foi enviada aos líderes.", "NORMAL", "DEPARTAMENTO", "Produção", -4],
    ["Programação de férias coletivas", "Gestores: enviem até sexta-feira a previsão de férias da equipe para o próximo trimestre, para planejarmos a produção.", "IMPORTANTE", "GESTORES", null, -6],
    ["Novo canal de solicitações", "Pedidos de declarações, atualização cadastral e justificativas agora são feitos pelo próprio sistema, na área Solicitações. Você acompanha o andamento e recebe a resposta do RH por lá.", "NORMAL", "TODOS", null, -10],
    ["Simulado de evacuação", "Haverá simulado de evacuação na quinta-feira às 15h. Siga as orientações da brigada.", "URGENTE", "TODOS", null, -1],
  ];
  for (const [title, body, priority, audience, dept, off] of ANN) {
    db.insert(schema.announcements)
      .values({ title, body, priority, audience, audienceDepartmentId: dept ? deptId[dept] : null, publishedAt: at(off, 9, 30), authorUserId: uRh })
      .run();
  }

  /* -------------------------------------------------------------- auditoria */
  const AUD: [number | null, string, string, string, number][] = [
    [uRh, "Mariana Campos", "LOGIN", "Login realizado", -1],
    [uRh, "Mariana Campos", "MUDANCA_ETAPA", "Candidatura movida de Triagem para Entrevista (Operador de Máquinas)", -1],
    [uRh, "Mariana Campos", "PUBLICACAO", "Vaga publicada: Assistente Comercial Interno", -9],
    [uRh, "Mariana Campos", "APROVACAO", "Férias aprovadas", -6],
    [uGestor, "Ricardo Moreira", "LOGIN", "Login realizado", -2],
    [uAdmin, "Administrador do Sistema", "PERMISSAO", "Perfil de acesso definido como RH para o Departamento Pessoal", -30],
    [uRh, "Mariana Campos", "CONTRATACAO", "Candidato contratado: Auxiliar de Expedição", -44],
  ];
  for (const [uid, label, action, summary, off] of AUD) {
    db.insert(schema.auditLogs).values({ userId: uid, actorLabel: label, action, summary, ip: "demo", createdAt: at(off, int(8, 17), int(0, 59)) }).run();
  }

  db.insert(schema.contactMessages)
    .values([
      { name: "Contato de demonstração", email: "contato@example.com", subject: "Revenda", message: "Mensagem fictícia de demonstração enviada pelo formulário de contato.", city: "Campinas", createdAt: at(-2) },
    ])
    .run();

  console.log(`Banco criado em ${path.relative(ROOT, DB_PATH)} com dados de demonstração.`);
  console.log(`Funcionários: ${emps.length} | Vagas: ${V.length}`);
  console.log(`Logins (senha ${DEMO_PASSWORD}): admin@ams.example, rh@ams.example, gestor@ams.example, funcionario@ams.example`);
}

import { eq } from "drizzle-orm";
function eqId(id: number) {
  return eq(schema.employees.id, id);
}

main().then(() => sqlite.close());
