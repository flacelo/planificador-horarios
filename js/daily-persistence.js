/* Persist the daily notebook separately from the weekly schedule. */
(function () {
  "use strict";

  var KEY = "planify_diario_estado_v1";
  var view = document.getElementById("view-diario");
  var dateInput = view && view.querySelector("#planner-date");
  var list = view && view.querySelector("#todo-list");
  if (!view || !dateInput || !list || view.dataset.dailyPersistenceReady) return;
  view.dataset.dailyPersistenceReady = "1";

  var currentDate = "";
  var restoring = false;
  var storageAvailable = true;

  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
    var day = new Date(value + "T12:00:00");
    return !isNaN(day.getTime()) && day.getFullYear() === Number(value.slice(0, 4)) &&
      day.getMonth() + 1 === Number(value.slice(5, 7)) && day.getDate() === Number(value.slice(8, 10));
  }

  function today() {
    var now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  }

  function readStore() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return { schemaVersion: 1, activeDate: "", days: {} };
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object" || Array.isArray(data) || !data.days ||
          typeof data.days !== "object" || Array.isArray(data.days)) throw new Error("Formato diario inválido");
      return data;
    } catch (error) {
      storageAvailable = false;
      console.warn("PLANIFY: no se pudo leer el diario guardado; se conserva sin reemplazar.", error);
      return null;
    }
  }

  function writeStore(data) {
    if (!storageAvailable) return;
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (error) { console.warn("PLANIFY: no se pudo guardar el diario.", error); }
  }

  function textValue(selector) {
    var field = view.querySelector(selector);
    return field ? field.value : "";
  }

  function taskId() {
    return "dt-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
  }

  function readTasks() {
    return Array.from(list.children).filter(function (item) { return item.tagName === "LI"; }).map(function (item) {
      var checkbox = item.querySelector('input[type="checkbox"]');
      var label = item.querySelector("label span");
      var button = item.querySelector("button");
      var text = label ? label.textContent : item.textContent.replace(button ? button.textContent : "", "");
      if (!item.dataset.dailyTaskId) item.dataset.dailyTaskId = taskId();
      return { id: item.dataset.dailyTaskId, text: text.trim(), done: checkbox ? checkbox.checked : item.classList.contains("done") };
    }).filter(function (item) { return item.text; });
  }

  function capture() {
    var mood = view.querySelector(".mood-btn.active");
    var sleep = view.querySelector(".sleep-clouds .cloud-btn.active");
    var stars = view.querySelectorAll("#star-rating .star.active");
    var title = view.querySelector("#titulo-rutina-diaria");
    return {
      title: title ? title.textContent.trim() : "",
      goals: textValue("#goals-input"),
      grateful: textValue("#grateful-input"),
      affirmations: textValue("#affirmations-input"),
      tasks: readTasks(),
      morning: Array.from(view.querySelectorAll('.routine-checkboxes input[type="checkbox"]')).map(function (field) { return field.checked; }),
      mood: mood ? mood.dataset.mood : "",
      sleep: sleep ? sleep.dataset.sleep : "",
      productivity: stars.length
    };
  }

  function writeLegacy(record) {
    try {
      if (record.title) localStorage.setItem("planify_titulo_rutina", record.title);
      if (record.sleep) localStorage.setItem("planify_sueño_horas", record.sleep);
      if (record.productivity) localStorage.setItem("planify_rating_diario", String(record.productivity));
    } catch (error) { console.warn("PLANIFY: no se pudieron actualizar las preferencias antiguas del diario.", error); }
  }

  function save(date) {
    if (restoring || !storageAvailable || !validDate(date)) return;
    var store = readStore();
    if (!store) return;
    var previous = store.days[date];
    store.days[date] = Object.assign({}, previous && typeof previous === "object" ? previous : {}, capture());
    store.activeDate = date;
    writeStore(store);
    writeLegacy(store.days[date]);
  }

  function legacyRecord() {
    var record = capture();
    try {
      var sleep = localStorage.getItem("planify_sueño_horas") || localStorage.getItem("planify_sueño_seleccionado") || "";
      var rating = Number(localStorage.getItem("planify_rating_diario"));
      record.title = localStorage.getItem("planify_titulo_rutina") || localStorage.getItem("planify_diario_titulo_custom") || record.title;
      record.sleep = record.sleep || sleep;
      record.productivity = record.productivity || (rating >= 1 && rating <= 5 ? rating : 0);
    } catch (error) { /* The current controls remain usable without local storage. */ }
    return record;
  }

  function createTask(task) {
    if (!task || typeof task.text !== "string" || !task.text.trim()) return;
    var item = document.createElement("li");
    item.dataset.dailyTaskId = typeof task.id === "string" && task.id ? task.id : taskId();
    item.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);list-style:none;";
    var label = document.createElement("label");
    label.style.cssText = "display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.9rem;";
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !!task.done;
    var text = document.createElement("span");
    text.textContent = task.text;
    function showDone() {
      text.style.textDecoration = checkbox.checked ? "line-through" : "none";
      text.style.opacity = checkbox.checked ? "0.5" : "1";
    }
    checkbox.addEventListener("change", showDone);
    showDone();
    label.appendChild(checkbox);
    label.appendChild(text);
    item.appendChild(label);
    var remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "✕";
    remove.setAttribute("aria-label", "Eliminar tarea: " + task.text);
    remove.style.cssText = "background:none;border:none;color:#94a3b8;cursor:pointer;font-size:0.85rem;padding:2px 6px;";
    remove.addEventListener("click", function () { item.remove(); });
    item.appendChild(remove);
    list.appendChild(item);
  }

  function restore(date, initialLegacy) {
    restoring = true;
    var store = readStore();
    var saved = store && store.days[date];
    var record = saved && typeof saved === "object" ? saved : (initialLegacy ? legacyRecord() : {});
    var title = view.querySelector("#titulo-rutina-diaria");
    if (!saved && !initialLegacy && typeof window.actualizarTituloSegunFecha === "function") {
      try { window.actualizarTituloSegunFecha(date); } catch (error) { /* Keep the existing title. */ }
    }
    if (title && typeof record.title === "string" && record.title) title.textContent = record.title;
    [["#goals-input", "goals"], ["#grateful-input", "grateful"], ["#affirmations-input", "affirmations"]].forEach(function (pair) {
      var field = view.querySelector(pair[0]);
      if (field) field.value = typeof record[pair[1]] === "string" ? record[pair[1]] : "";
    });
    list.replaceChildren();
    if (Array.isArray(record.tasks)) record.tasks.forEach(createTask);
    view.querySelectorAll('.routine-checkboxes input[type="checkbox"]').forEach(function (field, index) {
      field.checked = Array.isArray(record.morning) && record.morning[index] === true;
    });
    view.querySelectorAll(".mood-btn[data-mood]").forEach(function (button) {
      button.classList.toggle("active", button.dataset.mood === record.mood);
    });
    view.querySelectorAll(".sleep-clouds .cloud-btn[data-sleep]").forEach(function (button) {
      var selected = button.dataset.sleep === record.sleep;
      button.classList.toggle("active", selected);
      button.style.backgroundColor = selected ? "#38bdf8" : "";
      button.style.color = selected ? "#0f172a" : "";
      button.style.boxShadow = selected ? "0 0 12px rgba(56, 189, 248, 0.6)" : "";
    });
    var rating = Number(record.productivity) || 0;
    view.querySelectorAll("#star-rating .star").forEach(function (star, index) {
      star.classList.toggle("active", index < rating);
    });
    restoring = false;
  }

  var firstStore = readStore();
  var previousDate = firstStore && validDate(firstStore.activeDate) ? firstStore.activeDate : "";
  var initialLegacy = !!firstStore && Object.keys(firstStore.days).length === 0;
  currentDate = previousDate || dateInput.value;
  if (!validDate(currentDate)) currentDate = today();
  dateInput.value = currentDate;
  restore(currentDate, initialLegacy);

  view.addEventListener("input", function (event) {
    if (event.target.matches("#goals-input, #grateful-input, #affirmations-input, #titulo-rutina-diaria")) save(currentDate);
  });
  view.addEventListener("change", function (event) {
    if (event.target === dateInput) {
      if (!validDate(dateInput.value)) { dateInput.value = currentDate; return; }
      if (dateInput.value === currentDate) return;
      save(currentDate);
      currentDate = dateInput.value;
      var store = readStore();
      if (store) { store.activeDate = currentDate; writeStore(store); }
      var nextDate = currentDate;
      setTimeout(function () {
        if (currentDate === nextDate) restore(nextDate, false);
      }, 0);
      return;
    }
    if (event.target.matches('.routine-checkboxes input[type="checkbox"], #todo-list input[type="checkbox"]')) save(currentDate);
  });
  view.addEventListener("click", function (event) {
    if (event.target.closest(".mood-btn, .sleep-clouds .cloud-btn, #star-rating .star, #todo-list li")) {
      setTimeout(function () { save(currentDate); }, 0);
    }
  });
  new MutationObserver(function () {
    if (!restoring) save(currentDate);
  }).observe(list, { childList: true });
})();
