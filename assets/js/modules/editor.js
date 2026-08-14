/* ==========================================================================
   FOLIO ENGINE — Editor (thumbnail rail, page CRUD, uploads)
   Exposes: window.FolioEditor
   ========================================================================== */
(function (global) {
  "use strict";

  var store = global.FolioStore;

  function renderThumbs() {
    var thumbList = document.getElementById("thumbList");
    var state = store.state;
    thumbList.innerHTML = "";
    var qEl = document.getElementById("pageSearch");
    var q = qEl ? (qEl.value || "").toLowerCase().trim() : "";

    state.pages.forEach(function (p, i) {
      if (q && (p.title || "").toLowerCase().indexOf(q) === -1) return;
      var t = document.createElement("div");
      t.className = "thumb" + (i === store.currentIndex ? " selected" : "");
      t.draggable = true;
      t.dataset.index = i;

      var hsBadge = p.hotspots.length
        ? '<span class="hs-count">📍 ' + p.hotspots.length + '</span>'
        : "";
      var imgBadge = (p.blocks || []).some(function (b) { return b.type === "image" && (b.assetId || b.src); }) ? "<span>🖼</span>" : "";

      t.innerHTML =
        '<div class="thumb-actions">' +
          '<button class="icon-btn mup" title="Move page up" aria-label="Move page up">↑</button>' +
          '<button class="icon-btn mdn" title="Move page down" aria-label="Move page down">↓</button>' +
          '<button class="icon-btn dup" title="Duplicate page" aria-label="Duplicate page">⧉</button>' +
          '<button class="icon-btn del" title="Delete page" aria-label="Delete page">×</button>' +
        '</div>' +
        '<div class="thumb-num">PAGE ' + String(i + 1).padStart(2, "0") + '</div>' +
        '<div class="thumb-title">' + store.escapeHtml(p.title || "Untitled") + '</div>' +
        '<div class="thumb-meta">' + hsBadge + imgBadge + '</div>';

      t.addEventListener("click", function (e) {
        if (e.target.closest(".icon-btn")) return;
        store.currentIndex = i;
        global.FolioApp.render();
        document.querySelector(".rail-left").classList.remove("open");
      });

      t.querySelector(".mup").addEventListener("click", function (e) {
        e.stopPropagation();
        if (i > 0) reorderPage(i, i - 1);
      });
      t.querySelector(".mdn").addEventListener("click", function (e) {
        e.stopPropagation();
        if (i < state.pages.length - 1) reorderPage(i, i + 1);
      });
      t.querySelector(".del").addEventListener("click", function (e) {
        e.stopPropagation();
        deletePage(i);
      });
      t.querySelector(".dup").addEventListener("click", function (e) {
        e.stopPropagation();
        duplicatePage(i);
      });

      t.addEventListener("dragstart", function (e) { e.dataTransfer.setData("text/plain", i); });
      t.addEventListener("dragover", function (e) { e.preventDefault(); t.classList.add("drag-over"); });
      t.addEventListener("dragleave", function () { t.classList.remove("drag-over"); });
      t.addEventListener("drop", function (e) {
        e.preventDefault();
        t.classList.remove("drag-over");
        reorderPage(parseInt(e.dataTransfer.getData("text/plain"), 10), i);
      });

      thumbList.appendChild(t);
    });
  }

  function selectionOnly() {
    document.querySelectorAll(".thumb").forEach(function (el, idx) {
      el.classList.toggle("selected", idx === store.currentIndex);
    });
  }

  function addPage() {
    store.state.pages.push({
      id: store.uid(),
      title: "New Page",
      blocks: [
        { id: store.uid(), type: "heading", text: "New Page" },
        { id: store.uid(), type: "text", text: "Start writing here." }
      ],
      hotspots: []
    });
    store.currentIndex = store.state.pages.length - 1;
    store.save(true);
    global.FolioApp.render();
  }

  function duplicatePage(i) {
    var src = store.state.pages[i];
    var copy = JSON.parse(JSON.stringify(src));
    copy.id = store.uid();
    copy.title = src.title + " (copy)";
    (copy.blocks || []).forEach(function (bl) { bl.id = store.uid(); });
    (copy.hotspots || []).forEach(function (h) { h.id = store.uid(); });
    store.state.pages.splice(i + 1, 0, copy);
    store.currentIndex = i + 1;
    store.save(true);
    global.FolioApp.render();
    global.FolioToast.show("Page duplicated");
  }

  function deletePage(i) {
    if (store.state.pages.length <= 1) {
      global.FolioToast.show("A publication needs at least one page");
      return;
    }
    global.FolioUI.confirm(
      'Delete page "' + (store.state.pages[i].title || "Untitled") + '"? This cannot be undone.',
      function () { reallyDelete(i); }
    );
  }

  function reallyDelete(i) {
    var removed = store.state.pages.splice(i, 1)[0];
    if (store.currentIndex >= store.state.pages.length) {
      store.currentIndex = store.state.pages.length - 1;
    }
    store.save(true);
    global.FolioApp.render();
    global.FolioToast.show("Page deleted", "Undo", function () {
      store.state.pages.splice(i, 0, removed);
      store.currentIndex = i;
      store.save(true);
      global.FolioApp.render();
    });
  }

  function reorderPage(from, to) {
    if (isNaN(from) || from === to) return;
    var moved = store.state.pages.splice(from, 1)[0];
    store.state.pages.splice(to, 0, moved);
    store.currentIndex = to;
    store.save(true);
    global.FolioApp.render();
  }

  function initToolbar() {
    document.getElementById("btnAddPage").addEventListener("click", addPage);


    document.getElementById("btnSave").addEventListener("click", function () { store.save(false); });

    /* Publication meta */
    var titleInput = document.getElementById("pubTitle");
    titleInput.value = store.state.meta.title;
    titleInput.addEventListener("change", function () {
      store.state.meta.title = titleInput.value.trim() || "Untitled Publication";
      store.save(true); // save() also refreshes the library index entry
      global.FolioApp.render();
    });

    var themeSelect = document.getElementById("pubTheme");
    themeSelect.value = store.state.meta.pubtheme;
    themeSelect.addEventListener("change", function () {
      store.state.meta.pubtheme = themeSelect.value;
      store.save(true);
      global.FolioApp.applyPubTheme();
    });

    /* Export / Import */
    document.getElementById("btnExport").addEventListener("click", store.exportProject);
    var importInput = document.getElementById("importInput");
    document.getElementById("btnImport").addEventListener("click", function () { importInput.click(); });
    importInput.addEventListener("change", function (e) {
      var file = e.target.files[0];
      if (!file) return;
      store.importProject(file, function (ok) {
        if (ok) {
          store.currentIndex = 0;
          global.FolioApp.render();
          global.FolioApp.applyPubTheme();
          document.getElementById("pubTitle").value = store.state.meta.title;
          document.getElementById("pubTheme").value = store.state.meta.pubtheme;
        }
      });
      importInput.value = "";
    });
  }

  global.FolioEditor = {
    renderThumbs: renderThumbs,
    selectionOnly: selectionOnly,
    addPage: addPage,
    deletePage: deletePage,
    duplicatePage: duplicatePage,
    reorderPage: reorderPage,
    initToolbar: initToolbar
  };
})(window);
