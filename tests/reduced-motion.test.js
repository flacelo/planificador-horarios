"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const cssFiles = fs.readdirSync(path.join(root, "css")).filter((f) => f.endsWith(".css"));
const jsFiles = fs.readdirSync(path.join(root, "js")).filter((f) => f.endsWith(".js"));

// Devuelve el texto de una hoja sin los bloques @media (...) { ... } cuya condición coincide con `cond`.
function stripMedia(css, cond) {
  let out = "";
  let i = 0;
  while (i < css.length) {
    const at = css.indexOf("@media", i);
    if (at < 0) { out += css.slice(i); break; }
    out += css.slice(i, at);
    const open = css.indexOf("{", at);
    const head = css.slice(at, open);
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth) { if (css[j] === "{") depth++; else if (css[j] === "}") depth--; j++; }
    out += cond.test(head) ? "" : css.slice(at, j);
    i = j;
  }
  return out;
}

// Devuelve el interior de cada bloque @media (...) { ... } cuya condición coincide con `cond`.
function mediaBlocks(css, cond) {
  const found = [];
  let i = 0;
  while (true) {
    const at = css.indexOf("@media", i);
    if (at < 0) break;
    const open = css.indexOf("{", at);
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth) { if (css[j] === "{") depth++; else if (css[j] === "}") depth--; j++; }
    if (cond.test(css.slice(at, open))) found.push(css.slice(open + 1, j - 1));
    i = j;
  }
  return found;
}

test("existe una regla única de 'reducir movimiento' en main.css que apaga animaciones, transiciones y desplazamientos", () => {
  const css = read("css/main.css");
  const block = css.slice(css.indexOf("/* Reducir movimiento: regla única"));
  assert.match(block, /@media \(prefers-reduced-motion: reduce\) \{/);
  assert.match(block, /:not\(#sin-movimiento\):not\(#sin-movimiento\):not\(#sin-movimiento\) \*:where\(:not\(#tabla, #tabla \*\)\)/);
  ["animation-duration: 0.01ms !important;", "animation-iteration-count: 1 !important;", "animation-delay: 0s !important;",
    "transition-duration: 0.01ms !important;", "transition-delay: 0s !important;", "scroll-behavior: auto !important;"].forEach((decl) => assert.ok(block.includes(decl), decl));
  assert.equal(css.split("/* Reducir movimiento: regla única").length, 2, "debe haber una sola");
});

test("la regla única no deja nada invisible: usa duración casi cero (termina en el estado final), nunca 'animation: none'", () => {
  const css = read("css/main.css");
  const block = css.slice(css.indexOf("/* Reducir movimiento: regla única"));
  assert.doesNotMatch(block, /animation:\s*none|animation-name:\s*none|display:\s*none/);
});

test("ninguna animación infinita queda fuera de 'sin preferencia' (la regla única la limita a una vez en 'reducir')", () => {
  cssFiles.forEach((file) => {
    const unguarded = stripMedia(stripMedia(read("css/" + file), /prefers-reduced-motion/), /print/);
    const infinite = unguarded.match(/[^{}]*\{[^}]*animation[^}]*infinite[^}]*\}/g) || [];
    infinite.forEach((rule) => {
      // Permitidas solo porque la regla única fuerza iteration-count: 1 en 'reducir'.
      assert.match(rule, /estrella|planifyBreathPulse/, file + ": animación infinita no prevista: " + rule.slice(0, 80));
    });
  });
});

test("todo desplazamiento suave de JavaScript respeta 'reducir movimiento'", () => {
  jsFiles.forEach((file) => {
    const src = read("js/" + file);
    (src.match(/(?<![-\w])behavior:\s*[^,}]*/g) || []).forEach((match) => {
      if (!/smooth|auto/.test(match)) return;
      assert.match(match, /prefers-reduced-motion: reduce/, file + ": " + match);
    });
    assert.doesNotMatch(src, /(?<![-\w])behavior:\s*["']smooth["']/, file);
  });
});

test("las reglas propias de reducir movimiento no vuelven a animar nada", () => {
  cssFiles.forEach((file) => {
    const css = read("css/" + file);
    mediaBlocks(css, /prefers-reduced-motion:\s*reduce/).forEach((block) => assert.doesNotMatch(block, /transition:\s*(?!none)[a-z]+\s+[.0-9]+s|animation:\s*(?!none)[a-zA-Z]+\s+[.0-9]+s/i, file));
  });
});
