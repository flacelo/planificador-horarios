/* A clearer control panel built around the planner's existing controls. */
(function () {
  "use strict";

  var PANEL_TABS = [
    { id: "tab-perfil", icon: "◯", label: "Perfil", kicker: "SOBRE TI", title: "Tu perfil", description: "Cuéntanos lo esencial para adaptar tu espacio." },
    { id: "tab-personalizar", icon: "▦", label: "Horario", kicker: "TU PLAN", title: "Organiza tu horario", description: "Elige una base y ajusta los bloques de tu semana." },
    { id: "tab-ajustes", icon: "↧", label: "Descargas", kicker: "PREFERENCIAS", title: "Descargas y ajustes", description: "Elige el idioma y guarda tu plan como prefieras." }
  ];
  var PROFILE_KEY = "planify_panel_profile_v1";

  function profileValue(selectId, inputId) {
    var select = document.getElementById(selectId);
    var input = document.getElementById(inputId);
    if (!select) return "";
    return (select.value === "otros" || select.value === "Agregar especialidad...") && input ? input.value.trim() : select.value;
  }

  function captureProfile() {
    return {
      schemaVersion: 1,
      nombre: profileValue("sel-nombre", "inp-nombre"),
      carrera: profileValue("sel-carrera", "inp-carrera"),
      especialidad: profileValue("sel-especialidad", "inp-especialidad"),
      ciclo: profileValue("sel-ciclo", "inp-ciclo"),
      objetivo: profileValue("sel-objetivo", "inp-objetivo"),
      header: (document.getElementById("inp-titulo-header") || {}).value || ""
    };
  }

  function chooseProfileValue(selectId, inputId, value) {
    var select = document.getElementById(selectId);
    var input = document.getElementById(inputId);
    if (!select || typeof value !== "string") return;
    var known = Array.from(select.options).some(function (option) { return option.value === value; });
    var customOption = selectId === "sel-especialidad" ? "Agregar especialidad..." : "otros";
    select.value = known ? value : value && input ? customOption : "";
    select.dispatchEvent(new Event("change", { bubbles: false }));
    if (!known && value && input) {
      input.value = value;
      input.classList.remove("oculto");
      input.classList.add("visible");
    }
  }

  function preserveProfile(profile) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch (error) { /* Storage may be unavailable. */ }
  }

  function profileFromWelcome() {
    var welcome;
    try { welcome = JSON.parse(localStorage.getItem("planify_personalizacion_v1") || "null"); }
    catch (error) { return null; }
    if (!welcome || typeof welcome !== "object" || Array.isArray(welcome)) return null;
    var roles = Array.isArray(welcome.roles) ? welcome.roles : [];
    var roleLabels = { study: "Estudiante", work: "Profesional", entrepreneur: "Emprendedor/a", home: "Hogar y cuidados" };
    var role = roles.map(function (item) { return roleLabels[item]; }).filter(Boolean).join(" y ");
    var careers = { engineering: "Ingeniería", medicine: "Medicina", law: "Derecho" };
    var career = careers[welcome.career] || "";
    return {
      nombre: role || (typeof welcome.occupationOther === "string" ? welcome.occupationOther : ""),
      carrera: career,
      especialidad: "",
      ciclo: "",
      objetivo: typeof welcome.goal === "string" ? welcome.goal : "",
      header: ""
    };
  }

  function initProfilePersistence(profilePanel) {
    var saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
      if (!saved) {
        var older = JSON.parse(localStorage.getItem("horario_completo") || "null");
        if (older && typeof older === "object" && (older.nombre || older.carrera || older.ciclo || older.objetivo || older.header)) saved = older;
      }
      if (!saved) saved = profileFromWelcome();
    } catch (error) { saved = null; }
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      chooseProfileValue("sel-nombre", "inp-nombre", saved.nombre);
      chooseProfileValue("sel-carrera", "", saved.carrera);
      chooseProfileValue("sel-especialidad", "inp-especialidad", saved.especialidad);
      chooseProfileValue("sel-ciclo", "inp-ciclo", saved.ciclo);
      chooseProfileValue("sel-objetivo", "inp-objetivo", saved.objetivo);
      if (typeof saved.header === "string") {
        var header = document.getElementById("inp-titulo-header");
        if (header) {
          header.value = saved.header;
          header.dispatchEvent(new Event("input", { bubbles: false }));
        }
      }
      preserveProfile(captureProfile());
    }
    profilePanel.addEventListener("change", function (event) {
      if (event.target.matches("select, input")) preserveProfile(captureProfile());
    });
    profilePanel.addEventListener("input", function (event) {
      if (event.target.matches("input")) preserveProfile(captureProfile());
    });
  }

  function addFieldLabel(id, text) {
    var input = document.getElementById(id);
    if (!input || document.querySelector('.panel-field-label[for="' + id + '"]')) return;
    var label = document.createElement("label");
    label.className = "panel-field-label";
    label.htmlFor = id;
    label.textContent = text;
    input.parentNode.insertBefore(label, input);
  }

  function decorateProfile() {
    var profile = document.getElementById("tab-perfil");
    if (!profile) return;
    if (!profile.querySelector(".panel-save-hint")) {
      var saveHint = document.createElement("p");
      saveHint.className = "panel-save-hint";
      saveHint.textContent = "Tus datos se guardan automáticamente en este navegador.";
      var intro = profile.querySelector(".panel-section-intro");
      if (intro) intro.insertAdjacentElement("afterend", saveHint);
    }
    addFieldLabel("inp-titulo-header", "Nombre de tu espacio");
    addFieldLabel("sel-nombre", "Ocupación principal");
    addFieldLabel("sel-carrera", "Carrera o área");
    addFieldLabel("sel-especialidad", "Especialidad");
    addFieldLabel("sel-ciclo", "Nivel o ciclo");
    addFieldLabel("sel-objetivo", "Objetivo que quieres tener presente");
    var customRole = document.getElementById("inp-nombre");
    if (customRole) {
      customRole.placeholder = "Escribe tu ocupación";
      customRole.setAttribute("aria-label", "Escribe tu ocupación si elegiste Otros");
    }
    var title = profile.querySelector(".card-section-title");
    if (title) title.textContent = "Datos personales";
  }

  function decorateSchedule() {
    var schedule = document.getElementById("tab-personalizar");
    if (!schedule) return;
    var titles = schedule.querySelectorAll(".card-section-title");
    ["Abrir una vista", "Empieza con una plantilla", "Horas de tu semana"].forEach(function (label, index) {
      if (titles[index]) titles[index].textContent = label;
    });
    var viewCard = titles[0] && titles[0].closest(".card-section");
    var templateCard = titles[1] && titles[1].closest(".card-section");
    if (viewCard && templateCard) {
      schedule.insertBefore(templateCard, viewCard);
      schedule.appendChild(viewCard);
    }
    if (templateCard && !templateCard.querySelector(".panel-card-hint")) {
      var hint = document.createElement("p");
      hint.className = "panel-card-hint";
      hint.textContent = "Una plantilla crea un horario nuevo. Si ya tienes actividades, te pediremos confirmación.";
      titles[1].insertAdjacentElement("afterend", hint);
    }
    if (templateCard) {
      templateCard.addEventListener("click", function (event) {
        var button = event.target.closest("button[onclick^='cargarModelo']");
        if (!button || typeof filas === "undefined" || !Array.isArray(filas)) return;
        var hasActivities = filas.some(function (row) {
          return row.celdas && row.celdas.some(function (cell) {
            return cell && typeof cell.t === "string" && cell.t.trim() && cell.t.trim() !== "—";
          });
        });
        if (hasActivities && !window.confirm("Esta plantilla reemplazará las actividades de tu horario actual. ¿Quieres continuar?")) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }, true);
    }

    var row = schedule.querySelector(".interval-row");
    if (!row || row.querySelector(".panel-time-field")) return;
    var fields = [
      { id: "sel-intervalo", label: "Intervalo al crear la tabla", kind: "interval" },
      { id: "inp-hora-inicio", label: "Desde", kind: "start" },
      { id: "inp-hora-fin", label: "Hasta", kind: "end" }
    ];
    var fragment = document.createDocumentFragment();
    fields.forEach(function (field) {
      var input = document.getElementById(field.id);
      if (!input) return;
      var wrapper = document.createElement("div");
      wrapper.className = "panel-time-field panel-time-" + field.kind;
      var label = document.createElement("label");
      label.htmlFor = field.id;
      label.textContent = field.label;
      wrapper.appendChild(label);
      wrapper.appendChild(input);
      fragment.appendChild(wrapper);
    });
    var apply = row.querySelector("button");
    if (apply) {
      apply.classList.add("panel-apply-hours");
      apply.textContent = "Aplicar horario";
      fragment.appendChild(apply);
    }
    row.replaceChildren(fragment);
    var caution = row.nextElementSibling;
    if (!caution || !caution.classList.contains("panel-rebuild-hint")) {
      caution = document.createElement("p");
      caution.className = "panel-rebuild-hint";
      caution.textContent = "Aplicar crea una tabla nueva y reemplaza sus actividades tras confirmarlo. Para ajustar un bloque de tu semana, edítalo directamente.";
      row.insertAdjacentElement("afterend", caution);
    }
    if (!row.parentElement.querySelector(".panel-advanced")) {
      var advanced = document.createElement("details");
      advanced.className = "panel-advanced";
      advanced.innerHTML = '<summary>Más ajustes de la tabla <span>Filas, días y celdas</span></summary>';
      while (caution.nextSibling) advanced.appendChild(caution.nextSibling);
      caution.insertAdjacentElement("afterend", advanced);
    }
  }

  function decorateData() {
    var data = document.getElementById("tab-ajustes");
    if (!data) return;
    var titles = data.querySelectorAll(".card-section-title");
    if (titles[0]) {
      titles[0].textContent = "Idioma";
      var languageCard = titles[0].closest(".card-section");
      if (languageCard) languageCard.classList.add("panel-language-card");
    }
    if (titles[1]) titles[1].textContent = "Tu plan para llevar";
    if (titles[1] && !data.querySelector(".panel-card-hint")) {
      var hint = document.createElement("p");
      hint.className = "panel-card-hint";
      hint.textContent = "PDF para ver o imprimir. Excel para revisar tu horario en una hoja de cálculo.";
      titles[1].insertAdjacentElement("afterend", hint);
    }
  }

  function decoratePanel(panel) {
    var header = panel.querySelector(".sp-header");
    var title = header && header.querySelector(".sp-title");
    if (title) title.innerHTML = '<span class="panel-brand-mark" aria-hidden="true">✦</span><span>Tu espacio<small>PLANIFY · A tu manera</small></span>';
    var intro = panel.querySelector(".trust-panel-intro");
    if (intro) intro.innerHTML = '<span class="panel-intro-kicker">HECHO PARA TU RUTINA</span><strong>Organiza lo que importa.</strong><p>Personaliza tu perfil, ajusta tu horario y conserva una copia de tus planes.</p><span class="panel-intro-flower" aria-hidden="true">✳</span>';
    var trigger = document.getElementById("cloud-btn");
    if (trigger) {
      trigger.tabIndex = 0;
      trigger.setAttribute("aria-controls", "side-panel");
      trigger.setAttribute("title", "Abrir panel de control");
    }
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Panel de control");
    var tabList = panel.querySelector(".panel-tabs");
    if (tabList) {
      tabList.setAttribute("role", "tablist");
      tabList.addEventListener("click", function (event) {
        if (event.target.closest("[data-tab]")) panel.scrollTop = 0;
      });
    }
    PANEL_TABS.forEach(function (item) {
      var tab = tabList && tabList.querySelector('[data-tab="' + item.id + '"]');
      var content = document.getElementById(item.id);
      if (tab) {
        tab.id = "panel-tab-" + item.id;
        tab.innerHTML = '<span class="panel-tab-icon" aria-hidden="true">' + item.icon + '</span><span>' + item.label + '</span>';
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-controls", item.id);
      }
      if (content) {
        content.setAttribute("role", "tabpanel");
        content.setAttribute("aria-labelledby", "panel-tab-" + item.id);
        if (!content.querySelector(".panel-section-intro")) {
          var lead = document.createElement("div");
          lead.className = "panel-section-intro";
          lead.innerHTML = '<span>' + item.kicker + '</span><h3>' + item.title + '</h3><p>' + item.description + '</p>';
          content.insertBefore(lead, content.firstChild);
        }
      }
    });
    decorateProfile();
    decorateSchedule();
    decorateData();
    var profile = document.getElementById("tab-perfil");
    if (profile) initProfilePersistence(profile);
  }

  function init() {
    var panel = document.getElementById("side-panel");
    var trigger = document.getElementById("cloud-btn");
    if (!panel || !trigger || panel.classList.contains("panel-redesign-ready")) return;
    decoratePanel(panel);
    panel.classList.add("panel-redesign-ready");
    document.documentElement.classList.add("planify-panel-redesign-ready");
    var wasOpen = panel.classList.contains("open");

    function sync() {
      var open = panel.classList.contains("open");
      panel.setAttribute("aria-hidden", open ? "false" : "true");
      panel.inert = !open;
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("panel-control-open", open);
      PANEL_TABS.forEach(function (item) {
        var tab = panel.querySelector('[data-tab="' + item.id + '"]');
        var content = document.getElementById(item.id);
        var active = !!(tab && tab.classList.contains("active"));
        if (tab) tab.setAttribute("aria-selected", active ? "true" : "false");
        if (content) content.setAttribute("aria-hidden", active ? "false" : "true");
      });
      if (open && !wasOpen) {
        var close = panel.querySelector('[data-panel-action="close"]');
        if (close) close.focus({ preventScroll: true });
      } else if (!open && wasOpen && !document.activeElement.closest('[aria-modal="true"]')) {
        trigger.focus({ preventScroll: true });
      }
      wasOpen = open;
    }

    sync();
    new MutationObserver(sync).observe(panel, { attributes: true, attributeFilter: ["class"], subtree: true });
    trigger.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      trigger.click();
    });
    function focusableControls() {
      return Array.from(panel.querySelectorAll('button, a[href], input, select, textarea, summary, [tabindex]')).filter(function (control) {
        var closedDetails = control.closest('details:not([open])');
        return control.tabIndex >= 0 && !control.disabled && !control.closest('[inert], [aria-hidden="true"]') &&
          (!closedDetails || closedDetails.querySelector('summary').contains(control)) && control.getClientRects().length > 0;
      });
    }
    document.addEventListener("keydown", function (event) {
      if (!panel.classList.contains("open")) return;
      var activeDialog = document.querySelector("dialog[open]");
      if (activeDialog && !panel.contains(activeDialog)) return;
      if (event.key === "Escape") {
        event.preventDefault();
        var close = panel.querySelector('[data-panel-action="close"]');
        if (close) close.click();
      } else if (event.key === "Tab") {
        var controls = focusableControls();
        var first = controls[0];
        var last = controls[controls.length - 1];
        if (!first) {
          event.preventDefault();
          panel.tabIndex = -1;
          panel.focus({ preventScroll: true });
        } else if (!panel.contains(document.activeElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus({ preventScroll: true });
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus({ preventScroll: true });
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus({ preventScroll: true });
        }
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
