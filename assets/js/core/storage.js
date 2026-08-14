/* ==========================================================================
   FOLIO ENGINE — Storage v3 (multi-project, versioned schema)
   Keys:
     folio_pro_index_v3   → [{id,title,pages,mode,theme,updatedAt,createdAt}]
     folio_project_<id>   → full project record
     folio_analytics_<id> → analytics for that project
     folio_pro_active_v3  → id of last active project
   Exposes: window.FolioStore
   ========================================================================== */
(function (global) {
  "use strict";

  var SCHEMA_VERSION = 3;
  var PRODUCT_VERSION = "2.0.1";
  var runtime = global.FolioRuntimeConfig || {};
  var demoMode = runtime.mode === "demo";
  var INDEX_KEY = demoMode ? "folio_engine_demo_index_v3" : "folio_pro_index_v3";
  var ACTIVE_KEY = demoMode ? "folio_engine_demo_active_v3" : "folio_pro_active_v3";
  var LEGACY_KEY = demoMode ? "folio_engine_demo_legacy_project_v2" : "folio_pro_project_v2";
  var LEGACY_AN = demoMode ? "folio_engine_demo_legacy_analytics_v2" : "folio_pro_analytics_v2";
  var PROJECT_PREFIX = demoMode ? "folio_engine_demo_project_" : "folio_project_";
  var ANALYTICS_PREFIX = demoMode ? "folio_engine_demo_analytics_" : "folio_analytics_";
  var STORAGE_PREFIX = demoMode ? "folio_engine_demo_" : "folio";

  function uid() {
    return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function nowIso() { return new Date().toISOString(); }

  function encodePassword(value) {
    return btoa(unescape(encodeURIComponent(String(value || ""))));
  }

  function text(value, fallback, max) {
    var out = value == null ? (fallback || "") : String(value);
    return out.slice(0, max || 100000);
  }

  function validateImportedTree(value, depth, budget) {
    depth = depth || 0;
    budget = budget || { nodes: 0, keys: 0 };
    budget.nodes += 1;
    if (budget.nodes > 100000) return false;
    if (depth > 24) return false;
    if (typeof value === "string") return value.length <= 20 * 1024 * 1024;
    if (value == null || typeof value !== "object") return true;
    if (Array.isArray(value)) {
      if (value.length > 10000) return false;
      for (var i = 0; i < value.length; i++) {
        if (!validateImportedTree(value[i], depth + 1, budget)) return false;
      }
      return true;
    }
    var keys = Object.keys(value);
    budget.keys += keys.length;
    if (keys.length > 1000 || budget.keys > 100000) return false;
    for (var k = 0; k < keys.length; k++) {
      if (keys[k] === "__proto__" || keys[k] === "prototype" || keys[k] === "constructor") return false;
      if (!validateImportedTree(value[keys[k]], depth + 1, budget)) return false;
    }
    return true;
  }

  function safeAssign(defaults, incoming) {
    var out = Object.assign({}, defaults);
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) return out;
    Object.keys(incoming).forEach(function (key) {
      if (key !== "__proto__" && key !== "prototype" && key !== "constructor") out[key] = incoming[key];
    });
    return out;
  }

  function safeFilename(value, fallback) {
    var name = String(value || fallback || "folio-project").trim().toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
    return (name || fallback || "folio-project").slice(0, 120);
  }

  function escapeHtml(str) {
    var d = document.createElement("div");
    d.textContent = str == null ? "" : String(str);
    return d.innerHTML;
  }

  /* ---------- safe LocalStorage wrappers ---------- */
  var storageOk = true;
  function lsGet(k) {
    try { return localStorage.getItem(k); } catch (e) { storageOk = false; return null; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, v); return true; }
    catch (e) { return false; }
  }
  function lsDel(k) {
    try { localStorage.removeItem(k); } catch (e) { /* noop */ }
  }

  function storageUsage() {
    var total = 0;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(STORAGE_PREFIX) === 0) total += (localStorage.getItem(k) || "").length + k.length;
      }
    } catch (e) { /* unavailable */ }
    return total;
  }

  /* ---------- schema ---------- */
  function baseProject(title, theme) {
    return {
      schemaVersion: SCHEMA_VERSION,
      id: uid(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      meta: { title: title || "Untitled Publication", author: "", pubtheme: theme || "ivory",
              info: { brandName: title || "", subtitle: "", email: "", phone: "", website: "", address: "", cta: "Contact us" },
              brand: { accent: "", page: "", viewer: "", text: "", muted: "", headingFont: "", bodyFont: "", radius: "", scale: "1", density: "1" } },
      settings: { mode: "book", password: "", passwordEncoded: true, watermark: false, watermarkText: "CONFIDENTIAL" },
      pages: [],
      analytics: { views: 0, pageSeconds: {}, maxIndexReached: -1, hotspotClicks: 0 }
    };
  }

  var ALLOWED_BLOCKS = ["heading", "text", "image", "price", "quote", "divider", "button", "cols", "stats", "list",
    "hero", "intro", "highlight", "testimonial", "product", "features", "comparison", "toc", "contact", "cta", "visual", "gallery"];

  function normalizeBlock(block) {
    var b = { id: block.id || uid(), type: block.type };
    if (b.type === "heading") {
      b.text = text(block.text, "Heading");
      b.size = ["s", "m", "l"].indexOf(block.size) !== -1 ? block.size : "m";
      b.align = ["left", "center", "right"].indexOf(block.align) !== -1 ? block.align : "left";
    } else if (b.type === "text") {
      b.text = text(block.text, "");
      b.align = ["left", "center", "right"].indexOf(block.align) !== -1 ? block.align : "left";
    } else if (b.type === "image") {
      b.src = /^data:image\/(jpeg|png|webp|gif);base64,/i.test(block.src || "") && block.src.length <= 5 * 1024 * 1024 ? block.src : "";
      b.assetId = /^[a-z0-9_-]{4,120}$/i.test(block.assetId || "") ? block.assetId : "";
      b.alt = text(block.alt, "", 1000);
      b.caption = text(block.caption, "", 2000);
      b.fit = ["cover", "contain"].indexOf(block.fit) !== -1 ? block.fit : "cover";
      b.focalX = Math.max(0, Math.min(100, Number(block.focalX == null ? 50 : block.focalX) || 0));
      b.focalY = Math.max(0, Math.min(100, Number(block.focalY == null ? 50 : block.focalY) || 0));
    } else if (b.type === "price") {
      b.item = text(block.item, "Item"); b.desc = text(block.desc, ""); b.price = text(block.price, "");
    } else if (b.type === "quote") {
      b.text = text(block.text, ""); b.cite = text(block.cite, "");
    } else if (b.type === "button") {
      b.label = text(block.label, "Button", 1000); b.url = text(block.url, "#", 4000);
      b.align = ["left", "center", "right"].indexOf(block.align) !== -1 ? block.align : "left";
      b.newTab = block.newTab !== false;
    } else if (b.type === "cols") {
      b.left = text(block.left, ""); b.right = text(block.right, "");
      b.ratio = ["1-1", "2-1", "1-2"].indexOf(block.ratio) !== -1 ? block.ratio : "1-1";
    } else if (b.type === "stats") {
      b.items = (Array.isArray(block.items) ? block.items : []).slice(0, 6).map(function (item) {
        item = item && typeof item === "object" ? item : {};
        return { v: text(item.v, "", 1000), l: text(item.l, "", 1000) };
      });
      if (!b.items.length) b.items = [{ v: "—", l: "Stat" }];
    } else if (b.type === "list") {
      b.items = (Array.isArray(block.items) ? block.items : []).slice(0, 50).map(function (item) { return text(item, ""); });
      if (!b.items.length) b.items = ["List item"];
    } else if (["hero", "highlight", "contact"].indexOf(b.type) !== -1) {
      b.title = text(block.title, "Title", 1000); b.text = text(block.text, "", 10000);
    } else if (b.type === "intro") {
      b.eyebrow = text(block.eyebrow, "SECTION", 200); b.title = text(block.title, "Page introduction", 1000); b.text = text(block.text, "", 10000);
    } else if (b.type === "testimonial") {
      b.text = text(block.text, "", 10000); b.cite = text(block.cite, "", 1000); b.role = text(block.role, "", 1000);
    } else if (b.type === "product") {
      b.title = text(block.title, "Product", 1000); b.text = text(block.text, "", 10000); b.price = text(block.price, "", 200);
    } else if (b.type === "features") {
      b.items = (Array.isArray(block.items) ? block.items : []).slice(0, 6).map(function (item) {
        item = item && typeof item === "object" ? item : {};
        return { v: text(item.v, "", 1000), l: text(item.l, "", 1000) };
      });
      if (!b.items.length) b.items = [{ v: "01", l: "Feature" }];
    } else if (b.type === "comparison") {
      b.title = text(block.title, "Compare options", 1000); b.left = text(block.left, "", 10000); b.right = text(block.right, "", 10000);
    } else if (b.type === "toc") {
      b.title = text(block.title, "Contents", 1000);
    } else if (b.type === "cta") {
      b.title = text(block.title, "Next step", 1000); b.text = text(block.text, "", 10000);
      b.label = text(block.label, "Contact us", 1000); b.url = text(block.url, "#contact", 4000);
    } else if (b.type === "visual") {
      b.title = text(block.title, "Visual story", 1000); b.text = text(block.text, "", 4000);
      b.tone = text(block.tone, "indigo", 40).replace(/[^a-z0-9_-]/gi, "");
    } else if (b.type === "gallery") {
      b.items = (Array.isArray(block.items) ? block.items : []).slice(0, 6).map(function (item) {
        item = item && typeof item === "object" ? item : {};
        return { title: text(item.title, "Gallery item", 500), text: text(item.text, "", 1000), tone: text(item.tone, "indigo", 40).replace(/[^a-z0-9_-]/gi, "") };
      });
      if (!b.items.length) b.items = [{ title: "Gallery item", text: "", tone: "indigo" }];
    }
    if (block.bindings && typeof block.bindings === "object" && !Array.isArray(block.bindings)) {
      var allowedBindingFields = ["text", "title", "label", "url", "cite", "role", "item", "desc"];
      var allowedInfoKeys = ["brandName", "subtitle", "email", "phone", "website", "address", "cta", "contactText"];
      b.bindings = {};
      allowedBindingFields.forEach(function (field) {
        if (allowedInfoKeys.indexOf(block.bindings[field]) !== -1) b.bindings[field] = block.bindings[field];
      });
      if (!Object.keys(b.bindings).length) delete b.bindings;
    }
    b.variant = text(block.variant, "", 60).replace(/[^a-z0-9_-]/gi, "");
    return b;
  }

  function migrate(s) {
    if (!s || typeof s !== "object" || Array.isArray(s)) s = baseProject();
    ["__proto__", "prototype", "constructor"].forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(s, key)) delete s[key];
    });
    var d = baseProject();
    var seenIds = Object.create(null);
    function uniqueId(value) {
      var id = /^[a-z0-9_-]{1,120}$/i.test(String(value || "")) ? String(value) : uid();
      while (seenIds[id]) id = uid();
      seenIds[id] = true;
      return id;
    }
    s.schemaVersion = SCHEMA_VERSION;
    s.id = uniqueId(s.id);
    if (!s.createdAt) s.createdAt = nowIso();
    if (!s.updatedAt) s.updatedAt = nowIso();
    var incomingMeta = s.meta && typeof s.meta === "object" && !Array.isArray(s.meta) ? s.meta : {};
    s.meta = safeAssign(d.meta, incomingMeta);
    s.meta.title = text(s.meta.title, "Untitled Publication", 500);
    s.meta.author = text(s.meta.author, "", 500);
    s.meta.desc = text(s.meta.desc, "", 2000);
    s.meta.pubtheme = ["ivory", "noir", "azure"].indexOf(s.meta.pubtheme) !== -1 ? s.meta.pubtheme : "ivory";
    var incomingInfo = incomingMeta.info && typeof incomingMeta.info === "object" && !Array.isArray(incomingMeta.info) ? incomingMeta.info : {};
    s.meta.info = safeAssign(d.meta.info, incomingInfo);
    ["brandName", "subtitle", "email", "phone", "website", "address", "cta"].forEach(function (key) {
      s.meta.info[key] = text(s.meta.info[key], "", key === "address" ? 1000 : 500);
    });
    var incomingBrand = incomingMeta.brand && typeof incomingMeta.brand === "object" && !Array.isArray(incomingMeta.brand) ? incomingMeta.brand : {};
    s.meta.brand = safeAssign(d.meta.brand, incomingBrand);
    var allowedFonts = ["", "Georgia, 'Times New Roman', serif", "'Segoe UI', Arial, sans-serif", "'Courier New', monospace"];
    s.meta.brand.accent = /^#[0-9a-f]{6}$/i.test(s.meta.brand.accent || "") ? s.meta.brand.accent : "";
    ["page", "viewer", "text", "muted"].forEach(function (key) {
      s.meta.brand[key] = /^#[0-9a-f]{6}$/i.test(s.meta.brand[key] || "") ? s.meta.brand[key] : "";
    });
    s.meta.brand.headingFont = allowedFonts.indexOf(s.meta.brand.headingFont) !== -1 ? s.meta.brand.headingFont : "";
    s.meta.brand.bodyFont = allowedFonts.indexOf(s.meta.brand.bodyFont) !== -1 ? s.meta.brand.bodyFont : "";
    s.meta.brand.radius = ["", "0px", "14px", "24px"].indexOf(s.meta.brand.radius) !== -1 ? s.meta.brand.radius : "";
    s.meta.brand.scale = ["0.9", "1", "1.1"].indexOf(String(s.meta.brand.scale)) !== -1 ? String(s.meta.brand.scale) : "1";
    s.meta.brand.density = ["0.82", "1", "1.16"].indexOf(String(s.meta.brand.density)) !== -1 ? String(s.meta.brand.density) : "1";
    var hadEncodedFlag = !!(s.settings && s.settings.passwordEncoded === true);
    var incomingSettings = s.settings && typeof s.settings === "object" && !Array.isArray(s.settings) ? s.settings : {};
    s.settings = safeAssign(d.settings, incomingSettings);
    s.settings.mode = s.settings.mode === "story" ? "story" : "book";
    s.settings.watermark = !!s.settings.watermark;
    s.settings.watermarkText = text(s.settings.watermarkText, "CONFIDENTIAL", 500);
    s.settings.passwordEncoded = hadEncodedFlag;
    var incomingAnalytics = s.analytics && typeof s.analytics === "object" && !Array.isArray(s.analytics) ? s.analytics : {};
    s.analytics = safeAssign(d.analytics, incomingAnalytics);
    if (s.analytics.views === 0) s.analytics.maxIndexReached = -1;
    if (s.settings.password && !s.settings.passwordEncoded) {
      s.settings.password = encodePassword(s.settings.password);
    }
    s.settings.passwordEncoded = true; // from here on, stored passwords are always encoded
    if (!Array.isArray(s.pages)) s.pages = [];
    s.pages = s.pages.slice(0, 250).filter(function (page) {
      return page && typeof page === "object" && !Array.isArray(page);
    });
    s.pages.forEach(function (p) {
      p.id = uniqueId(p.id);
      p.title = text(p.title, "Untitled", 500);
      if (p.cover && typeof p.cover === "object" && !Array.isArray(p.cover)) {
        p.cover.preset = ["editorial", "left", "minimal"].indexOf(p.cover.preset) !== -1 ? p.cover.preset : "editorial";
        p.cover.treatment = p.cover.treatment === "solid" ? "solid" : "gradient";
        p.cover.color1 = /^#[0-9a-f]{6}$/i.test(p.cover.color1 || "") ? p.cover.color1 : "#4338ca";
        p.cover.color2 = /^#[0-9a-f]{6}$/i.test(p.cover.color2 || "") ? p.cover.color2 : "#111827";
        p.cover.align = ["left", "center", "right"].indexOf(p.cover.align) !== -1 ? p.cover.align : "center";
        p.cover.vertical = ["start", "center", "end"].indexOf(p.cover.vertical) !== -1 ? p.cover.vertical : "center";
      }
      if (!Array.isArray(p.hotspots)) p.hotspots = [];
      p.hotspots = p.hotspots.slice(0, 100).filter(function (hotspot) {
        return hotspot && typeof hotspot === "object" && !Array.isArray(hotspot);
      });
      p.hotspots.forEach(function (h) {
        h.id = uniqueId(h.id);
        h.x = Math.max(2, Math.min(98, parseInt(h.x, 10) || 50));
        h.y = Math.max(2, Math.min(98, parseInt(h.y, 10) || 50));
        h.label = text(h.label, "Note", 500);
        h.text = text(h.text, h.label, 4000);
        if (h.enabled === undefined) h.enabled = true;
      });
      if (!Array.isArray(p.blocks)) {
        p.blocks = [];
        if (p.body) p.blocks.push({ id: uid(), type: "text", text: String(p.body) });
        delete p.body;
      }
      p.blocks = p.blocks.slice(0, 100);
      if (p.image) {
        p.blocks.unshift({ id: uid(), type: "image", src: p.image });
        delete p.image;
      }
      p.blocks = p.blocks.filter(function (b) {
        return b && ALLOWED_BLOCKS.indexOf(b.type) !== -1;
      }).map(normalizeBlock).map(function (block) {
        block.id = uniqueId(block.id);
        return block;
      });
    });
    if (!s.pages.length) {
      s.pages.push({
        id: uid(), title: "Page 1",
        blocks: [{ id: uid(), type: "heading", text: "Untitled publication" },
          { id: uid(), type: "text", text: "Add blocks from the inspector to shape your first page." }],
        hotspots: []
      });
    }
    return s;
  }

  /* ---------- project index ---------- */
  function readIndex() {
    try {
      var raw = lsGet(INDEX_KEY);
      var idx = raw ? JSON.parse(raw) : [];
      return Array.isArray(idx) ? idx : [];
    } catch (e) { return []; }
  }

  function writeIndex(idx) { lsSet(INDEX_KEY, JSON.stringify(idx)); }

  function countContent(proj) {
    var words = 0, images = 0;
    proj.pages.forEach(function (p) {
      (p.blocks || []).forEach(function (b) {
        ["text", "item", "desc", "left", "right", "label", "cite"].forEach(function (k) {
          if (b[k]) words += String(b[k]).trim().split(/\s+/).filter(Boolean).length;
        });
        if (b.items) b.items.forEach(function (it) {
          var t = typeof it === "string" ? it : (it.v + " " + it.l);
          words += t.trim().split(/\s+/).filter(Boolean).length;
        });
        if (b.type === "image" && (b.assetId || b.src)) images++;
      });
    });
    return { words: words, images: images };
  }

  function indexEntry(proj) {
    var c = countContent(proj);
    var cover = proj.pages && proj.pages[0] ? proj.pages[0] : {};
    var coverHeading = "", coverText = "";
    (cover.blocks || []).some(function (b) {
      if (!coverHeading && b.type === "heading") coverHeading = text(b.text, "", 120);
      if (!coverText && b.type === "text") coverText = text(b.text, "", 160);
      return coverHeading && coverText;
    });
    return {
      id: proj.id,
      title: proj.meta.title,
      status: proj.meta && proj.meta.archived ? "Archived" : (proj.exportHistory ? "Published" : "Draft"),
      words: c.words,
      images: c.images,
      fav: !!(proj.meta && proj.meta.fav),
      pages: proj.pages.length,
      mode: proj.settings.mode,
      theme: proj.meta.pubtheme,
      thumbnail: {
        title: coverHeading || proj.meta.title,
        subtitle: coverText,
        accent: (proj.meta.brand && proj.meta.brand.accent) || "",
        templateKey: proj.meta.templateKey || ""
      },
      createdAt: proj.createdAt,
      updatedAt: proj.updatedAt
    };
  }

  function upsertIndex(proj) {
    var idx = readIndex();
    var e = indexEntry(proj);
    var pos = -1;
    for (var i = 0; i < idx.length; i++) if (idx[i].id === proj.id) { pos = i; break; }
    if (pos === -1) idx.unshift(e); else idx[pos] = e;
    idx.sort(function (a, b) { return (b.updatedAt || "").localeCompare(a.updatedAt || ""); });
    writeIndex(idx);
  }

  /* ---------- active project state (single source of truth) ---------- */
  var state = {};
  var saveFailed = false;
  if (typeof window.addEventListener === "function") {
    window.addEventListener("beforeunload", function (e) {
      if (saveFailed) { e.preventDefault(); e.returnValue = ""; }
    });
  }

  function setStatus(s) {
    var el = document.getElementById("saveStatus");
    if (el) {
      el.textContent = s;
      el.className = "save-status" +
        (s === "Saved" ? " ok" : ((s.indexOf("full") !== -1 || s.indexOf("failed") !== -1) ? " bad" : ""));
    }
  }

  function projectKey(id) { return PROJECT_PREFIX + id; }
  function analyticsKey(id) { return ANALYTICS_PREFIX + (id || state.id); }

  function save(silent) {
    if (!state.id) return false;
    setStatus("Saving…");
    state.updatedAt = nowIso();
    var toSave = JSON.parse(JSON.stringify(state));
    delete toSave.analytics;
    /* Once a legacy image has a verified IndexedDB asset, never copy its
       transfer payload back into normal LocalStorage project JSON. */
    (toSave.pages || []).forEach(function (page) {
      (page.blocks || []).forEach(function (block) {
        if (block.type === "image" && block.assetId && block.src) delete block.src;
      });
    });
    var serialized = JSON.stringify(toSave);
    var ok = lsSet(projectKey(state.id), serialized);
    if (ok) {
      if (global.FolioHistory) global.FolioHistory.onSave(serialized);
      upsertIndex(state);
      lsSet(ACTIVE_KEY, state.id);
      saveFailed = false;
      if (storageUsage() > 4 * 1024 * 1024) setStatus("Storage nearly full");
      else setStatus("Saved");
      if (!silent && global.FolioToast) global.FolioToast.show("Project saved locally");
      return true;
    }
    setStatus("Save failed — storage full");
    saveFailed = true;
    if (global.FolioToast) global.FolioToast.show("STORAGE FULL — last change was NOT saved. Remove large images or export a JSON backup now.");
    return false;
  }

  function loadAnalytics(id) {
    try {
      var raw = lsGet(analyticsKey(id));
      if (raw) return JSON.parse(raw);
    } catch (e) { /* fall through */ }
    return { views: 0, pageSeconds: {}, maxIndexReached: -1, hotspotClicks: 0 };
  }

  function swapState(next) {
    Object.keys(state).forEach(function (k) { delete state[k]; });
    Object.assign(state, next);
    store.currentIndex = 0;
  }

  function openProject(id) {
    var raw = lsGet(projectKey(id));
    if (!raw) return false;
    var proj;
    try { proj = migrate(JSON.parse(raw)); } catch (e) { return false; }
    proj.analytics = loadAnalytics(id);
    swapState(proj);
    lsSet(ACTIVE_KEY, id);
    setStatus("Saved");
    if (global.FolioHistory) {
      var slim = Object.assign({}, proj);
      delete slim.analytics;
      global.FolioHistory.resetFor(JSON.stringify(slim));
    }
    setTimeout(migrateActiveMedia, 0);
    return true;
  }

  /* Restore a serialized snapshot of the ACTIVE project (undo/redo). */
  function applySnapshot(serialized) {
    var proj;
    try { proj = migrate(JSON.parse(serialized)); } catch (e) { return false; }
    if (proj.id !== state.id) return false; // never cross project boundaries
    proj.analytics = state.analytics;       // analytics are not part of history
    var keepIndex = Math.min(store.currentIndex, proj.pages.length - 1);
    if (!lsSet(projectKey(proj.id), serialized)) {
      setStatus("History failed — storage full");
      return false;
    }
    swapState(proj);
    store.currentIndex = Math.max(0, keepIndex);
    upsertIndex(proj);
    setStatus("Saved");
    return true;
  }

  /* Would adding `extraBytes` push us past a safe quota margin? */
  function wouldExceedQuota(extraBytes) {
    return storageUsage() + extraBytes > 4.8 * 1024 * 1024;
  }

  function createProject(proj) {
    proj = migrate(proj);
    swapState(proj);
    save(true);
    return proj.id;
  }

  /* Valid in-memory state for first-run UI. It is not indexed or persisted. */
  function prepareDraft() {
    swapState(migrate(baseProject("Untitled Publication", "ivory")));
    return state;
  }

  function duplicateProject(id) {
    var raw = lsGet(projectKey(id));
    if (!raw) return null;
    var copy;
    try { copy = migrate(JSON.parse(raw)); } catch (e) { return null; }
    copy.id = uid();
    copy.createdAt = nowIso();
    copy.updatedAt = nowIso();
    copy.meta.title += " (copy)";
    copy.pages.forEach(function (p) {
      p.id = uid();
      p.blocks.forEach(function (b) { b.id = uid(); });
      p.hotspots.forEach(function (h) { h.id = uid(); });
    });
    var slim = Object.assign({}, copy);
    delete slim.analytics;
    lsSet(projectKey(copy.id), JSON.stringify(slim));
    upsertIndex(copy);
    if (global.FolioMedia) {
      global.FolioMedia.referencedIds(copy).forEach(function (assetId) {
        global.FolioMedia.linkAsset(assetId, copy.id).catch(function () {
          if (global.FolioToast) global.FolioToast.show("A linked image could not be copied. Export a backup before editing this duplicate.");
        });
      });
    }
    return copy.id;
  }

  function renameProject(id, title) {
    var raw = lsGet(projectKey(id));
    if (!raw) return;
    try {
      var proj = JSON.parse(raw);
      proj.meta.title = title;
      proj.updatedAt = nowIso();
      lsSet(projectKey(id), JSON.stringify(proj));
      var idx = readIndex();
      for (var i = 0; i < idx.length; i++) {
        if (idx[i].id === id) { idx[i].title = title; idx[i].updatedAt = proj.updatedAt; break; }
      }
      writeIndex(idx);
      if (state.id === id) state.meta.title = title;
    } catch (e2) { /* corrupted record; leave untouched */ }
  }

  function deleteProject(id) {
    var raw = lsGet(projectKey(id));
    var wasActive = state.id === id;
    lsDel(projectKey(id));
    lsDel(analyticsKey(id));
    writeIndex(readIndex().filter(function (r) { return r.id !== id; }));
    if (lsGet(ACTIVE_KEY) === id) lsDel(ACTIVE_KEY);
    if (wasActive && global.FolioHistory) global.FolioHistory.clear();
    if (global.FolioMedia) global.FolioMedia.unlinkProject(id).catch(function () { /* cleanup can be retried from Media Library */ });
    return raw;
  }

  function restoreProjectRaw(raw) {
    try {
      var proj = migrate(JSON.parse(raw));
      var slim = Object.assign({}, proj);
      delete slim.analytics;
      lsSet(projectKey(proj.id), JSON.stringify(slim));
      upsertIndex(proj);
      return proj.id;
    } catch (e) { return null; }
  }

  /* ---------- export / import ---------- */
  async function exportProject() {
    var out = Object.assign({}, state);
    delete out.analytics;
    try {
      out = JSON.parse(JSON.stringify(out));
      out.backupSchema = "folio-portable-v1";
      out.portableMedia = global.FolioMedia ? await global.FolioMedia.portableRecords(state) : [];
      out.manifest = {
        schema: "folio-portable-v1",
        projectId: state.id,
        mediaCount: out.portableMedia.length,
        createdAt: nowIso()
      };
    } catch (error) {
      global.FolioToast.show(global.FolioMedia ? global.FolioMedia.friendlyError(error, error.message) : "Project backup could not be prepared.");
      return false;
    }
    var blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = safeFilename(state.meta.title, "folio-project") + ".folio.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    global.FolioToast.show("Portable project backup exported — content and media included");
    return true;
  }

  /* Import is ALWAYS non-destructive: creates a new project in the library. */
  function importProject(file, done) {
    if (file.size > 80 * 1024 * 1024) {
      global.FolioToast.show("Import failed: backup exceeds 80 MB");
      done && done(false);
      return;
    }
    var reader = new FileReader();
    reader.onload = function (ev) {
      var fixed, incoming;
      try {
        incoming = JSON.parse(ev.target.result);
        if (!validateImportedTree(incoming, 0)) throw new Error("unsafe");
        if (incoming.schemaVersion !== undefined &&
            (!Number.isInteger(incoming.schemaVersion) || incoming.schemaVersion < 1 || incoming.schemaVersion > SCHEMA_VERSION)) {
          throw new Error("unsupported schema");
        }
        if (!incoming || !Array.isArray(incoming.pages) || !incoming.pages.length || incoming.pages.length > 250) {
          throw new Error("invalid");
        }
        var totalBlocks = 0;
        incoming.pages.forEach(function (page) {
          if (!page || typeof page !== "object" || !Array.isArray(page.blocks) || page.blocks.length > 100 ||
              (page.hotspots && (!Array.isArray(page.hotspots) || page.hotspots.length > 100))) throw new Error("invalid");
          totalBlocks += page.blocks.length;
        });
        if (totalBlocks > 5000) throw new Error("invalid");
        fixed = migrate(incoming);
      } catch (e) {
        global.FolioToast.show("Import failed: not a valid Folio project file");
        done && done(false);
        return;
      }
      fixed.id = uid();
      fixed.createdAt = nowIso();
      var portable = incoming.portableMedia;
      if (portable !== undefined) {
        if (!Array.isArray(portable) || !incoming.manifest || incoming.backupSchema !== "folio-portable-v1" ||
            incoming.manifest.schema !== "folio-portable-v1" ||
            incoming.manifest.mediaCount !== portable.length) {
          global.FolioToast.show("Import failed: portable backup manifest is invalid");
          done && done(false);
          return;
        }
      }
      global.FolioUI.confirm(
        'Import "' + fixed.meta.title + '" (' + fixed.pages.length + " pages, " +
        Math.round(file.size / 1024) + " KB) as a new project?",
        async function () {
          var createdAssets = [];
          var mapping = {};
          try {
            if (portable && global.FolioMedia) {
              mapping = await global.FolioMedia.importPortable(fixed.id, portable);
              createdAssets = Object.keys(mapping).map(function (key) { return mapping[key]; });
              fixed.pages.forEach(function (page) {
                (page.blocks || []).forEach(function (block) {
                  if (block.assetId && mapping[block.assetId]) block.assetId = mapping[block.assetId];
                  delete block.src;
                });
                if (page.coverAssetId && mapping[page.coverAssetId]) page.coverAssetId = mapping[page.coverAssetId];
              });
            } else if (global.FolioMedia) {
              await migrateProjectMedia(fixed, ev.target.result, true);
            }
          } catch (mediaError) {
            if (global.FolioMedia) {
              for (var ci = 0; ci < createdAssets.length; ci++) {
                await global.FolioMedia.deleteAsset(createdAssets[ci], true).catch(function () {});
              }
            }
            global.FolioToast.show(global.FolioMedia ? global.FolioMedia.friendlyError(mediaError, mediaError.message) : "Import failed while restoring media.");
            done && done(false);
            return;
          }
          var slim = Object.assign({}, fixed);
          delete slim.analytics;
          delete slim.portableMedia;
          delete slim.manifest;
          delete slim.backupSchema;
          if (!lsSet(projectKey(fixed.id), JSON.stringify(slim))) {
            if (global.FolioMedia) await global.FolioMedia.unlinkProject(fixed.id).catch(function () {});
            global.FolioToast.show("Import failed: storage is full");
            done && done(false);
            return;
          }
          upsertIndex(fixed);
          global.FolioToast.show("Imported as a new project — media verified");
          done && done(true, fixed.id);
        }
      );
    };
    reader.onerror = reader.onabort = function () {
      global.FolioToast.show("Import failed: the selected file could not be read");
      done && done(false);
    };
    reader.readAsText(file);
  }

  async function migrateProjectMedia(project, originalSerialized, imported) {
    if (!global.FolioMedia) return { migrated: 0 };
    var candidates = [];
    (project.pages || []).forEach(function (page) {
      (page.blocks || []).forEach(function (block) {
        if (block.type === "image" && block.src && /^data:image\//i.test(block.src) && !block.assetId) candidates.push(block);
      });
    });
    if (!candidates.length) return { migrated: 0 };
    var working = JSON.parse(JSON.stringify(project));
    var workingBlocks = [];
    (working.pages || []).forEach(function (page) {
      (page.blocks || []).forEach(function (block) {
        if (block.type === "image" && block.src && /^data:image\//i.test(block.src) && !block.assetId) workingBlocks.push(block);
      });
    });
    if (!imported) await global.FolioMedia.saveSnapshot(project.id, originalSerialized);
    var created = [];
    try {
      for (var i = 0; i < workingBlocks.length; i++) {
        setStatus("Migrating media " + (i + 1) + "/" + workingBlocks.length);
        var asset = await global.FolioMedia.createFromDataUrl(project.id, workingBlocks[i].src, {
          name: "Migrated image " + (i + 1),
          alt: workingBlocks[i].alt || "",
          caption: workingBlocks[i].caption || "",
          history: false
        });
        created.push(asset.id);
        workingBlocks[i].assetId = asset.id;
        workingBlocks[i].focalX = workingBlocks[i].focalX == null ? 50 : workingBlocks[i].focalX;
        workingBlocks[i].focalY = workingBlocks[i].focalY == null ? 50 : workingBlocks[i].focalY;
        delete workingBlocks[i].src;
        var verified = await global.FolioMedia.getAsset(asset.id);
        if (!verified || !verified.blob) throw new Error("A migrated image could not be verified.");
      }
      if (imported) {
        Object.keys(project).forEach(function (key) { delete project[key]; });
        Object.assign(project, working);
      } else {
        var slim = Object.assign({}, working);
        delete slim.analytics;
        if (!lsSet(projectKey(project.id), JSON.stringify(slim))) throw new Error("The smaller migrated project record could not be committed.");
        var analytics = project.analytics;
        swapState(working);
        state.analytics = analytics;
        upsertIndex(state);
      }
      setStatus("Saved");
      if (!imported && global.FolioToast) global.FolioToast.show(created.length + " legacy image" + (created.length === 1 ? "" : "s") + " moved safely to the Media Library");
      if (!imported && global.FolioApp) global.FolioApp.render();
      return { migrated: created.length };
    } catch (error) {
      for (var ci = 0; ci < created.length; ci++) await global.FolioMedia.deleteAsset(created[ci], true).catch(function () {});
      setStatus("Migration paused — backup preserved");
      if (!imported && global.FolioToast) global.FolioToast.show(global.FolioMedia.friendlyError(error, "Media migration paused. The original project remains unchanged; retry from Help."));
      throw error;
    }
  }

  async function migrateActiveMedia() {
    if (!state.id || !global.FolioMedia) return { migrated: 0 };
    var raw = lsGet(projectKey(state.id));
    if (!raw) return { migrated: 0 };
    try { return await migrateProjectMedia(state, raw, false); }
    catch (error) { return { migrated: 0, error: error }; }
  }

  /* ---------- boot: legacy migration ---------- */
  function boot() {
    var legacy = lsGet(LEGACY_KEY);
    if (legacy) {
      try {
        var proj = migrate(JSON.parse(legacy));
        var slim = Object.assign({}, proj);
        delete slim.analytics;
        var saved = lsSet(projectKey(proj.id), JSON.stringify(slim));
        var an = lsGet(LEGACY_AN);
        if (saved) {
          if (an) lsSet(analyticsKey(proj.id), an);
          upsertIndex(proj);
          lsSet(ACTIVE_KEY, proj.id);
          lsDel(LEGACY_KEY);
          lsDel(LEGACY_AN);
        }
      } catch (e) { /* corrupted legacy — ignore */ }
    }
    var active = lsGet(ACTIVE_KEY);
    if (active && openProject(active)) return { hasActive: true };
    return { hasActive: false };
  }

  var store = {
    VERSION: PRODUCT_VERSION,
    state: state,
    currentIndex: 0,
    uid: uid,
    save: save,
    escapeHtml: escapeHtml,
    migrate: migrate,
    validateImportedTree: validateImportedTree,
    baseProject: baseProject,
    exportProject: exportProject,
    importProject: importProject,
    listProjects: readIndex,
    openProject: openProject,
    createProject: createProject,
    prepareDraft: prepareDraft,
    duplicateProject: duplicateProject,
    renameProject: renameProject,
    deleteProject: deleteProject,
    restoreProjectRaw: restoreProjectRaw,
    toggleFavorite: function (id) {
      var raw = lsGet(projectKey(id));
      if (!raw) return;
      try {
        var proj = JSON.parse(raw);
        proj.meta.fav = !proj.meta.fav;
        lsSet(projectKey(id), JSON.stringify(proj));
        upsertIndex(migrate(proj));
        if (state.id === id) state.meta.fav = proj.meta.fav;
      } catch (e) { /* leave untouched */ }
    },
    toggleArchive: function (id) {
      var raw = lsGet(projectKey(id));
      if (!raw) return false;
      try {
        var proj = JSON.parse(raw);
        proj.meta = proj.meta || {};
        proj.meta.archived = !proj.meta.archived;
        proj.updatedAt = nowIso();
        lsSet(projectKey(id), JSON.stringify(proj));
        upsertIndex(migrate(proj));
        if (state.id === id) state.meta.archived = proj.meta.archived;
        return !!proj.meta.archived;
      } catch (e) { return false; }
    },
    storageUsage: storageUsage,
    storageOk: function () { return storageOk; },
    analyticsKey: analyticsKey,
    applySnapshot: applySnapshot,
    wouldExceedQuota: wouldExceedQuota,
    migrateActiveMedia: migrateActiveMedia,
    setStatus: setStatus,
    getActiveId: function () { return lsGet(ACTIVE_KEY); },
    boot: boot
  };

  global.FolioStore = store;
})(window);
