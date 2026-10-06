# AMS Componentes — ecossistema digital

Site institucional modernizado + **Trabalhe Conosco** + **RH privado**, num único produto Next.js.

```
/                   → site público (catálogo, empresa, representantes, eventos, contato)
/trabalhe-conosco   → vagas e candidatura (alimenta o RH)
/rh                 → área privada (login por perfil)
```

## Como rodar

```bash
npm install
npm run db:setup        # cria data/ams.db com DADOS DE DEMONSTRAÇÃO (apaga o banco anterior)
npm run dev             # http://localhost:3000
```

Logins de demonstração (senha `Ams@demo2026`), também disponíveis como botões na tela de login:

| Perfil | E-mail | O que vê |
|---|---|---|
| Admin | admin@ams.example | tudo, inclusive usuários/permissões, auditoria e mensagens do site |
| RH | rh@ams.example | funcionários, recrutamento, documentos, férias, solicitações, comunicados, indicadores |
| Gestor | gestor@ams.example | a própria equipe (Produção), processos seletivos da área (somente leitura), solicitações e férias da equipe |
| Funcionário | funcionario@ams.example | o próprio perfil, documentos, férias, solicitações e comunicados |

Verificações:

```bash
npm run typecheck && npm run lint
npm run test:e2e              # Playwright: build de produção com banco isolado (data/test.db)
npm run db:setup -- --empty   # banco limpo só com o admin, para implantação
npm run lgpd:retencao         # anonimiza candidatos com retenção vencida (agendar diariamente)
```

## Hospedagem

O RH grava banco (SQLite) e arquivos em disco, então a hospedagem precisa de **Node.js com disco persistente** montado em `/data`. Hospedagem estática (GitHub Pages, Netlify) ou serverless sem disco (Vercel) não servem sem trocar a camada de dados.

**Render (recomendado, blueprint pronto em `render.yaml`):** [Deploy no Render](https://render.com/deploy?repo=https://github.com/APXWeb/ams-componentes) → confirmar o serviço `ams-componentes` (plano Starter, disco de 1 GB). Cada push na `main` publica de novo.

**Railway / Fly.io / VPS:** usar o `Dockerfile` e montar um volume em `/data`.

| Variável | Uso |
|---|---|
| `SEED_DEMO` | `1` no primeiro boot cria os dados de demonstração; `0` cria banco vazio só com o admin |
| `PREVIEW_MODE` | `1` bloqueia indexação do site inteiro (obrigatório enquanto houver dados fictícios); lido no build |
| `SITE_URL` | endereço público (metadados, sitemap) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | admin criado quando `SEED_DEMO=0` |
| `DATABASE_PATH`, `STORAGE_PATH` | padrão `/data/ams.db` e `/data/storage` |

O container aplica as migrations a cada boot sem apagar dados (`scripts/start.sh`) e expõe `/healthz`. Para recomeçar a demonstração do zero, apague `/data/ams.db` e reinicie o serviço.

## Fase 1 — Auditoria do site atual (out/2026)

O "projeto existente" é o site WordPress em produção. Não havia código-fonte disponível, então o conteúdo foi extraído do site no ar (scripts em `_tools/`) e transcrito para dados estruturados (`src/data/catalog.json`, `src/lib/site.ts`).

**Stack atual:** WordPress 7.1 + Elementor Pro + WooCommerce (usado só como catálogo), TranslatePress (pt/en/es), HTML5 Maps, Simple Download Monitor, GTM/GA4. Cerca de 40 scripts na Home.

**Problemas encontrados**
- **Segurança:** foram encontrados pontos de atenção no WordPress atual, repassados diretamente à AMS. Recomenda-se uma revisão de segurança do site atual independentemente da migração.
- Home sem `<meta name="description">`; todos os títulos repetem o slogan; Representantes, Contato e Eventos sem H1.
- Erros de digitação no texto institucional ("Distibuidoras", "fusiveis", "Menssagem").
- Política de privacidade é o modelo padrão do WordPress (comentários e Gravatar), sem tratar formulários nem LGPD.
- Banners com texto dentro da imagem (inacessíveis, não traduzíveis, 2560 px).
- Produtos em tabelas soltas por página, sem busca por código. `/produtos` e `/lancamentos` retornam 404; o menu Produtos tem 4 níveis.

**Preservado:** logotipo oficial (arquivo original de 2096 px), azul `#003A63` e amarelo `#FFF200` amostrados do logo, os textos institucionais, os 71 produtos com 488 códigos e tabelas técnicas, imagens oficiais de produto, fotos da fábrica e de eventos, representantes por estado, agenda 2026, contatos e catálogos. URLs antigas redirecionam para as novas (`next.config.ts`).

**Não inventado:** números, benefícios, estrutura interna ou histórico além do publicado. Os números do site vêm de dados reais (fundação, contagem de produtos, códigos e estados com representante).

## Arquitetura

- **Next.js 16 (App Router) + TypeScript**, Server Components e Server Actions. Catálogo estático (`generateStaticParams`); área privada dinâmica.
- **SQLite + Drizzle ORM** (`src/db/schema.ts`, migrations em `drizzle/`). 17 tabelas relacionadas: `users, sessions, departments, positions, employees, employee_history, vacancies, candidates, applications, application_events, documents, vacations, requests, announcements, announcement_reads, audit_logs, contact_messages`. Para produção com muitos acessos simultâneos, o schema migra para PostgreSQL trocando o driver.
- **Autenticação:** senha com scrypt; sessão em cookie `httpOnly`/`SameSite=Lax`/`Secure` com token aleatório (só o hash SHA-256 fica no banco); expira em 10 h ou 1 h sem uso; bloqueio de 15 min após 5 senhas erradas; limite de tentativas por IP e e-mail; erro genérico e tempo constante para e-mail inexistente.
- **Autorização no servidor:** matriz única em `src/lib/permissions.ts`; `requireUser()` em toda página, ação e rota; escopo de dados em `src/lib/rh-scope.ts` (gestor só consulta a equipe, funcionário só a si). O `src/proxy.ts` faz apenas o redirecionamento otimista para o login.
- **Arquivos privados** em `storage/` (fora de `public/`), nome aleatório, validação pela assinatura do arquivo (PDF/DOCX/JPG/PNG/WEBP, até 8 MB), entregues só por `/rh/arquivos/[id]` após checar o vínculo, com `no-store` e registro de acesso.
- **Auditoria:** login, login recusado, logout, criação, edição, exclusão, desligamento, mudança de etapa, contratação, aprovação/recusa, upload, acesso a arquivo, exportação e alteração de permissão (`/rh/auditoria`, só admin).

## LGPD

Consentimento registrado na candidatura (data e versão do texto), retenção de 12 meses com rotina de anonimização (`npm run lgpd:retencao`), minimização (gestor não vê documentos nem e-mail pessoal da equipe), exportação CSV restrita e auditada, área privada com `noindex` e `no-store`. A página `/privacidade` é uma **minuta** para o jurídico da AMS validar (controlador, encarregado/DPO, prazos).

## Design system

Em `src/app/globals.css`, compartilhado por site e RH.

- **Linguagem:** mesma base visual da proposta Intercientifica: primeira tela clara com vitrine de produtos e cartões flutuantes, botões em pílula, cantos arredondados, pontilhado discreto. Azul é estrutura; amarelo é sinal pontual; o triângulo do logo é o marcador.
- **Tipografia:** Figtree (títulos, rótulos e códigos) e Noto Sans (texto), as mesmas da Intercientifica.
- **Tokens:** `--navy-*`, `--steel-*`, `--signal`; espaçamento base 4 px; raios 2 a 10 px; três níveis de sombra; easing único.
- **Componentes:** botões (primário, sinal, contorno, fantasma, perigo, carregando), campos com erro acessível, upload, badges, painéis, tabelas que viram cartões no celular, abas, modais que viram folha inferior no celular, avisos (toasts), estados vazios, skeleton, KPIs, gráficos SVG (colunas, barras, funil, rosca), calendário e Kanban (arrastar ou seletor por teclado).
- **Movimento:** revelação ao rolar, contadores, cotas que se desenham, transições entre páginas (React `ViewTransition`), feedback em botões e cartões. Respeita `prefers-reduced-motion`.

## Dados de demonstração

`scripts/db-setup.ts` gera pessoas, vagas, candidaturas, documentos (PDFs fictícios), férias, solicitações e comunicados **fictícios** (`is_demo = 1`), com aviso "Dados de demonstração" no RH e "vagas fictícias" no site. Departamentos e cargos são genéricos de indústria e devem ser trocados pela estrutura real antes da implantação.

## Pendências para a AMS

- Validar a minuta de privacidade/LGPD e o prazo de retenção de candidatos.
- Informar departamentos, cargos e benefícios reais (só publicar benefícios confirmados).
- Fotos da fábrica em alta resolução (as atuais vêm de um banner de 1920×600).
- Endereço completo da matriz (o site atual só publica "Cotia – SP").
- Versões em inglês e espanhol (o site atual tem); esta versão é só pt-BR.
- Envio de e-mails (aviso de candidatura, respostas do RH): hoje o acompanhamento é dentro do sistema.
- Hospedagem com Node.js (o RH não roda em hospedagem estática como o GitHub Pages).
