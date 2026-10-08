import { expect, test } from "@playwright/test";
import { expectToast, login, pdf } from "./helpers";

test.describe("Login de demonstração", () => {
  test("cada perfil entra e vê o próprio menu", async ({ page }) => {
    await login(page, "Funcionário");
    const nav = page.getByRole("complementary", { name: "Navegação do RH" });
    await expect(nav.getByRole("link", { name: "Meu perfil" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Recrutamento" })).toHaveCount(0);

    await login(page, "Gestor");
    await expect(nav.getByRole("link", { name: "Minha equipe" })).toBeVisible();

    await login(page, "Administrador");
    await expect(nav.getByRole("link", { name: "Auditoria" })).toBeVisible();
  });

  test("validação visual e sair", async ({ page }) => {
    await page.goto("/rh/login");
    await page.getByLabel("E-mail").fill("invalido");
    await page.getByRole("button", { name: /^Entrar como/ }).click();
    await expect(page.getByText("Informe um e-mail válido.")).toBeVisible();
    await page.getByLabel("E-mail").fill("rh@ams.example");
    await page.getByRole("button", { name: /^Entrar como/ }).click();
    await expect(page).toHaveURL(/\/rh$/);
    await page.getByRole("button", { name: /Mariana Campos/ }).click();
    await page.getByRole("menuitem", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/rh\/login\?saiu=1/);
  });

  test("perfil sem permissão vê aviso, não erro", async ({ page }) => {
    await login(page, "Funcionário");
    await page.goto("/rh/usuarios");
    await expect(page.getByText("Acesso não permitido para este perfil")).toBeVisible();
  });
});

test.describe("RH", () => {
  test.beforeEach(async ({ page }) => login(page));

  test("painel com números coerentes com a lista de funcionários", async ({ page }) => {
    const kpi = page.getByRole("link", { name: /Funcionários ativos/ });
    const n = (await kpi.locator(".kpi__value").textContent())!.trim();
    await kpi.click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Funcionários");
    await expect(page.getByText(`${n} pessoas encontradas`)).toBeVisible();
  });

  test("funcionários: busca, filtros e perfil com abas", async ({ page }) => {
    await page.goto("/rh/funcionarios");
    await page.getByLabel("Departamento").selectOption({ label: "Recursos Humanos" });
    await expect(page).toHaveURL(/dep=/);
    await expect(page.getByRole("link", { name: "Mariana Campos" })).toBeVisible();
    await page.getByLabel("Buscar", { exact: true }).fill("Lucas Pereira");
    await page.getByLabel("Departamento").selectOption("");
    await expect(page.getByText("1 pessoa encontrada")).toBeVisible();
    await page.getByRole("link", { name: "Lucas Pereira" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Lucas Pereira");
    await expect(page.getByText("Operador de Máquinas").first()).toBeVisible();
    for (const tab of ["Documentos", "Férias", "Solicitações", "Histórico"]) {
      await page.getByRole("navigation", { name: "Seções do perfil" }).getByRole("link", { name: new RegExp(`^${tab}`) }).click();
      await expect(page).toHaveURL(/aba=/);
    }
    await page.getByRole("navigation", { name: "Seções do perfil" }).getByRole("link", { name: /^Documentos/ }).click();
    await page.getByRole("button", { name: /Abrir Holerite/ }).first().click();
    await expect(page.getByText("Demonstrativo de pagamento")).toBeVisible();
    await page.getByRole("button", { name: "Fechar" }).click();
  });

  test("busca sem resultado mostra estado vazio", async ({ page }) => {
    await page.goto("/rh/funcionarios?q=zzzzz");
    await expect(page.getByText("Ninguém encontrado")).toBeVisible();
    await page.getByRole("link", { name: "Limpar filtros" }).click();
    await expect(page.getByText(/pessoas encontradas/)).toBeVisible();
  });

  test("cadastro de funcionário com validação", async ({ page }) => {
    await page.goto("/rh/funcionarios/novo");
    await page.getByRole("button", { name: "Cadastrar funcionário" }).click();
    await expect(page.getByText("Informe o nome completo.")).toBeVisible();
    await page.getByLabel("Nome completo").fill("Nicolas Almeida");
    await page.getByLabel("E-mail corporativo").fill("nicolas.almeida@ams.example");
    await page.getByLabel("Cargo").selectOption({ label: "Analista de Produção" });
    await page.getByRole("button", { name: "Cadastrar funcionário" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Nicolas Almeida");
    await expectToast(page, "Funcionário cadastrado");
  });

  test("Kanban: mover candidato pelo seletor e abrir o candidato", async ({ page }) => {
    await page.goto("/rh/recrutamento");
    const col = page.locator(".kcol").first();
    const card = col.locator(".kcard").first();
    const name = (await card.locator(".kcard__name").textContent())!.trim();
    await card.locator("select").selectOption("TRIAGEM");
    await expectToast(page, "movido(a) para Triagem");
    await expect(page.locator(".kcol").nth(1)).toContainText(name);
    await page.locator(".kcol").nth(1).getByRole("link", { name }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(name);
    await expect(page.getByText("Candidato → Triagem").first()).toBeVisible();
  });

  test("contratação de candidato aprovado vira funcionário", async ({ page }) => {
    await page.goto("/rh/recrutamento");
    const approved = page.locator(".kcol").nth(4).locator(".kcard").first();
    const name = (await approved.locator(".kcard__name").textContent())!.trim();
    await approved.getByRole("link", { name }).click();
    await page.getByRole("button", { name: "Contratar candidato" }).click();
    await page.getByRole("button", { name: "Confirmar contratação" }).click();
    await expect(page).toHaveURL(/\/rh\/funcionarios\/\d+$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(name);
    await expect(page.getByText("Contratado pelo recrutamento.")).toBeVisible();
  });

  test("férias: aprovar pedido pendente", async ({ page }) => {
    await page.goto("/rh/ferias?ver=pendentes");
    const before = await page.getByRole("button", { name: "Aprovar" }).count();
    await page.getByRole("button", { name: "Aprovar" }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Aprovar" }).click();
    await expectToast(page, "aprovadas");
    await expect(page.getByRole("button", { name: "Aprovar" })).toHaveCount(before - 1);
  });

  test("solicitação: responder muda o status", async ({ page }) => {
    await page.goto("/rh/solicitacoes");
    await page.getByRole("link", { name: "Declaração de vínculo empregatício" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Declaração de vínculo empregatício");
    await page.getByLabel("Situação").selectOption("CONCLUIDO");
    await page.getByRole("button", { name: "Salvar resposta" }).click();
    await expect(page.getByText("A resposta é obrigatória para encerrar.")).toBeVisible();
    await page.getByLabel("Resposta ao colaborador").fill("Declaração disponível na sua área de documentos.");
    await page.getByRole("button", { name: "Salvar resposta" }).click();
    await expectToast(page, "Concluído");
    await expect(page.getByText("Resposta do RH")).toBeVisible();
  });

  test("comunicado: publicar e abrir", async ({ page }) => {
    await page.goto("/rh/comunicados");
    await page.getByRole("button", { name: "Novo comunicado" }).click();
    await page.getByLabel("Título").fill("Parada programada da linha 2");
    await page.getByLabel("Mensagem").fill("A linha 2 fica parada na sexta para manutenção preventiva.");
    await page.getByRole("button", { name: "Publicar" }).click();
    await expectToast(page, "Comunicado publicado");
    await page.getByRole("button", { name: "Parada programada da linha 2" }).click();
    await expect(page.getByRole("dialog")).toContainText("manutenção preventiva");
  });

  test("documentos: envio pelo RH com arquivo e remoção do arquivo escolhido", async ({ page }) => {
    await page.goto("/rh/documentos");
    await page.getByRole("button", { name: "Enviar arquivo" }).click();
    const dlg = page.getByRole("dialog");
    await dlg.getByLabel("Funcionário").selectOption({ label: "Lucas Pereira" });
    await dlg.getByLabel("Categoria").selectOption("CERTIFICADO");
    await dlg.getByLabel("Nome do documento").fill("Certificado NR-35");
    await dlg.locator('input[type="file"]').setInputFiles(pdf("nr35.pdf"));
    await expect(dlg.getByText("nr35.pdf")).toBeVisible();
    await dlg.getByRole("button", { name: "Remover nr35.pdf" }).click();
    await expect(dlg.getByText("nr35.pdf")).toHaveCount(0);
    await dlg.locator('input[type="file"]').setInputFiles(pdf("nr35.pdf"));
    await dlg.getByRole("button", { name: "Salvar documento" }).click();
    await expectToast(page, "Documento salvo");
  });

  test("notificações e busca rápida", async ({ page }) => {
    await page.getByRole("button", { name: /^Notificações/ }).click();
    await expect(page.getByRole("dialog", { name: "Notificações" })).toBeVisible();
    await page.getByRole("button", { name: "Marcar todas como lidas" }).click();
    await expect(page.getByText("Tudo em dia")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.keyboard.press("Control+k");
    await page.getByRole("combobox", { name: "Buscar" }).fill("Lucas");
    await page.getByRole("option", { name: /Lucas Pereira/ }).first().click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Lucas Pereira");
  });

  test("troca de perfil pelo menu do usuário", async ({ page }) => {
    await page.getByRole("button", { name: /Mariana Campos/ }).click();
    await page.getByRole("menuitemradio", { name: /Gestor/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Ricardo");
    await expect(page.getByText("Gestão · Produção")).toBeVisible();
  });
});
