import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => readFileSync(join(root, name), "utf8");
const write = (name, text) => writeFileSync(join(root, name), text);

function listJs(dir) {
  const files = [];
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listJs(path));
    else if (entry.name.endsWith(".js")) files.push(path);
  }
  return files;
}

const current = JSON.parse(read("version.json")).version;
const target = process.argv[2] ?? "patch";

function nextVersion(version, target) {
  if (/^\d+\.\d+\.\d+$/.test(target)) return target;
  const [major, minor, patch] = version.split(".").map(Number);
  if (target === "major") return `${major + 1}.0.0`;
  if (target === "minor") return `${major}.${minor + 1}.0`;
  if (target === "patch") return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Alvo inválido: ${target}. Use patch, minor, major ou X.Y.Z.`);
}

const next = nextVersion(current, target);
const stamp = new Date().toLocaleDateString("pt-BR");

write("version.json", `${JSON.stringify({ version: next }, null, 2)}\n`);

write(
  "src/config.js",
  read("src/config.js").replace(
    /export const APP_VERSION = "[^"]+";/,
    `export const APP_VERSION = "${next}";`,
  ),
);

write(
  "index.html",
  read("index.html").replace(/\?v=[^"]+/g, `?v=${next}`),
);

write(
  "sw.js",
  read("sw.js")
    .replace(/const CACHE_VERSION = "[^"]+";/, `const CACHE_VERSION = "${next}";`)
    .replace(/(\.\/src\/[^"?]+\.js)(\?v=[^"]*)?"/g, `$1?v=${next}"`)
    .replace(/\?v=[^"']+/g, `?v=${next}`),
);

for (const file of listJs("src")) {
  write(
    file,
    read(file).replace(
      /(from\s+")(\.[^"?]+\.js)(\?v=[^"]*)?"/g,
      `$1$2?v=${next}"`,
    ),
  );
}

write(
  "LEIA-ME.txt",
  read("LEIA-ME.txt")
    .replace(/^Versão atual: .*$/m, `Versão atual: ${next}`)
    .replace(/^Atualizado em: .*$/m, `Atualizado em: ${stamp}`),
);

console.log(`Versão: ${current} -> ${next}`);
