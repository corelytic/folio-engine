/* ==========================================================================
   FOLIO ENGINE — Story Mode (vertical scroll-snap)
   Exposes: window.FolioStory
   ========================================================================== */
(function (global) {
  "use strict";

  var store = global.FolioStore;

  function renderStory() {
    var storyEl = document.getElementById("story");
    var state = store.state;
    storyEl.innerHTML = "";

    state.pages.forEach(function (p, i) {
      var slide = document.createElement("div");
      slide.className = "slide" + (p.layout === "cover" ? " layout-cover" : "");
      if (p.layout === "cover" && p.cover) {
        slide.style.background = p.cover.treatment === "solid" ? p.cover.color1 :
          "linear-gradient(145deg," + p.cover.color1 + "," + p.cover.color2 + ")";
        slide.style.color = "#ffffff";
        slide.style.textAlign = p.cover.align || "center";
        slide.style.justifyContent = p.cover.vertical || "center";
      }

      var dots = state.pages.map(function (_, di) {
        return '<span class="' + (di <= i ? "done" : "") + '"></span>';
      }).join("");

      slide.innerHTML =
        '<div class="slide-progress">' + dots + '</div>' +
        
        '<div class="slide-eyebrow">' + store.escapeHtml(state.meta.title) + ' · ' + (i + 1) + '/' + state.pages.length + '</div>';

      global.FolioBlocks.renderAll(slide, p);
      global.FolioHotspots.renderInto(slide, p);

      storyEl.appendChild(slide);
    });

    storyEl.onscroll = function () {
      var idx = Math.round(storyEl.scrollTop / storyEl.clientHeight);
      if (idx !== store.currentIndex && idx >= 0 && idx < state.pages.length) {
        store.currentIndex = idx;
        global.FolioApp.syncInspector();
        global.FolioEditor.selectionOnly();
        global.FolioHotspots.renderList();
      }
    };
  }

  global.FolioStory = { render: renderStory };
})(window);
