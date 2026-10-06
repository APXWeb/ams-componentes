import { expect, test, type Page } from "@playwright/test";
import { expectToast, login, logout, pdf, uid } from "./helpers";

async function modal(page: Page) {
  const d = page.locator("dialog[open]");
  await expect(d).toBeVisible();
  return d;
}

test.describe("RH", () => {
  test("dashboard do RH mostra indicadores e pipeline", async ({ page }) => {
    await login(page, "rh");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Mariana");
    for (const kpi of ["Funcionários ativos", "Novas contratações", "Vagas abertas", "Candidatos em processo", "Entrevistas", "Férias próximas", "Solicitações pendentes", "Documentos pendentes"]) {
      await expect(page.locator(".kpi", { hasText: kpi })).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Pipeline de recrutamento" })).toBeVisible();
    await expect(page.getByRole("grid", { name: /Calendário de/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Atividades recentes" })).toBeVisible();
  });

  test("funcionário: criar, editar (histórico) e desligar", async ({ page }) => {
    const name = `Pessoa Teste ${uid()}`;
    const email = `${name.toLowerCase().replace(/\s/g, ".")}@ams.example`;
    await login(page, "rh");
    await page.goto("/rh/funcionarios/novo");
    await page.getByRole("button", { name: "Cadastrar funcionário" }).click();
    await expect(page.getByText("Informe o nome completo.")).toBeVisible();

    await page.getByLabel("Nome completo").fill(name);
    await page.getByLabel("E-mail corporativo").fill(email);
    await page.getByLabel("Cargo").selectOption({ label: "Montador" });
    await page.getByLabel("Data de admissão").fill("2026-09-01");
    await page.getByRole("button", { name: "Cadastrar funcionário" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(name);
    await expectToast(page, "Funcionário cadastrado.");

    await page.getByRole("link", { name: "Editar" }).click();
    await page.getByLabel("Cargo").selectOption({ label: "Operador de Máquinas" });
    await page.getByLabel("Telefone").fill("(11) 95555-4444");
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expectToast(page, "Alterações salvas.");
    await expect(page.getByText("Operador de Máquinas").first()).toBeVisible();

    await page.getByRole("navigation", { name: "Seções do perfil" }).getByRole("link", { name: "Histórico" }).click();
    await expect(page.getByText("Cargo alterado de Montador para Operador de Máquinas.")).toBeVisible();

    await page.getByRole("button", { name: "Desligar" }).click();
    const d = await modal(page);
    await d.getByLabel("Motivo").fill("Teste automatizado de desligamento");
    await d.getByRole("button", { name: "Confirmar desligamento" }).click();
    await expectToast(page, "foi desligado");
    await expect(page.getByText(/Desligado em/)).toBeVisible();

    // busca na lista
    await page.goto("/rh/funcionarios?status=DESLIGADO");
    await page.getByRole("searchbox", { name: "Buscar" }).fill(name);
    await expect(page.getByRole("link", { name })).toBeVisible();
  });

  test("recrutamento: criar vaga, publicar no site, mover candidato e contratar", async ({ page }) => {
    const title = `Analista de Testes ${uid()}`;
    await login(page, "rh");
    await page.goto("/rh/recrutamento/vagas/nova");
    await page.getByLabel("Cargo da vaga").fill(title);
    await page.getByLabel("Resumo").fill("Vaga criada pelo teste automatizado.");
    await page.getByLabel("Atividades").fill("Planejar testes\nExecutar testes");
    await page.getByLabel("Requisitos").fill("Experiência com qualidade");
    await page.getByLabel("Departamento").selectOption({ label: "Qualidade e Laboratório" });
    await page.getByLabel("Cargo no quadro").selectOption({ label: "Inspetor de Qualidade" });
    await page.getByRole("button", { name: "Salvar e publicar no site" }).click();
    await expect(page).toHaveURL(/\/rh\/recrutamento\/vagas/);
    await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Notificações" })).toContainText("Vaga publicada no site.");

    // aparece no site público
    await page.goto("/trabalhe-conosco");
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    // mover um candidato pelo seletor do cartão (alternativa acessível ao arrastar)
    await page.goto("/rh/recrutamento?vaga=1");
    const triagem = page.getByRole("listitem", { name: /^Triagem:/ });
    const card = triagem.locator("article.kcard").first();
    const candName = (await card.locator(".kcard__name").innerText()).trim();
    await card.getByRole("combobox").selectOption("ENTREVISTA");
    await expectToast(page, "movido(a) para Entrevista");
    await expect(page.getByRole("listitem", { name: /^Entrevista:/ }).getByRole("link", { name: candName })).toBeVisible();

    await page.getByRole("link", { name: candName }).click();
    await expect(page.getByText("Triagem → Entrevista").first()).toBeVisible();

    // contratar o candidato aprovado da vaga 1
    await page.goto("/rh/recrutamento?vaga=1");
    const approved = page.getByRole("listitem", { name: /^Aprovado:/ }).locator("article.kcard").first();
    const hired = (await approved.locator(".kcard__name").innerText()).trim();
    await approved.getByRole("link", { name: hired }).click();
    await page.getByRole("button", { name: "Contratar candidato" }).click();
    const d = await modal(page);
    await expect(d.getByText("Dados aproveitados")).toBeVisible();
    await d.getByLabel("E-mail corporativo").fill(`contratado.${uid()}@ams.example`);
    await d.getByRole("button", { name: "Confirmar contratação" }).click();
    await expect(page).toHaveURL(/\/rh\/funcionarios\/\d+/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(hired);
    await expect(page.getByRole("link", { name: "Ver processo seletivo" })).toBeVisible();
    await page.getByRole("navigation", { name: "Seções do perfil" }).getByRole("link", { name: "Documentos" }).click();
    await expect(page.getByText("Currículo (processo seletivo)")).toBeVisible();
    await expect(page.getByText("Contrato de trabalho assinado")).toBeVisible();

    // processo sai do quadro ativo e vai para Contratado
    await page.goto("/rh/recrutamento?vaga=1");
    await expect(page.getByRole("listitem", { name: /^Contratado:/ }).getByRole("link", { name: hired })).toBeVisible();
    await expect(page.getByRole("listitem", { name: /^Aprovado:/ }).getByRole("link", { name: hired })).toHaveCount(0);
  });

  test("férias: funcionário solicita e RH aprova", async ({ page }) => {
    await login(page, "funcionario");
    await page.goto("/rh/ferias");
    await page.getByRole("button", { name: "Solicitar férias" }).click();
    let d = await modal(page);
    const start = new Date();
    start.setDate(start.getDate() + 120);
    const end = new Date(start);
    end.setDate(end.getDate() + 4);
    const iso = (x: Date) => x.toLocaleDateString("sv-SE");
    await d.getByLabel("Início").fill(iso(start));
    await d.getByLabel("Término").fill(iso(end));
    await d.getByLabel("Observação").fill("Pedido do teste automatizado");
    await d.getByRole("button", { name: "Enviar pedido" }).click();
    await expectToast(page, "Pedido enviado");
    await expect(page.getByRole("cell", { name: /Pendente/ }).first()).toBeVisible();
    await logout(page);

    await login(page, "rh");
    await page.goto("/rh/ferias?ver=pendentes");
    const row = page.getByRole("row", { name: /Lucas Pereira/ }).filter({ hasText: "Pedido do teste automatizado" });
    await row.getByRole("button", { name: "Aprovar" }).click();
    d = await modal(page);
    await d.getByRole("button", { name: "Aprovar" }).click();
    await expectToast(page, "aprovadas");
    await logout(page);

    await login(page, "funcionario");
    await page.goto("/rh/ferias");
    await expect(page.getByRole("row", { name: /Pedido do teste automatizado/ }).getByText("Aprovadas")).toBeVisible();
  });

  test("documentos: RH pede, funcionário envia, RH valida", async ({ page }) => {
    const title = `Certificado NR-35 ${uid()}`;
    await login(page, "rh");
    await page.goto("/rh/documentos");
    await page.getByRole("button", { name: "Pedir documento" }).click();
    let d = await modal(page);
    await d.getByLabel("Funcionário").selectOption({ label: "Lucas Pereira" });
    await d.getByLabel("Categoria").selectOption("CERTIFICADO");
    await d.getByLabel("Documento").fill(title);
    await d.getByRole("button", { name: "Criar pendência" }).click();
    await expectToast(page, "Pendência criada");
    await logout(page);

    await login(page, "funcionario");
    await expect(page.getByText(title)).toBeVisible();
    await page.goto("/rh/documentos");
    await page.getByRole("row", { name: new RegExp(title) }).getByRole("button", { name: "Enviar" }).click();
    d = await modal(page);
    await d.locator('input[type="file"]').setInputFiles(pdf("Certificado"));
    await d.getByRole("button", { name: "Enviar arquivo" }).click();
    await expectToast(page, "O RH vai validar");
    await expect(page.getByRole("row", { name: new RegExp(title) })).toContainText("Aguardando validação");
    await logout(page);

    await login(page, "rh");
    await page.goto("/rh/documentos?status=ENVIADO");
    const row = page.getByRole("row", { name: new RegExp(title) });
    // arquivo abre pela rota protegida
    const href = await row.getByRole("link", { name: /Abrir/ }).getAttribute("href");
    const file = await page.request.get(href!);
    expect(file.status()).toBe(200);
    expect(file.headers()["content-type"]).toBe("application/pdf");
    await row.getByRole("button", { name: "Validar" }).click();
    d = await modal(page);
    await d.getByRole("button", { name: "Validar" }).click();
    await expectToast(page, "Documento validado.");
  });

  test("solicitação: funcionário abre e RH responde", async ({ page }) => {
    const subject = `Declaração de teste ${uid()}`;
    await login(page, "funcionario");
    await page.goto("/rh/solicitacoes");
    await page.getByRole("button", { name: "Nova solicitação" }).click();
    const d = await modal(page);
    await d.getByLabel("Tipo").selectOption("DOCUMENTO");
    await d.getByLabel("Assunto").fill(subject);
    await d.getByLabel("Mensagem").fill("Preciso de uma declaração para o banco.");
    await d.getByRole("button", { name: "Enviar solicitação" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(subject);
    await expect(page.getByText("Aguardando resposta do RH.")).toBeVisible();
    const url = page.url();
    await logout(page);

    await login(page, "rh");
    await page.goto(url);
    await page.getByLabel("Situação").selectOption("CONCLUIDO");
    await page.getByRole("button", { name: "Salvar resposta" }).click();
    await expect(page.getByText("A resposta é obrigatória para encerrar.")).toBeVisible();
    await page.getByLabel("Resposta ao colaborador").fill("Declaração disponível na sua área de documentos.");
    await page.getByRole("button", { name: "Salvar resposta" }).click();
    await expectToast(page, "Concluído");
    await logout(page);

    await login(page, "funcionario");
    await page.goto(url);
    await expect(page.getByText("Declaração disponível na sua área de documentos.")).toBeVisible();
  });

  test("comunicado publicado pelo RH aparece para o funcionário", async ({ page }) => {
    const title = `Comunicado de teste ${uid()}`;
    await login(page, "rh");
    await page.goto("/rh/comunicados");
    await page.getByRole("button", { name: "Novo comunicado" }).click();
    const d = await modal(page);
    await d.getByLabel("Título").fill(title);
    await d.getByLabel("Mensagem").fill("Texto do comunicado criado pelo teste automatizado.");
    await d.getByRole("button", { name: "Publicar" }).click();
    await expectToast(page, "Comunicado publicado.");
    await logout(page);

    await login(page, "funcionario");
    await expect(page.getByText(title)).toBeVisible();
    await page.goto("/rh/comunicados");
    await expect(page.getByRole("article", { name: title })).toContainText("Novo");
  });

  test("auditoria registra contratação e mudança de etapa", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/rh/auditoria?acao=CONTRATACAO");
    await expect(page.getByRole("cell", { name: /Candidato contratado/ }).first()).toBeVisible();
    await page.goto("/rh/auditoria?acao=MUDANCA_ETAPA");
    await expect(page.getByRole("cell", { name: /→ Entrevista/ }).first()).toBeVisible();
  });
});
