/* PLANIFY PWA: instalación clara y segura, sin prometer funciones que el navegador no ofrece. */
(function () {
  "use strict";
  var deferredPrompt = null;
  var isStandalone = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
  if (!isStandalone && window.navigator.standalone) isStandalone = true;

  function installLabel() { return deferredPrompt ? "Instalar PLANIFY" : "Ver cómo instalar"; }

  function ensureModal() {
    var modal = document.getElementById("planify-pwa-modal");
    if (modal) return modal;
    modal = document.createElement("section");
    modal.id = "planify-pwa-modal";
    modal.className = "planify-pwa-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "planify-pwa-modal-title");
    document.body.appendChild(modal);
    return modal;
  }

  function openGuide() {
    var modal = ensureModal();
    var promptAction = deferredPrompt ? '<button type="button" class="pwa-primary-action" data-pwa-action="install">📲 Instalar PLANIFY ahora</button>' : "";
    modal.innerHTML = '<div class="planify-pwa-dialog">' +
      '<button type="button" class="planify-pwa-close" data-pwa-action="close" aria-label="Cerrar">×</button>' +
      '<span class="planify-pwa-kicker">PLANIFY EN TU CELULAR</span><h2 id="planify-pwa-modal-title">Úsalo como una app</h2>' +
      '<p>Guarda PLANIFY en tu pantalla de inicio para entrar más rápido. Tus horarios siguen siendo tuyos y podrás abrirlos desde el mismo navegador.</p>' + promptAction +
      '<div class="planify-pwa-steps">' +
        '<article><span>🤖</span><div><strong>Android · Chrome</strong><p>Toca el menú ⋮ y elige <b>“Instalar aplicación”</b> o <b>“Añadir a pantalla de inicio”</b>.</p></div></article>' +
        '<article><span>🍎</span><div><strong>iPhone / iPad · Safari</strong><p>Toca <b>Compartir</b> y luego <b>“Añadir a pantalla de inicio”</b>.</p></div></article>' +
        '<article><span>💻</span><div><strong>Computadora · Chrome o Edge</strong><p>Busca el ícono de instalación junto a la dirección de la página y confirma.</p></div></article>' +
      '</div><small>La disponibilidad depende del navegador y del dispositivo. No necesitas descargar nada externo.</small></div>';
    modal.classList.add("is-open");
    var close = modal.querySelector(".planify-pwa-close");
    if (close) close.focus();
  }

  function closeGuide() { var modal = document.getElementById("planify-pwa-modal"); if (modal) modal.classList.remove("is-open"); }
  function refreshEntryPoints() {
    document.querySelectorAll("[data-pwa-entry-label]").forEach(function (entry) { entry.textContent = installLabel(); });
    document.querySelectorAll("[data-pwa-status]").forEach(function (element) {
      element.textContent = deferredPrompt ? "Tu navegador permite instalarla ahora." : "Te explicamos cómo guardarla en tu pantalla de inicio.";
    });
  }

  function ensureMobileHint() {
    var existing = document.getElementById("planify-mobile-app-hint");
    if (isStandalone) { if (existing) existing.remove(); return; }
    if (existing) { refreshEntryPoints(); return; }
    var hub = document.querySelector(".trust-start-hub");
    if (!hub || !hub.parentNode) return;
    var hint = document.createElement("section");
    hint.id = "planify-mobile-app-hint";
    hint.className = "planify-mobile-app-hint";
    hint.innerHTML = '<span aria-hidden="true">📲</span><div><strong>¿Lo usarás todos los días?</strong><small data-pwa-status></small></div><button type="button" data-pwa-action="guide" data-pwa-entry-label></button>';
    hub.insertAdjacentElement("afterend", hint);
    refreshEntryPoints();
  }

  function ensureSettingsCard() {
    var tab = document.getElementById("tab-ajustes");
    if (!tab || tab.querySelector(".planify-pwa-settings-card")) return;
    var card = document.createElement("section");
    card.className = "planify-pwa-settings-card";
    card.innerHTML = '<div><span aria-hidden="true">📱</span><p><strong>PLANIFY como app</strong><small>Ten un acceso directo en tu celular o computadora.</small></p></div><button type="button" data-pwa-action="guide" data-pwa-entry-label></button>';
    tab.appendChild(card);
    refreshEntryPoints();
  }

  function requestInstall() {
    if (!deferredPrompt) { openGuide(); return; }
    var prompt = deferredPrompt;
    prompt.prompt();
    Promise.resolve(prompt.userChoice).then(function () { deferredPrompt = null; refreshEntryPoints(); closeGuide(); }).catch(function () { deferredPrompt = null; refreshEntryPoints(); });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    var locallySecure = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (location.protocol !== "https:" && !locallySecure) return;
    navigator.serviceWorker.register("sw.js").catch(function () { /* PLANIFY sigue funcionando en línea. */ });
  }

  window.addEventListener("beforeinstallprompt", function (event) { event.preventDefault(); deferredPrompt = event; refreshEntryPoints(); });
  window.addEventListener("appinstalled", function () { deferredPrompt = null; isStandalone = true; refreshEntryPoints(); ensureMobileHint(); closeGuide(); });
  document.addEventListener("click", function (event) {
    var target = event.target instanceof Element ? event.target.closest("[data-pwa-action]") : null;
    if (!target) return;
    var action = target.getAttribute("data-pwa-action");
    if (action === "guide") { event.preventDefault(); openGuide(); }
    if (action === "install") { event.preventDefault(); requestInstall(); }
    if (action === "close") { event.preventDefault(); closeGuide(); }
  });
  document.addEventListener("keydown", function (event) { if (event.key === "Escape") closeGuide(); });

  function init() {
    registerServiceWorker(); ensureMobileHint(); ensureSettingsCard();
    new MutationObserver(function () {
      window.clearTimeout(window.__planifyPwaTimer);
      window.__planifyPwaTimer = window.setTimeout(function () { ensureMobileHint(); ensureSettingsCard(); }, 80);
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
  window.PLANIFY_PWA = { openGuide: openGuide, requestInstall: requestInstall };
})();
