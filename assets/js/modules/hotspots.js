/* ==========================================================================
   FOLIO ENGINE — Interactive Hotspots
   Place annotation dots on any page (% coordinates → works in both modes).
   Exposes: window.FolioHotspots
   ========================================================================== */
(function (global) {
  "use strict";

  var store = global.FolioStore;
  var placing = false;
  var openPop = null;
  var editIndex = null;

  /* ---------- Render dots inside a page container ---------- */
  function renderInto(container, page) {
    page.hotspots.forEach(function (hs, hi) {
      if (hs.enabled === false) return;
      var dot = document.createElement("button");
      dot.className = "hotspot";
      dot.type = "button";
      dot.title = hs.label;
      dot.style.left = hs.x + "%";
      dot.style.top = hs.y + "%";
      dot.addEventListener("click", function (e) {
        e.stopPropagation();
        if (dot.dataset.dragged === "1") { dot.dataset.dragged = ""; return; }
        togglePopover(container, hs, hi);
        global.FolioAnalytics.recordHotspotClick();
      });
      if (!document.body.classList.contains("reader")) {
        dot.style.touchAction = "none";
        dot.addEventListener("pointerdown", function (pd) {
          pd.preventDefault();
          var rect = container.getBoundingClientRect();
          var moved = false;
          function onMove(pm) {
            moved = true;
            hs.x = Math.max(2, Math.min(98, Math.round(((pm.clientX - rect.left) / rect.width) * 100)));
            hs.y = Math.max(2, Math.min(98, Math.round(((pm.clientY - rect.top) / rect.height) * 100)));
            dot.style.left = hs.x + "%";
            dot.style.top = hs.y + "%";
          }
          function onUp() {
            document.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerup", onUp);
            if (moved) {
              dot.dataset.dragged = "1";
              store.save(true);
              global.FolioHotspots.renderList();
            }
          }
          document.addEventListener("pointermove", onMove);
          document.addEventListener("pointerup", onUp);
        });
      }
      container.appendChild(dot);
    });
  }

  function togglePopover(container, hs) {
    closePopover();
    var pop = document.createElement("div");
    pop.className = "hotspot-pop";
    pop.style.left = hs.x + "%";
    pop.style.top = hs.y + "%";
    pop.innerHTML =
      "<h4>" + store.escapeHtml(hs.label) + "</h4>" +
      "<p>" + store.escapeHtml(hs.text) + "</p>";
    container.appendChild(pop);
    openPop = pop;
  }

  function closePopover() {
    if (openPop && openPop.parentNode) openPop.parentNode.removeChild(openPop);
    openPop = null;
  }

  /* ---------- Placement mode ---------- */
  function togglePlacing() {
    placing = !placing;
    document.getElementById("stage").classList.toggle("placing", placing);
    document.getElementById("btnAddHotspot").textContent = placing ? "Click page to place…" : "+ Add Hotspot";
    if (placing) global.FolioToast.show("Placement mode: click anywhere on the page");
  }

  function handleStageClick(e, containerSelector) {
    if (!placing) return false;
    var container = e.target.closest(containerSelector);
    if (!container) return false;

    var rect = container.getBoundingClientRect();
    var x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    var y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    x = Math.max(2, Math.min(98, x));
    y = Math.max(2, Math.min(98, y));

    openHotspotModal(x, y);
    togglePlacing();
    return true;
  }

  /* ---------- Create/edit modal ---------- */
  function openHotspotModal(x, y, idx) {
    editIndex = (typeof idx === "number") ? idx : null;
    var page = store.state.pages[store.currentIndex];
    var hs = editIndex !== null ? page.hotspots[editIndex] : null;
    document.getElementById("hsX").value = hs ? hs.x : x;
    document.getElementById("hsY").value = hs ? hs.y : y;
    document.getElementById("hsLabel").value = hs ? hs.label : "";
    document.getElementById("hsText").value = hs ? hs.text : "";
    document.getElementById("btnHsSave").textContent = hs ? "Save Changes" : "Add Hotspot";
    document.getElementById("hsModalBackdrop").classList.add("open");
    document.getElementById("hsLabel").focus();
  }

  function clampPct(v) {
    v = parseInt(v, 10);
    if (isNaN(v)) v = 50;
    return Math.max(2, Math.min(98, v));
  }

  function saveFromModal() {
    var label = document.getElementById("hsLabel").value.trim();
    var text = document.getElementById("hsText").value.trim();
    if (!label) { global.FolioToast.show("Hotspot needs a label"); return; }
    var page = store.state.pages[store.currentIndex];
    var data = {
      id: (editIndex !== null && page.hotspots[editIndex].id) || store.uid(),
      x: clampPct(document.getElementById("hsX").value),
      y: clampPct(document.getElementById("hsY").value),
      label: label,
      text: text || label
    };
    if (editIndex !== null) {
      page.hotspots[editIndex] = data;
    } else {
      page.hotspots.push(data);
    }
    store.save(true);
    document.getElementById("hsModalBackdrop").classList.remove("open");
    global.FolioApp.render();
    global.FolioToast.show(editIndex !== null ? "Hotspot updated" : "Hotspot added");
    editIndex = null;
  }

  function deleteHotspot(pageIndex, hsIndex) {
    var removed = store.state.pages[pageIndex].hotspots.splice(hsIndex, 1)[0];
    store.save(true);
    global.FolioApp.render();
    global.FolioToast.show("Hotspot deleted", "Undo", function () {
      store.state.pages[pageIndex].hotspots.splice(hsIndex, 0, removed);
      store.save(true);
      global.FolioApp.render();
    });
  }

  /* ---------- Inspector list ---------- */
  function renderList() {
    var wrap = document.getElementById("hotspotList");
    var page = store.state.pages[store.currentIndex];
    wrap.innerHTML = "";
    if (!page.hotspots.length) {
      wrap.innerHTML = '<div class="hint">No hotspots on this page yet.</div>';
      return;
    }
    page.hotspots.forEach(function (hs, hi) {
      var row = document.createElement("div");
      row.className = "hs-item";
      row.innerHTML = "<span title=\"Click to edit\">📍 " + store.escapeHtml(hs.label) + "</span>";
      row.querySelector("span").style.cursor = "pointer";
      row.querySelector("span").addEventListener("click", function () {
        openHotspotModal(hs.x, hs.y, hi);
      });
      var del = document.createElement("button");
      del.className = "icon-btn del";
      del.textContent = "×";
      del.title = "Delete hotspot";
      del.addEventListener("click", function () { deleteHotspot(store.currentIndex, hi); });
      row.appendChild(del);
      wrap.appendChild(row);
    });
  }

  function init() {
    document.getElementById("btnAddHotspot").addEventListener("click", togglePlacing);
    document.getElementById("btnHsSave").addEventListener("click", saveFromModal);
    document.getElementById("btnHsCancel").addEventListener("click", function () {
      document.getElementById("hsModalBackdrop").classList.remove("open");
      editIndex = null;
    });
    document.getElementById("hsModalBackdrop").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) { e.currentTarget.classList.remove("open"); editIndex = null; }
    });
    document.addEventListener("click", function (e) {
      if (openPop && !e.target.closest(".hotspot") && !e.target.closest(".hotspot-pop")) closePopover();
    });
  }

  global.FolioHotspots = {
    renderInto: renderInto,
    renderList: renderList,
    handleStageClick: handleStageClick,
    closePopover: closePopover,
    isPlacing: function () { return placing; },
    init: init
  };
})(window);
