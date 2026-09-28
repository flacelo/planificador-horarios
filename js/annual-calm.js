/* Presentation layer for the existing annual goals; storage remains in app.js. */
(function () {
  "use strict";

  function init() {
    var view = document.getElementById("vista-anual-metas");
    var grid = view && view.querySelector(".grid-12-meses");
    var heading = view && view.querySelector(".encabezado-anual");
    if (!view || !grid || !heading || view.classList.contains("annual-calm-ready")) return;

    var eyebrow = document.createElement("span");
    eyebrow.className = "annual-calm-eyebrow";
    eyebrow.textContent = "PANORAMA ANUAL";
    heading.insertBefore(eyebrow, heading.firstChild);

    var guidance = view.querySelector('[data-planify-guidance="annual"]');
    if (guidance) {
      var ideas = document.createElement("details");
      ideas.className = "annual-calm-ideas";
      ideas.innerHTML = '<summary><span>Ideas para darle dirección a tu año</span><small>Opcional · según tus objetivos</small></summary>';
      grid.insertAdjacentElement("afterend", ideas);
      ideas.appendChild(guidance);
    }

    function decorateCards() {
      var cards = grid.querySelectorAll(":scope > .tarjeta-mes-objetivos");
      cards.forEach(function (card, index) {
        var textarea = card.querySelector("textarea");
        if (!textarea) return;
        var title = card.querySelector("h4");
        if (title) textarea.setAttribute("aria-label", "Objetivos de " + title.textContent.replace(/^\d+\.\s*/, ""));
        var hasGoal = Boolean(textarea.value.trim());
        card.classList.toggle("annual-calm-filled", hasGoal);
        textarea.style.height = "auto";
        var contentHeight = textarea.scrollHeight;
        textarea.style.height = Math.max(70, Math.min(210, contentHeight)) + "px";
        textarea.style.overflowY = contentHeight > 210 ? "auto" : "hidden";
        if (index % 3 === 0 && !card.querySelector(".annual-calm-quarter")) {
          var quarter = document.createElement("span");
          quarter.className = "annual-calm-quarter";
          quarter.textContent = "TRIMESTRE " + (Math.floor(index / 3) + 1);
          card.insertBefore(quarter, card.firstChild);
        }
      });
    }

    grid.addEventListener("input", function (event) {
      if (event.target.matches(".tarjeta-mes-objetivos textarea")) decorateCards();
    });
    new MutationObserver(decorateCards).observe(grid, { childList: true });
    decorateCards();

    view.classList.add("annual-calm-ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
