/*
 * Dados institucionais da AMS. Fonte: site oficial amscomponentes.com.br (out/2026).
 * Não acrescentar informações que não estejam publicadas pela empresa.
 */
export const SITE = {
  name: "AMS Componentes",
  legalName: "AMS Ind. e Com. de Componentes Eletr. Ltda.",
  url: process.env.SITE_URL ?? "https://amscomponentes.com.br",
  founded: 1977,
  founder: "Albery Spínola",
  city: "Cotia",
  state: "SP",
  region: "Grande São Paulo",
  hours: "Segunda a sexta, das 7h às 17h",
  phone: "(11) 5896-4775",
  phoneHref: "tel:+551158964775",
  whatsapp: "(11) 99974-1030",
  whatsappHref: "https://wa.me/5511999741030",
  emails: {
    contato: "contato@amscomponentes.com.br",
    vendas: "vendas@amscomponentes.com.br",
    exportacao: "exportacao@amscomponentes.com.br",
    industria: "comercial@amscomponentes.com.br",
  },
  salesContact: "Juliana / Ana",
  catalogPdf: "https://amscomponentes.com.br/pdf/AMS_CATALOGO_2025.pdf",
  catalogOnline: "http://www.baixecatalogo.com.br/catalogo/ams",
  social: {
    instagram: "https://www.instagram.com/amscomponentes/",
    facebook: "https://www.facebook.com/p/AMS-Componentes-Automotivos-100063058519637/",
    linkedin: "https://www.linkedin.com/company/ams-componentes-automotivo",
  },
};

/** Textos institucionais publicados na página "Quem somos". */
export const ABOUT = {
  headline: "Excelência em soluções automotivas por mais de quatro décadas",
  intro:
    "A AMS Componentes é líder nacional na fabricação de fusíveis automotivos e oferece também uma linha completa de cordoalhas, terminais de bateria e cabos de bateria. Somos parceiros de confiança dos mais renomados distribuidores de autopeças e indústrias em todo o Brasil.",
  history:
    "Fundada em 1977 pelo sócio-diretor Albery Spínola, a AMS nasceu da paixão pela indústria automotiva e da visão de transformar um sonho em realidade.",
  location: "Nossa matriz está estrategicamente localizada na Grande São Paulo, na cidade de Cotia.",
  quality:
    "Investimos continuamente em tecnologia. Contamos com maquinário moderno e um laboratório próprio de testes e controle de qualidade, recursos que garantem a qualidade e o desempenho de todos os nossos produtos.",
  innovation:
    "A inovação é um pilar da AMS. Estamos em constante atualização, acompanhando as tendências e lançando novos produtos com foco na excelência de resultados para nossos clientes.",
  mission:
    "Satisfazer as necessidades dos nossos clientes por meio de produtos de alta qualidade, confiabilidade e o melhor custo-benefício.",
};

export const NAV = [
  { href: "/empresa", label: "Empresa" },
  { href: "/produtos", label: "Produtos" },
  { href: "/lancamentos", label: "Lançamentos" },
  { href: "/representantes", label: "Representantes" },
  { href: "/eventos", label: "Eventos" },
  { href: "/contato", label: "Contato" },
] as const;

export type Rep = {
  name: string;
  company?: string;
  phones: string[];
  contact: string;
  email?: string;
};

/** Representantes por UF, transcritos do mapa da página /representantes do site oficial. */
const CICERO: Rep = { name: "Cícero & Lima", company: "Cicero Lima & Filhos Ltda.", phones: ["(92) 3233-8989", "(92) 3633-6349"], contact: "Ítalo", email: "comercial@cicerolimarepresentacoes.com.br" };
const CARDOSO: Rep = { name: "Cardoso", company: "Amilton Cardoso Representações Ltda.", phones: ["(71) 99154-7820", "(71) 99965-3431"], contact: "Cardoso / Letícia", email: "cardosonote@gmail.com" };
const FEDATO: Rep = { name: "Fedato", company: "Fedato Representações Ltda.", phones: ["(62) 3587-1122", "(62) 3587-1121"], contact: "Victor / Andreia", email: "fedato1@terra.com.br" };
const COMANDER: Rep = { name: "Comander", company: "Comander Nordeste Comércio e Repres. Ltda.", phones: ["(86) 99816-6000"], contact: "Cristiane", email: "comander.nord@uol.com.br" };
const ENOCH: Rep = { name: "Enoch Representações", company: "Enoch Representações Ltda.", phones: ["(67) 3382-6788", "(67) 3382-6798", "(65) 99902-1456"], contact: "Reni", email: "vendas@enochrep.com.br" };
const MANO: Rep = { name: "Mano Representações", company: "Mano Representações Ltda. ME", phones: ["(81) 3314-9637", "(81) 99791-5657"], contact: "Mano / Laryssa / Ighor", email: "mano@manorepresentacoes.com.br" };

export const STATES: { uf: string; name: string; reps: Rep[] }[] = [
  { uf: "AC", name: "Acre", reps: [CICERO] },
  { uf: "AL", name: "Alagoas", reps: [CARDOSO] },
  { uf: "AP", name: "Amapá", reps: [] },
  { uf: "AM", name: "Amazonas", reps: [CICERO] },
  { uf: "BA", name: "Bahia", reps: [CARDOSO] },
  {
    uf: "CE",
    name: "Ceará",
    reps: [CARDOSO, { name: "Leléo", company: "Francisco de Assis Lima Furtado", phones: ["(85) 3341-5413", "(85) 99984-6307"], contact: "Leléo", email: "limafurtadorep@yahoo.com.br" }],
  },
  { uf: "DF", name: "Distrito Federal", reps: [FEDATO] },
  {
    uf: "ES",
    name: "Espírito Santo",
    reps: [{ name: "Esthavic", company: "Esthavic Adm. Vendas e Marketing Ltda.", phones: ["(27) 3329-1341", "(27) 3033-3230"], contact: "Fernando / Edson", email: "fernando@esthavic.com.br" }],
  },
  { uf: "GO", name: "Goiás", reps: [FEDATO] },
  { uf: "MA", name: "Maranhão", reps: [COMANDER] },
  { uf: "MT", name: "Mato Grosso", reps: [ENOCH] },
  { uf: "MS", name: "Mato Grosso do Sul", reps: [ENOCH] },
  {
    uf: "MG",
    name: "Minas Gerais",
    reps: [{ name: "Pro Mar", company: "Pro Mar Promoção e Market. de Vendas Ltda.", phones: ["(31) 3332-9411"], contact: "Mônica / Salazar", email: "promarbh@promarbh.com.br" }],
  },
  { uf: "PA", name: "Pará", reps: [{ name: "Jorge Hage", phones: ["(91) 98352-7577", "(91) 3244-7967"], contact: "Jorge", email: "mohage2@yahoo.com.br" }] },
  { uf: "PB", name: "Paraíba", reps: [MANO] },
  {
    uf: "PR",
    name: "Paraná",
    reps: [{ name: "Anderson Gabardo", company: "A. Gabardo Consultoria e Assessoria", phones: ["(41) 3056-1308", "(41) 99909-8497"], contact: "Anderson / Tairine", email: "anderson.gabardo@gmail.com" }],
  },
  { uf: "PE", name: "Pernambuco", reps: [MANO] },
  { uf: "PI", name: "Piauí", reps: [COMANDER] },
  {
    uf: "RJ",
    name: "Rio de Janeiro",
    reps: [{ name: "Ricser Representações", company: "Ricser Consultoria Comercial Ltda.", phones: ["(21) 2135-8318", "(21) 99945-7368"], contact: "Ricardo / Henrique", email: "rioconsultor@terra.com.br" }],
  },
  { uf: "RN", name: "Rio Grande do Norte", reps: [MANO] },
  {
    uf: "RS",
    name: "Rio Grande do Sul",
    reps: [{ name: "Papareia", company: "Papareia Comunicação e Representação Ltda.", phones: ["(51) 3273-3175"], contact: "Marina / Luís Augusto", email: "papareiarep@terra.com.br" }],
  },
  { uf: "RO", name: "Rondônia", reps: [{ name: "André Representações", phones: ["(41) 99248-7500"], contact: "André", email: "arcrepresentacoes2025@gmail.com" }] },
  { uf: "RR", name: "Roraima", reps: [CICERO] },
  { uf: "SC", name: "Santa Catarina", reps: [{ name: "VGA Soluções Comerciais", phones: ["(44) 98403-5895"], contact: "Alexandre / Dionatan" }] },
  {
    uf: "SP",
    name: "São Paulo",
    reps: [
      { name: "Rigla (Valéria e Waltinho)", company: "Rigla Com. e Repres. de Auto Peças Ltda.", phones: ["(19) 99639-4954", "(19) 99791-1235"], contact: "Valéria / Waltinho", email: "agea@agearepres.com.br" },
      { name: "Sebastião César", company: "Sebastião César Martinez", phones: ["(16) 3941-3052", "(16) 99183-6049"], contact: "Sebastião / João", email: "sebastiao.cm1959@gmail.com" },
      { name: "Thomas", company: "TSR Representações EIRELI", phones: ["(11) 4451-2939", "(11) 99406-5206"], contact: "Thomas Anderson", email: "thomasvendedor@gmail.com" },
    ],
  },
  { uf: "SE", name: "Sergipe", reps: [] },
  { uf: "TO", name: "Tocantins", reps: [] },
];

/** Agenda 2026 publicada em /agenda-2 e fotos de /eventos do site oficial. */
export const AGENDA = [
  { name: "Autopar", dates: "6 a 9 de maio de 2026", start: "2026-05-06", end: "2026-05-09", city: "Curitiba, PR", image: "/img/eventos/autopar-2026.webp" },
  { name: "Autop", dates: "19 a 22 de agosto de 2026", start: "2026-08-19", end: "2026-08-22", city: "Ceará", image: "/img/eventos/autop-2026.webp" },
  { name: "Expo Peças", dates: "10 a 12 de setembro de 2026", start: "2026-09-10", end: "2026-09-12", city: "Goiânia, GO", image: "/img/eventos/expopecas-2026.webp" },
];

export const PAST_EVENTS = [
  {
    name: "Automec 2025",
    year: 2025,
    photos: [
      "/img/eventos/automec-2025-3.webp",
      "/img/eventos/automec-2025-1.webp",
      "/img/eventos/automec-2025-2.webp",
      "/img/eventos/automec-2025-4.webp",
      "/img/eventos/automec-2025-5.webp",
      "/img/eventos/automec-2025-6.webp",
    ],
  },
  { name: "Automec SP", year: 2023, photos: ["/img/eventos/automec-2023.webp"] },
  { name: "Expo Peças Goiânia", year: 2022, photos: ["/img/eventos/expopecas-2022.webp"] },
  { name: "Autop Ceará", year: 2022, photos: ["/img/eventos/autop-2022.webp"] },
  { name: "Autopar Paraná", year: 2022, photos: ["/img/eventos/autopar-2022.webp"] },
];
