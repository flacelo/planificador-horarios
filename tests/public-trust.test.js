"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const indexHtml = fs.readFileSync(require.resolve("../index.html"), "utf8");
const report = fs.readFileSync(require.resolve("../js/honest-report.js"), "utf8");

test("el reporte es local, ofrece descarga y no simula el envío de correo", () => {
  const appIndex = indexHtml.indexOf('src="js/app.js?v=10.0"');
  const reportIndex = indexHtml.indexOf('src="js/honest-report.js?v=1.0"');
  assert.ok(appIndex >= 0);
  assert.ok(reportIndex > appIndex);
  assert.match(report, /window\.getMailReportTemplate/);
  assert.match(report, /new Blob\(\[report\]/);
  assert.match(report, /planify-reporte-semanal-/);
  assert.match(report, /No se envió ningún correo/);
  assert.doesNotMatch(report, /fetch\s*\(|XMLHttpRequest|trackAnonymEvent/);
  assert.doesNotMatch(report, /localStorage\.setItem\(["']report_email/);
});
