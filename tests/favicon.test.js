"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const html = fs.readFileSync(require.resolve("../index.html"), "utf8");
const head = html.slice(0, html.indexOf("</head>"));

test("la página declara su ícono de pestaña, así el navegador no pide /favicon.ico (que daba 404)", () => {
  const icons = head.match(/<link[^>]*rel="icon"[^>]*>/g) || [];
  assert.equal(icons.length, 1, "debe haber exactamente un <link rel=\"icon\">");
  assert.match(icons[0], /href="icon\.svg"/);
  assert.match(icons[0], /type="image\/svg\+xml"/);
});

test("el ícono usado existe y es el mismo que ya usan el manifiesto y el modo sin conexión", () => {
  assert.ok(fs.existsSync(require.resolve("../icon.svg")), "icon.svg debe existir");
  assert.ok(!fs.existsSync(require.resolve("../index.html").replace("index.html", "favicon.ico")), "no se agrega un favicon.ico nuevo");
  const manifest = JSON.parse(fs.readFileSync(require.resolve("../manifest.json"), "utf8"));
  assert.ok(manifest.icons.some((icon) => icon.src === "icon.svg"));
  assert.match(fs.readFileSync(require.resolve("../sw.js"), "utf8"), /"\.\/icon\.svg"/);
  assert.match(head, /<link rel="apple-touch-icon" href="icon\.svg">/, "el ícono del iPhone sigue igual");
});
