import { expect, test } from "@playwright/test";

test.describe("Cabeçalho do site", () => {
  test("altura fixa ao rolar para baixo e para cima (sem pulos)", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header.site-header");
    const h0 = (await header.boundingBox())!.height;
    const docH = await page.evaluate(() => document.documentElement.scrollHeight);
    const steps = [0, 10, 20, 30, 40, 80, 200, 600, 200, 80, 40, 30, 20, 10, 5, 0];
    for (const y of steps) {
      await page.mouse.wheel(0, 0);
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(120);
      const box = (await header.boundingBox())!;
      expect(box.height, `altura do topo em scrollY=${y}`).toBe(h0);
      // a página não muda de tamanho e a posição pedida é respeitada (sem efeito sanfona)
      expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(docH);
      expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(y);
      // depois que a barra de contato sai da tela, o topo fica colado no alto
      if (y >= 40) expect(Math.round(box.y)).toBe(0);
    }
  });
});
