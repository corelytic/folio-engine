/* ==========================================================================
   FOLIO ENGINE — Access Deterrence & Watermark
   Password gate (reader mode) + dynamic tiled watermark overlay.
   Client-side deterrence for small publishers — documented as such.
   Exposes: window.FolioProtect
   ========================================================================== */
(function (global) {
  "use strict";

  var store = global.FolioStore;

  function encodePassword(value) {
    return btoa(unescape(encodeURIComponent(value)));
  }

  /* ---------- Watermark ---------- */
  function renderWatermark() {
    var wm = document.getElementById("wmOverlay");
    var on = store.state.settings.watermark;
    wm.classList.toggle("on", !!on);
    wm.innerHTML = "";
    if (!on) return;

    var text = store.state.settings.watermarkText || "CONFIDENTIAL";
    var stamp = text + " · " + new Date().toLocaleDateString();
    for (var r = 0; r < 6; r++) {
      for (var c = 0; c < 4; c++) {
        var span = document.createElement("span");
        span.textContent = stamp;
        span.style.top = (r * 18 + 4) + "%";
        span.style.left = (c * 28 - 6) + "%";
        wm.appendChild(span);
      }
    }
  }

  /* ---------- Password gate ---------- */
  function maybeGate() {
    var pass = store.state.settings.password;
    if (!pass) return false;
    var gate = document.getElementById("gateOverlay");
    gate.classList.add("open");
    document.getElementById("gateInput").value = "";
    document.getElementById("gateInput").focus();
    return true;
  }

  function tryUnlock() {
    var input = document.getElementById("gateInput");
    var s = store.state.settings;
    var ok = s.passwordEncoded ? encodePassword(input.value) === s.password : input.value === s.password;
    if (ok) {
      document.getElementById("gateOverlay").classList.remove("open");
      if (global.FolioApp.consumePendingSession()) global.FolioAnalytics.startSession();
      global.FolioToast.show("Publication unlocked");
    } else {
      input.value = "";
      input.placeholder = "Wrong password — try again";
    }
  }

  function init() {
    /* Settings controls */
    var passInput = document.getElementById("passInput");
    document.getElementById("btnSetPass").addEventListener("click", function () {
      var v = passInput.value.trim();
      store.state.settings.password = v ? encodePassword(v) : "";
      store.state.settings.passwordEncoded = true;
      store.save(true);
      passInput.value = "";
      passInput.placeholder = v ? "Password is set — type a new one to replace" : "Reader password (client-side gate)";
      global.FolioToast.show(v ? "Access gate enabled" : "Access gate removed");
    });

    var wmToggle = document.getElementById("wmToggle");
    wmToggle.addEventListener("change", function () {
      store.state.settings.watermark = wmToggle.checked;
      store.save(true);
      renderWatermark();
    });

    var wmText = document.getElementById("wmText");
    wmText.addEventListener("input", function () {
      store.state.settings.watermarkText = wmText.value.trim() || "CONFIDENTIAL";
      store.save(true);
      renderWatermark();
    });

    /* Gate events */
    document.getElementById("gateBtn").addEventListener("click", tryUnlock);
    document.getElementById("gateInput").addEventListener("keydown", function (e) {
      if (e.key === "Enter") tryUnlock();
    });

    syncControls();
  }

  function syncControls() {
    var settings = store.state.settings;
    var passInput = document.getElementById("passInput");
    passInput.value = "";
    passInput.placeholder = settings.password ? "Password is set — type a new one to replace" : "Reader password (client-side gate)";
    document.getElementById("wmToggle").checked = !!settings.watermark;
    document.getElementById("wmText").value = settings.watermarkText || "CONFIDENTIAL";
    renderWatermark();
  }

  global.FolioProtect = {
    init: init,
    maybeGate: maybeGate,
    renderWatermark: renderWatermark,
    syncControls: syncControls
  };
})(window);
