/* ==========================================================================
   FOLIO ENGINE — Book Mode (two-sided 3D leaves)
   Front face carries content + hotspots; back face is a real back side,
   which eliminates the mirrored-text artifact from v1.
   Exposes: window.FolioBook
   ========================================================================== */
(function (global) {
  "use strict";

  var store = global.FolioStore;

  function renderBook() {
    var bookEl = document.getElementById("book");
    var state = store.state;
    bookEl.innerHTML = "";

    state.pages.forEach(function (p, i) {
      var leaf = document.createElement("div");
      var flipped = i < store.currentIndex;
      leaf.className = "leaf" + (flipped ? " flipped" : "");
      leaf.style.zIndex = flipped ? i + 1 : state.pages.length - i;

      var front = document.createElement("div");
      front.className = "leaf-face leaf-front" + (p.layout === "cover" ? " layout-cover" : "");
      if (p.layout === "cover" && p.cover) {
        front.style.background = p.cover.treatment === "solid" ? p.cover.color1 :
          "linear-gradient(145deg," + p.cover.color1 + "," + p.cover.color2 + ")";
        front.style.color = "#ffffff";
        front.style.textAlign = p.cover.align || "center";
        front.style.justifyContent = p.cover.vertical || "center";
      }
      front.innerHTML =
        '<div class="leaf-eyebrow">' + store.escapeHtml(state.meta.title) + ' — ' +
        String(i + 1).padStart(2, "0") + ' / ' + String(state.pages.length).padStart(2, "0") + '</div>' +
        '';
      global.FolioBlocks.renderAll(front, p);

      var back = document.createElement("div");
      back.className = "leaf-face leaf-back";
      back.innerHTML = '<div class="back-num">FOLIO · ' + String(i + 1).padStart(2, "0") + '</div>';

      leaf.appendChild(front);
      leaf.appendChild(back);

      global.FolioHotspots.renderInto(front, p);

      leaf.addEventListener("click", function (e) {
        if (global.FolioHotspots.isPlacing()) return;      // placement handled at stage level
        if (e.target.isContentEditable) return;             // editing a block
        if (e.target.closest(".hotspot") || e.target.closest(".hotspot-pop")) return;
        if (e.target.closest(".blk-img-ph") || e.target.closest(".blk-btn")) return;
        if (i === store.currentIndex) nextPage();
        else if (flipped) { store.currentIndex = i; refresh(); }
      });

      bookEl.appendChild(leaf);
    });
  }

  function refresh() {
    renderBook();
    global.FolioApp.syncInspector();
    global.FolioEditor.selectionOnly();
    global.FolioHotspots.renderList();
    global.FolioHotspots.closePopover();
  }

  function nextPage() {
    if (store.currentIndex < store.state.pages.length - 1) {
      store.currentIndex++;
      refresh();
    }
  }

  function prevPage() {
    if (store.currentIndex > 0) {
      store.currentIndex--;
      refresh();
    }
  }

  global.FolioBook = { render: renderBook, nextPage: nextPage, prevPage: prevPage };
})(window);
