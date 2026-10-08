# AMS Componentes — projeto conceitual

**Projeto conceitual desenvolvido pela APX Web para a AMS Componentes**, apresentado no portfólio da APX Web. Não substitui o site oficial da empresa: o site institucional é uma experiência completa e o sistema de RH é uma **demonstração interativa** com dados fictícios.

```
/                   → site institucional (catálogo, empresa, representantes, eventos, contato)
/trabalhe-conosco   → vagas, detalhes e candidatura (envio simulado)
/rh                 → sistema de RH demonstrativo (login por perfil, sem autenticação real)
```

## Como rodar

```bash
npm install
npm run dev             # http://localhost:3000
```

Não há banco, backend, autenticação, upload ou e-mail. Tudo o que muda durante a demonstração (mover candidato no Kanban, aprovar férias, responder solicitação, publicar vaga ou comunicado, enviar candidatura pelo site) fica no `localStorage` do navegador e volta ao estado inicial a cada dia ou pelo menu do usuário → **Restaurar dados da demonstração**.

**Entrar no RH:** em `/rh/login`, escolha um perfil e clique em Entrar (qualquer senha). Links diretos para `/rh/...` entram como RH. O perfil pode ser trocado a qualquer momento pelo menu do usuário, no rodapé da barra lateral.

| Perfil | Pessoa | O que vê |
|---|---|---|
| Recursos Humanos | Mariana Campos | funcionários, recrutamento, documentos, férias, solicitações, comunicados, indicadores |
| Gestor | Ricardo Moreira (Produção) | a própria equipe, processos seletivos da área (somente leitura), férias e solicitações da equipe |
| Funcionário | Lucas Pereira (Operador de Máquinas) | o próprio perfil, holerites e documentos, férias, solicitações e comunicados |
| Administrador | Administrador do Sistema | tudo, inclusive usuários e permissões, auditoria e mensagens do site |

**Roteiro sugerido para apresentar:** Painel → Funcionários (filtros, busca) → perfil de um funcionário (abas, documentos) → Recrutamento (Kanban) → candidato (currículo, avaliação, contratação) → Vagas → Férias (aprovar) → Solicitações (responder) → Comunicados. Para mostrar o caminho completo, envie uma candidatura em `/trabalhe-conosco` e abra o link "Ver a candidatura no RH".

Verificações:

```bash
npm run typecheck && npm run lint
npm run test:e2e        # Playwright: 27 testes (site, login, RH, Kanban, formulários, celular) num build de produção
```

## Hospedagem

**Publicado no GitHub Pages:** https://apxweb.github.io/ams-componentes/ (cada push na `main` publica de novo pelo workflow `.github/workflows/pages.yml`).

Como a demonstração não tem backend, o site inteiro é exportado como arquivos estáticos:

```bash
STATIC_EXPORT=1 BASE_PATH=/ams-componentes PREVIEW_MODE=1 npx next build
node _tools/flatten-rsc.cjs out   # corrige os nomes dos arquivos de prefetch da exportação do Next 16
```

Também roda como app Next comum (Vercel, `render.yaml` no plano gratuito ou o `Dockerfile`). Manter `PREVIEW_MODE=1`: o site inteiro fica fora dos buscadores, para a demonstração nunca concorrer com o site oficial da AMS.

| Variável | Uso |
|---|---|
| `STATIC_EXPORT` | `1` gera o site estático em `out/` |
| `BASE_PATH` | subcaminho da publicação (`/ams-componentes` no GitHub Pages) |
| `PREVIEW_MODE` | `1` bloqueia indexação do site inteiro; lido no build |
| `SITE_URL` | endereço público (metadados, sitemap) |

Na versão estática, registros criados durante a demonstração ganham página até um limite (ids do estado inicial + 40). Os redirecionamentos das URLs antigas do WordPress (`next.config.ts`) só valem quando há servidor Node.

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

- **Next.js 16 (App Router) + TypeScript.** Site institucional em Server Components com catálogo estático; telas do RH são client components que leem a camada de dados da demo.
- **Camada de dados da demonstração** em `src/lib/demo/`, separada das telas para ser trocada por uma API no futuro:
  - `types.ts`: modelo relacional (departamentos, cargos, funcionários, usuários, vagas, candidatos, candidaturas e eventos, documentos, férias, solicitações, comunicados, histórico, auditoria, mensagens do site).
  - `seed.ts`: gerador determinístico dos dados fictícios, com datas relativas ao dia (128 funcionários ativos, 5 vagas abertas, candidatos em todas as etapas, contratações vindas do recrutamento, férias, solicitações e comunicados coerentes entre si).
  - `store.ts`: estado no navegador (`useSyncExternalStore` + `localStorage`, sincronizado entre abas), sessão de demonstração e latência simulada.
  - `queries.ts`: consultas puras com o escopo de cada perfil (gestor só vê a equipe, funcionário só a si), busca global e notificações.
  - `actions/`: ações com validação `zod` e a mesma assinatura usada pelos formulários (`(estado, FormData) => ActionState`). Na versão real, cada uma vira uma chamada à API sem mudar os componentes.
- **Permissões:** matriz única em `src/lib/permissions.ts`, usada pelo menu, pelas telas e pelas ações. Na versão real, a mesma matriz seria aplicada no backend.
- **Arquivos:** os escolhidos pelo visitante não saem do navegador (pré-visualização local nesta aba). Os documentos da demo são folhas de visualização geradas a partir dos dados (currículo, contrato, holerite, certificado, atestado), em `src/components/rh/document-viewer.tsx`.
- **Para virar sistema real:** API e banco (o modelo em `types.ts` já é relacional), autenticação com sessão no servidor, armazenamento privado de arquivos, envio de e-mails e permissões aplicadas no backend. A versão anterior deste repositório, com SQLite/Drizzle e login real, está no histórico do git (commit `6fcb363`).

## LGPD

Os formulários mostram o consentimento como no sistema real (candidatura com prazo de 12 meses) e o RH registra a data e a versão do consentimento de cada candidato. A página `/privacidade` é uma **minuta** para o jurídico da AMS validar se o projeto virar produção. Nenhum dado digitado na demonstração sai do navegador.

## Design system

Em `src/app/globals.css`, compartilhado por site e RH.

- **Linguagem:** mesma base visual da proposta Intercientifica: primeira tela clara com vitrine de produtos e cartões flutuantes, botões em pílula, cantos arredondados, pontilhado discreto. Azul é estrutura; amarelo é sinal pontual; o triângulo do logo é o marcador.
- **Tipografia:** Figtree (títulos, rótulos e códigos) e Noto Sans (texto), as mesmas da Intercientifica.
- **Tokens:** `--navy-*`, `--steel-*`, `--signal`; espaçamento base 4 px; raios 2 a 10 px; três níveis de sombra; easing único.
- **Componentes:** botões (primário, sinal, contorno, fantasma, perigo, carregando), campos com erro acessível, upload, badges, painéis, tabelas que viram cartões no celular, abas, modais que viram folha inferior no celular, avisos (toasts), estados vazios, skeleton, KPIs, gráficos SVG (colunas, barras, funil, rosca), calendário e Kanban (arrastar ou seletor por teclado).
- **Movimento:** revelação ao rolar, contadores, cotas que se desenham, transições entre páginas (React `ViewTransition`), feedback em botões e cartões. Respeita `prefers-reduced-motion`.

## Dados de demonstração

Pessoas, vagas, candidaturas, documentos, férias, solicitações e comunicados são **fictícios** e gerados por `src/lib/demo/seed.ts`. O RH mostra o selo "Demonstração" e o site marca as vagas como fictícias. Departamentos e cargos são genéricos de indústria. Nenhum dado institucional da AMS foi inventado: textos, produtos, representantes e contatos do site vêm do site oficial.

## Pendências caso o projeto vire produção

- Backend, banco, autenticação real, armazenamento de arquivos e e-mails (ver Arquitetura).
- Validar a minuta de privacidade/LGPD e o prazo de retenção de candidatos.
- Departamentos, cargos e benefícios reais (só publicar benefícios confirmados).
- Fotos da fábrica em alta resolução (as atuais vêm de um banner de 1920×600).
- Endereço completo da matriz (o site atual só publica "Cotia – SP").
- Versões em inglês e espanhol (o site atual tem); esta versão é só pt-BR.
