/* Calm monthly framing; the original calendar and event handlers stay in place. */
(function () {
  "use strict";

  function dateIso(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }

  var MAX_SCHEDULE_ITEMS = 3;

  function scheduleFor(cache, iso, date) {
    var flow = window.PLANIFY_DAY_FLOW;
    if (!flow || typeof flow.forDate !== "function") return [];
    var weekday = date.getDay();
    if (!cache[weekday]) {
      try { cache[weekday] = flow.forDate(iso); } catch (error) { cache[weekday] = []; }
    }
    return cache[weekday];
  }

  function timeLabel(minutes) {
    var time = window.PLANIFY_SCHEDULE_TIME;
    return time && typeof time.formatTime12 === "function" ? time.formatTime12(minutes) : "";
  }

  // Muestra en cada día las actividades que el horario semanal tiene para ese día de la semana.
  function renderScheduleList(cell, items) {
    var old = cell.querySelector(".cal-horario");
    if (old) old.remove();
    if (!items.length) return;
    var list = document.createElement("ul");
    list.className = "cal-horario";
    list.setAttribute("aria-hidden", "true");
    items.slice(0, MAX_SCHEDULE_ITEMS).forEach(function (item) {
      var row = document.createElement("li");
      var time = document.createElement("time");
      time.textContent = timeLabel(item.start);
      var title = document.createElement("span");
      title.textContent = item.title;
      row.appendChild(time);
      row.appendChild(title);
      list.appendChild(row);
    });
    if (items.length > MAX_SCHEDULE_ITEMS) {
      var more = document.createElement("li");
      more.className = "cal-horario-mas";
      more.textContent = "+" + (items.length - MAX_SCHEDULE_ITEMS) + " más";
      list.appendChild(more);
    }
    var number = cell.querySelector(".cal-numero");
    if (number) number.insertAdjacentElement("afterend", list);
    else cell.insertBefore(list, cell.firstChild);
  }

  function enhanceCalendarCells(grid) {
    if (!grid) return;
    var scheduleCache = {};
    var cells = Array.prototype.slice.call(grid.querySelectorAll(".cal-dia"));
    var currentMonthCells = cells.filter(function (cell) { return Boolean(cell.dataset.fecha); });
    var lastCurrentIndex = currentMonthCells.length ? cells.indexOf(currentMonthCells[currentMonthCells.length - 1]) : -1;
    var lastCurrentDate = currentMonthCells.length ? new Date(currentMonthCells[currentMonthCells.length - 1].dataset.fecha + "T12:00:00") : null;

    cells.forEach(function (cell, index) {
      var iso = cell.dataset.fecha;
      if (!iso && cell.classList.contains("otro-mes") && index > lastCurrentIndex && lastCurrentDate) {
        var day = parseInt(cell.textContent.trim(), 10);
        if (day > 0) {
          iso = dateIso(new Date(lastCurrentDate.getFullYear(), lastCurrentDate.getMonth() + 1, day));
          cell.dataset.fecha = iso;
        }
      }
      if (!iso) return;
      var date = new Date(iso + "T12:00:00");
      var label = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
      cell.setAttribute("role", "button");
      cell.setAttribute("tabindex", "0");
      // Solo los días del mes que se está viendo; los grises son de otro mes y no tienen número propio.
      var items = cell.classList.contains("otro-mes") ? [] : scheduleFor(scheduleCache, iso, date);
      renderScheduleList(cell, items);
      cell.setAttribute("aria-label", "Añadir o editar fecha para " + label + (items.length ? ". Horario: " + items.map(function (item) { return item.title; }).join(", ") : ""));
      cell.setAttribute("aria-keyshortcuts", "Enter Space");
      if (cell.classList.contains("hoy")) cell.setAttribute("aria-current", "date");
      else cell.removeAttribute("aria-current");
    });
  }

  function init() {
    var view = document.getElementById("view-mensual");
    var nav = document.getElementById("nav-bar-mensual");
    var calendar = document.getElementById("cal-container");
    if (!view || !nav || !calendar || view.classList.contains("monthly-calm-ready")) return;
    var grid = calendar.querySelector("#cal-grid");

    var intro = document.createElement("header");
    intro.className = "monthly-calm-intro";
    intro.innerHTML = '<span class="monthly-calm-eyebrow">PANORAMA MENSUAL</span>' +
      '<h2>Tu mes, con espacio para todo</h2>' +
      '<p>Elige un día para añadir una fecha importante, una entrega o algo que quieras recordar.</p>';
    view.insertBefore(intro, nav);

    nav.setAttribute("aria-label", "Cambiar de mes");
    var previous = document.getElementById("btn-prev-mes");
    var next = document.getElementById("btn-next-mes");
    if (previous) previous.setAttribute("aria-label", "Mes anterior");
    if (next) next.setAttribute("aria-label", "Mes siguiente");

    var scrollHint = document.createElement("p");
    scrollHint.className = "monthly-calm-scroll-hint";
    scrollHint.textContent = "Desliza el calendario para ver la semana completa →";
    view.insertBefore(scrollHint, calendar);

    var guidance = view.querySelector('[data-planify-guidance="monthly"]');
    if (guidance) {
      var ideas = document.createElement("details");
      ideas.className = "monthly-calm-ideas";
      ideas.innerHTML = '<summary><span>Ideas para organizar tu mes</span><small>Opcional · según tus objetivos</small></summary>';
      calendar.insertAdjacentElement("afterend", ideas);
      ideas.appendChild(guidance);
    }

    enhanceCalendarCells(grid);
    if (grid) {
      grid.addEventListener("keydown", function (event) {
        var day = event.target.closest(".cal-dia[role='button']");
        if (!day || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        day.click();
      });
      new MutationObserver(function () { enhanceCalendarCells(grid); })
        .observe(grid, { childList: true });
    }

    view.classList.add("monthly-calm-ready");
    document.documentElement.classList.add("planify-monthly-calm-ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
