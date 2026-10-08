// Uso: node _tools/crawl-rh.cjs <base> <pasta> [largura] [altura] [userId do perfil: 1 admin, 2 RH, 3 gestor, 4 funcionário] [rotas,separadas,por,vírgula]
// Percorre as telas do RH, salva capturas e lista erros do console e rolagem horizontal.
const path = require("path");
const PROJ = path.join(__dirname, "..");
const { chromium } = require(path.join(PROJ, "node_modules", "@playwright/test"));
const fs = require("fs");
(async () => {
  const [base, out, w = "1440", h = "900", persona = "2", routesArg] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  await ctx.addInitScript((id) => {
    try {
      if (!localStorage.getItem("ams-demo:session")) localStorage.setItem("ams-demo:session", id);
    } catch {}
  }, persona);
  const p = await ctx.newPage();
  const errors = [];
  p.on("console", (m) => (m.type() === "error" || m.type() === "warning") && errors.push(`[${p.url()}] ${m.type()}: ${m.text()}`));
  p.on("pageerror", (e) => errors.push(`[${p.url()}] pageerror: ${e}`));
  const routes = routesArg
    ? routesArg.split(",")
    : ["/rh", "/rh/funcionarios", "/rh/funcionarios/3", "/rh/funcionarios/3?aba=documentos", "/rh/funcionarios/3?aba=historico", "/rh/recrutamento", "/rh/recrutamento/vagas", "/rh/candidatos/15", "/rh/ferias", "/rh/solicitacoes", "/rh/solicitacoes/1", "/rh/comunicados", "/rh/documentos", "/rh/indicadores", "/rh/usuarios", "/rh/auditoria", "/rh/mensagens", "/rh/conta", "/rh/perfil", "/rh/funcionarios/novo", "/rh/recrutamento/vagas/nova"];
  for (const r of routes) {
    const t0 = Date.now();
    await p.goto(base + r, { waitUntil: "networkidle", timeout: 120000 });
    await p.waitForTimeout(900);
    const name = r.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "home";
    await p.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    console.log(`${r} ${Date.now() - t0}ms${overflow ? " HORIZONTAL-OVERFLOW" : ""}`);
  }
  if (errors.length) console.log("CONSOLE:\n" + [...new Set(errors)].join("\n"));
  await b.close();
})();
