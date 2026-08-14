/* ==========================================================================
   FOLIO ENGINE — Toast Notifications
   Exposes: window.FolioToast
   ========================================================================== */
(function (global) {
  "use strict";

  var timer;

  function show(msg, actionLabel, actionFn) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    if (actionLabel && actionFn) {
      var b = document.createElement("button");
      b.className = "toast-action";
      b.textContent = actionLabel;
      b.addEventListener("click", function () {
        el.classList.remove("show");
        clearTimeout(timer);
        actionFn();
      });
      el.appendChild(b);
    }
    el.classList.add("show");
    clearTimeout(timer);
    timer = setTimeout(function () { el.classList.remove("show"); }, actionLabel ? 5000 : 2300);
  }

  global.FolioToast = { show: show };

  /* Minimal promise-style confirm dialog. */
  var pendingYes = null;
  function confirmDialog(message, onYes) {
    document.getElementById("confirmMsg").textContent = message;
    var action = /^delete\b/i.test(message) ? "Delete" :
      (/^reset\b/i.test(message) ? "Reset" :
      (/^import\b/i.test(message) ? "Import" :
      (/^add\b/i.test(message) ? "Add" : "Confirm")));
    document.getElementById("btnConfirmYes").textContent = action;
    document.getElementById("confirmBackdrop").classList.add("open");
    pendingYes = onYes;
  }
  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("btnConfirmYes").addEventListener("click", function () {
      document.getElementById("confirmBackdrop").classList.remove("open");
      if (pendingYes) pendingYes();
      pendingYes = null;
    });
    document.getElementById("btnConfirmNo").addEventListener("click", function () {
      document.getElementById("confirmBackdrop").classList.remove("open");
      pendingYes = null;
    });
    document.getElementById("confirmBackdrop").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) { e.currentTarget.classList.remove("open"); pendingYes = null; }
    });
  });

  /* ---------- Shared modal accessibility: focus trap + restoration ---------- */
  var lastFocus = null;
  var activeModal = null;
  var pendingTrigger = null;
  function syncModalFocus() {
    var open = document.querySelector(".modal-backdrop.open");
    if (open === activeModal) return;
    if (open) {
      lastFocus = pendingTrigger && document.contains(pendingTrigger) ? pendingTrigger : document.activeElement;
      var first = open.querySelector("input, select, textarea, button");
      if (first) first.focus();
    } else if (activeModal) {
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
      lastFocus = null;
    }
    activeModal = open;
    pendingTrigger = null;
  }
  document.addEventListener("click", function () {
    if (!activeModal) pendingTrigger = document.activeElement;
    setTimeout(syncModalFocus, 0);
  }, true);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") setTimeout(syncModalFocus, 0);
  }, true);

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var open = document.querySelector(".modal-backdrop.open");
    if (!open) return;
    var focusables = open.querySelectorAll("button:not([disabled]), input, select, textarea, [href]");
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!open.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  });

  global.FolioUI = { confirm: confirmDialog };
})(window);
