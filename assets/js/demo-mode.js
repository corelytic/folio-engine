(function (global) {
  "use strict";

  var PREFIX = "folio_engine_demo_";
  var SEED_KEY = PREFIX + "seed_v1";
  var FLAGSHIPS = ["catalog", "lookbook", "hotel", "company", "restaurant"];

  function clearPrefixed(storage) {
    var keys = [];
    try {
      for (var i = 0; i < storage.length; i++) {
        var key = storage.key(i);
        if (key && key.indexOf(PREFIX) === 0) keys.push(key);
      }
      keys.forEach(function (key) { storage.removeItem(key); });
    } catch (error) { /* unavailable storage is already isolated */ }
  }

  function seedFlagships() {
    var store = global.FolioStore;
    var templates = global.FolioProjects && global.FolioProjects.TEMPLATES;
    if (!store || !templates) return;
    if (!localStorage.getItem(SEED_KEY) || store.listProjects().length !== FLAGSHIPS.length) {
      store.listProjects().forEach(function (project) { store.deleteProject(project.id); });
      FLAGSHIPS.forEach(function (name) { store.createProject(templates[name].make()); });
      localStorage.setItem(SEED_KEY, "1");
    }
    global.FolioProjects.showLibrary();
  }

  async function resetDemo() {
    var button = document.getElementById("btnResetDemo");
    if (button) { button.disabled = true; button.textContent = "Resetting…"; }
    if (global.FolioMedia && global.FolioMedia.resetDemoData) {
      await global.FolioMedia.resetDemoData();
    }
    clearPrefixed(localStorage);
    clearPrefixed(sessionStorage);
    location.reload();
  }

  function installDemoControls() {
    document.body.classList.add("demo-mode");
    var badge = document.createElement("div");
    badge.className = "demo-mode-bar";
    badge.setAttribute("role", "note");
    badge.innerHTML = '<span><b>Folio Engine Demo</b><small>Changes stay in this browser only.</small></span><button type="button" id="btnResetDemo">Reset Demo</button>';
    document.body.appendChild(badge);
    document.getElementById("btnResetDemo").addEventListener("click", function () {
      if (global.FolioUI && global.FolioUI.confirm) {
        global.FolioUI.confirm("Reset this browser-local demo and restore the five flagship publications?", resetDemo);
      } else {
        resetDemo();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    installDemoControls();
    seedFlagships();
  });
})(window);
