/* ==========================================================================
   FOLIO ENGINE — App Orchestrator
   Load LAST. Wires all modules together.
   ========================================================================== */
(function (global) {
  "use strict";

  var demoMode = global.FolioRuntimeConfig && global.FolioRuntimeConfig.mode === "demo";
  var INSPECTOR_TAB_KEY = demoMode ? "folio_engine_demo_inspector_tab" : "folio_inspector_tab";
  var BRAND_PRESET_KEY = demoMode ? "folio_engine_demo_brand_preset_v1" : "folio_brand_preset_v1";

  var store = global.FolioStore;
  var pendingSession = false;
  var inspectorTab = "page";

  function setMode(mode) {
    var changed = store.state.settings.mode !== mode;
    store.state.settings.mode = mode;
    document.getElementById("book").classList.toggle("mode-active", mode === "book");
    document.getElementById("story").classList.toggle("mode-active", mode === "story");
    document.getElementById("btnBook").classList.toggle("active", mode === "book");
    document.getElementById("btnStory").classList.toggle("active", mode === "story");
    var isBook = mode === "book";
    document.getElementById("navPrev").style.display = isBook ? "" : "none";
    document.getElementById("navNext").style.display = isBook ? "" : "none";
    if (changed) store.save(true);
  }

  function applyPubTheme() {
    var stage = document.getElementById("stage");
    stage.setAttribute("data-pubtheme", store.state.meta.pubtheme);
    stage.setAttribute("data-template", store.state.meta.templateKey || "custom");
    var br = store.state.meta.brand || {};
    function optionalProperty(name, value) {
      if (value) stage.style.setProperty(name, value);
      else stage.style.removeProperty(name);
    }
    optionalProperty("--pub-accent", br.accent);
    optionalProperty("--pub-head", br.headingFont);
    optionalProperty("--pub-body", br.bodyFont);
    optionalProperty("--pub-radius", br.radius);
    optionalProperty("--pub-page", br.page);
    optionalProperty("--pub-viewer", br.viewer);
    optionalProperty("--pub-text", br.text);
    optionalProperty("--pub-muted", br.muted);
    stage.style.setProperty("--pub-scale", br.scale || "1");
    stage.style.setProperty("--pub-density", br.density || "1");
  }

  function syncInspector() {
    var state = store.state;
    document.getElementById("folioCounter").textContent =
      String(store.currentIndex + 1).padStart(2, "0") + " / " +
      String(state.pages.length).padStart(2, "0");

    var p = state.pages[store.currentIndex];
    var words = global.FolioBlocks.wordCount(p);
    document.getElementById("inspIndex").textContent = store.currentIndex + 1;
    document.getElementById("inspWords").textContent = words;
    document.getElementById("inspRead").textContent = Math.max(1, Math.round(words / 3.3)) + "s";

    var titleField = document.getElementById("pageTitleInput");
    if (document.activeElement !== titleField) titleField.value = p.title || "";
    document.getElementById("pageCoverToggle").checked = p.layout === "cover";
    var cv = p.cover || {};
    document.getElementById("coverPreset").value = cv.preset || "editorial";
    document.getElementById("coverTreatment").value = cv.treatment || "gradient";
    document.getElementById("coverColor1").value = cv.color1 || "#4338ca";
    document.getElementById("coverColor2").value = cv.color2 || "#111827";
    document.getElementById("coverAlign").value = cv.align || "center";
    document.getElementById("coverVertical").value = cv.vertical || "center";

    document.getElementById("navPrev").disabled = store.currentIndex === 0;
    document.getElementById("navNext").disabled = store.currentIndex === state.pages.length - 1;
  }

  function render() {
    global.FolioEditor.renderThumbs();
    global.FolioBook.render();
    global.FolioStory.render();
    global.FolioHotspots.renderList();
    global.FolioBlocks.renderPanel();
    global.FolioAnalytics.renderPanel();
    syncInspector();
    setMode(store.state.settings.mode || "book");
  }

  /* ---------- Reader (preview) mode ---------- */
  function enterReader() {
    document.getElementById("btnExitReader").style.display = "inline-flex";
    document.body.classList.add("reader");
    render(); // re-render: all content becomes non-editable
    if (global.FolioProtect.maybeGate()) {
      pendingSession = true; // session starts only after successful unlock
    } else {
      global.FolioAnalytics.startSession();
    }
    global.FolioToast.show("Reader preview — press Esc or Exit to leave");
  }

  function exitReader() {
    if (!document.body.classList.contains("reader")) return;
    document.getElementById("btnExitReader").style.display = "none";
    document.body.classList.remove("reader");
    document.getElementById("gateOverlay").classList.remove("open");
    pendingSession = false;
    render(); // re-render: editing restored, analytics panel refreshed
  }

  /* ---------- Wiring ---------- */
  function initModeToggle() {
    document.getElementById("btnBook").addEventListener("click", function () { setMode("book"); });
    document.getElementById("btnStory").addEventListener("click", function () { setMode("story"); });
    document.getElementById("btnReader").addEventListener("click", enterReader);
    document.getElementById("btnFullscreen").addEventListener("click", toggleFullscreen);
    var fileBtn = document.getElementById("btnFileMenu");
    var fileMenu = document.getElementById("fileMenu");
    fileBtn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      var open = fileMenu.classList.toggle("open");
      fileBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (ev) {
      if (!ev.target.closest(".menu-wrap")) {
        fileMenu.classList.remove("open");
        fileBtn.setAttribute("aria-expanded", "false");
      }
    });
    var railL = document.querySelector(".rail-left"), railR = document.querySelector(".rail-right");
    document.getElementById("btnTogglePages").addEventListener("click", function () {
      railR.classList.remove("open"); railL.classList.toggle("open");
    });
    document.getElementById("btnClosePages").addEventListener("click", function () { railL.classList.remove("open"); });
    document.getElementById("btnTogglePanel").addEventListener("click", function () {
      railL.classList.remove("open"); railR.classList.toggle("open");
    });
    document.getElementById("btnCloseInspector").addEventListener("click", function () { railR.classList.remove("open"); });
    document.getElementById("stage").addEventListener("click", function () {
      railL.classList.remove("open"); railR.classList.remove("open");
    });
    document.getElementById("btnExitReader").addEventListener("click", exitReader);
  }

  function setInspectorTab(name, focusTab) {
    var valid = ["page", "blocks", "brand", "interactions", "publish"];
    if (valid.indexOf(name) === -1) name = "page";
    inspectorTab = name;
    try { sessionStorage.setItem(INSPECTOR_TAB_KEY, name); } catch (e) { /* session-only preference */ }
    var labels = { page: "Page settings", blocks: "Content system", brand: "Brand system", interactions: "Reader interactions", publish: "Preview and export" };
    document.getElementById("inspectorContext").textContent = labels[name];
    document.querySelectorAll("[data-inspector-tab]").forEach(function (button) {
      var active = button.dataset.inspectorTab === name;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
      button.tabIndex = active ? 0 : -1;
      if (active && focusTab) button.focus();
    });
    document.querySelectorAll("[data-inspector-panel]").forEach(function (panel) {
      var active = panel.dataset.inspectorPanel === name;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
  }

  function initInspectorTabs() {
    try { inspectorTab = sessionStorage.getItem(INSPECTOR_TAB_KEY) || "page"; } catch (e) { inspectorTab = "page"; }
    var tabs = Array.prototype.slice.call(document.querySelectorAll("[data-inspector-tab]"));
    tabs.forEach(function (button, index) {
      button.addEventListener("click", function () { setInspectorTab(button.dataset.inspectorTab); });
      button.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        var next = (index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
        setInspectorTab(tabs[next].dataset.inspectorTab, true);
      });
    });
    document.getElementById("btnInspectorPublish").addEventListener("click", function () { document.getElementById("btnExportHtml").click(); });
    document.getElementById("btnInspectorPreview").addEventListener("click", function () { document.getElementById("btnReader").click(); });
    document.getElementById("btnInspectorAssistant").addEventListener("click", function () { document.getElementById("btnAssistant").click(); });
    setInspectorTab(inspectorTab);
  }

  function initStage() {
    var stage = document.getElementById("stage");
    stage.addEventListener("click", function (e) {
      // Hotspot placement gets first claim on stage clicks.
      var selector = store.state.settings.mode === "book" ? ".leaf-front" : ".slide";
      global.FolioHotspots.handleStageClick(e, selector);
    }, true);

    document.getElementById("navPrev").addEventListener("click", global.FolioBook.prevPage);
    document.getElementById("navNext").addEventListener("click", global.FolioBook.nextPage);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
  }

  function initKeyboard() {
    document.addEventListener("keydown", function (e) {
      if (document.activeElement && document.activeElement.isContentEditable) return;
      if (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
      if (e.key === "Escape") {
        var openModal = document.querySelector(".modal-backdrop.open");
        if (openModal) { openModal.classList.remove("open"); return; }
        exitReader();
        return;
      }
      if (store.state.settings.mode !== "book") return;
      if (e.key === "ArrowRight") global.FolioBook.nextPage();
      if (e.key === "ArrowLeft") global.FolioBook.prevPage();
    });
  }

  function enterProject() {
    store.currentIndex = 0;
    global.FolioBlocks.clearSelection();
    document.getElementById("pubTitle").value = store.state.meta.title;
    document.getElementById("pubTheme").value = store.state.meta.pubtheme;
    var br = store.state.meta.brand || {};
    document.getElementById("brandAccent").value = br.accent || "#000000";
    document.getElementById("brandHead").value = br.headingFont || "";
    document.getElementById("brandBody").value = br.bodyFont || "";
    document.getElementById("brandRadius").value = br.radius || "";
    document.getElementById("brandPage").value = br.page || "#fdfbf6";
    document.getElementById("brandViewer").value = br.viewer || "#0d1017";
    document.getElementById("brandText").value = br.text || "#26221a";
    document.getElementById("brandMuted").value = br.muted || "#6b6353";
    document.getElementById("brandScale").value = br.scale || "1";
    document.getElementById("brandDensity").value = br.density || "1";
    var info = store.state.meta.info || {};
    ["BrandName", "Subtitle", "Email", "Phone", "Website", "Address", "Cta"].forEach(function (suffix) {
      var key = suffix.charAt(0).toLowerCase() + suffix.slice(1);
      document.getElementById("info" + suffix).value = info[key] || "";
    });
    applyPubTheme();
    global.FolioProtect.syncControls();
    render();
    global.FolioAnalytics.renderPanel();
  }

  function refreshHelpStats() {
    var used = store.storageUsage();
    var mb = (used / (1024 * 1024)).toFixed(2);
    document.getElementById("helpStorage").textContent = mb + " MB of ~5 MB browser quota";
    document.getElementById("helpProjects").textContent = String(store.listProjects().length);
  }

  function init() {
    /* Load or create a valid project before modules read store.state. On a clean
       browser the store starts as an empty object, so toolbar/module setup must
       never run before this bootstrap completes. */
    var booted = store.boot();
    var projects = store.listProjects();
    if (!booted.hasActive && !projects.length) {
      store.prepareDraft();
    } else if (!booted.hasActive && projects.length) {
      booted.hasActive = store.openProject(projects[0].id);
    }

    initModeToggle();
    initStage();
    initKeyboard();
    initInspectorTabs();
    global.FolioEditor.initToolbar();
    global.FolioExport.init();
    global.FolioHotspots.init();
    global.FolioProtect.init();
    global.FolioBlocks.init();
    global.FolioMediaLibrary.init();
    document.getElementById("pageCoverToggle").addEventListener("change", function () {
      var p = store.state.pages[store.currentIndex];
      if (this.checked) p.layout = "cover"; else delete p.layout;
      store.save(true);
      render();
    });
    document.getElementById("pageSearch").addEventListener("input", function () {
      global.FolioEditor.renderThumbs();
    });
    document.getElementById("pageTitleInput").addEventListener("change", function () {
      var p = store.state.pages[store.currentIndex];
      p.title = this.value.trim() || "Untitled";
      store.save(true);
      global.FolioEditor.renderThumbs();
    });
    document.getElementById("btnExportReport").addEventListener("click", global.FolioAnalytics.exportReport);
    document.getElementById("btnResetAnalytics").addEventListener("click", function () {
      global.FolioUI.confirm("Reset all preview analytics? This cannot be undone.", global.FolioAnalytics.resetAnalytics);
    });
    ["brandAccent", "brandHead", "brandBody", "brandRadius", "brandPage", "brandViewer", "brandText", "brandMuted", "brandScale", "brandDensity"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", function () {
        var br = store.state.meta.brand;
        br.accent = document.getElementById("brandAccent").value === "#000000" ? "" : document.getElementById("brandAccent").value;
        br.headingFont = document.getElementById("brandHead").value;
        br.bodyFont = document.getElementById("brandBody").value;
        br.radius = document.getElementById("brandRadius").value;
        br.page = document.getElementById("brandPage").value;
        br.viewer = document.getElementById("brandViewer").value;
        br.text = document.getElementById("brandText").value;
        br.muted = document.getElementById("brandMuted").value;
        br.scale = document.getElementById("brandScale").value;
        br.density = document.getElementById("brandDensity").value;
        store.save(true);
        applyPubTheme();
        render();
      });
    });
    function linkedValue(info, key) {
      if (key !== "contactText") return info[key] || "";
      return [info.brandName, info.address, info.email, info.phone, info.website].filter(Boolean).join("\n");
    }
    ["BrandName", "Subtitle", "Email", "Phone", "Website", "Address", "Cta"].forEach(function (suffix) {
      var key = suffix.charAt(0).toLowerCase() + suffix.slice(1);
      document.getElementById("info" + suffix).addEventListener("change", function () {
        var info = store.state.meta.info || (store.state.meta.info = {});
        var oldInfo = Object.assign({}, info);
        var oldDirect = linkedValue(oldInfo, key);
        var oldContact = linkedValue(oldInfo, "contactText");
        info[key] = this.value.trim();
        var detached = 0, updated = 0;
        store.state.pages.forEach(function (page) {
          (page.blocks || []).forEach(function (block) {
            Object.keys(block.bindings || {}).forEach(function (property) {
              var bindingKey = block.bindings[property];
              if (bindingKey !== key && bindingKey !== "contactText") return;
              var previous = bindingKey === "contactText" ? oldContact : oldDirect;
              if (block[property] === previous || !block[property]) {
                block[property] = linkedValue(info, bindingKey);
                updated++;
              } else {
                delete block.bindings[property];
                detached++;
              }
            });
          });
        });
        document.getElementById("infoLinkStatus").textContent = updated + " linked field" + (updated === 1 ? "" : "s") + " updated" + (detached ? " · " + detached + " manually edited field" + (detached === 1 ? "" : "s") + " detached" : "");
        store.save(true);
        render();
      });
    });
    document.getElementById("btnBrandReset").addEventListener("click", function () {
      store.state.meta.brand = { accent: "", page: "", viewer: "", text: "", muted: "", headingFont: "", bodyFont: "", radius: "", scale: "1", density: "1" };
      document.getElementById("brandAccent").value = "#000000";
      document.getElementById("brandHead").value = "";
      document.getElementById("brandBody").value = "";
      document.getElementById("brandRadius").value = "";
      document.getElementById("brandPage").value = "#fdfbf6";
      document.getElementById("brandViewer").value = "#0d1017";
      document.getElementById("brandText").value = "#26221a";
      document.getElementById("brandMuted").value = "#6b6353";
      document.getElementById("brandScale").value = "1";
      document.getElementById("brandDensity").value = "1";
      store.save(true);
      applyPubTheme();
      render();
      global.FolioToast.show("Brand reset to theme defaults");
    });
    document.getElementById("btnBrandSave").addEventListener("click", function () {
      try {
        localStorage.setItem(BRAND_PRESET_KEY, JSON.stringify(store.state.meta.brand));
        global.FolioToast.show("Brand preset saved locally");
      } catch (e) { global.FolioToast.show("Could not save preset in browser storage"); }
    });
    document.getElementById("btnBrandApply").addEventListener("click", function () {
      try {
        var preset = JSON.parse(localStorage.getItem(BRAND_PRESET_KEY) || "null");
        if (!preset) { global.FolioToast.show("No saved brand preset yet"); return; }
        store.state.meta.brand = Object.assign(store.state.meta.brand, preset);
        store.save(true); enterProject(); global.FolioToast.show("Saved brand preset applied");
      } catch (e) { global.FolioToast.show("Saved preset could not be read"); }
    });
    ["coverPreset", "coverTreatment", "coverColor1", "coverColor2", "coverAlign", "coverVertical"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", function () {
        var p = store.state.pages[store.currentIndex];
        p.layout = "cover";
        p.cover = {
          preset: document.getElementById("coverPreset").value,
          treatment: document.getElementById("coverTreatment").value,
          color1: document.getElementById("coverColor1").value,
          color2: document.getElementById("coverColor2").value,
          align: document.getElementById("coverAlign").value,
          vertical: document.getElementById("coverVertical").value
        };
        store.save(true); render();
      });
    });
    document.getElementById("btnCoverReset").addEventListener("click", function () {
      var p = store.state.pages[store.currentIndex]; delete p.cover;
      store.save(true); render(); global.FolioToast.show("Cover style reset to brand defaults");
    });
    document.getElementById("btnCoverDuplicate").addEventListener("click", function () {
      var p = store.state.pages[store.currentIndex];
      if (!p.cover) { global.FolioToast.show("Customize this cover before duplicating its style"); return; }
      var next = store.state.pages[store.currentIndex + 1];
      if (!next) { global.FolioToast.show("Add another page first"); return; }
      next.layout = "cover"; next.cover = JSON.parse(JSON.stringify(p.cover));
      store.save(true); global.FolioToast.show("Cover style applied to the next page");
    });
    document.getElementById("btnHelp").addEventListener("click", function () {
      refreshHelpStats();
      document.getElementById("helpBackdrop").classList.add("open");
    });
    document.getElementById("btnHelpClose").addEventListener("click", function () {
      document.getElementById("helpBackdrop").classList.remove("open");
    });
    document.getElementById("helpBackdrop").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) e.currentTarget.classList.remove("open");
    });
    document.getElementById("btnHelpSamples").addEventListener("click", function () {
      global.FolioUI.confirm("Add the four sample publications to your library?", function () {
        global.FolioProjects.restoreSamples();
        enterProject();
        refreshHelpStats();
      });
    });
    document.getElementById("btnHelpDeleteAll").addEventListener("click", function () {
      global.FolioUI.confirm("Delete ALL publications from this browser? Export backups first — this cannot be undone.", function () {
        store.listProjects().forEach(function (p) { store.deleteProject(p.id); });
        document.getElementById("helpBackdrop").classList.remove("open");
        global.FolioProjects.showLibrary();
        global.FolioToast.show("All publications deleted");
      });
    });
    document.getElementById("btnHelpTour").addEventListener("click", function () {
      document.getElementById("helpBackdrop").classList.remove("open");
      global.FolioTour.start();
    });
    global.FolioProjects.init();
    global.FolioAssistant.init();
    enterProject();
    global.FolioProjects.showLibrary();
    global.FolioAnalytics.startTracking();
  }

  global.FolioApp = {
    render: render,
    syncInspector: syncInspector,
    applyPubTheme: applyPubTheme,
    setInspectorTab: setInspectorTab,
    enterProject: enterProject,
    consumePendingSession: function () {
      if (pendingSession) { pendingSession = false; return true; }
      return false;
    },
    init: init
  };

  document.addEventListener("DOMContentLoaded", global.FolioApp.init);
})(window);
