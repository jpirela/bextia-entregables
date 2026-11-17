import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const START = "<!-- matriz:inicio -->";
const END = "<!-- matriz:fin -->";
const STATUS = { passed: "OK", failed: "FALLA" };

const rel = (file, root) => {
  const f = file.replaceAll("\\", "/");
  const r = root.replaceAll("\\", "/").replace(/\/$/, "");
  return f.startsWith(r + "/") ? f.slice(r.length + 1) : f.split("/").slice(-3).join("/");
};
// Primera línea del error, sin rutas del equipo (Windows: C:\ o C:/).
const firstLine = (msgs) => (msgs?.[0] ?? "").split("\n")[0].replace(/[A-Za-z]:[\\/][^\s)]+|\/(?:home|Users)\/[^\s)]+/g, "<ruta>").slice(0, 160);
const fmt = (o) => Object.entries(o ?? {}).map(([k, v]) => `${k}=${v === null ? "null" : String(v)}`).join(", ");

export function rowsFromVitest(report, root) {
  return report.testResults.flatMap((file) =>
    file.assertionResults.map((a) => ({
      suite: [rel(file.name, root), ...a.ancestorTitles].join(" › "),
      caso: a.title,
      esperado: a.title,
      obtenido: STATUS[a.status] ?? "OMITIDO",
      detalle: a.status === "failed" ? firstLine(a.failureMessages) : "",
    })));
}

export function rowsFromEval(report) {
  return report.results.map((r) => ({
    suite: `eval › ${r.prompt}`,
    caso: r.id,
    esperado: fmt(r.expected),
    obtenido: r.ok ? "OK" : "FALLA",
    detalle: r.mismatches.map((k) => `${k}: ${r.got?.[k] === null || r.got?.[k] === undefined ? "null" : String(r.got[k])}`).join("; "),
  }));
}

const cell = (s) => String(s).replaceAll("|", "\\|").replaceAll("\n", " ");

export function renderMatrix(rows) {
  const n = (s) => rows.filter((r) => r.obtenido === s).length;
  const head = `**Total:** ${rows.length} · OK ${n("OK")} · FALLA ${n("FALLA")} · OMITIDO ${n("OMITIDO")}`;
  const lines = rows.map((r) => `| ${cell(r.suite)} | ${cell(r.caso)} | ${cell(r.esperado)} | ${r.obtenido} | ${cell(r.detalle)} |`);
  return [head, "", "| Suite | Caso | Esperado | Obtenido | Detalle |", "|---|---|---|---|---|", ...lines].join("\n");
}

export function replaceBetween(doc, block) {
  const i = doc.indexOf(START);
  const j = doc.indexOf(END);
  if (i < 0 || j < i) throw new Error("marcadores matriz:inicio/fin ausentes");
  return doc.slice(0, i + START.length) + "\n" + block + "\n" + doc.slice(j);
}

// `node --test tools/` también carga este archivo: no ejecutar la CLI bajo el runner.
if (!process.env.NODE_TEST_CONTEXT && process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const evalAt = args.indexOf("--eval");
  const evalFile = evalAt >= 0 ? args.splice(evalAt, 2)[1] : null;
  const [out, ...vitestFiles] = args;
  if (!out || vitestFiles.length === 0) {
    console.error("uso: node tools/test-matrix.mjs <salida.md> <vitest.json>... [--eval <eval.json>]");
    process.exit(2);
  }
  const root = fileURLToPath(new URL("../bextia-agentes/", import.meta.url));
  const rows = vitestFiles.flatMap((f) => rowsFromVitest(JSON.parse(readFileSync(f, "utf8")), root));
  if (evalFile) rows.push(...rowsFromEval(JSON.parse(readFileSync(evalFile, "utf8"))));
  writeFileSync(out, replaceBetween(readFileSync(out, "utf8"), renderMatrix(rows)));
  console.log(`matriz: ${rows.length} filas → ${out}`);
}
