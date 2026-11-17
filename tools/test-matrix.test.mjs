import { test } from "node:test";
import assert from "node:assert/strict";
import { rowsFromVitest, rowsFromEval, renderMatrix, replaceBetween } from "./test-matrix.mjs";

const vitest = {
  testResults: [{
    name: "C:\\repo\\bextia-agentes\\apps\\agents\\src\\server\\app.test.ts",
    assertionResults: [
      { ancestorTitles: ["webhook"], title: "rechaza firma inválida con 401", status: "passed", failureMessages: [] },
      { ancestorTitles: [], title: "acepta | pipes", status: "failed", failureMessages: ["AssertionError: expected 401\n  at C:\\repo\\x.ts:1"] },
      { ancestorTitles: [], title: "pendiente", status: "skipped", failureMessages: [] },
    ],
  }],
};

test("rowsFromVitest: ruta relativa, estados y sin rutas absolutas en el detalle", () => {
  const rows = rowsFromVitest(vitest, "C:\\repo\\bextia-agentes");
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], { suite: "apps/agents/src/server/app.test.ts › webhook", caso: "rechaza firma inválida con 401", esperado: "rechaza firma inválida con 401", obtenido: "OK", detalle: "" });
  assert.equal(rows[1].obtenido, "FALLA");
  assert.equal(rows[1].detalle, "AssertionError: expected 401");
  assert.equal(rows[2].obtenido, "OMITIDO");
});

test("rowsFromEval: esperado y obtenido por campo", () => {
  const rows = rowsFromEval({ results: [
    { id: "L01", prompt: "cualificacion", ok: true, expected: { destino: "japon" }, got: { destino: "japon" }, mismatches: [] },
    { id: "I03", prompt: "incidencia", ok: false, expected: { tipologia: "emergencia" }, got: { tipologia: "consulta" }, mismatches: ["tipologia"] },
  ] });
  assert.equal(rows[0].suite, "eval › cualificacion");
  assert.equal(rows[0].esperado, "destino=japon");
  assert.equal(rows[1].obtenido, "FALLA");
  assert.equal(rows[1].detalle, "tipologia: consulta");
});

test("renderMatrix escapa pipes y resume totales", () => {
  const md = renderMatrix(rowsFromVitest(vitest, "C:\\repo\\bextia-agentes"));
  assert.match(md, /\*\*Total:\*\* 3 · OK 1 · FALLA 1 · OMITIDO 1/);
  assert.match(md, /acepta \\\| pipes/);
  assert.match(md, /^\| Suite \| Caso \| Esperado \| Obtenido \| Detalle \|$/m);
});

test("replaceBetween conserva lo de afuera y exige marcadores", () => {
  const doc = "a\n<!-- matriz:inicio -->\nviejo\n<!-- matriz:fin -->\nb\n";
  assert.equal(replaceBetween(doc, "nuevo"), "a\n<!-- matriz:inicio -->\nnuevo\n<!-- matriz:fin -->\nb\n");
  assert.throws(() => replaceBetween("sin", "x"), /marcadores/);
});
