/* ==========================================================================
   FOLIO ENGINE — Publication Assistant (rule-based, offline, no AI)
   Analyzes the current publication and produces actionable suggestions.
   Exposes: window.FolioAssistant
   ========================================================================== */
(function (global) {
  "use strict";

  var store = global.FolioStore;

  /* Each rule returns an array of {level:'warn'|'tip', text, pageIndex?} */
  function analyze() {
    var s = store.state;
    var out = [];
    if (!s.meta.title || /^untitled/i.test(s.meta.title)) {
      out.push({ level: "warn", text: "Publication title is missing or generic. Why it matters: titles drive navigation and export metadata. Fix: open Brand → Publication title and add the final name." });
    }
    if (!s.meta.desc) {
      out.push({ level: "tip", text: "Export description is missing. Why it matters: shared and hosted files need useful metadata. Fix: add a concise description in Publish before export." });
    }

    // Publication-level
    if (!s.exportHistory) {
      out.push({ level: "tip", text: "This publication has never been published — use Publish to generate a shareable file when you're ready." });
    } else if (s.updatedAt > s.exportHistory.revision) {
      out.push({ level: "warn", text: "Content has changed since the last export — recipients of the old file won't see your edits. Re-publish when done." });
    }
    var br = s.meta.brand || {};
    if (!br.accent && !br.headingFont && !br.bodyFont) {
      out.push({ level: "tip", text: "No brand customization applied — set an accent color or fonts in the Publication panel to make this unmistakably yours." });
    }
    if (!s.pages.some(function (p) { return p.layout === "cover"; })) {
      out.push({ level: "tip", text: "No cover page — mark your first page as a cover (Selected Page → Cover layout) for a stronger opening." });
    }
    var first = s.pages[0];
    if (first && first.layout === "cover" && (first.blocks || []).length < 2) {
      out.push({ level: "warn", text: "The cover is visually weak. Why it matters: readers judge the publication before page two. Fix: add a subtitle, highlight or CTA to page 1.", pageIndex: 0 });
    }
    var hasCTA = s.pages.some(function (p) {
      return (p.blocks || []).some(function (b) { return b.type === "button" || b.type === "cta"; });
    });
    if (!hasCTA) {
      out.push({ level: "tip", text: "No call-to-action anywhere — add a Button block so readers know what to do next (book, buy, contact)." });
    }
    var hasContact = s.pages.some(function (p) {
      return (p.blocks || []).some(function (b) { return b.type === "contact" || /contact|enquir|book|order/i.test((b.label || "") + " " + (b.text || "")); });
    });
    if (!hasContact) out.push({ level: "tip", text: "No contact information found. Why it matters: interested readers need a credible next step. Fix: add a Contact Info block to the final page." });
    if (s.pages.length >= 8 && !s.pages.some(function (p) { return (p.blocks || []).some(function (b) { return b.type === "toc"; }); })) {
      out.push({ level: "tip", text: "This longer publication has no table of contents. Why it matters: eight or more pages are harder to scan. Fix: insert a Table of Contents block near the beginning." });
    }
    var totalImages = 0;

    // Page-level
    var titles = {};
    s.pages.forEach(function (p, i) {
      var n = "Page " + (i + 1) + (p.title ? ' ("' + p.title + '")' : "");
      var blocks = p.blocks || [];
      if (!p.title || /^untitled$/i.test(p.title)) out.push({ level: "warn", text: n + " has no meaningful navigation title. Fix: set Selected Page → Navigation title.", pageIndex: i });
      if (!blocks.length) out.push({ level: "warn", text: n + " is empty. Why it matters: blank pages break reading flow. Fix: add a Page Intro or remove the page.", pageIndex: i });
      if (titles[p.title]) out.push({ level: "warn", text: "Duplicate page title — " + n + " shares its name with another page, which confuses navigation.", pageIndex: i });
      titles[p.title] = true;
      if (blocks.length > 8) out.push({ level: "warn", text: n + " has " + blocks.length + " blocks — long pages read poorly in Book mode. Consider splitting it.", pageIndex: i });
      if (blocks.length === 1 && s.pages.length > 1 && p.layout !== "cover") {
        out.push({ level: "tip", text: n + " has a single block — thin pages feel unfinished. Add supporting content or merge it.", pageIndex: i });
      }
      var pageWords = 0;
      blocks.forEach(function (b) {
        if (b.type === "image" && (b.assetId || b.src)) totalImages++;
        if (b.type === "image" && (b.assetId || b.src) && !b.alt) {
          out.push({ level: "warn", text: n + ": image is missing alt text — add it in the block settings for accessibility.", pageIndex: i });
        }
        if ((b.type === "button" || b.type === "cta") && (!b.url || b.url === "#contact" || b.url === "#" || /example\.com/.test(b.url))) {
          out.push({ level: "warn", text: n + ': action link is still a demonstration destination. Why it matters: the reader cannot complete the intended action. Fix: select the block and enter a verified https, mailto or tel URL.', pageIndex: i });
        }
        if ((b.type === "button" || b.type === "cta") && /^(javascript:|data:|vbscript:)/i.test(b.url || "")) {
          out.push({ level: "warn", text: n + ": unsafe action URL was detected. Fix: replace it with https, mailto or tel before export.", pageIndex: i });
        }
        if (b.text) pageWords += String(b.text).trim().split(/\s+/).filter(Boolean).length;
        if (b.text && /Your title here|Start writing|Untitled publication/.test(b.text)) {
          out.push({ level: "warn", text: n + ": placeholder text is still in the content.", pageIndex: i });
        }
      });
      if (pageWords > 160) {
        out.push({ level: "tip", text: n + " is text-heavy (~" + pageWords + " words) — an image, stats row, or checklist would improve visual balance.", pageIndex: i });
      }
    });

    if (totalImages === 0 && s.pages.length > 1) {
      out.push({ level: "tip", text: "The publication has no images — visual publications convert far better. Add at least one Image block." });
    }
    if (store.storageUsage() > 3.5 * 1024 * 1024) {
      out.push({ level: "warn", text: "Browser storage is filling up — export a JSON backup now (File → Export backup) to protect your work." });
    }
    if (s.settings.password) {
      out.push({ level: "tip", text: "Access Prompt is enabled — remember it's casual deterrence only, and recipients will need the password." });
    }

    return out;
  }

  function render() {
    var list = document.getElementById("assistantList");
    var items = analyze();
    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = '<div class="pf-item ok">✓ Nothing to flag — this publication looks ready. Run Publish for the final preflight.</div>';
      return;
    }
    items.forEach(function (it) {
      var row = document.createElement("div");
      row.className = "pf-item " + (it.level === "warn" ? "warn" : "");
      row.textContent = (it.level === "warn" ? "! " : "✦ ") + it.text;
      if (typeof it.pageIndex === "number") {
        var go = document.createElement("button");
        go.className = "btn sm ghost";
        go.textContent = "Go";
        go.setAttribute("aria-label", "Go to page " + (it.pageIndex + 1));
        go.style.marginLeft = "auto";
        go.addEventListener("click", function () {
          store.currentIndex = it.pageIndex;
          document.getElementById("assistantBackdrop").classList.remove("open");
          global.FolioApp.render();
        });
        row.appendChild(go);
      }
      list.appendChild(row);
    });
  }

  function open() {
    render();
    document.getElementById("assistantBackdrop").classList.add("open");
  }

  function init() {
    document.getElementById("btnAssistant").addEventListener("click", open);
    document.getElementById("btnAssistantClose").addEventListener("click", function () {
      document.getElementById("assistantBackdrop").classList.remove("open");
    });
    document.getElementById("assistantBackdrop").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) e.currentTarget.classList.remove("open");
    });
  }

  global.FolioAssistant = { init: init, open: open, analyze: analyze };
})(window);
