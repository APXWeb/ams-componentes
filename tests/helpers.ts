import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Ams@demo2026";
export type Role = "admin" | "rh" | "gestor" | "funcionario";

export async function login(page: Page, role: Role) {
  await page.goto("/rh/login");
  await page.getByLabel("E-mail").fill(`${role}@ams.example`);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/rh$/);
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Sair do sistema" }).click();
  await expect(page).toHaveURL(/\/rh\/login/);
}

/** PDF mínimo válido para uploads de teste. */
export function pdf(text = "Arquivo de teste") {
  const body = `BT /F1 12 Tf 60 760 Td (${text}) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${body.length} >>\nstream\n${body}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offs: number[] = [];
  objs.forEach((o, i) => {
    offs.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const x = out.length;
  out += `xref\n0 6\n0000000000 65535 f \n${offs.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return { name: "documento.pdf", mimeType: "application/pdf", buffer: Buffer.from(out, "latin1") };
}

/** Confirma o aviso (toast) de sucesso ou erro. */
export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.getByRole("region", { name: "Notificações" })).toContainText(text);
}

export const uid = () => Date.now().toString(36).slice(-5);
