"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const cssFiles = fs.readdirSync(path.join(__dirname, "..", "css")).filter((name) => name.endsWith(".css"));

test("el tema claro real (clase tema-claro) no hereda las reglas del tema oscuro 'estelar'", () => {
  // La app activa el modo claro con la clase `tema-claro`; `light-mode` no existe en el cuerpo de la página.
  // Por eso cada regla oscura 'body.tema-estelar:not(.light-mode)' debe excluir también `.tema-claro`.
  let guarded = 0;
  cssFiles.forEach((file) => {
    const css = read("css/" + file);
    const all = css.match(/tema-estelar:not\(\.light-mode\)/g) || [];
    const safe = css.match(/tema-estelar:not\(\.light-mode\):where\(:not\(\.tema-claro\)\)/g) || [];
    assert.equal(all.length, safe.length, file + ": hay reglas oscuras sin excluir tema-claro");
    guarded += safe.length;
  });
  assert.ok(guarded >= 60, "se protegieron las reglas oscuras (" + guarded + ")");
});

test("la exclusión no cambia la especificidad de las reglas oscuras (usa :where)", () => {
  cssFiles.forEach((file) => {
    assert.doesNotMatch(read("css/" + file), /tema-estelar:not\(\.light-mode\):not\(\.tema-claro\)/, file);
  });
});

test("la clase del modo claro sigue siendo tema-claro en la app", () => {
  const app = read("js/app.js");
  assert.match(app, /classList\.toggle\("tema-claro"\)/);
  assert.match(app, /localStorage\.setItem\("planify_theme",\w+\?"light":"dark"\)/);
});
