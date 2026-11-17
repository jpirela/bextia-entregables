import { test } from "node:test";
import assert from "node:assert/strict";
import { extractMermaid, missingTools } from "./export-docs.mjs";

test("extractMermaid reemplaza bloques y conserva el resto", () => {
  const md = "# T\n\n```mermaid\nflowchart LR\n  A-->B\n```\n\ntexto\n\n```mermaid\nerDiagram\n```\n\n```js\nx\n```\n";
  const r = extractMermaid(md, "03");
  assert.equal(r.diagrams.length, 2);
  assert.deepEqual(r.diagrams[0], { name: "03-1.svg", code: "flowchart LR\n  A-->B" });
  assert.match(r.md, /!\[\]\(03-1\.svg\)/);
  assert.match(r.md, /!\[\]\(03-2\.svg\)/);
  assert.match(r.md, /```js\nx\n```/);
  assert.doesNotMatch(r.md, /```mermaid/);
});

test("extractMermaid detecta bloques con CRLF", () => {
  const r = extractMermaid("a\r\n```mermaid\r\nflowchart LR\r\n  A-->B\r\n```\r\nb\r\n", "x");
  assert.equal(r.diagrams.length, 1);
  assert.equal(r.diagrams[0].name, "x-1.svg");
  assert.doesNotMatch(r.md, /mermaid/);
});

test("extractMermaid acepta otra extensión (PNG para PDF)", () => {
  const r = extractMermaid("```mermaid\nerDiagram\n```", "p", "png");
  assert.equal(r.diagrams[0].name, "p-1.png");
  assert.match(r.md, /!\[\]\(p-1\.png\)/);
});

test("extractMermaid sin bloques devuelve el texto intacto", () => {
  const r = extractMermaid("# solo texto\n", "z");
  assert.deepEqual(r, { md: "# solo texto\n", diagrams: [] });
});

test("missingTools lista las herramientas ausentes con su instalación", () => {
  const msgs = missingTools((cmd) => cmd === "pandoc", ["pandoc", "mmdc"]);
  assert.equal(msgs.length, 1);
  assert.match(msgs[0], /mmdc/);
  assert.match(msgs[0], /yarn global add @mermaid-js\/mermaid-cli/);
  const both = missingTools(() => false, ["pandoc", "mmdc"]);
  assert.match(both.join("\n"), /winget install JohnMacFarlane\.Pandoc/);
  assert.doesNotMatch(both.join("\n"), /npm/);
  assert.deepEqual(missingTools(() => true, ["pandoc", "mmdc"]), []);
});
