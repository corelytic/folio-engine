/* ==========================================================================
   FOLIO ENGINE — Local Preview Check (zero server)
   Tracks: views, seconds per page, completion, hotspot clicks.
   Computes a 0–100 Engagement Score and exports a JSON report.
   Exposes: window.FolioAnalytics
   ========================================================================== */
(function (global) {
  "use strict";

  var store = global.FolioStore;
  var tickHandle = null;

  function currentPageId() {
    var p = store.state.pages[store.currentIndex];
    return p ? p.id : null;
  }

  function startTracking() {
    if (tickHandle) clearInterval(tickHandle);
    tickHandle = setInterval(tick, 1000);
  }

  /* A "session" = one entry into Reader preview. Author editing is never counted. */
  function startSession() {
    store.state.analytics.views += 1;
    persist();
    renderPanel();
  }

  function tick() {
    if (document.visibilityState !== "visible") return;
    if (!document.body.classList.contains("reader")) return; // only measure readers, not authors
    var gate = document.getElementById("gateOverlay");
    if (gate && gate.classList.contains("open")) return;      // never count time behind the access gate
    var id = currentPageId();
    if (!id) return;
    var a = store.state.analytics;
    a.pageSeconds[id] = (a.pageSeconds[id] || 0) + 1;
    if (store.currentIndex > a.maxIndexReached) a.maxIndexReached = store.currentIndex;
    // Analytics persist to their own key — never rewrites page/image data.
    if (a.pageSeconds[id] % 5 === 0) persist();
    renderPanel();
  }

  function recordHotspotClick() {
    if (!document.body.classList.contains("reader")) return; // author clicks don't count
    store.state.analytics.hotspotClicks += 1;
    persist();
    renderPanel();
  }

  function persist() {
    try {
      localStorage.setItem(store.analyticsKey(), JSON.stringify(store.state.analytics));
    } catch (e) { /* analytics loss is acceptable; never break the app */ }
  }

  function totalSeconds() {
    var a = store.state.analytics, sum = 0, k;
    for (k in a.pageSeconds) sum += a.pageSeconds[k];
    return sum;
  }

  function completion() {
    var a = store.state.analytics;
    if (a.views === 0 || a.maxIndexReached < 0) return 0;
    var n = store.state.pages.length;
    if (n < 1) return 0;
    return Math.min(1, (a.maxIndexReached + 1) / n);
  }

  /* Score = 40% completion + 40% dwell time + 20% interaction */
  function score() {
    var a = store.state.analytics;
    var pages = Math.max(1, store.state.pages.length);
    var avg = totalSeconds() / pages;
    var dwell = Math.min(1, avg / 15);          // 15s avg per page = full marks
    var inter = Math.min(1, a.hotspotClicks / 4); // 4 hotspot opens = full marks
    return Math.round(40 * completion() + 40 * dwell + 20 * inter);
  }

  function fmtTime(s) {
    var m = Math.floor(s / 60), r = s % 60;
    return (m > 0 ? m + "m " : "") + r + "s";
  }

  function renderPanel() {
    var sEl = document.getElementById("scoreVal");
    if (!sEl) return;
    var val = score();
    sEl.textContent = val;

    var circ = 2 * Math.PI * 36; // r=36
    var fill = document.getElementById("dialFill");
    fill.style.strokeDasharray = circ;
    fill.style.strokeDashoffset = circ * (1 - val / 100);

    document.getElementById("statViews").textContent = store.state.analytics.views;
    document.getElementById("statTime").textContent = fmtTime(totalSeconds());
    document.getElementById("statCompletion").textContent = Math.round(completion() * 100) + "%";
    document.getElementById("statHotspots").textContent = store.state.analytics.hotspotClicks;
  }

  function exportReport() {
    var a = store.state.analytics;
    var perPage = store.state.pages.map(function (p, i) {
      return {
        index: i + 1,
        title: p.title,
        seconds: a.pageSeconds[p.id] || 0,
        hotspots: p.hotspots.length
      };
    });
    var report = {
      publication: store.state.meta.title,
      generatedAt: new Date().toISOString(),
      engagementScore: score(),
      previewSessions: a.views,
      totalReadSeconds: totalSeconds(),
      completionRate: Math.round(completion() * 100) + "%",
      hotspotInteractions: a.hotspotClicks,
      pages: perPage
    };
    var blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "engagement-report.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    global.FolioToast.show("Engagement report downloaded");
  }

  function resetAnalytics() {
    store.state.analytics = { views: 0, pageSeconds: {}, maxIndexReached: -1, hotspotClicks: 0 };
    persist();
    renderPanel();
    global.FolioToast.show("Analytics reset");
  }

  global.FolioAnalytics = {
    startTracking: startTracking,
    startSession: startSession,
    recordHotspotClick: recordHotspotClick,
    renderPanel: renderPanel,
    exportReport: exportReport,
    resetAnalytics: resetAnalytics,
    score: score
  };
})(window);
