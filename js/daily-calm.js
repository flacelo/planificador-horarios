/* Arrange the existing daily cards without replacing inputs or their listeners. */
(function () {
  "use strict";

  function syncProductivityRating(group) {
    if (!group) return;
    var stars = Array.prototype.slice.call(group.querySelectorAll(".star"));
    if (!stars.length) return;
    var selected = stars.filter(function (star) { return star.classList.contains("active"); }).pop();
    var selectedValue = selected ? stars.indexOf(selected) + 1 : 0;
    group.setAttribute("role", "radiogroup");
    group.setAttribute("aria-label", "Nivel de productividad");
    stars.forEach(function (star, index) {
      var value = index + 1;
      star.setAttribute("role", "radio");
      star.setAttribute("aria-label", value + " de 5");
      star.setAttribute("aria-checked", String(value === selectedValue));
      star.setAttribute("tabindex", value === (selectedValue || 1) ? "0" : "-1");
      star.setAttribute("title", value + " de 5");
    });
  }

  function enhanceProductivityRating(view) {
    var group = view.querySelector(".star-rating");
    if (!group || group.dataset.accessibleRating === "true") return;
    group.dataset.accessibleRating = "true";
    syncProductivityRating(group);
    group.addEventListener("click", function (event) {
      var star = event.target.closest(".star");
      if (star && group.contains(star)) syncProductivityRating(group);
    });
    group.addEventListener("keydown", function (event) {
      var star = event.target.closest(".star[role='radio']");
      if (!star) return;
      var stars = Array.prototype.slice.call(group.querySelectorAll(".star[role='radio']"));
      var index = stars.indexOf(star);
      var nextIndex = index;
      if (event.key === "ArrowRight" || event.key === "ArrowUp") nextIndex = Math.min(stars.length - 1, index + 1);
      else if (event.key === "ArrowLeft" || event.key === "ArrowDown") nextIndex = Math.max(0, index - 1);
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = stars.length - 1;
      else if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      stars[nextIndex].click();
      syncProductivityRating(group);
      stars[nextIndex].focus();
    });
    new MutationObserver(function () { syncProductivityRating(group); })
      .observe(group, { subtree: true, attributes: true, attributeFilter: ["class"] });
  }

  // Se abre solo si la fecha elegida ya tiene algo guardado en esas tarjetas; no recuerda si quedó abierto.
  function hasMoreData(view) {
    var text = ["#grateful-input", "#affirmations-input"].some(function (selector) {
      var field = view.querySelector(selector);
      return !!(field && field.value.trim());
    });
    return text || !!view.querySelector('.routine-checkboxes input:checked, .mood-btn.active, .sleep-clouds .cloud-btn.active, #star-rating .star.active');
  }

  function syncMoreOpen(view, more) {
    var update = function () { more.open = hasMoreData(view); };
    // El diario guardado se restaura en otro módulo: se revisa al cargar y justo después de cambiar la fecha.
    update();
    setTimeout(update, 0);
    setTimeout(update, 400);
    window.addEventListener("load", update, { once: true });
    view.addEventListener("change", function (event) {
      if (event.target && event.target.id === "planner-date") setTimeout(update, 30);
    });
    // Al imprimir desde el navegador se muestra abierto y luego vuelve a como estaba.
    var openBeforePrint = null;
    window.addEventListener("beforeprint", function () { openBeforePrint = more.open; more.open = true; });
    window.addEventListener("afterprint", function () {
      if (openBeforePrint !== null) more.open = openBeforePrint;
      openBeforePrint = null;
    });
  }

  function init() {
    var view = document.getElementById("view-diario");
    var grid = view && view.querySelector(".notebook-grid");
    var columns = grid && grid.querySelectorAll(":scope > .notebook-col");
    if (!view || !grid || !columns || columns.length !== 2 || view.classList.contains("daily-calm-ready")) return;

    // Una acción principal: la meta y las tareas quedan arriba; el resto se pliega en "Más para tu día".
    var primary = [".goals-section", ".todo-section"];
    var secondary = [".morning-section", ".mood-section", ".sleep-section", ".productivity-section", ".grateful-section", ".affirmations-section"];
    if (primary.concat(secondary).some(function (selector) { return !grid.querySelector(selector); })) return;

    primary.forEach(function (selector) { columns[0].appendChild(grid.querySelector(selector)); });
    secondary.forEach(function (selector) { columns[1].appendChild(grid.querySelector(selector)); });
    var more = document.createElement("details");
    more.className = "daily-more";
    more.innerHTML = '<summary><span class="daily-more-title">Más para tu día</span><small>Rutina, ánimo, sueño y más · opcional</small></summary>';
    grid.appendChild(more);
    more.appendChild(columns[1]);
    syncMoreOpen(view, more);

    var date = view.querySelector("#planner-date");
    var dateLabel = view.querySelector(".date-picker-container label");
    if (date && dateLabel) dateLabel.setAttribute("for", date.id);

    var addTask = view.querySelector("#add-todo-btn");
    if (addTask) addTask.setAttribute("aria-label", "Añadir tarea");

    var moods = { happy: "Muy bien", good: "Bien", neutral: "Regular", sad: "Mal" };
    view.querySelectorAll(".mood-btn[data-mood]").forEach(function (button) {
      button.setAttribute("aria-label", "Estado de ánimo: " + (moods[button.dataset.mood] || button.dataset.mood));
    });
    view.querySelectorAll(".sleep-clouds .cloud-btn[data-sleep]").forEach(function (button) {
      button.setAttribute("aria-label", "Dormí " + button.dataset.sleep + " horas");
    });
    enhanceProductivityRating(view);

    view.classList.add("daily-calm-ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
