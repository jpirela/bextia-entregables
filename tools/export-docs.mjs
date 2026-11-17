import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const FENCE = /```mermaid\r?\n([\s\S]*?)\r?\n```/g;
// En Windows, pandoc y mmdc instalados por winget/yarn son shims .cmd: requieren shell.
const SHELL = process.platform === "win32";
const INSTALL = {
  pandoc: "winget install JohnMacFarlane.Pandoc",
  mmdc: "yarn global add @mermaid-js/mermaid-cli",
};

export function extractMermaid(md, prefix, ext = "svg") {
  const diagrams = [];
  const out = md.replace(FENCE, (_, code) => {
    const name = `${prefix}-${diagrams.length + 1}.${ext}`;
    diagrams.push({ name, code: code.replace(/\r\n/g, "\n") });
    return `![](${name})`;
  });
  return { md: out, diagrams };
}

// Mensajes con la instalación de cada herramienta ausente; vacío si están todas.
export function missingTools(exists, tools) {
  return tools.filter((t) => !exists(t)).map((t) => `Falta ${t}. Instalar con: ${INSTALL[t]}`);
}

function hasTool(cmd) {
  const r = spawnSync(cmd, ["--version"], { shell: SHELL, stdio: "ignore" });
  return r.status === 0;
}

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: "inherit", shell: SHELL });

// Solo se ejecuta como CLI; `node --test tools/` carga este archivo sin efectos.
if (!process.env.NODE_TEST_CONTEXT && process.argv[1] === fileURLToPath(import.meta.url)) {
  const pdf = process.argv.includes("--pdf");
  const missing = missingTools(hasTool, ["pandoc", "mmdc"]);
  if (missing.length > 0) {
    console.error(missing.join("\n"));
    process.exit(1);
  }
  const root = fileURLToPath(new URL("../docs/", import.meta.url));
  for (const folder of ["entregables", "propuesta"]) {
    if (!existsSync(join(root, folder))) continue;
    const outDir = join(root, "export", folder);
    mkdirSync(outDir, { recursive: true });
    for (const file of readdirSync(join(root, folder)).filter((f) => f.endsWith(".md"))) {
      const stem = basename(file, ".md");
      const src = readFileSync(join(root, folder, file), "utf8");
      const { md, diagrams } = extractMermaid(src, stem, pdf ? "png" : "svg");
      for (const d of diagrams) {
        const mmd = d.name.replace(/\.\w+$/, ".mmd");
        writeFileSync(join(outDir, mmd), d.code);
        run("mmdc", ["-i", mmd, "-o", d.name, "-b", "white"], outDir);
      }
      writeFileSync(join(outDir, `${stem}.md`), md);
      run("pandoc", [`${stem}.md`, "-o", `${stem}.docx`], outDir);
      if (pdf) run("pandoc", [`${stem}.md`, "-o", `${stem}.pdf`, "--pdf-engine=xelatex"], outDir);
      console.log(`export: ${folder}/${stem} (${diagrams.length} diagramas)`);
    }
  }
}
