/* PLANIFY's visual welcome. Keeps the existing planner and its actions intact. */
(function () {
  "use strict";

  var LAST_VIEW_KEY = "planify_ultima_vista_v1";
  var VALID_VIEWS = ["diario", "semanal", "mensual", "anual", "dashboard"];

  function hasSavedSchedule() {
    var keys = ["horario_data_semanal", "horario_datos", "horario_completo"];
    return keys.some(function (key) {
      try {
        var data = JSON.parse(localStorage.getItem(key) || "null");
        return Boolean(data && Array.isArray(data.filas) && data.filas.some(function (row) {
          return Array.isArray(row.celdas) && row.celdas.some(function (cell) {
            var title = String(cell && (cell.t || cell.texto || cell.title) || "").trim();
            return title && title !== "—" && title !== "-";
          });
        }));
      } catch (error) { return false; }
    });
  }

  function isReturningUser() {
    try { return hasSavedSchedule() || localStorage.getItem("planify_bienvenida_estado") === "completada"; }
    catch (error) { return hasSavedSchedule(); }
  }

  function buildHeader() {
    var app = document.querySelector(".app");
    var title = document.getElementById("main-title");
    var actions = app && app.querySelector(".header-actions");
    if (!app || !title || !actions || app.querySelector(".brand-site-header")) return;

    var header = document.createElement("header");
    header.className = "brand-site-header";
    var identity = document.createElement("div");
    identity.className = "brand-identity";
    var mark = document.createElement("span");
    mark.className = "brand-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.innerHTML = '<span class="brand-mark-core"></span><span class="brand-mark-orbit"></span>';
    identity.appendChild(mark);
    identity.appendChild(title);
    header.appendChild(identity);
    header.appendChild(actions);
    app.insertBefore(header, app.firstChild);
  }

  function buildHero(returning) {
    var hub = document.querySelector(".trust-start-hub");
    if (!hub || !hub.parentNode) return;
    var existingHero = document.querySelector(".brand-hero");
    if (existingHero) existingHero.remove();
    var hero = document.createElement("section");
    hero.className = "brand-hero" + (returning ? " is-returning" : "");
    hero.setAttribute("aria-labelledby", "brand-hero-title");
    hero.innerHTML =
      '<div class="brand-hero-copy">' +
        '<span class="brand-eyebrow"><span aria-hidden="true"></span> PLANEA A TU MANERA</span>' +
        '<h2 id="brand-hero-title">' + (returning ? 'Tu plan te espera.<br><em>Continúa a tu ritmo.</em>' : 'Organiza tu tiempo.<br><em>Haz espacio para vivir.</em>') + '</h2>' +
        '<p>' + (returning ? 'Tu horario sigue aquí. Revísalo, mueve lo que necesites y sigue con tu semana.' : 'Elige cómo empezar: arma tu horario por tu cuenta o responde preguntas para recibir una propuesta que siempre podrás editar.') + '</p>' +
        '<div class="brand-hero-actions">' +
          (returning
            ? '<button type="button" class="brand-primary" data-brand-action="week">Ver mi semana <span aria-hidden="true">↗</span></button><button type="button" class="brand-secondary" data-brand-action="paths">Ver opciones para crear <span aria-hidden="true">↓</span></button>'
            : '<button type="button" class="brand-primary" data-brand-action="paths">Elegir cómo empezar <span aria-hidden="true">↗</span></button>') +
        '</div>' +
      '</div>' +
      (returning ? '' : '<div class="brand-hero-preview" aria-label="Ejemplo ilustrativo de un día organizado">' +
        '<div class="brand-preview-top"><span class="brand-preview-icon" aria-hidden="true">✦</span><div><small>UN EJEMPLO, A TU MEDIDA</small><strong>Un día con intención</strong></div><span class="brand-preview-dots" aria-hidden="true">•••</span></div>' +
        '<div class="brand-preview-day"><span>LUN</span><span class="is-active">MAR</span><span>MIÉ</span><span>JUE</span><span>VIE</span><span>SÁB</span><span>DOM</span></div>' +
        '<div class="brand-preview-timeline"><div><time>08:00</time><span class="brand-preview-event is-focus"><i aria-hidden="true"></i> Enfocarme en lo importante</span></div><div><time>10:00</time><span class="brand-preview-event is-break"><i aria-hidden="true"></i> Pausa para recargar</span></div><div><time>11:00</time><span class="brand-preview-event is-life"><i aria-hidden="true"></i> Tiempo para mí</span></div></div>' +
        '<div class="brand-preview-bottom"><span class="brand-preview-spark" aria-hidden="true">✳</span><span>Tu plan puede cambiar contigo.</span><span aria-hidden="true">↗</span></div>' +
      '</div>');
    hub.parentNode.insertBefore(hero, hub);
  }

  function organizeStartHub(returning) {
    var hub = document.querySelector(".trust-start-hub");
    if (!hub) return;
    hub.classList.toggle("is-compact", returning);
    var heading = hub.querySelector(".trust-start-heading h2");
    var description = hub.querySelector(".trust-start-heading p");
    if (heading) heading.textContent = returning ? "¿Quieres crear otro horario?" : "¿Qué nivel de ayuda prefieres?";
    if (description) description.textContent = returning ?
      "Puedes hacerlo por tu cuenta o responder preguntas para recibir una propuesta editable." :
      "Elige cuánto quieres armar: por tu cuenta, con preguntas breves o casi listo.";
    var toggle = hub.querySelector('[data-start-action="toggle"]');
    if (returning && !toggle) hub.querySelector(".trust-start-heading").insertAdjacentHTML("beforeend", '<button type="button" data-start-action="toggle">Ver opciones</button>');
    if (!returning && toggle) toggle.remove();
    var destinations = hub.querySelector(".trust-start-destinations");
    if (destinations) destinations.remove();
  }

  function placeNavigation() {
    var header = document.querySelector(".brand-site-header");
    var nav = document.querySelector(".bottom-nav");
    if (!header || !nav || document.querySelector(".brand-nav-slot")) return;
    nav.setAttribute("aria-label", "Vistas del planificador");
    var daily = nav.querySelector('[data-tab="diario"]');
    if (daily) {
      daily.setAttribute("aria-label", "Diario y notas");
      var label = daily.querySelector("span");
      if (label) label.textContent = "Diario";
    }
    var initialActive = nav.querySelector("[data-tab].active");
    if (initialActive && isReturningUser()) initialActive.setAttribute("aria-current", "page");
    else if (initialActive) {
      initialActive.classList.remove("active");
      initialActive.removeAttribute("aria-current");
    }
    var slot = document.createElement("div");
    slot.className = "brand-nav-slot";
    header.insertAdjacentElement("afterend", slot);
    slot.appendChild(nav);
    nav.addEventListener("click", function (event) {
      var button = event.target.closest("[data-tab]");
      var viewName = button && button.getAttribute("data-tab");
      if (!button || VALID_VIEWS.indexOf(viewName) < 0) return;
      document.documentElement.classList.add("planify-home-entered");
      nav.querySelectorAll("[data-tab]").forEach(function (item) {
        var current = item === button;
        item.classList.toggle("active", current);
        if (current) item.setAttribute("aria-current", "page");
        else item.removeAttribute("aria-current");
      });
      try { localStorage.setItem(LAST_VIEW_KEY, viewName); } catch (error) { /* Private browsing may disable storage. */ }

      var returning = isReturningUser();
      var wasReturning = document.documentElement.classList.contains("planify-has-schedule");
      if (returning !== wasReturning) {
        document.documentElement.classList.toggle("planify-has-schedule", returning);
        document.documentElement.classList.toggle("planify-home-new", !returning);
        buildHero(returning);
        organizeStartHub(returning);
      }
      if (viewName === "dashboard") return;
      window.requestAnimationFrame(function () {
        var view = document.getElementById("view-" + viewName);
        if (view) view.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    var dashboardWasOpen = false;
    var viewBeforeDashboard = "";
    var dashboardObserver = new MutationObserver(function () {
      var dashboardOpen = document.documentElement.classList.contains("planify-dashboard-open");
      if (dashboardOpen === dashboardWasOpen) return;
      dashboardWasOpen = dashboardOpen;
      if (dashboardOpen) {
        var selected = nav.querySelector('[data-tab][aria-current="page"]');
        viewBeforeDashboard = selected && selected.dataset.tab !== "dashboard" ? selected.dataset.tab : "";
        document.documentElement.classList.add("planify-home-entered");
        nav.querySelectorAll("[data-tab]").forEach(function (item) {
          var current = item.dataset.tab === "dashboard";
          item.classList.toggle("active", current);
          if (current) item.setAttribute("aria-current", "page");
          else item.removeAttribute("aria-current");
        });
        try { localStorage.setItem(LAST_VIEW_KEY, "dashboard"); } catch (error) { /* Private browsing may disable storage. */ }
      } else {
        nav.querySelectorAll("[data-tab]").forEach(function (item) {
          var current = Boolean(viewBeforeDashboard) && item.dataset.tab === viewBeforeDashboard;
          item.classList.toggle("active", current);
          if (current) item.setAttribute("aria-current", "page");
          else item.removeAttribute("aria-current");
        });
        if (viewBeforeDashboard) {
          try { localStorage.setItem(LAST_VIEW_KEY, viewBeforeDashboard); } catch (error) { /* Private browsing may disable storage. */ }
        }
        viewBeforeDashboard = "";
      }
    });
    dashboardObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    var welcomeWasOpen = Boolean(document.getElementById("welcome-flow-overlay"));
    var welcomeObserver = new MutationObserver(function () {
      var welcomeOpen = Boolean(document.getElementById("welcome-flow-overlay"));
      if (welcomeWasOpen && !welcomeOpen) {
        document.documentElement.classList.add("planify-home-entered");
        var appliedWelcome = false;
        try { appliedWelcome = localStorage.getItem("planify_bienvenida_aplicada_pendiente_v1") === "1"; } catch (error) { appliedWelcome = false; }
        var visibleView = appliedWelcome ? "semanal" : VALID_VIEWS.filter(function (name) { return name !== "dashboard"; }).find(function (name) {
          var view = document.getElementById("view-" + name);
          return view && getComputedStyle(view).display !== "none" && view.getClientRects().length > 0;
        });
        if (visibleView) {
          nav.querySelectorAll("[data-tab]").forEach(function (item) {
            var current = item.dataset.tab === visibleView;
            item.classList.toggle("active", current);
            if (current) item.setAttribute("aria-current", "page");
            else item.removeAttribute("aria-current");
          });
          try { localStorage.setItem(LAST_VIEW_KEY, visibleView); } catch (error) { /* Private browsing may disable storage. */ }
        }
        if (appliedWelcome) {
          try { localStorage.removeItem("planify_bienvenida_aplicada_pendiente_v1"); } catch (error) { /* Private browsing may disable storage. */ }
        }
      }
      welcomeWasOpen = welcomeOpen;
    });
    welcomeObserver.observe(document.body, { childList: true, subtree: true });
    function updatePosition() {
      nav.classList.toggle("is-pinned", window.innerWidth > 600 && slot.getBoundingClientRect().bottom < 0);
    }
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition);
    updatePosition();

    var returning = isReturningUser();
    if (returning) {
      var savedView = "";
      try {
        if (localStorage.getItem("planify_bienvenida_aplicada_pendiente_v1") === "1") {
          savedView = "semanal";
          localStorage.setItem(LAST_VIEW_KEY, savedView);
          localStorage.removeItem("planify_bienvenida_aplicada_pendiente_v1");
        } else savedView = localStorage.getItem(LAST_VIEW_KEY) || "";
      } catch (error) { savedView = ""; }
      if (VALID_VIEWS.indexOf(savedView) < 0) savedView = hasSavedSchedule() ? "semanal" : "diario";
      var savedButton = nav.querySelector('[data-tab="' + savedView + '"]');
      if (savedButton) savedButton.click();
    }
  }

  document.addEventListener("click", function (event) {
    if (!(event.target instanceof Element)) return;
    var startOption = event.target.closest(".trust-start-hub [data-start-action]");
    if (startOption && startOption.getAttribute("data-start-action") !== "toggle") {
      document.documentElement.classList.add("planify-home-entered");
    }
    var button = event.target.closest("[data-brand-action]");
    if (!button) return;
    var action = button.getAttribute("data-brand-action");
    if (action === "paths") {
      var hub = document.querySelector(".trust-start-hub");
      if (hub) {
        hub.classList.add("is-expanded");
        hub.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    if (action === "week") {
      var tab = document.querySelector('.bottom-nav [data-tab="semanal"]');
      if (tab) tab.click();
      var week = document.getElementById("view-semanal");
      if (week) week.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  function init() {
    var returning = isReturningUser();
    document.documentElement.classList.toggle("planify-has-schedule", returning);
    document.documentElement.classList.toggle("planify-home-new", !returning);
    buildHeader();
    buildHero(returning);
    organizeStartHub(returning);
    placeNavigation();
    document.documentElement.classList.add("planify-brand-ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
