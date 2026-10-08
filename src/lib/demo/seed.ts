/*
 * Dados de DEMONSTRAÇÃO do RH. Tudo aqui é fictício: pessoas, vagas, candidaturas, documentos e
 * números servem apenas para apresentar o sistema. Departamentos e cargos são genéricos de uma
 * indústria. O gerador é determinístico (mesma semente = mesmos nomes e ids) e as datas são
 * relativas ao dia em que roda, para a demonstração parecer sempre atual.
 */
import type {
  ApplicationEvent,
  AuditLog,
  DemoData,
  DocCategory,
  DocumentRow,
  Employee,
  EmployeeHistory,
  EmploymentType,
  Priority,
  RequestStatus,
  RequestType,
  Role,
  Stage,
  Vacancy,
  Vacation,
} from "./types";

export const DEMO_VERSION = 4;

export const DEMO_PERSONAS = [
  { userId: 2, role: "RH" as Role, title: "Recursos Humanos", person: "Mariana Campos", detail: "Analista de RH", email: "rh@ams.example" },
  { userId: 3, role: "GESTOR" as Role, title: "Gestor", person: "Ricardo Moreira", detail: "Supervisor de Produção", email: "gestor@ams.example" },
  { userId: 4, role: "FUNCIONARIO" as Role, title: "Funcionário", person: "Lucas Pereira", detail: "Operador de Máquinas", email: "funcionario@ams.example" },
  { userId: 1, role: "ADMIN" as Role, title: "Administrador", person: "Administrador do Sistema", detail: "Acesso completo", email: "admin@ams.example" },
];

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export function createSeed(now = new Date()): DemoData {
  let seed = 1977;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
  const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));

  const today = new Date(now);
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
    // eventos de hoje nunca ficam depois do momento atual
    if (offsetDays <= 0 && d > now) d.setTime(now.getTime() - ((hour * 7 + min) % 50 + 5) * 60000);
    return d.toISOString();
  };
  const workday = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return Math.round((d.getTime() - today.getTime()) / 86400000);
  };

  const data: DemoData = {
    version: DEMO_VERSION,
    seededOn: day(0),
    departments: [],
    positions: [],
    employees: [],
    users: [],
    vacancies: [],
    candidates: [],
    applications: [],
    applicationEvents: [],
    documents: [],
    vacations: [],
    requests: [],
    announcements: [],
    announcementReads: [],
    employeeHistory: [],
    auditLogs: [],
    contactMessages: [],
    seenNotifications: {},
    seq: {},
  };
  const nextId = (table: string) => (data.seq[table] = (data.seq[table] ?? 0) + 1);

  /* ------------------------------------------------ departamentos e cargos */
  const DEPTS: { name: string; desc: string; positions: string[] }[] = [
    { name: "Produção", desc: "Estamparia, montagem e acabamento das linhas de fusíveis, cordoalhas e terminais.", positions: ["Supervisor de Produção", "Líder de Produção", "Analista de Produção", "Operador de Máquinas", "Montador", "Auxiliar de Produção"] },
    { name: "Qualidade e Laboratório", desc: "Laboratório de testes e controle de qualidade dos produtos.", positions: ["Coordenador da Qualidade", "Técnico de Laboratório", "Inspetor de Qualidade"] },
    { name: "Engenharia e Manutenção", desc: "Ferramentaria, manutenção de máquinas e desenvolvimento de novos produtos.", positions: ["Coordenador de Engenharia", "Ferramenteiro", "Eletricista de Manutenção", "Projetista"] },
    { name: "Comercial", desc: "Atendimento a distribuidores, indústria e rede de representantes.", positions: ["Gerente Comercial", "Assistente Comercial", "Analista de Vendas"] },
    { name: "Exportação", desc: "Atendimento a clientes internacionais.", positions: ["Coordenador de Exportação", "Analista de Exportação", "Assistente de Exportação"] },
    { name: "Logística e Expedição", desc: "Almoxarifado, separação, embalagem e expedição de pedidos.", positions: ["Coordenador de Logística", "Conferente", "Auxiliar de Expedição", "Almoxarife"] },
    { name: "Administrativo e Financeiro", desc: "Financeiro, faturamento, compras e fiscal.", positions: ["Gerente Administrativo", "Analista Financeiro", "Assistente Administrativo", "Comprador"] },
    { name: "Recursos Humanos", desc: "Gestão de pessoas, recrutamento e departamento pessoal.", positions: ["Analista de RH", "Assistente de Departamento Pessoal"] },
  ];
  const deptId: Record<string, number> = {};
  const posId: Record<string, number> = {};
  for (const d of DEPTS) {
    const id = nextId("departments");
    data.departments.push({ id, name: d.name, slug: slug(d.name), description: d.desc });
    deptId[d.name] = id;
    for (const p of d.positions) {
      const pid = nextId("positions");
      data.positions.push({ id: pid, title: p, departmentId: id });
      posId[p] = pid;
    }
  }

  /* ------------------------------------------------------- funcionários */
  const FIRST_F = ["Ana", "Beatriz", "Camila", "Daniela", "Fernanda", "Gabriela", "Juliana", "Larissa", "Mariana", "Patrícia", "Renata", "Sabrina", "Tatiane", "Vanessa", "Aline", "Bruna", "Carla", "Débora", "Elaine", "Priscila", "Luana", "Natália", "Isabela", "Jéssica", "Letícia", "Rafaela", "Simone", "Viviane", "Adriana", "Cristiane"];
  const FIRST_M = ["André", "Bruno", "Carlos", "Diego", "Eduardo", "Felipe", "Gustavo", "Henrique", "Igor", "João", "Leandro", "Marcelo", "Nelson", "Otávio", "Paulo", "Rafael", "Rodrigo", "Sérgio", "Thiago", "Vinícius", "Wagner", "Alexandre", "Fábio", "Márcio", "Nicolas", "Matheus", "Gabriel", "Renan", "Caio", "Daniel", "Everton", "Roberto", "Luiz", "Antônio", "Júlio", "Robson"];
  const LAST = ["Almeida", "Barbosa", "Cardoso", "Carvalho", "Costa", "Dias", "Ferreira", "Gomes", "Lima", "Martins", "Mendes", "Moreira", "Nascimento", "Oliveira", "Pereira", "Ribeiro", "Rocha", "Santos", "Silva", "Souza", "Teixeira", "Vieira", "Araújo", "Campos", "Freitas", "Monteiro", "Nunes", "Pires", "Ramos", "Rezende", "Batista", "Correia", "Fonseca", "Machado", "Lopes", "Siqueira", "Prado", "Andrade", "Castro", "Duarte"];
  const CITIES = ["Cotia", "Cotia", "Cotia", "Cotia", "Vargem Grande Paulista", "Itapevi", "Carapicuíba", "Embu das Artes", "Osasco", "São Paulo", "Jandira", "Barueri"];
  const usedNames = new Set<string>(["Ricardo Moreira", "Mariana Campos", "Lucas Pereira"]);
  const personName = () => {
    for (;;) {
      const n = `${rnd() < 0.42 ? pick(FIRST_F) : pick(FIRST_M)} ${pick(LAST)}`;
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
  const history = (h: Omit<EmployeeHistory, "id">) => data.employeeHistory.push({ id: nextId("employeeHistory"), ...h });
  const addEmp = (name: string, dept: string, position: string, managerId: number | null, hiredAt: string, extra: Partial<Employee> = {}) => {
    const id = nextId("employees");
    const type: EmploymentType = position.startsWith("Auxiliar") && rnd() < 0.15 ? "TEMPORARIO" : "CLT";
    data.employees.push({
      id,
      name,
      photo: null,
      positionId: posId[position],
      departmentId: deptId[dept],
      managerId,
      corporateEmail: emailOf(name),
      personalEmail: rnd() < 0.7 ? `${slug(name).replace(/-/g, "")}${int(10, 99)}@example.com` : null,
      phone: phone(),
      city: pick(CITIES),
      hiredAt,
      employmentType: type,
      status: "ATIVO",
      terminatedAt: null,
      terminationReason: null,
      vacationBalance: int(0, 30),
      sourceApplicationId: null,
      createdAt: `${hiredAt}T12:00:00.000Z`,
      updatedAt: `${hiredAt}T12:00:00.000Z`,
      ...extra,
    });
    const e = { id, name, dept, position, managerId, hiredAt };
    emps.push(e);
    history({ employeeId: id, type: "ADMISSAO", description: `Admissão como ${position} em ${dept}.`, actorUserId: null, occurredAt: `${hiredAt}T12:00:00.000Z` });
    return e;
  };
  const empRow = (id: number) => data.employees.find((e) => e.id === id)!;

  // gestores (um por departamento)
  const managers: Record<string, Emp> = {};
  const mgrTitle: Record<string, string> = {
    Produção: "Supervisor de Produção",
    "Qualidade e Laboratório": "Coordenador da Qualidade",
    "Engenharia e Manutenção": "Coordenador de Engenharia",
    Comercial: "Gerente Comercial",
    Exportação: "Coordenador de Exportação",
    "Logística e Expedição": "Coordenador de Logística",
    "Administrativo e Financeiro": "Gerente Administrativo",
    "Recursos Humanos": "Analista de RH",
  };
  managers["Produção"] = addEmp("Ricardo Moreira", "Produção", "Supervisor de Produção", null, "2009-03-02");
  managers["Recursos Humanos"] = addEmp("Mariana Campos", "Recursos Humanos", "Analista de RH", null, "2014-08-11");
  for (const d of DEPTS) {
    if (managers[d.name]) continue;
    managers[d.name] = addEmp(personName(), d.name, mgrTitle[d.name], null, day(-int(2200, 6800)));
  }
  empRow(managers["Produção"].id).vacationBalance = 12;
  empRow(managers["Recursos Humanos"].id).vacationBalance = 18;

  // equipe: distribuição típica de uma fábrica (a maior parte na produção)
  const TEAM: Record<string, [string, number][]> = {
    Produção: [["Líder de Produção", 4], ["Analista de Produção", 2], ["Operador de Máquinas", 31], ["Montador", 23], ["Auxiliar de Produção", 13]],
    "Qualidade e Laboratório": [["Técnico de Laboratório", 4], ["Inspetor de Qualidade", 6]],
    "Engenharia e Manutenção": [["Ferramenteiro", 4], ["Eletricista de Manutenção", 3], ["Projetista", 2]],
    Comercial: [["Assistente Comercial", 4], ["Analista de Vendas", 4]],
    Exportação: [["Analista de Exportação", 1], ["Assistente de Exportação", 1]],
    "Logística e Expedição": [["Conferente", 4], ["Auxiliar de Expedição", 6], ["Almoxarife", 2]],
    "Administrativo e Financeiro": [["Analista Financeiro", 2], ["Assistente Administrativo", 3], ["Comprador", 2]],
    "Recursos Humanos": [["Assistente de Departamento Pessoal", 2]],
  };
  let funcionario: Emp | null = null;
  for (const [dept, list] of Object.entries(TEAM)) {
    for (const [pos, n] of list) {
      for (let i = 0; i < n; i++) {
        const isLucas = !funcionario && pos === "Operador de Máquinas";
        const name = isLucas ? "Lucas Pereira" : personName();
        // ~13% admitidos nos últimos 6 meses (gera "novas contratações" e o gráfico mensal)
        const hired = isLucas ? day(-1130) : rnd() < 0.13 ? day(-int(5, 175)) : day(-int(200, 6000));
        const e = addEmp(name, dept, pos, managers[dept].id, hired);
        if (isLucas) {
          funcionario = e;
          Object.assign(empRow(e.id), { city: "Cotia", vacationBalance: 30, phone: "(11) 97342-1180", personalEmail: "lucas.pereira.cotia@example.com" });
        }
      }
    }
  }
  const lucas = funcionario!;

  // afastado e desligados de demonstração
  const prodOps = emps.filter((e) => e.dept === "Produção" && e.position === "Montador");
  empRow(prodOps[1].id).status = "AFASTADO";
  history({ employeeId: prodOps[1].id, type: "STATUS", description: "Situação alterada para Afastado (licença médica).", actorUserId: 2, occurredAt: at(-18, 10) });
  const terminated = [
    prodOps[2],
    emps.find((e) => e.position === "Auxiliar de Expedição")!,
    emps.find((e) => e.position === "Assistente Comercial")!,
    emps.filter((e) => e.position === "Operador de Máquinas")[6],
    emps.filter((e) => e.position === "Auxiliar de Produção")[3],
  ];
  const termDays = [-38, -96, -150, -212, -301];
  const termReasons = ["Término de contrato", "Pedido de demissão", "Término de contrato", "Pedido de demissão", "Término de contrato temporário"];
  terminated.forEach((e, i) => {
    Object.assign(empRow(e.id), { status: "DESLIGADO", terminatedAt: day(termDays[i]), terminationReason: termReasons[i] });
    history({
      employeeId: e.id,
      type: "DESLIGAMENTO",
      description: termReasons[i] === "Pedido de demissão" ? "Desligamento a pedido do colaborador." : "Desligamento por término de contrato.",
      actorUserId: 2,
      occurredAt: at(termDays[i]),
    });
  });
  // promoções e transferências no histórico
  for (const e of emps.filter((x) => x.position === "Líder de Produção")) {
    history({ employeeId: e.id, type: "CARGO", description: "Promoção de Operador de Máquinas para Líder de Produção.", actorUserId: 2, occurredAt: at(-int(300, 900)) });
  }
  for (const e of emps.filter((x) => x.position === "Analista de Produção")) {
    history({ employeeId: e.id, type: "CARGO", description: "Promoção de Montador para Analista de Produção.", actorUserId: 2, occurredAt: at(-int(120, 400)) });
  }
  history({ employeeId: lucas.id, type: "CADASTRO", description: "Dados cadastrais atualizados (endereço).", actorUserId: 2, occurredAt: at(-23, 11) });

  /* --------------------------------------------------------------- usuários */
  const dp = emps.find((e) => e.position === "Assistente de Departamento Pessoal")!;
  const mkUser = (email: string, name: string, role: Role, employeeId: number | null, lastLogin: string | null) => {
    const id = nextId("users");
    data.users.push({ id, email, name, role, employeeId, active: true, lastLoginAt: lastLogin, passwordChangedAt: at(-int(20, 120), 9), createdAt: at(-400) });
    return id;
  };
  const uAdmin = mkUser("admin@ams.example", "Administrador do Sistema", "ADMIN", null, at(-2, 8, 4));
  const uRh = mkUser("rh@ams.example", "Mariana Campos", "RH", managers["Recursos Humanos"].id, at(0, 8, 2));
  const uGestor = mkUser("gestor@ams.example", "Ricardo Moreira", "GESTOR", managers["Produção"].id, at(-1, 7, 48));
  const uFunc = mkUser("funcionario@ams.example", "Lucas Pereira", "FUNCIONARIO", lucas.id, at(-3, 12, 15));
  const uDp = mkUser(emailOf(dp.name), dp.name, "RH", dp.id, at(0, 7, 55));
  for (const d of ["Qualidade e Laboratório", "Logística e Expedição", "Comercial"]) mkUser(emailOf(managers[d].name), managers[d].name, "GESTOR", managers[d].id, at(-int(1, 6), int(8, 17), int(0, 59)));
  mkUser(emailOf(managers["Administrativo e Financeiro"].name), managers["Administrativo e Financeiro"].name, "GESTOR", managers["Administrativo e Financeiro"].id, null);
  data.users.find((u) => u.id === data.users.length)!.active = false;

  /* ---------------------------------------------------------------- vagas */
  type V = { title: string; dept: string; pos: string; type: EmploymentType; status: Vacancy["status"]; openings: number; published: number | null; summary: string; description: string; requirements: string; extra: string | null };
  const VAGAS: V[] = [
    {
      title: "Operador de Máquinas",
      dept: "Produção",
      pos: "Operador de Máquinas",
      type: "CLT",
      status: "ABERTA",
      openings: 2,
      published: -21,
      summary: "Operação de prensas e máquinas automáticas na linha de fusíveis.",
      description:
        "Operar prensas excêntricas e máquinas automáticas de montagem.\nFazer setup simples e conferência dimensional das peças com instrumentos de medição.\nRegistrar a produção e apontar paradas e não conformidades.\nZelar pela organização e segurança do posto de trabalho.",
      requirements: "Ensino médio completo.\nExperiência de pelo menos 1 ano em operação de prensas ou máquinas automáticas.\nLeitura de paquímetro e micrômetro.\nDisponibilidade para trabalhar em Cotia, SP.",
      extra: "Desejável curso de NR-12.\nJornada de segunda a sexta-feira.",
    },
    {
      title: "Técnico de Laboratório da Qualidade",
      dept: "Qualidade e Laboratório",
      pos: "Técnico de Laboratório",
      type: "CLT",
      status: "ABERTA",
      openings: 1,
      published: -14,
      summary: "Ensaios elétricos e dimensionais em fusíveis e componentes.",
      description:
        "Executar ensaios elétricos e dimensionais conforme plano de inspeção.\nCalibrar e conservar equipamentos do laboratório.\nEmitir relatórios de ensaio e apoiar a análise de não conformidades.\nParticipar da aprovação de novos produtos.",
      requirements: "Curso técnico em Eletrotécnica, Eletrônica, Mecânica ou Qualidade.\nVivência com instrumentos de medição e registros de qualidade.\nPacote Office intermediário.",
      extra: "Diferencial: conhecimento de normas automotivas e ferramentas da qualidade.",
    },
    {
      title: "Assistente Comercial Interno",
      dept: "Comercial",
      pos: "Assistente Comercial",
      type: "CLT",
      status: "ABERTA",
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
      type: "CLT",
      status: "ABERTA",
      openings: 1,
      published: -30,
      summary: "Processos de exportação e atendimento a clientes internacionais.",
      description: "Conduzir processos de exportação: documentação, cotação de frete e acompanhamento de embarques.\nAtender clientes internacionais em inglês e espanhol.\nInteragir com despachantes e transportadoras.",
      requirements: "Superior completo em Comércio Exterior, Administração ou áreas afins.\nInglês avançado; espanhol intermediário.\nExperiência com documentos de exportação.",
      extra: "Diferencial: experiência com autopeças.",
    },
    {
      title: "Auxiliar de Produção",
      dept: "Produção",
      pos: "Auxiliar de Produção",
      type: "CLT",
      status: "ABERTA",
      openings: 3,
      published: -26,
      summary: "Apoio às linhas de montagem, embalagem e abastecimento de componentes.",
      description: "Abastecer as linhas de montagem com componentes e embalagens.\nEmbalar, etiquetar e conferir lotes de produtos acabados.\nApoiar a inspeção visual e a separação de peças não conformes.\nManter o posto de trabalho limpo e organizado.",
      requirements: "Ensino fundamental completo.\nDisponibilidade para trabalhar em Cotia, SP.\nExperiência em linha de produção é um diferencial.",
      extra: "Oportunidade de primeiro emprego na indústria.",
    },
    {
      title: "Eletricista de Manutenção",
      dept: "Engenharia e Manutenção",
      pos: "Eletricista de Manutenção",
      type: "CLT",
      status: "RASCUNHO",
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
      type: "CLT",
      status: "ENCERRADA",
      openings: 1,
      published: -80,
      summary: "Separação, conferência e embalagem de pedidos.",
      description: "Separar e conferir pedidos.\nEmbalar e identificar volumes para expedição.\nApoiar o inventário do almoxarifado.",
      requirements: "Ensino fundamental completo.\nExperiência com separação de pedidos é um diferencial.",
      extra: null,
    },
  ];
  const vacancyIds: Record<string, number> = {};
  for (const v of VAGAS) {
    const id = nextId("vacancies");
    vacancyIds[v.title] = id;
    data.vacancies.push({
      id,
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
      createdAt: at((v.published ?? -3) - 2, 15),
      updatedAt: at(v.published ?? -3, 9),
    });
  }

  /* --------------------------------------------- candidatos e candidaturas */
  const plan: [string, Stage, number][] = [
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
    ["Auxiliar de Produção", "CANDIDATO", 4],
    ["Auxiliar de Produção", "TRIAGEM", 3],
    ["Auxiliar de Produção", "ENTREVISTA", 1],
    ["Auxiliar de Produção", "AVALIACAO", 1],
  ];
  const ORDER: Stage[] = ["CANDIDATO", "TRIAGEM", "ENTREVISTA", "AVALIACAO", "APROVADO", "CONTRATADO"];
  const NOTES: Partial<Record<Stage, string[]>> = {
    TRIAGEM: ["Currículo aderente; confirmar disponibilidade de horário.", "Experiência compatível. Agendar conversa inicial.", "Mora perto da fábrica; perfil alinhado à vaga."],
    ENTREVISTA: ["Boa comunicação, conhece o processo de estampagem.", "Entrevista por vídeo realizada; seguir para conversa com o gestor.", "Demonstrou interesse em crescer na área."],
    AVALIACAO: ["Prova prática de leitura de instrumentos: bom resultado.", "Referências confirmadas com os dois últimos empregadores."],
    APROVADO: ["Aprovado pelo gestor. Aguardando exames admissionais.", "Proposta aceita verbalmente; início previsto em duas semanas."],
  };
  const MESSAGES = [
    "Tenho interesse na vaga e disponibilidade imediata. Moro próximo a Cotia.",
    "Trabalhei por três anos em indústria metalúrgica e gostaria de fazer parte da equipe da AMS.",
    "Busco uma oportunidade para crescer em uma empresa sólida do setor automotivo.",
    "Tenho experiência na área e conheço os produtos da AMS pelo trabalho em autopeças.",
  ];
  const EDU: Record<string, string[]> = {
    "Operador de Máquinas": ["Ensino médio completo", "Curso técnico"],
    "Técnico de Laboratório da Qualidade": ["Curso técnico", "Superior em andamento"],
    "Assistente Comercial Interno": ["Ensino médio completo", "Superior em andamento"],
    "Analista de Exportação": ["Superior completo", "Pós-graduação"],
    "Auxiliar de Produção": ["Ensino fundamental completo", "Ensino médio completo"],
    "Auxiliar de Expedição": ["Ensino fundamental completo", "Ensino médio completo"],
  };
  const EXP = ["Primeiro emprego", "Menos de 1 ano", "1 a 3 anos", "1 a 3 anos", "3 a 5 anos", "Mais de 5 anos"];
  const interviewSlots = [workday(1), workday(1), workday(2), workday(3), workday(5), workday(6), workday(8), workday(9)];
  let interviewIdx = 0;

  const event = (e: Omit<ApplicationEvent, "id">) => data.applicationEvents.push({ id: nextId("applicationEvents"), ...e });
  const addCandidate = (name: string, vacancy: string, appliedOffset: number, city = pick(CITIES)) => {
    const id = nextId("candidates");
    const exp = vacancy === "Auxiliar de Produção" ? pick(EXP.slice(0, 3)) : pick(EXP.slice(1));
    data.candidates.push({
      id,
      name,
      email: `${slug(name).replace(/-/g, ".")}${int(10, 99)}@example.com`,
      phone: phone(),
      city,
      education: pick(EDU[vacancy] ?? ["Ensino médio completo"]),
      experience: exp,
      linkedin: rnd() < 0.45 ? `linkedin.com/in/${slug(name)}-${int(100, 999)}` : null,
      consentAt: at(appliedOffset, int(7, 22)),
      consentVersion: "2026-10",
      retainUntil: day(appliedOffset + 365),
      createdAt: at(appliedOffset, int(7, 22)),
    });
    return id;
  };
  const addResume = (appId: number, name: string, offset: number) =>
    data.documents.push({
      id: nextId("documents"),
      employeeId: null,
      applicationId: appId,
      category: "CURRICULO",
      title: "Currículo",
      storageKey: "demo",
      originalName: `curriculo-${slug(name)}.pdf`,
      mimeType: "application/pdf",
      sizeBytes: int(88, 420) * 1024,
      status: "ENVIADO",
      dueDate: null,
      note: null,
      requestedById: null,
      uploadedById: null,
      uploadedAt: at(offset, 9),
      reviewedById: null,
      reviewedAt: null,
      createdAt: at(offset, 9),
    });

  for (const [vacancy, stage, n] of plan) {
    for (let i = 0; i < n; i++) {
      const name = personName();
      const stageIdx = ORDER.indexOf(stage);
      const appliedOffset = -int(1, Math.min(28, 3 + stageIdx * 6));
      const candidateId = addCandidate(name, vacancy, appliedOffset);
      const isInterview = stage === "ENTREVISTA" && interviewIdx < interviewSlots.length;
      const id = nextId("applications");
      data.applications.push({
        id,
        candidateId,
        vacancyId: vacancyIds[vacancy],
        stage,
        outcome: "EM_ANDAMENTO",
        message: rnd() < 0.7 ? pick(MESSAGES) : null,
        notes: NOTES[stage] ? pick(NOTES[stage]!) : null,
        rating: stageIdx >= 2 ? int(3, 5) : stageIdx === 1 ? int(2, 4) : null,
        interviewAt: isInterview ? at(interviewSlots[interviewIdx++], pick([9, 10, 14, 15, 16]), pick([0, 30])) : null,
        hiredEmployeeId: null,
        lastActivityAt: at(Math.min(0, appliedOffset + stageIdx * 2), int(8, 17)),
        createdAt: at(appliedOffset, int(7, 22)),
      });
      addResume(id, name, appliedOffset);
      event({ applicationId: id, type: "CRIADA", fromStage: null, toStage: "CANDIDATO", note: "Candidatura recebida pelo site.", actorUserId: null, createdAt: at(appliedOffset, 9) });
      for (let s = 1; s <= stageIdx; s++) {
        event({ applicationId: id, type: "ETAPA", fromStage: ORDER[s - 1], toStage: ORDER[s], note: null, actorUserId: s % 3 === 0 ? uDp : uRh, createdAt: at(Math.min(0, appliedOffset + s * 2), 10 + s) });
      }
      const app = data.applications[data.applications.length - 1];
      if (app.interviewAt) event({ applicationId: id, type: "ENTREVISTA", fromStage: null, toStage: null, note: "Entrevista agendada com o RH e o gestor da área.", actorUserId: uRh, createdAt: at(Math.min(0, appliedOffset + 5), 16) });
      if (app.rating && stageIdx >= 3) event({ applicationId: id, type: "AVALIACAO", fromStage: null, toStage: null, note: `Avaliação: ${app.rating} de 5. ${app.notes ?? ""}`.trim(), actorUserId: uRh, createdAt: app.lastActivityAt });
    }
  }
  // alguns candidatos não selecionados, para o histórico das vagas
  for (const vacancy of ["Operador de Máquinas", "Assistente Comercial Interno", "Técnico de Laboratório da Qualidade"]) {
    const name = personName();
    const off = -int(12, 24);
    const candidateId = addCandidate(name, vacancy, off);
    const id = nextId("applications");
    data.applications.push({ id, candidateId, vacancyId: vacancyIds[vacancy], stage: "TRIAGEM", outcome: "REPROVADO", message: null, notes: "Perfil abaixo dos requisitos mínimos.", rating: 2, interviewAt: null, hiredEmployeeId: null, lastActivityAt: at(off + 4), createdAt: at(off) });
    addResume(id, name, off);
    event({ applicationId: id, type: "CRIADA", fromStage: null, toStage: "CANDIDATO", note: "Candidatura recebida pelo site.", actorUserId: null, createdAt: at(off, 9) });
    event({ applicationId: id, type: "ETAPA", fromStage: "CANDIDATO", toStage: "TRIAGEM", note: null, actorUserId: uRh, createdAt: at(off + 2, 11) });
    event({ applicationId: id, type: "ENCERRAMENTO", fromStage: null, toStage: null, note: "Não selecionado: experiência abaixo do exigido para a vaga.", actorUserId: uRh, createdAt: at(off + 4, 15) });
  }

  // processos concluídos: candidatos contratados que viraram funcionários
  const hireFromProcess = (vacancy: string, dept: string, position: string, hiredDay: number, appliedDay: number) => {
    const name = personName();
    const candidateId = addCandidate(name, vacancy, appliedDay, "Cotia");
    const e = addEmp(name, dept, position, managers[dept].id, day(hiredDay));
    const cand = data.candidates.find((c) => c.id === candidateId)!;
    Object.assign(empRow(e.id), { personalEmail: cand.email, phone: cand.phone, city: cand.city, vacationBalance: 0 });
    const id = nextId("applications");
    data.applications.push({ id, candidateId, vacancyId: vacancyIds[vacancy], stage: "CONTRATADO", outcome: "CONTRATADO", message: pick(MESSAGES), notes: "Excelente desempenho na prova prática.", rating: 5, interviewAt: null, hiredEmployeeId: e.id, lastActivityAt: at(hiredDay), createdAt: at(appliedDay) });
    empRow(e.id).sourceApplicationId = id;
    data.employeeHistory.find((h) => h.employeeId === e.id && h.type === "ADMISSAO")!.description = `Admissão como ${position}, pelo processo seletivo da vaga ${vacancy}.`;
    addResume(id, name, appliedDay);
    const span = hiredDay - appliedDay;
    ORDER.forEach((s, i) => {
      if (i === 0) event({ applicationId: id, type: "CRIADA", fromStage: null, toStage: "CANDIDATO", note: "Candidatura recebida pelo site.", actorUserId: null, createdAt: at(appliedDay, 9) });
      else
        event({
          applicationId: id,
          type: i === 5 ? "CONTRATACAO" : "ETAPA",
          fromStage: ORDER[i - 1],
          toStage: s,
          note: i === 5 ? `Contratado como ${position}. Admissão em ${day(hiredDay).split("-").reverse().join("/")}.` : null,
          actorUserId: uRh,
          createdAt: at(appliedDay + Math.round((span * i) / 5), 10 + i),
        });
    });
    return e;
  };
  const hiredExp = hireFromProcess("Auxiliar de Expedição", "Logística e Expedição", "Auxiliar de Expedição", -44, -75);
  const hiredProd = hireFromProcess("Auxiliar de Produção", "Produção", "Auxiliar de Produção", -6, -24);

  /* ------------------------------------------------------------ documentos */
  const doc = (d: Partial<DocumentRow> & Pick<DocumentRow, "category" | "title" | "status">) =>
    data.documents.push({
      id: nextId("documents"),
      employeeId: null,
      applicationId: null,
      storageKey: null,
      originalName: null,
      mimeType: null,
      sizeBytes: null,
      dueDate: null,
      note: null,
      requestedById: null,
      uploadedById: null,
      uploadedAt: null,
      reviewedById: null,
      reviewedAt: null,
      createdAt: at(-1),
      ...d,
    });
  const DOCS: [DocCategory, string][] = [
    ["CONTRATO", "Contrato de trabalho"],
    ["IDENTIFICACAO", "Documento de identificação"],
    ["COMPROVANTE", "Comprovante de residência"],
  ];
  for (const e of emps) {
    for (const [cat, title] of DOCS) {
      if (rnd() < 0.12 && cat === "COMPROVANTE") continue;
      doc({ employeeId: e.id, category: cat, title, status: "VALIDADO", storageKey: "demo", originalName: `${slug(title)}.pdf`, mimeType: "application/pdf", sizeBytes: int(140, 900) * 1024, uploadedById: uDp, uploadedAt: `${e.hiredAt}T13:00:00.000Z`, reviewedById: uRh, reviewedAt: `${e.hiredAt}T15:00:00.000Z`, createdAt: `${e.hiredAt}T13:00:00.000Z` });
    }
  }
  // currículo do processo seletivo e pendências admissionais dos recém-contratados
  for (const e of [hiredExp, hiredProd]) {
    doc({ employeeId: e.id, category: "CURRICULO", title: "Currículo (processo seletivo)", status: "VALIDADO", storageKey: "demo", originalName: `curriculo-${slug(e.name)}.pdf`, mimeType: "application/pdf", sizeBytes: 212 * 1024, uploadedById: uRh, uploadedAt: `${e.hiredAt}T12:00:00.000Z`, createdAt: `${e.hiredAt}T12:00:00.000Z` });
  }
  doc({ employeeId: hiredProd.id, category: "CERTIFICADO", title: "Certificado de escolaridade", status: "PENDENTE", dueDate: day(4), note: "Documento admissional.", requestedById: uRh, createdAt: at(-6, 10) });
  // holerites recentes para o funcionário de demonstração
  for (let m = 1; m <= 3; m++) {
    const d = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    doc({ employeeId: lucas.id, category: "HOLERITE", title: `Holerite de ${label}`, status: "VALIDADO", storageKey: "demo", originalName: `holerite-${d.toLocaleDateString("sv-SE").slice(0, 7)}.pdf`, mimeType: "application/pdf", sizeBytes: 96 * 1024, uploadedById: uDp, uploadedAt: new Date(today.getFullYear(), today.getMonth() - m + 1, 5, 9).toISOString(), createdAt: new Date(today.getFullYear(), today.getMonth() - m + 1, 5, 9).toISOString() });
  }
  doc({ employeeId: lucas.id, category: "CERTIFICADO", title: "Certificado NR-12", status: "VALIDADO", storageKey: "demo", originalName: "certificado-nr12.pdf", mimeType: "application/pdf", sizeBytes: 310 * 1024, uploadedById: uFunc, uploadedAt: at(-210, 14), reviewedById: uRh, reviewedAt: at(-209, 10), createdAt: at(-210, 14) });
  // pendências: comprovante atualizado, certificados NR, atestados aguardando validação
  const active = emps.filter((e) => !terminated.includes(e));
  const pendings: [Emp, DocCategory, string, number][] = [
    [lucas, "COMPROVANTE", "Comprovante de residência atualizado", 7],
    [active[8], "CERTIFICADO", "Certificado NR-12 (reciclagem)", 12],
    [active[14], "CERTIFICADO", "Certificado NR-12 (reciclagem)", 12],
    [active[21], "IDENTIFICACAO", "CNH atualizada", 5],
    [active[30], "COMPROVANTE", "Comprovante de escolaridade", -2],
    [active[36], "CERTIFICADO", "Certificado NR-10", 20],
    [active[52], "COMPROVANTE", "Comprovante de residência atualizado", 9],
  ];
  for (const [e, cat, title, due] of pendings) {
    doc({ employeeId: e.id, category: cat, title, status: "PENDENTE", dueDate: day(due), requestedById: uRh, note: "Enviar em PDF ou foto legível.", createdAt: at(-int(2, 9)) });
  }
  for (const e of [active[5], active[19], active[44]]) {
    doc({ employeeId: e.id, category: "ATESTADO", title: "Atestado médico", status: "ENVIADO", storageKey: "demo", originalName: "atestado.pdf", mimeType: "application/pdf", sizeBytes: int(80, 300) * 1024, uploadedById: uRh, uploadedAt: at(-int(0, 2), int(8, 16)), createdAt: at(-1, 15) });
  }
  doc({ employeeId: active[27].id, category: "CERTIFICADO", title: "Certificado de curso de empilhadeira", status: "RECUSADO", storageKey: "demo", originalName: "certificado-foto.jpg", mimeType: "image/jpeg", sizeBytes: 1450 * 1024, uploadedAt: at(-5, 18), reviewedById: uRh, reviewedAt: at(-4, 9), note: "Foto cortada: falta a data de validade.", createdAt: at(-5, 18) });

  /* ---------------------------------------------------------------- férias */
  const vac = (e: Emp, start: number, days: number, status: Vacation["status"], note?: string) =>
    data.vacations.push({
      id: nextId("vacations"),
      employeeId: e.id,
      startDate: day(start),
      endDate: day(start + days - 1),
      days,
      status,
      note: note ?? null,
      reviewedById: status === "PENDENTE" ? null : uRh,
      reviewedAt: status === "PENDENTE" ? null : at(Math.min(-1, start - int(10, 30))),
      reviewNote: status === "RECUSADO" ? "Período coincide com o inventário anual. Sugerimos remarcar para a semana seguinte." : null,
      requestedById: uRh,
      createdAt: at(Math.min(-1, start - int(15, 40))),
    });
  const pool = active.filter((e) => e.id !== lucas.id && e.id !== hiredProd.id && e.id !== hiredExp.id);
  for (let i = 0; i < 22; i++) vac(pool[(i * 5 + 1) % pool.length], -int(20, 330), pick([10, 15, 20, 30]), "APROVADO");
  vac(lucas, -260, 20, "APROVADO", "Férias de fim de ano.");
  // em andamento e próximas aprovadas
  vac(pool[2], -4, 15, "APROVADO");
  vac(pool[33], -2, 10, "APROVADO");
  vac(pool[7], 3, 10, "APROVADO");
  vac(pool[12], 9, 20, "APROVADO");
  vac(pool[17], 16, 15, "APROVADO");
  vac(pool[41], 19, 10, "APROVADO");
  vac(pool[24], 27, 30, "APROVADO");
  vac(managers["Comercial"], 40, 15, "APROVADO");
  vac(pool[58], 45, 20, "APROVADO");
  // pendentes
  vac(pool[4], 22, 15, "PENDENTE", "Gostaria de emendar com o feriado.");
  vac(pool[9], 35, 10, "PENDENTE");
  vac(pool[27], 50, 20, "PENDENTE");
  vac(pool[66], 31, 15, "PENDENTE", "Viagem para visitar a família no Nordeste.");
  vac(lucas, 63, 15, "PENDENTE", "Viagem em família.");
  vac(pool[13], 12, 10, "RECUSADO");
  vac(pool[49], 14, 5, "CANCELADO");
  // quem tem pedido pendente tem saldo para ele (o RH consegue aprovar na demonstração)
  for (const v of data.vacations.filter((x) => x.status === "PENDENTE")) {
    const e = empRow(v.employeeId);
    const pending = data.vacations.filter((x) => x.employeeId === e.id && x.status === "PENDENTE").reduce((a, b) => a + b.days, 0);
    if (e.vacationBalance < pending) e.vacationBalance = Math.min(30, pending + int(0, 10));
  }

  /* ---------------------------------------------------------- solicitações */
  const empUser: Record<number, number> = { [lucas.id]: uFunc, [managers["Produção"].id]: uGestor, [managers["Recursos Humanos"].id]: uRh };
  const REQ: [Emp, RequestType, string, string, Priority, RequestStatus, number, string | null][] = [
    [lucas, "DOCUMENTO", "Declaração de vínculo empregatício", "Preciso de uma declaração de vínculo para abertura de conta em banco.", "MEDIA", "PENDENTE", -1, null],
    [lucas, "ATUALIZACAO_CADASTRAL", "Alteração de endereço", "Mudei de endereço no mês passado. O comprovante novo segue anexado pela área de documentos.", "BAIXA", "CONCLUIDO", -24, "Endereço atualizado no cadastro. Obrigada!"],
    [active[6], "JUSTIFICATIVA", "Ausência por consulta médica", "Justificativa da ausência na manhã de terça-feira; o atestado foi enviado.", "MEDIA", "EM_ANALISE", -2, null],
    [active[11], "DOCUMENTO", "Informe de rendimentos", "Solicito a segunda via do informe de rendimentos do último ano.", "BAIXA", "PENDENTE", -3, null],
    [active[15], "OUTROS", "Troca de turno", "Gostaria de avaliar a troca para o turno da manhã a partir do próximo mês.", "MEDIA", "PENDENTE", -1, null],
    [active[18], "ATUALIZACAO_CADASTRAL", "Inclusão de dependente", "Nascimento do meu filho; preciso incluir como dependente no plano.", "ALTA", "EM_ANALISE", -4, null],
    [active[22], "DOCUMENTO", "Cópia do contrato de trabalho", "Solicito uma cópia do meu contrato.", "BAIXA", "CONCLUIDO", -15, "Cópia disponibilizada na sua área de documentos."],
    [active[25], "JUSTIFICATIVA", "Atraso por problema no transporte", "Atraso de 40 minutos por interrupção da linha de ônibus.", "BAIXA", "APROVADO", -9, "Justificativa aceita."],
    [active[29], "OUTROS", "Ajuste no banco de horas", "Acredito que faltam 2 horas extras do dia 12 no banco de horas.", "MEDIA", "RECUSADO", -12, "Conferimos o ponto: as horas já constam no fechamento seguinte."],
    [active[33], "DOCUMENTO", "Declaração para faculdade", "Preciso de declaração de horário de trabalho para a faculdade.", "MEDIA", "PENDENTE", 0, null],
    [managers["Produção"], "OUTROS", "Treinamento NR-12 para a equipe", "Solicito agendar a reciclagem de NR-12 para os operadores admitidos este ano.", "ALTA", "EM_ANALISE", -5, null],
    [active[40], "ATUALIZACAO_CADASTRAL", "Troca de conta salário", "Abri conta em outro banco e gostaria de alterar a conta para recebimento do salário.", "MEDIA", "PENDENTE", -2, null],
    [active[47], "FERIAS", "Dúvida sobre abono pecuniário", "Posso vender 10 dias das minhas férias neste período aquisitivo?", "BAIXA", "CONCLUIDO", -20, "Sim. Informe no pedido de férias que deseja o abono e o RH calcula o valor."],
    [active[55], "JUSTIFICATIVA", "Falta por doença do filho", "Precisei acompanhar meu filho ao pronto-socorro. Atestado de acompanhante enviado.", "MEDIA", "APROVADO", -7, "Ausência abonada conforme a convenção coletiva."],
    [active[61], "DOCUMENTO", "Carta de referência", "Preciso de uma carta de referência para o curso técnico.", "BAIXA", "PENDENTE", -6, null],
  ];
  for (const [e, type, subject, message, priority, status, off, response] of REQ) {
    data.requests.push({
      id: nextId("requests"),
      authorUserId: empUser[e.id] ?? uDp,
      employeeId: e.id,
      type,
      subject,
      message,
      priority,
      status,
      response,
      responderUserId: response || status === "EM_ANALISE" ? uRh : null,
      respondedAt: response ? at(off + 1, 11) : null,
      createdAt: at(off, int(8, 16)),
      updatedAt: at(off + (response ? 1 : 0), 11),
    });
  }

  /* ----------------------------------------------------------- comunicados */
  const ANN: [string, string, "NORMAL" | "IMPORTANTE" | "URGENTE", "TODOS" | "DEPARTAMENTO" | "GESTORES", string | null, number, number][] = [
    ["Simulado de evacuação na quinta-feira", "Haverá simulado de evacuação na quinta-feira às 15h. Ao ouvir o alarme, interrompa a atividade com segurança, desligue a máquina e siga as orientações da brigada até o ponto de encontro no estacionamento.", "URGENTE", "TODOS", null, -1, 74],
    ["Atualização cadastral anual", "Até o fim do mês, confira seus dados na área Meu perfil e envie comprovante de residência atualizado pela área de documentos. Dúvidas: fale com o RH.", "IMPORTANTE", "TODOS", null, -2, 96],
    ["Reciclagem de NR-12", "A reciclagem de NR-12 para operadores acontece em duas turmas na próxima semana. A lista de participantes foi enviada aos líderes.", "NORMAL", "DEPARTAMENTO", "Produção", -4, 51],
    ["Programação de férias do próximo trimestre", "Gestores: enviem até sexta-feira a previsão de férias da equipe para o próximo trimestre, para planejarmos a produção.", "IMPORTANTE", "GESTORES", null, -6, 7],
    ["Campanha de vacinação contra a gripe", "A vacinação acontece no refeitório na próxima terça e quarta, das 8h às 16h. Leve um documento com foto. A participação é voluntária.", "NORMAL", "TODOS", null, -8, 88],
    ["Novo canal de solicitações", "Pedidos de declarações, atualização cadastral e justificativas agora são feitos pelo próprio sistema, na área Solicitações. Você acompanha o andamento e recebe a resposta do RH por lá.", "NORMAL", "TODOS", null, -10, 113],
    ["Entrega dos novos EPIs", "Os novos protetores auriculares e óculos de segurança serão entregues pelos líderes de turno. Assine a ficha de EPI no recebimento.", "NORMAL", "DEPARTAMENTO", "Produção", -15, 62],
  ];
  for (const [title, body, priority, audience, dept, off, reads] of ANN) {
    data.announcements.push({ id: nextId("announcements"), title, body, priority, audience, audienceDepartmentId: dept ? deptId[dept] : null, publishedAt: at(off, 9, 30), expiresAt: null, authorUserId: uRh, baseReads: reads, createdAt: at(off, 9, 30) });
  }
  // os mais antigos já foram lidos pelos perfis de demonstração
  for (const a of data.announcements.filter((x) => x.publishedAt < at(-5))) {
    for (const u of [uRh, uGestor, uFunc, uAdmin]) data.announcementReads.push({ announcementId: a.id, userId: u, readAt: at(-5, 10) });
  }

  /* -------------------------------------------------------------- auditoria */
  const opName = (stage: Stage) => data.applications.find((a) => a.stage === stage && a.outcome === "EM_ANDAMENTO")!;
  const candName = (appId: number) => data.candidates.find((c) => c.id === data.applications.find((a) => a.id === appId)!.candidateId)!.name;
  const AUD: [number | null, string, string, string, number, string | null, number | null][] = [
    [uRh, "Mariana Campos", "LOGIN", "Login realizado", 0, "user", uRh],
    [uDp, dp.name, "LOGIN", "Login realizado", 0, "user", uDp],
    [uRh, "Mariana Campos", "MUDANCA_ETAPA", `${candName(opName("ENTREVISTA").id)}: Triagem → Entrevista (Operador de Máquinas)`, -1, "application", opName("ENTREVISTA").id],
    [uRh, "Mariana Campos", "APROVACAO", "Férias aprovadas para a equipe de Logística", -1, "vacation", null],
    [null, "Site (candidato)", "CANDIDATURA", "Nova candidatura para Auxiliar de Produção", -1, null, null],
    [uDp, dp.name, "UPLOAD", "Documento enviado: Atestado médico", -1, "document", null],
    [uGestor, "Ricardo Moreira", "LOGIN", "Login realizado", -1, "user", uGestor],
    [uRh, "Mariana Campos", "MUDANCA_ETAPA", `${candName(opName("APROVADO").id)}: Avaliação → Aprovado (Operador de Máquinas)`, -2, "application", opName("APROVADO").id],
    [null, "Site (candidato)", "CANDIDATURA", "Nova candidatura para Operador de Máquinas", -2, null, null],
    [uRh, "Mariana Campos", "PUBLICACAO", "Comunicado publicado: Atualização cadastral anual", -2, "announcement", 2],
    [uFunc, "Lucas Pereira", "CRIACAO", "Solicitação aberta: Declaração de vínculo empregatício", -1, "request", 1],
    [uRh, "Mariana Campos", "RECUSA", "Documento recusado: Certificado de curso de empilhadeira", -4, "document", null],
    [uRh, "Mariana Campos", "CONTRATACAO", `Candidato contratado: ${hiredProd.name} (Auxiliar de Produção)`, -6, "employee", hiredProd.id],
    [uRh, "Mariana Campos", "EDICAO", `Cadastro atualizado: ${data.employees.find((e) => e.id === prodOps[1].id)!.name} (status)`, -18, "employee", prodOps[1].id],
    [uRh, "Mariana Campos", "PUBLICACAO", "Vaga publicada no site: Assistente Comercial Interno", -9, "vacancy", vacancyIds["Assistente Comercial Interno"]],
    [uRh, "Mariana Campos", "PUBLICACAO", "Vaga publicada no site: Técnico de Laboratório da Qualidade", -14, "vacancy", vacancyIds["Técnico de Laboratório da Qualidade"]],
    [uAdmin, "Administrador do Sistema", "PERMISSAO", "Perfil de acesso definido como RH para o Departamento Pessoal", -30, "user", uDp],
    [uRh, "Mariana Campos", "CONTRATACAO", `Candidato contratado: ${hiredExp.name} (Auxiliar de Expedição)`, -44, "employee", hiredExp.id],
    [uRh, "Mariana Campos", "DESATIVACAO", `Funcionário desligado: ${terminated[0].name}`, -38, "employee", terminated[0].id],
    [null, "lucas.pereira@ams.example", "LOGIN_FALHOU", "Senha incorreta", -3, "user", uFunc],
    [uFunc, "Lucas Pereira", "LOGIN", "Login realizado", -3, "user", uFunc],
    [uAdmin, "Administrador do Sistema", "LOGIN", "Login realizado", -2, "user", uAdmin],
  ];
  const audits: AuditLog[] = AUD.map(([uid, label, action, summary, off, type, eid]) => ({
    id: 0,
    userId: uid,
    actorLabel: label,
    action,
    entityType: type,
    entityId: eid,
    summary,
    ip: `10.0.${int(1, 4)}.${int(10, 240)}`,
    createdAt: off === 0 ? at(0, int(7, 9), int(0, 59)) : at(off, int(8, 17), int(0, 59)),
  }));
  audits.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const a of audits) data.auditLogs.push({ ...a, id: nextId("auditLogs") });

  /* ------------------------------------------------------ mensagens do site */
  const MSG: [string, string, string, string, string, number, "NOVA" | "RESPONDIDA" | "ARQUIVADA"][] = [
    ["Rogério Tavares", "compras@distribuidora-exemplo.com.br", "Campinas", "Compras e distribuidores", "Somos distribuidores de autopeças na região de Campinas e gostaríamos de receber a tabela de preços e as condições para revenda.", -1, "NOVA"],
    ["Helena Duarte", "helena.duarte@example.com", "Curitiba", "Representação comercial", "Tenho carteira de clientes no Paraná e interesse em representar a AMS na região.", -3, "NOVA"],
    ["Engenharia de Compras", "engenharia@industria-exemplo.com", "Sorocaba", "Indústria", "Precisamos de cordoalhas sob medida para um projeto de chicotes. Vocês atendem lotes de 5 mil peças?", -6, "RESPONDIDA"],
    ["Martín Gómez", "mgomez@example.com", "Montevidéu", "Exportação", "Interesados en fusibles tipo lámina para distribución en Uruguay. ¿Pueden enviar catálogo?", -12, "ARQUIVADA"],
  ];
  for (const [name, email, city, subject, message, off, status] of MSG) {
    data.contactMessages.push({ id: nextId("contactMessages"), name, email, phone: null, city, subject, message, status, createdAt: at(off, int(8, 20), int(0, 59)) });
  }

  return data;
}
