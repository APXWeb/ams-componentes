// Visita as rotas do RH com cada perfil e reporta status, erros de console e telas de erro.
const { chromium } = require("@playwright/test");
const BASE = process.argv[2] || "http://localhost:3100";
const ROUTES = [
  "/rh", "/rh/indicadores", "/rh/funcionarios", "/rh/funcionarios/novo", "/rh/funcionarios/1", "/rh/funcionarios/1?aba=documentos",
  "/rh/funcionarios/1?aba=ferias", "/rh/funcionarios/1?aba=solicitacoes", "/rh/funcionarios/1?aba=historico", "/rh/funcionarios/3/editar",
  "/rh/recrutamento", "/rh/recrutamento?vaga=1", "/rh/recrutamento/vagas", "/rh/recrutamento/vagas/nova", "/rh/recrutamento/vagas/1",
  "/rh/candidatos/1", "/rh/documentos", "/rh/ferias", "/rh/solicitacoes", "/rh/solicitacoes/1", "/rh/comunicados", "/rh/perfil",
  "/rh/auditoria", "/rh/usuarios", "/rh/mensagens", "/rh/conta", "/rh/exportar/funcionarios",
];
const ROLES = ["admin", "rh", "gestor", "funcionario"];
(async () => {
  const b = await chromium.launch();
  for (const role of ROLES) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const p = await ctx.newPage();
    const errors = [];
    p.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
    p.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
    await p.goto(BASE + "/rh/login");
    await p.fill("#email", `${role}@ams.example`);
    await p.fill("#password", "Ams@demo2026");
    await Promise.all([p.waitForURL((u) => !u.pathname.endsWith("/login")), p.click("button[type=submit]")]);
    const out = [];
    for (const r of ROUTES) {
      errors.length = 0;
      let status;
      if (r.includes("exportar")) {
        const res = await p.request.get(BASE + r);
        status = res.status();
        out.push(`${status} ${r}`);
        continue;
      }
      const res = await p.goto(BASE + r, { waitUntil: "networkidle" });
      status = res.status();
      const txt = await p.locator("main").innerText().catch(() => "");
      const flag = txt.includes("Algo deu errado") ? " !!ERRO" : txt.includes("Acesso não permitido") ? " (403)" : txt.includes("Registro não encontrado") ? " (404)" : "";
      out.push(`${status} ${r}${flag}${errors.length ? "  CONSOLE: " + errors.join(" | ") : ""}`);
    }
    console.log(`\n== ${role}\n` + out.join("\n"));
    await ctx.close();
  }
  await b.close();
})();
