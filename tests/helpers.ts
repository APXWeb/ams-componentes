import { expect, type Page } from "@playwright/test";

export type Persona = "Recursos Humanos" | "Gestor" | "Funcionário" | "Administrador";

/** Entra na demonstração pela tela de login escolhendo um perfil. */
export async function login(page: Page, persona: Persona = "Recursos Humanos") {
  await page.goto("/rh/login");
  await page.getByRole("button", { name: new RegExp(`^${persona}`) }).click();
  await page.getByRole("button", { name: /^Entrar como/ }).click();
  await expect(page).toHaveURL(/\/rh$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Bom dia|Boa tarde|Boa noite/);
}

/** PDF mínimo válido para uploads de teste. */
export function pdf(name = "curriculo.pdf") {
  const body = "BT /F1 12 Tf 60 760 Td (Arquivo de teste) Tj ET";
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
  return { name, mimeType: "application/pdf", buffer: Buffer.from(out, "latin1") };
}

/** Confirma o aviso (toast) de sucesso ou erro. */
export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.getByRole("region", { name: "Notificações" })).toContainText(text);
}
