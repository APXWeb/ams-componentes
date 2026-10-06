import { expect, test } from "@playwright/test";
import { login, pdf, uid } from "./helpers";

test.describe("Trabalhe Conosco → RH", () => {
  test("candidatura pelo site chega ao recrutamento", async ({ page }) => {
    const name = `Candidata Teste ${uid()}`;
    await page.goto("/trabalhe-conosco");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Construa sua carreira");
    await page.getByRole("link", { name: "Técnico de Laboratório da Qualidade" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Técnico de Laboratório da Qualidade");

    // validação: sem dados e sem currículo
    await page.getByRole("button", { name: "Quero me candidatar" }).click();
    await expect(page.getByText("Informe seu nome completo.")).toBeVisible();

    await page.getByLabel("Nome completo").fill(name);
    await page.getByLabel("E-mail", { exact: true }).fill(`${name.toLowerCase().replace(/\s/g, ".")}@example.com`);
    await page.getByLabel("Telefone", { exact: true }).fill("(11) 98888-7777");
    await page.getByLabel("Cidade", { exact: true }).fill("Cotia");
    // dados digitados continuam no formulário após o erro
    await page.getByRole("button", { name: "Quero me candidatar" }).click();
    await expect(page.getByLabel("Nome completo")).toHaveValue(name);

    await page.locator('input[name="resume"]').setInputFiles(pdf("Curriculo de teste"));
    await page.getByLabel("Mensagem").fill("Tenho experiência com ensaios elétricos.");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Quero me candidatar" }).click();
    await expect(page.getByRole("heading", { name: "Candidatura recebida" })).toBeVisible();

    // candidatura duplicada é recusada
    await page.goto("/trabalhe-conosco/tecnico-de-laboratorio-da-qualidade");
    await page.getByLabel("Nome completo").fill(name);
    await page.getByLabel("E-mail", { exact: true }).fill(`${name.toLowerCase().replace(/\s/g, ".")}@example.com`);
    await page.getByLabel("Telefone", { exact: true }).fill("(11) 98888-7777");
    await page.getByLabel("Cidade", { exact: true }).fill("Cotia");
    await page.locator('input[name="resume"]').setInputFiles(pdf());
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Quero me candidatar" }).click();
    await expect(page.locator(".notice--danger")).toContainText("Já recebemos uma candidatura");

    // RH vê o candidato na primeira coluna do quadro
    await login(page, "rh");
    await page.goto("/rh/recrutamento");
    const col = page.getByRole("listitem", { name: /^Candidato:/ });
    await expect(col.getByRole("link", { name })).toBeVisible();
    await col.getByRole("link", { name }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(name);
    await expect(page.getByText("Candidatura recebida pelo site.")).toBeVisible();
  });

  test("currículo com formato inválido é recusado", async ({ page }) => {
    await page.goto("/trabalhe-conosco/operador-de-maquinas");
    await page.getByLabel("Nome completo").fill("Arquivo Inválido");
    await page.getByLabel("E-mail", { exact: true }).fill(`invalido.${uid()}@example.com`);
    await page.getByLabel("Telefone", { exact: true }).fill("11977776666");
    await page.getByLabel("Cidade", { exact: true }).fill("Itapevi");
    await page.locator('input[name="resume"]').setInputFiles({ name: "curriculo.pdf", mimeType: "application/pdf", buffer: Buffer.from("<script>alert(1)</script>") });
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Quero me candidatar" }).click();
    await expect(page.getByText("Envie o currículo em PDF ou DOCX.").first()).toBeVisible();
  });
});
