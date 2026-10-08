// Uso: node _tools/flatten-rsc.cjs [pasta=out]
// Pós-build da exportação estática (GitHub Pages). O Next 16 grava os payloads de prefetch por
// segmento em pastas (ex.: rh/__next.rh/!KGFwcCk/ferias/__PAGE__.txt), mas o navegador os pede
// com o caminho unido por pontos (rh/__next.rh.!KGFwcCk.ferias.__PAGE__.txt). Sem esta cópia,
// cada clique em link vira um recarregamento completo da página em vez de navegação instantânea.
const fs = require("fs");
const path = require("path");

const OUT = path.resolve(process.argv[2] ?? "out");
let copied = 0;

function filesUnder(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? filesUnder(p) : [p];
  });
}

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const p = path.join(dir, e.name);
    if (e.name.startsWith("__next.")) {
      for (const f of filesUnder(p)) {
        const rel = path.relative(dir, f).split(path.sep).join(".");
        const target = path.join(dir, rel);
        if (!fs.existsSync(target)) {
          fs.copyFileSync(f, target);
          copied++;
        }
      }
    } else if (e.name !== "_next") {
      walk(p);
    }
  }
}

walk(OUT);
console.log(`flatten-rsc: ${copied} arquivos de prefetch copiados em ${OUT}`);
