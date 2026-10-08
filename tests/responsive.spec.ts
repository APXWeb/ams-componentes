import { expect, test } from "@playwright/test";
import { login } from "./helpers";

const noOverflow = async (page: import("@playwright/test").Page, label: string) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, label).toBeLessThanOrEqual(1);
};

test.describe("Celular", () => {
  test("menu do site abre e navega", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Abrir menu" }).click();
    const menu = page.locator("#menu-mobile");
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: /Trabalhe conosco/ }).click();
    await expect(page).toHaveURL(/trabalhe-conosco/);
    await expect(menu).toBeHidden();
  });

  test("sem rolagem horizontal nas páginas do site", async ({ page }) => {
    for (const url of ["/", "/produtos", "/produtos/fusivel-mini-lamina", "/representantes", "/trabalhe-conosco", "/trabalhe-conosco/operador-de-maquinas", "/contato", "/rh/login"]) {
      await page.goto(url);
      await noOverflow(page, url);
    }
  });

  test("RH no celular: menu lateral, telas principais sem rolagem horizontal", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await page.getByRole("complementary", { name: "Navegação do RH" }).getByRole("link", { name: "Recrutamento" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Recrutamento");
    for (const url of ["/rh", "/rh/recrutamento", "/rh/funcionarios", "/rh/funcionarios/3", "/rh/candidatos/15", "/rh/ferias", "/rh/solicitacoes", "/rh/comunicados", "/rh/documentos", "/rh/indicadores"]) {
      await page.goto(url);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await noOverflow(page, url);
    }
  });
});
