"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const focusHistory = require("../js/focus-activity-history.js");
const source = fs.readFileSync(require.resolve("../js/focus-session.js"), "utf8");

class MemoryStorage {
  constructor() { this.values = new Map(); this.failNextKey = ""; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) {
    if (this.failNextKey === key) { this.failNextKey = ""; throw new Error("simulated quota failure"); }
    this.values.set(key, String(value));
  }
  removeItem(key) { this.values.delete(key); }
}

function harness(storage = new MemoryStorage()) {
  const elements = new Map();
  const listeners = {};
  const intervals = new Map();
  const historyStates = [{ app: "state" }];
  let nextId = 0;
  let nextIntervalId = 0;
  let now = Date.now();
  class TestDate extends Date { static now() { return now; } }
  class ElementStub {
    constructor(tagName) {
      this.tagName = String(tagName || "div").toUpperCase();
      this.children = [];
      this.attributes = {};
      this.className = "";
      this.parentNode = null;
      this.ownerDocument = null;
      this._innerHTML = "";
      this.textContent = "";
      this.hidden = false;
      this.style = {};
      this.classList = {
        add: (name) => { if (!this.classList.contains(name)) this.className = (this.className + " " + name).trim(); },
        remove: (name) => { this.className = this.className.split(/\s+/).filter((item) => item && item !== name).join(" "); },
        contains: (name) => this.className.split(/\s+/).includes(name),
        toggle: (name, force) => {
          const add = force === undefined ? !this.classList.contains(name) : Boolean(force);
          if (add) this.classList.add(name); else this.classList.remove(name);
          return add;
        }
      };
    }
    set innerHTML(value) {
      const previousIds = this._innerHTML.match(/\bid="([^"]+)"/g) || [];
      previousIds.forEach((match) => {
        const id = match.slice(4, -1);
        if (elements.get(id) && elements.get(id).parentNode === this) elements.delete(id);
      });
      this._innerHTML = String(value || "");
      const nextIds = this._innerHTML.matchAll(/\bid="([^"]+)"/g);
      for (const match of nextIds) {
        const child = new ElementStub("span");
        child.ownerDocument = this.ownerDocument;
        child.id = match[1];
        child.parentNode = this;
        this.children.push(child);
      }
    }
    get innerHTML() { return this._innerHTML; }
    set id(value) { this._id = value; if (value) elements.set(value, this); }
    get id() { return this._id || ""; }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name] || null; }
    appendChild(child) { this.children.push(child); child.parentNode = this; child.ownerDocument = this.ownerDocument; if (child.id) elements.set(child.id, child); return child; }
    remove() {
      if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
      (this._innerHTML.match(/\bid="([^"]+)"/g) || []).forEach((match) => elements.delete(match.slice(4, -1)));
      if (this.id) elements.delete(this.id);
    }
    focus() { this.focused = true; if (this.ownerDocument) this.ownerDocument.activeElement = this; }
    querySelector(selector) {
      if (selector === "[data-focus-action='close']") return new ElementStub("button");
      return null;
    }
    closest(selector) { return selector === "[data-focus-action]" && this.action ? this : null; }
    matches() { return false; }
  }
  const document = {
    body: new ElementStub("body"),
    head: new ElementStub("head"),
    hidden: false,
    activeElement: null,
    getElementById: (id) => elements.get(id) || null,
    querySelector: () => null,
    createElement: (tagName) => { const element = new ElementStub(tagName); element.ownerDocument = document; return element; },
    addEventListener(type, handler) { (listeners[type] ||= []).push(handler); }
  };
  document.body.ownerDocument = document;
  document.head.ownerDocument = document;
  const window = {
    PLANIFY_FOCUS_ACTIVITY_HISTORY: focusHistory,
    PLANIFY_COMPLETION_HISTORY: { set() { throw new Error("focus must not mark completion"); } },
    crypto: { randomUUID: () => "focus-session-" + (++nextId) },
    setInterval(callback) { const id = ++nextIntervalId; intervals.set(id, callback); return id; },
    clearInterval(id) { intervals.delete(id); },
    setTimeout() {},
    location: { href: "https://planify.test/" },
    history: {
      get state() { return historyStates[historyStates.length - 1]; },
      pushState(value) { historyStates.push(value); },
      back() { if (historyStates.length > 1) historyStates.pop(); (listeners["window:popstate"] || []).forEach((handler) => handler()); }
    },
    addEventListener(type, handler) { (listeners["window:" + type] ||= []).push(handler); },
    dispatchEvent() {}
  };
  const context = { window, document, localStorage: storage, Element: ElementStub, HTMLSelectElement: ElementStub, Intl, Date: TestDate, Math, Number, String, Object, Array, JSON, Promise, RegExp, isNaN };
  vm.runInNewContext(source, context, { filename: "focus-session.js" });
  return {
    storage, elements, listeners, context, intervals,
    open(activity) { return activity ? window.PLANIFY_FOCUS.open(activity) : window.PLANIFY_FOCUS.open(); },
    click(action) {
      const target = elements.get(action === "breath-start" ? "planify-focus-breath-start" : action === "breath-stop" ? "planify-focus-breath-stop" : "") || new ElementStub("button");
      target.action = action;
      target.attributes["data-focus-action"] = action;
      document.activeElement = target;
      (listeners.click || []).forEach((handler) => handler({ target, preventDefault() {} }));
    },
    clickOutside() {
      const target = elements.get("planify-focus-modal");
      (listeners.click || []).forEach((handler) => handler({ target, preventDefault() {} }));
    },
    pressEscape() { (listeners.keydown || []).forEach((handler) => handler({ key: "Escape", preventDefault() {} })); },
    pressBack() { window.history.back(); },
    advance(ms) { now += ms; },
    runIntervals() { Array.from(intervals.values()).forEach((callback) => callback()); },
    finishNow() { assert.ok(intervals.size, "starting focus should create a timer"); now += 60 * 60 * 1000; Array.from(intervals.values())[0](); }
  };
}

test("la tarjeta contextual identifica actividad y fecha, registra al completar una sola vez", () => {
  const app = harness();
  const activity = { activityId: "math-id", dateKey: "2026-09-27", title: "Álgebra <script>alert(1)</script>" };
  assert.equal(app.open(activity), true);
  const modal = app.elements.get("planify-focus-modal");
  assert.match(modal.innerHTML, /ENFOQUE PARA/);
  assert.match(modal.innerHTML, /2026/);
  assert.match(modal.innerHTML, /&lt;script&gt;/);
  assert.doesNotMatch(modal.innerHTML, /<script>/);

  app.click("toggle");
  app.finishNow();
  const globalState = JSON.parse(app.storage.getItem("planify_focus_session_v1"));
  assert.equal(globalState.completedMinutes, 25);
  assert.equal(globalState.completedSessions, 1);
  assert.equal(globalState.phase, "break");
  const linkedState = focusHistory.read(app.storage).state;
  assert.deepEqual(focusHistory.stats(linkedState, activity.dateKey, activity.activityId), {
    sessions: 1, minutes: 25, title: activity.title
  });
  assert.equal(globalState.completedSessions, 1);
});

test("cerrar el temporizador restaura el historial y Atrás cierra el modal sin salir de la página", () => {
  const app = harness();
  app.open();
  assert.equal(app.elements.has("planify-focus-modal"), true);
  app.pressBack();
  assert.equal(app.elements.has("planify-focus-modal"), false);

  app.open();
  app.click("close");
  assert.equal(app.elements.has("planify-focus-modal"), false);
  assert.equal(app.context.window.history.state.app, "state");
});

test("pausar conserva la actividad; abrir otra durante la sesión no la reasigna", () => {
  const app = harness();
  const first = { activityId: "first", dateKey: "2026-09-27", title: "Primera tarea" };
  const second = { activityId: "second", dateKey: "2026-09-27", title: "Segunda tarea" };
  app.open(first);
  app.click("toggle");
  app.click("toggle");
  assert.equal(app.open(second), false);
  const state = JSON.parse(app.storage.getItem("planify_focus_session_v1"));
  assert.equal(state.selectedActivity.activityId, "first");
  assert.equal(state.sessionActivity.activityId, "first");
  assert.ok(state.sessionId);
  app.click("reset");
  assert.equal(app.open(second), true);
  assert.equal(JSON.parse(app.storage.getItem("planify_focus_session_v1")).selectedActivity.activityId, "second");
});

test("recargar una sesión iniciada conserva la actividad, fecha e identidad hasta reanudar", () => {
  const storage = new MemoryStorage();
  const firstApp = harness(storage);
  const activity = { activityId: "stable-id", dateKey: "2026-09-26", title: "Lectura" };
  firstApp.open(activity);
  firstApp.click("toggle");
  const before = JSON.parse(storage.getItem("planify_focus_session_v1"));
  const secondApp = harness(storage);
  assert.equal(secondApp.open(), true, "una apertura personal no debe desprender la sesión pausada por recarga");
  const recovered = JSON.parse(storage.getItem("planify_focus_session_v1"));
  assert.equal(recovered.running, false, "se restaura pausada, no se reanuda por sorpresa");
  assert.equal(recovered.sessionActivity.activityId, activity.activityId);
  assert.equal(recovered.sessionActivity.dateKey, activity.dateKey);
  assert.equal(recovered.sessionId, before.sessionId);
  secondApp.click("toggle");
  assert.equal(JSON.parse(storage.getItem("planify_focus_session_v1")).sessionId, before.sessionId);
});

test("la pausa manual y el descanso no atribuyen minutos; volver a enfoque inicia otra sesión", () => {
  const app = harness();
  const activity = { activityId: "study-id", dateKey: "2026-09-27", title: "Estudio" };
  app.open(activity);
  app.click("toggle");
  const firstSessionId = JSON.parse(app.storage.getItem("planify_focus_session_v1")).sessionId;
  app.click("switch");
  assert.equal(focusHistory.stats(focusHistory.read(app.storage).state, activity.dateKey, activity.activityId).sessions, 0);
  assert.equal(JSON.parse(app.storage.getItem("planify_focus_session_v1")).completedMinutes, 0);
  assert.match(app.elements.get("planify-focus-modal").innerHTML, /ACTIVIDAD SELECCIONADA/);
  app.click("switch");
  app.click("toggle");
  const nextSessionId = JSON.parse(app.storage.getItem("planify_focus_session_v1")).sessionId;
  assert.notEqual(nextSessionId, firstSessionId);
});

test("el temporizador genérico mantiene acumulados globales sin crear actividad ficticia", () => {
  const app = harness();
  app.open();
  assert.match(app.elements.get("planify-focus-modal").innerHTML, /MODO PERSONAL/);
  app.click("toggle");
  app.finishNow();
  assert.equal(JSON.parse(app.storage.getItem("planify_focus_session_v1")).completedSessions, 1);
  assert.equal(app.storage.getItem(focusHistory.storageKey), null);
});

test("si falla una escritura contextual, restaura ambas claves y no deja contadores parciales", () => {
  const app = harness();
  app.open({ activityId: "study-id", dateKey: "2026-09-27", title: "Estudio" });
  app.click("toggle");
  const beforeGlobal = app.storage.getItem("planify_focus_session_v1");
  const beforeHistory = app.storage.getItem(focusHistory.storageKey);
  app.storage.failNextKey = "planify_focus_session_v1";
  app.finishNow();
  assert.equal(app.storage.getItem(focusHistory.storageKey), beforeHistory);
  const afterGlobal = JSON.parse(app.storage.getItem("planify_focus_session_v1"));
  assert.equal(afterGlobal.completedSessions, 0);
  assert.equal(afterGlobal.completedMinutes, 0);
  assert.equal(afterGlobal.phase, "break");
  assert.notEqual(app.storage.getItem("planify_focus_session_v1"), beforeGlobal);
});

test("la guía aparece solo durante el descanso, es opcional y no persiste ni altera el temporizador principal", () => {
  const app = harness();
  app.open();
  assert.doesNotMatch(app.elements.get("planify-focus-modal").innerHTML, /planify-focus-breath/);
  app.click("breath-start");
  assert.equal(app.intervals.size, 0, "no debe iniciar desde la fase de enfoque");

  app.click("switch");
  const modal = app.elements.get("planify-focus-modal");
  assert.match(modal.innerHTML, /Pausa consciente/);
  assert.equal(app.elements.get("planify-focus-breath-start").hidden, false);
  assert.equal(app.elements.get("planify-focus-breath-stop").hidden, true);

  const beforeStorage = Array.from(app.storage.values.entries()).sort();
  const beforeTimer = JSON.parse(app.storage.getItem("planify_focus_session_v1"));
  app.click("breath-start");
  assert.equal(app.intervals.size, 1);
  assert.equal(app.elements.get("planify-focus-breath-start").hidden, true);
  assert.equal(app.elements.get("planify-focus-breath-stop").hidden, false);
  assert.match(app.elements.get("planify-focus-live").textContent, /iniciada/);

  app.advance(30000);
  app.runIntervals();
  assert.equal(app.elements.get("planify-focus-breath-clock").textContent, "00:30");
  assert.deepEqual(JSON.parse(app.storage.getItem("planify_focus_session_v1")), beforeTimer);
  assert.deepEqual(Array.from(app.storage.values.entries()).sort(), beforeStorage);

  app.advance(30000);
  app.runIntervals();
  assert.equal(app.intervals.size, 0);
  assert.equal(app.elements.get("planify-focus-breath-start").hidden, false);
  assert.equal(app.elements.get("planify-focus-breath-stop").hidden, true);
  assert.match(app.elements.get("planify-focus-live").textContent, /terminada/);
  assert.deepEqual(Array.from(app.storage.values.entries()).sort(), beforeStorage);
});

test("detener, cerrar con Escape y cerrar con el fondo limpian la guía y su intervalo", () => {
  const app = harness();
  app.open();
  app.click("switch");
  const beforeStorage = Array.from(app.storage.values.entries()).sort();

  app.click("breath-start");
  app.click("breath-stop");
  assert.equal(app.intervals.size, 0);
  assert.equal(app.elements.get("planify-focus-breath-start").hidden, false);
  assert.match(app.elements.get("planify-focus-live").textContent, /detenida/);
  assert.deepEqual(Array.from(app.storage.values.entries()).sort(), beforeStorage);

  app.click("breath-start");
  app.pressEscape();
  assert.equal(app.intervals.size, 0);
  assert.equal(app.elements.has("planify-focus-modal"), false);

  app.open();
  app.click("switch");
  const beforeOverlayStorage = Array.from(app.storage.values.entries()).sort();
  app.click("breath-start");
  app.clickOutside();
  assert.equal(app.intervals.size, 0);
  assert.equal(app.elements.has("planify-focus-modal"), false);
  assert.deepEqual(Array.from(app.storage.values.entries()).sort(), beforeOverlayStorage);
});

test("volver a enfoque y el fin natural del descanso cancelan la micro-pausa sin sumar enfoque", () => {
  const app = harness();
  app.open();
  app.click("switch");
  app.click("breath-start");
  app.click("switch");
  assert.equal(app.intervals.size, 0);
  assert.equal(JSON.parse(app.storage.getItem("planify_focus_session_v1")).phase, "focus");
  assert.doesNotMatch(app.elements.get("planify-focus-modal").innerHTML, /planify-focus-breath/);

  const storage = new MemoryStorage();
  storage.setItem("planify_focus_session_v1", JSON.stringify({ phase: "break", breakMinutes: 5, remainingSeconds: 30 }));
  const endingApp = harness(storage);
  endingApp.open();
  endingApp.click("toggle");
  endingApp.click("breath-start");
  assert.equal(endingApp.intervals.size, 2);
  endingApp.advance(30000);
  endingApp.runIntervals();
  const ended = JSON.parse(storage.getItem("planify_focus_session_v1"));
  assert.equal(ended.phase, "focus");
  assert.equal(ended.completedMinutes, 0);
  assert.equal(ended.completedSessions, 0);
  assert.equal(endingApp.intervals.size, 0);
  assert.equal(storage.getItem(focusHistory.storageKey), null);
});

test("los textos siguen planify_idioma y el CSS ofrece foco visible y alternativa sin movimiento", () => {
  const storage = new MemoryStorage();
  storage.setItem("planify_idioma", "en");
  const app = harness(storage);
  app.open();
  app.click("switch");
  assert.match(app.elements.get("planify-focus-modal").innerHTML, /Mindful pause/);
  assert.match(app.elements.get("planify-focus-breath-start").textContent, /Start 1-minute pause/);
  app.click("breath-start");
  assert.match(app.elements.get("planify-focus-breath-stop").textContent, /Stop pause/);

  const css = fs.readFileSync(require.resolve("../css/focus-breath.css"), "utf8");
  const modalCss = fs.readFileSync(require.resolve("../css/ux-follow-up.css"), "utf8");
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /animation:\s*none\s*!important/);
  assert.match(css, /:focus-visible/);
  assert.match(modalCss, /\.planify-focus-card\s*\{[^}]*max-height:\s*calc\(100dvh - 40px\)[^}]*overflow-y:\s*auto/s);
  assert.match(modalCss, /\.planify-focus-card\s*\{[^}]*max-height:\s*calc\(100dvh - 24px\)/s);
});
