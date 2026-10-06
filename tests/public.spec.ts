import { expect, test } from "@playwright/test";

test.describe("Site público", () => {
  test("navegação principal e SEO básico", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/AMS Componentes/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("fusíveis automotivos");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /fusíveis/);

    const nav = page.getByRole("navigation", { name: "Principal" });
    for (const [label, path, h1] of [
      ["Empresa", "/empresa", /quatro décadas/],
      ["Lançamentos", "/lancamentos", /lançamentos/i],
      ["Representantes", "/representantes", /Representantes/],
      ["Eventos", "/eventos", /Eventos/],
      ["Contato", "/contato", /Fale com a AMS/],
    ] as const) {
      await nav.getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole("heading", { level: 1 })).toContainText(h1);
    }
  });

  test("catálogo: filtro por linha e busca por código", async ({ page }) => {
    await page.goto("/produtos");
    await page.getByRole("button", { name: /^Cordoalhas/ }).first().click();
    await expect(page).toHaveURL(/linha=cordoalhas/);
    await expect(page.getByRole("heading", { level: 3 }).first()).toContainText("Cordoalha");

    await page.goto("/produtos");
    await page.getByLabel("Buscar por nome ou código").fill("17010");
    await expect(page.getByText(/1 produto/)).toBeVisible();
    await page.getByRole("link", { name: "Fusível Mini Lâmina", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fusível Mini Lâmina");
    await expect(page.locator("tr.is-hl")).toContainText("17010");
  });

  test("redirecionamento das URLs antigas do WordPress", async ({ page }) => {
    await page.goto("/produto/fusivel-lamina1/");
    await expect(page).toHaveURL(/\/produtos\/fusivel-lamina$/);
    await page.goto("/quem-somos");
    await expect(page).toHaveURL(/\/empresa$/);
  });

  test("representantes por estado", async ({ page }) => {
    await page.goto("/representantes");
    await page.getByLabel("Selecione o estado").selectOption("BA");
    await expect(page.getByRole("heading", { level: 2, name: "Bahia" })).toBeVisible();
    await expect(page.getByText("Amilton Cardoso Representações Ltda.")).toBeVisible();
  });

  test("contato: validação e envio", async ({ page }) => {
    await page.goto("/contato");
    await page.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(page.getByText("Informe seu nome.")).toBeVisible();
    await expect(page.getByLabel("Nome")).toHaveAttribute("aria-invalid", "true");

    await page.getByLabel("Nome").fill("Teste Automatizado");
    await page.getByLabel("E-mail").fill("teste@example.com");
    await page.getByLabel("Assunto").selectOption("Indústria");
    await page.getByLabel("Mensagem").fill("Mensagem enviada pelo teste automatizado.");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(page.getByRole("heading", { name: "Mensagem enviada" })).toBeVisible();
  });

  test("área privada não é indexável", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /rh");
    const res = await request.get("/rh/login");
    expect(res.headers()["x-robots-tag"]).toContain("noindex");
  });
});
