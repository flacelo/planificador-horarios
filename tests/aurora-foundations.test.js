"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const css = read("css/aurora.css");
const index = read("index.html");

// Valor de una variable dentro del bloque que empieza con `selector {`.
function block(selector) {
  const start = css.indexOf(selector + " {");
  assert.ok(start >= 0, "no está el bloque " + selector);
  return css.slice(start, css.indexOf("\n}", start));
}
const variable = (blockText, name) => (blockText.match(new RegExp(name + ":\\s*([^;]+);")) || [])[1].trim();

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const dark = block("body");
const light = block("body.tema-claro,\nbody.light-mode");

test("tipografías: de 5 a 3 familias y menos pesos (Montserrat solo en 700: es la letra de los encabezados de la tabla de Semanal)", () => {
  const link = index.match(/fonts\.googleapis\.com\/css2\?([^"]*)"/)[1];
  assert.equal(link, "family=Montserrat:wght@700&family=Outfit:wght@400;600;700&family=Poppins:wght@400;600;700&display=swap");
  assert.doesNotMatch(link, /Inter|Roboto/);
});

test("la capa visual está en la lista del empaquetado y la carga brand-home.js (inicio y app)", () => {
  assert.match(read("scripts/build.js"), /'css\/aurora\.css'/);
  const home = read("js/brand-home.js");
  assert.match(home, /link\.id = "planify-aurora-style";/);
  assert.match(home, /link\.href = "css\/aurora\.css\?v=\d+";/);
  assert.match(home, /function init\(\) \{\s*ensureAurora\(\);/);
});

test("colores, radios, sombras y escala tipográfica definidos como variables (piso de 12 px)", () => {
  ["--au-mint: #74e3c0;", "--au-mint-ink: #103a38;", "--au-sky: #6fb8ff;", "--au-violet: #9a8cff;",
    "--au-r-sm: 14px;", "--au-r-md: 20px;", "--au-r-lg: 28px;", "--au-r-xl: 36px;",
    "--au-t-small: 0.75rem;"].forEach((decl) => assert.ok(css.includes(decl), decl));
  assert.match(css, /--au-t-display: clamp\(2\.5rem, 7\.5vw \+ 0\.5rem, 4\.75rem\);/);
  assert.match(css, /--au-font-display: "Outfit"/);
  assert.match(css, /--au-font-body: "Poppins"/);
  ["--au-shadow-sm", "--au-shadow-md", "--au-glow"].forEach((name) => { assert.ok(dark.includes(name) && light.includes(name), name); });
});

test("contraste de texto de 4,5 o más (oscuro y claro) y de 3 o más en el anillo de progreso", () => {
  const pairs = [
    [dark, "--au-text", "--au-glass-solid"], [dark, "--au-text-soft", "--au-glass-solid"], [dark, "--au-text-soft", "--au-tile"],
    [dark, "--au-text", "--au-bg"], [dark, "--au-text-soft", "--au-bg"],
    [light, "--au-text", "--au-glass-solid"], [light, "--au-text-soft", "--au-glass-solid"], [light, "--au-text-soft", "--au-tile"],
    [light, "--au-text", "--au-bg"], [light, "--au-text-soft", "--au-bg"]
  ];
  pairs.forEach(([b, fg, bg]) => {
    const value = ratio(variable(b, fg), variable(b, bg));
    assert.ok(value >= 4.5, fg + " sobre " + bg + " = " + value.toFixed(2));
  });
  // Texto sobre la menta (botones de acción).
  assert.ok(ratio("#103a38", "#74e3c0") >= 4.5);
  // Anillo: relleno contra pista (la pista oscura es un blanco al 14 % sobre la tarjeta; se usa su equivalente opaco).
  assert.ok(ratio(variable(dark, "--au-ring-a"), "#33445a") >= 3);
  assert.ok(ratio(variable(dark, "--au-ring-b"), "#33445a") >= 3);
  assert.ok(ratio(variable(light, "--au-ring-a"), variable(light, "--au-ring-track")) >= 3);
  assert.ok(ratio(variable(light, "--au-ring-b"), variable(light, "--au-ring-track")) >= 3);
});

test("fondo con malla de degradados en oscuro y claro (sin imágenes ni fijo: no cuesta al desplazarse)", () => {
  assert.match(css, /html\.planify-brand-ready body \{\s*background: var\(--au-mesh\), var\(--au-bg\) !important;/);
  assert.match(css, /html\.planify-brand-ready body\.tema-claro,\s*html\.planify-brand-ready body\.light-mode \{\s*background: var\(--au-mesh\), var\(--au-bg\) !important;/);
  assert.equal((dark.match(/radial-gradient/g) || []).length, 3);
  assert.equal((light.match(/radial-gradient/g) || []).length, 3);
  assert.doesNotMatch(css, /background-attachment|url\(/);
});

test("el vidrio tiene respaldo opaco, solo desenfoca si el navegador puede y respeta 'menos transparencia'", () => {
  const glass = css.slice(css.indexOf(".au-glass {"));
  assert.match(glass, /\.au-glass \{[^}]*background: var\(--au-glass-solid\);/);
  assert.match(glass, /@supports \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\) \{\s*\.au-glass \{\s*background: var\(--au-glass\);/);
  assert.match(glass, /@media \(prefers-reduced-transparency: reduce\) \{\s*\.au-glass \{\s*background: var\(--au-glass-solid\);[^}]*backdrop-filter: none;/);
});

test("el panel cerrado no desenfoca y las estrellas se pausan (menos trabajo en celulares modestos)", () => {
  assert.match(css, /#side-panel:not\(\.open\) \.sp-header \{[^}]*backdrop-filter: none !important;/);
  assert.match(css, /html\.planify-brand-ready \.estrella \{ display: none !important; \}/);
});

test("sin animaciones ni transiciones en esta base; no toca la tabla de Semanal, el PDF, el ícono ni el logo", () => {
  // Solo la parte de la maqueta (las pantallas de la fase 2 tienen su propia prueba: tests/aurora-pantallas.test.js).
  const maqueta = css.slice(0, css.indexOf("/* ───────── Pantallas (fase 2)"));
  assert.doesNotMatch(maqueta, /animation|transition|@keyframes/);
  assert.doesNotMatch(maqueta, /#tabla|#view-table|weekly|planify-export|brand-mark|\.brand-identity|icon\.svg/);
});
