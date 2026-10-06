import { expect, test } from "@playwright/test";
import { login, logout, PASSWORD } from "./helpers";

test.describe("Autenticação e permissões", () => {
  test("rotas privadas exigem login", async ({ page, request }) => {
    await page.goto("/rh/funcionarios");
    await expect(page).toHaveURL(/\/rh\/login\?next=%2Frh%2Ffuncionarios/);
    // arquivos privados não têm URL pública
    const file = await request.get("/rh/arquivos/1", { maxRedirects: 0 });
    expect([307, 401, 404]).toContain(file.status());
  });

  test("senha incorreta mostra erro genérico", async ({ page }) => {
    await page.goto("/rh/login");
    await page.getByLabel("E-mail").fill("rh@ams.example");
    await page.getByLabel("Senha", { exact: true }).fill("senha-errada-123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.locator(".notice--danger")).toContainText("E-mail ou senha incorretos.");
    await expect(page.getByLabel("E-mail")).toHaveValue("rh@ams.example");
  });

  test("login, redirecionamento para a página pedida e logout", async ({ page }) => {
    await page.goto("/rh/ferias");
    await page.getByLabel("E-mail").fill("rh@ams.example");
    await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/rh\/ferias$/);
    await logout(page);
    await page.goto("/rh");
    await expect(page).toHaveURL(/\/rh\/login/);
  });

  test("funcionário não acessa áreas do RH (bloqueio no servidor)", async ({ page }) => {
    await login(page, "funcionario");
    const nav = page.getByRole("complementary", { name: "Navegação do RH" });
    await expect(nav.getByRole("link", { name: "Funcionários" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Recrutamento" })).toHaveCount(0);
    // mesmo digitando a URL, o servidor bloqueia
    for (const url of ["/rh/funcionarios", "/rh/recrutamento", "/rh/indicadores", "/rh/auditoria", "/rh/usuarios"]) {
      await page.goto(url);
      await expect(page.getByText("Acesso não permitido")).toBeVisible();
    }
    // exportação CSV também é bloqueada
    const res = await page.request.get("/rh/exportar/funcionarios");
    expect(res.status()).toBe(404);
  });

  test("gestor vê apenas a própria equipe", async ({ page }) => {
    await login(page, "gestor");
    await page.goto("/rh/funcionarios");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Minha equipe");
    await expect(page.getByRole("cell", { name: "Comercial" })).toHaveCount(0);
    // funcionário de outro departamento: a página "não existe" para o gestor
    await page.goto("/rh/funcionarios?dep=4");
    await expect(page.getByText(/0 pessoas encontradas/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Novo funcionário" })).toHaveCount(0);
    await page.goto("/rh/recrutamento");
    await expect(page.getByText("Visualização somente leitura")).toBeVisible();
  });

  test("RH não acessa auditoria nem usuários (exclusivo do admin)", async ({ page }) => {
    await login(page, "rh");
    await page.goto("/rh/auditoria");
    await expect(page.getByText("Acesso não permitido")).toBeVisible();
    await logout(page);
    await login(page, "admin");
    await page.goto("/rh/auditoria");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Auditoria");
    await expect(page.getByRole("cell", { name: "Login", exact: true }).first()).toBeVisible();
  });
});
