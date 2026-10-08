import { expect, test } from "@playwright/test";
import { pdf } from "./helpers";

test.describe("Trabalhe conosco", () => {
  test("lista, filtro por área e detalhes da vaga", async ({ page }) => {
    await page.goto("/trabalhe-conosco");
    await expect(page.locator(".job")).toHaveCount(5);
    await page.getByRole("link", { name: "Produção", exact: true }).click();
    await expect(page.locator(".job")).toHaveCount(2);
    await page.getByRole("link", { name: "Operador de Máquinas" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Operador de Máquinas");
    await expect(page.getByRole("heading", { name: "Requisitos" })).toBeVisible();
  });

  test("candidatura: validação, arquivo, envio simulado e chegada no RH", async ({ page }) => {
    await page.goto("/trabalhe-conosco/operador-de-maquinas");
    await page.getByRole("button", { name: "Enviar candidatura" }).click();
    await expect(page.getByText("Informe seu nome completo.")).toBeVisible();
    await expect(page.getByText("Anexe seu currículo em PDF ou DOCX.")).toBeVisible();

    await page.getByLabel("Nome completo").fill("Nicolas Almeida");
    await page.getByLabel("E-mail", { exact: true }).fill("nicolas.almeida@example.com");
    await page.getByLabel("Telefone", { exact: true }).fill("11987654321");
    await expect(page.getByLabel("Telefone", { exact: true })).toHaveValue("(11) 98765-4321");
    await page.getByLabel("Cidade", { exact: true }).fill("Cotia");
    await page.getByLabel("Formação").selectOption("Curso técnico");
    await page.getByLabel("Experiência na área").selectOption("3 a 5 anos");
    await page.locator('input[name="resume"]').setInputFiles(pdf("curriculo-nicolas.pdf"));
    await expect(page.getByText("curriculo-nicolas.pdf")).toBeVisible();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Enviar candidatura" }).click();
    await expect(page.getByText("Validando os dados…")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Currículo enviado com sucesso." })).toBeVisible({ timeout: 10_000 });

    await page.getByRole("link", { name: /Ver a candidatura no RH/ }).click();
    await expect(page.locator(".kcol").first()).toContainText("Nicolas Almeida");
  });
});
