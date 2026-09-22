/* PLANIFY: ayuda contextual breve para que la edición móvil sea fácil de descubrir. */
(function () {
  "use strict";

  var COPY = {
    diario: { icon: "☀️", title: "Tu día, sin complicarte", text: "Revisa tu siguiente bloque, anota una meta o inicia una sesión de enfoque.", action: "Anotar una meta" },
    semanal: { icon: "🗓️", title: "Tu semana se puede editar", text: "Toca cualquier celda para cambiarla. Desde Horario y vistas también eliges intervalos de 15, 30 o 60 minutos.", action: "Editar horario" },
    mensual: { icon: "📆", title: "Mira el mes completo", text: "Usa cada día para ubicar entregas, descansos y momentos importantes sin perder el panorama.", action: "Ver tutorial" },
    anual: { icon: "🧭", title: "Dale dirección a tu año", text: "Escribe un objetivo por mes y deja espacio para temporadas de mayor carga o descanso.", action: "Ver tutorial" },
    dashboard: { icon: "📊", title: "Entiende tu avance", text: "Aquí ves lo que realmente cumpliste y el ajuste más útil para tu siguiente semana.", action: "Pedir un ajuste" }
  };

  function currentView() {
    if (document.getElementById("planify-dashboard-safe")) return "dashboard";
    var active = document.querySelector(".bottom-nav .tab-btn.active");
    var tab = active && active.getAttribute("data-tab");
    if (tab === "semanal" || tab === "mensual" || tab === "anual" || tab === "diario") return tab;
    var views = ["diario", "semanal", "mensual", "anual"];
    for (var i = 0; i < views.length; i += 1) {
      var node = document.getElementById("view-" + views[i]);
      if (node && getComputedStyle(node).display !== "none") return views[i];
    }
    return "diario";
  }

  function openPanelPersonalizar() {
    var opener = document.getElementById("cloud-btn");
    if (opener && !document.getElementById("side-panel").classList.contains("open")) opener.click();
    window.setTimeout(function () {
      var jump = document.querySelector('[data-panel-jump="tab-personalizar"]');
      if (jump) jump.click();
    }, 100);
  }

  function actionFor(view) {
    if (view === "semanal") return openPanelPersonalizar();
    if (view === "diario") {
      var goal = document.querySelector(".goals-section textarea,.goals-section input");
      if (goal) { goal.scrollIntoView({ behavior: "smooth", block: "center" }); goal.focus(); }
      return;
    }
    if (view === "dashboard") {
      if (window.PLANIFY_WELCOME && typeof window.PLANIFY_WELCOME.requestChange === "function") window.PLANIFY_WELCOME.requestChange();
      else { var button = document.getElementById("schedule-change-open"); if (button) button.click(); }
      return;
    }
    if (window.iniciarTourInteractivo) window.iniciarTourInteractivo();
    else if (document.getElementById("tutorial-btn")) document.getElementById("tutorial-btn").click();
  }

  function ensureCoach() {
    var coach = document.getElementById("planify-mobile-coach");
    if (coach) return coach;
    var anchor = document.querySelector(".header-actions") || document.querySelector(".main-card-container");
    if (!anchor || !anchor.parentNode) return null;
    coach = document.createElement("section");
    coach.id = "planify-mobile-coach";
    coach.className = "planify-mobile-coach";
    coach.setAttribute("aria-live", "polite");
    coach.innerHTML = '<span class="mobile-coach-icon" aria-hidden="true"></span><div class="mobile-coach-copy"><strong></strong><small></small></div><button type="button" class="mobile-coach-action" data-mobile-coach-action="primary"></button><button type="button" class="mobile-coach-close" data-mobile-coach-action="close" aria-label="Ocultar ayuda">×</button>';
    anchor.insertAdjacentElement("afterend", coach);
    return coach;
  }

  function refreshCoach() {
    var coach = ensureCoach();
    if (!coach) return;
    var view = currentView();
    var copy = COPY[view] || COPY.diario;
    var changed = coach.dataset.view !== view;
    coach.dataset.view = view;
    if (!changed) {
      if (localStorage.getItem("planify_mobile_coach_hidden") === "true") coach.classList.add("is-collapsed");
      else coach.classList.remove("is-collapsed");
      return;
    }
    coach.querySelector(".mobile-coach-icon").textContent = copy.icon;
    coach.querySelector(".mobile-coach-copy strong").textContent = copy.title;
    coach.querySelector(".mobile-coach-copy small").textContent = copy.text;
    coach.querySelector(".mobile-coach-action").textContent = copy.action;
    if (localStorage.getItem("planify_mobile_coach_hidden") === "true") coach.classList.add("is-collapsed");
    else coach.classList.remove("is-collapsed");
  }

  document.addEventListener("click", function (event) {
    var target = event.target instanceof Element ? event.target.closest("[data-mobile-coach-action]") : null;
    if (!target) return;
    event.preventDefault();
    if (target.getAttribute("data-mobile-coach-action") === "close") {
      localStorage.setItem("planify_mobile_coach_hidden", "true");
      var coach = document.getElementById("planify-mobile-coach");
      if (coach) coach.classList.add("is-collapsed");
    } else actionFor(currentView());
  });

  document.addEventListener("click", function (event) {
    if (event.target.closest(".bottom-nav,[data-dashboard-action],#btn-sidebar-planificador,#btn-sidebar-dashboard")) window.setTimeout(refreshCoach, 140);
  });

  function init() {
    refreshCoach();
    new MutationObserver(function (mutations) {
      var coach = document.getElementById("planify-mobile-coach");
      if (coach && mutations.every(function (mutation) { return coach.contains(mutation.target); })) return;
      window.clearTimeout(window.__planifyMobileCoachTimer);
      window.__planifyMobileCoachTimer = window.setTimeout(refreshCoach, 100);
    }).observe(document.body, { childList: true, subtree: true });
    window.setInterval(refreshCoach, 600);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
  window.PLANIFY_MOBILE_COACH = { refresh: refreshCoach };
})();
