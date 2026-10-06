import { expect, test } from "@playwright/test";
import { login } from "./helpers";

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

  test("sem rolagem horizontal nas páginas principais", async ({ page }) => {
    for (const url of ["/", "/produtos", "/produtos/fusivel-mini-lamina", "/representantes", "/trabalhe-conosco", "/contato"]) {
      await page.goto(url);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, url).toBeLessThanOrEqual(1);
    }
  });

  test("RH no celular: menu lateral e quadro", async ({ page }) => {
    await login(page, "rh");
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await page.getByRole("complementary", { name: "Navegação do RH" }).getByRole("link", { name: "Recrutamento" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Recrutamento");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
