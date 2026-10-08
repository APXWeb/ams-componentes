// Uso: node _tools/shot.cjs <url> <saida.png> [largura] [altura] [fullpage=1] [as:email]
// Captura de tela para revisão visual (Chromium do Playwright). "as:<userId>" entra na demo com aquele perfil (1 admin, 2 RH, 3 gestor, 4 funcionário).
const { chromium } = require("@playwright/test");
(async () => {
  const [url, out, w = "1440", h = "900", full = "1", as] = process.argv.slice(2);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  const errors = [];
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  p.on("pageerror", (e) => errors.push(String(e)));
  if (as && as.startsWith("as:")) {
    await ctx.addInitScript((id) => localStorage.setItem("ams-demo:session", id), as.slice(3));
  }
  await p.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  await p.evaluate(() => document.querySelectorAll("[data-reveal]").forEach((e) => e.classList.add("is-in")));
  await p.waitForTimeout(500);
  await p.screenshot({ path: out, fullPage: full === "1" });
  if (errors.length) console.log("CONSOLE ERRORS:\n" + errors.join("\n"));
  await b.close();
})();
