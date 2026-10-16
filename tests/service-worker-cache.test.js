"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync(require.resolve("../sw.js"), "utf8");

function loadServiceWorker(existingCaches) {
  const handlers = {};
  const deleted = [];
  const opened = [];
  const self = {
    addEventListener(type, handler) { handlers[type] = handler; },
    skipWaiting() {},
    clients: { claim() { return Promise.resolve(); } },
    location: { origin: "https://example.test" }
  };
  const caches = {
    keys() { return Promise.resolve(existingCaches.slice()); },
    delete(key) { deleted.push(key); return Promise.resolve(true); },
    open(name) { opened.push(name); return Promise.resolve({ add() { return Promise.resolve(); }, put() {} }); },
    match() { return Promise.resolve(undefined); }
  };
  const context = { self, caches, URL, Response, Promise, Array, Object, console };
  vm.runInNewContext(source, context, { filename: "sw.js" });
  return { handlers, deleted, opened, context };
}

async function run(handler) {
  let pending = Promise.resolve();
  handler({ waitUntil(promise) { pending = promise; } });
  await pending;
}

test("la caché nueva se llama liberday-shell-v1", async () => {
  const sw = loadServiceWorker([]);
  await run(sw.handlers.install);
  assert.deepEqual(Array.from(sw.opened), ["liberday-shell-v1"]);
});

test("al activarse borra las cachés viejas de Planify y de Liberday, y respeta las demás", async () => {
  const sw = loadServiceWorker(["planify-shell-v19", "planify-shell-v18", "liberday-shell-v0", "liberday-shell-v1", "otra-app-v3"]);
  await run(sw.handlers.activate);
  assert.deepEqual(Array.from(sw.deleted).sort(), ["liberday-shell-v0", "planify-shell-v18", "planify-shell-v19"]);
});

test("el service worker ya no menciona el nombre antiguo fuera de la limpieza de cachés", () => {
  const withoutCleanup = source.split("\n").filter((line) => !/planify-/.test(line) && !/Antes la app se llamaba/.test(line)).join("\n");
  assert.doesNotMatch(withoutCleanup, /planify/i);
});
