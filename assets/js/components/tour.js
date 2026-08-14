/* ==========================================================================
   FOLIO ENGINE — First-use Walkthrough
   Exposes: window.FolioTour
   ========================================================================== */
(function (global) {
  "use strict";

  var DONE_KEY = global.FolioRuntimeConfig && global.FolioRuntimeConfig.mode === "demo"
    ? "folio_engine_demo_tour_done_v1"
    : "folio_tour_done_v1";
  var steps = [
    { sel: "#btnProjects",   text: "Your Project Library lives here — create, open, rename, duplicate, or delete publications." },
    { sel: "#thumbList",     text: "Pages of the current publication. Drag to reorder; hover a card for duplicate and delete." },
    { sel: "#book",          text: "The live canvas. Click any text to edit it in place. Click a block to select it." },
    { sel: "#blockProps",    text: "The inspector: block list, per-block settings, hotspots, branding theme, and the Access Gate." },
    { sel: "#btnReader",     text: "Preview shows exactly what readers see — read-only, with Preview Analytics recording." },
    { sel: "#btnExportHtml", text: "Export a single self-contained HTML file: your whole publication, ready to email or host anywhere." }
  ];
  var idx = -1;

  function el(id) { return document.getElementById(id.replace("#", "")); }

  function show(i) {
    idx = i;
    var step = steps[i];
    var target = document.querySelector(step.sel);
    var tip = el("tourTip");
    document.querySelectorAll(".tour-target").forEach(function (t) { t.classList.remove("tour-target"); });
    el("tourText").textContent = step.text;
    el("tourCount").textContent = (i + 1) + " / " + steps.length;
    el("btnTourNext").textContent = i === steps.length - 1 ? "Finish" : "Next";
    tip.classList.add("open");
    if (target) {
      target.classList.add("tour-target");
      var r = target.getBoundingClientRect();
      var top = Math.min(window.innerHeight - 150, Math.max(12, r.bottom + 10));
      var left = Math.min(window.innerWidth - 290, Math.max(12, r.left));
      tip.style.top = top + "px";
      tip.style.left = left + "px";
    } else {
      tip.style.top = "80px";
      tip.style.left = "50%";
    }
  }

  function end() {
    idx = -1;
    el("tourTip").classList.remove("open");
    document.querySelectorAll(".tour-target").forEach(function (t) { t.classList.remove("tour-target"); });
    try { localStorage.setItem(DONE_KEY, "1"); } catch (e) { /* fine */ }
  }

  function start() { show(0); }

  function maybeAutoStart() {
    var done = null;
    try { done = localStorage.getItem(DONE_KEY); } catch (e) { done = "1"; }
    if (!done) {
      // Give the first render a beat before pointing at things.
      setTimeout(start, 600);
    }
  }

  function init() {
    el("btnTourNext").addEventListener("click", function () {
      if (idx >= steps.length - 1) end(); else show(idx + 1);
    });
    el("btnTourSkip").addEventListener("click", end);
  }

  document.addEventListener("DOMContentLoaded", init);

  global.FolioTour = { start: start, maybeAutoStart: maybeAutoStart };
})(window);
