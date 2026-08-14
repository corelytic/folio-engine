/* ==========================================================================
   FOLIO ENGINE — Content Blocks
   Pages are stacks of blocks: heading, text, image, price row, quote,
   divider, button, two columns. Shared renderer for Book & Story modes.
   Exposes: window.FolioBlocks
   ========================================================================== */
(function (global) {
  "use strict";

  var RECENT_BLOCKS_KEY = global.FolioRuntimeConfig && global.FolioRuntimeConfig.mode === "demo"
    ? "folio_engine_demo_recent_blocks"
    : "folio_recent_blocks";

  var store = global.FolioStore;
  var selectedId = null;

  var TYPES = {
    heading: { label: "Heading",   icon: "H",  category: "text",   desc: "Section title",            make: function () { return { text: "Section heading" }; } },
    text:    { label: "Text",      icon: "¶",  category: "text",   desc: "Body paragraph",           make: function () { return { text: "Write something meaningful here." }; } },
    image:   { label: "Image",     icon: "▣",  category: "media",  desc: "Reusable media with focal control", make: function () { return { assetId: "", src: "", alt: "", caption: "", fit: "cover", focalX: 50, focalY: 50 }; } },
    price:   { label: "Price Row", icon: "$",  category: "data",   desc: "Item · dots · price",      make: function () { return { item: "Item name", desc: "Short description", price: "$12" }; } },
    quote:   { label: "Quote",     icon: "❝",  category: "text",   desc: "Pull-quote + attribution", make: function () { return { text: "A short quote that adds character.", cite: "Author" }; } },
    stats:   { label: "Stats",     icon: "№",  category: "data",   desc: "Three key numbers",        make: function () { return { items: [{ v: "120+", l: "Projects" }, { v: "14", l: "Countries" }, { v: "98%", l: "Retention" }] }; } },
    list:    { label: "Checklist", icon: "✓",  category: "text",   desc: "Feature or bullet list",   make: function () { return { items: ["First key point", "Second key point", "Third key point"] }; } },
    divider: { label: "Divider",   icon: "—",  category: "layout", desc: "Visual section separator",  make: function () { return {}; } },
    button:  { label: "Button",    icon: "⬢",  category: "action", desc: "Call-to-action link",      make: function () { return { label: "Learn more", url: "#contact" }; } },
    cols:    { label: "2 Columns", icon: "▥",  category: "layout", desc: "Side-by-side text",        make: function () { return { left: "Left column text.", right: "Right column text." }; } },
    hero:    { label: "Hero", icon: "◆", category: "layout", desc: "High-impact title and subtitle", make: function () { return { title: "A clear publication promise", text: "Support it with one concise, useful sentence." }; } },
    intro:   { label: "Page Intro", icon: "→", category: "text", desc: "Eyebrow, title and lead", make: function () { return { eyebrow: "SECTION", title: "Introduce this page", text: "Set context before the detail." }; } },
    highlight:{ label: "Highlight Panel", icon: "✦", category: "layout", desc: "Emphasized key message", make: function () { return { title: "Worth noticing", text: "Give an important point visual priority." }; } },
    testimonial:{ label: "Testimonial", icon: "❝", category: "commercial", desc: "Quote with role and source", make: function () { return { text: "Add a verified customer statement.", cite: "Name", role: "Role or context" }; } },
    product: { label: "Product Card", icon: "◇", category: "commercial", desc: "Product, details and price", make: function () { return { title: "Product name", text: "Material, size or key benefit", price: "$120" }; } },
    features:{ label: "Feature Grid", icon: "▦", category: "commercial", desc: "Three benefits at a glance", make: function () { return { items: [{ v: "01", l: "First feature" }, { v: "02", l: "Second feature" }, { v: "03", l: "Third feature" }] }; } },
    comparison:{ label: "Comparison", icon: "⇄", category: "data", desc: "Compare two clear choices", make: function () { return { title: "Compare options", left: "Option A\nBest for focused needs.", right: "Option B\nBest for broader needs." }; } },
    toc:     { label: "Table of Contents", icon: "☷", category: "publication", desc: "Automatic page list", make: function () { return { title: "Contents" }; } },
    contact: { label: "Contact Info", icon: "@", category: "action", desc: "Structured contact details", make: function () { return { title: "Contact", text: "" }; } },
    cta:     { label: "CTA Panel", icon: "⬢", category: "action", desc: "Closing message and action", make: function () { return { title: "Ready for the next step?", text: "Tell readers exactly what to do next.", label: "Contact us", url: "#contact" }; } },
    visual:  { label: "Visual Story", icon: "◫", category: "media", desc: "Image-led art direction without stock", make: function () { return { title: "Visual story", text: "Add a concise editorial caption.", tone: "indigo", variant: "split" }; } },
    gallery: { label: "Gallery", icon: "▦", category: "media", desc: "Three-up visual collection", make: function () { return { variant: "editorial", items: [{ title: "First view", text: "Detail or angle", tone: "indigo" }, { title: "Second view", text: "Material or moment", tone: "rose" }, { title: "Third view", text: "Context or finish", tone: "amber" }] }; } }
  };
  var activeCategory = "all";
  var recentTypes = [];

  function sanitizeUrl(u) {
    u = String(u || "").trim();
    if (!u) return "#";
    if (/^#[A-Za-z][A-Za-z0-9_:.-]*$/.test(u)) return u;
    if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return "#"; // javascript:, data:, vbscript:, unknown schemes
    if (/^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,62}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}(?::\d{1,5})?(?:[/?#][^\s]*)?$/.test(u)) return "https://" + u; // validated bare domain
    return "#";
  }

  function createBlock(type) {
    var def = TYPES[type];
    if (!def) return null;
    var b = def.make();
    b.id = store.uid();
    b.type = type;
    return b;
  }

  /* ---------- Editable helper ---------- */
  function editable(tag, cls, value, onCommit) {
    var el = document.createElement(tag);
    el.className = cls;
    // Read-only whenever we are in Reader preview.
    el.contentEditable = document.body.classList.contains("reader") ? "false" : "true";
    el.textContent = value;
    el.addEventListener("blur", function () { onCommit(el.textContent); });
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && tag !== "p" && tag !== "div") { e.preventDefault(); el.blur(); }
    });
    return el;
  }

  function commit() {
    store.save(true);
    global.FolioEditor.renderThumbs();
    global.FolioApp.syncInspector();
  }

  /* ---------- Block renderer (used by both Book and Story) ---------- */
  function renderBlock(block, page) {
    var wrap = document.createElement("div");
    wrap.className = "blk blk-" + block.type + (block.id === selectedId ? " selected" : "");
    if (block.variant) wrap.classList.add("variant-" + block.variant);
    wrap.dataset.blockId = block.id;
    if (!document.body.classList.contains("reader")) {
      wrap.addEventListener("click", function (ev) {
        if (selectedId !== block.id) {
          selectedId = block.id;
          document.querySelectorAll(".blk.selected").forEach(function (el) { el.classList.remove("selected"); });
          document.querySelectorAll('[data-block-id="' + block.id + '"]').forEach(function (el) { el.classList.add("selected"); });
          renderPanel();
        }
        void ev;
      });
    }

    switch (block.type) {
      case "heading":
        var hEl = editable("h3", "blk-heading-text size-" + (block.size || "m"), block.text, function (v) { block.text = v; commit(); });
        hEl.style.textAlign = block.align || "left";
        wrap.appendChild(hEl);
        break;

      case "text":
        var tEl = editable("p", "blk-text-body", block.text, function (v) { block.text = v; commit(); });
        tEl.style.textAlign = block.align || "left";
        wrap.appendChild(tEl);
        break;

      case "hero":
      case "highlight":
        wrap.classList.add("blk-panel", "blk-panel-" + block.type);
        wrap.appendChild(editable("h3", "blk-panel-title", block.title, function (v) { block.title = v; commit(); }));
        wrap.appendChild(editable("p", "blk-panel-text", block.text, function (v) { block.text = v; commit(); }));
        break;

      case "intro":
        wrap.classList.add("blk-page-intro");
        wrap.appendChild(editable("small", "blk-intro-eye", block.eyebrow, function (v) { block.eyebrow = v; commit(); }));
        wrap.appendChild(editable("h3", "blk-panel-title", block.title, function (v) { block.title = v; commit(); }));
        wrap.appendChild(editable("p", "blk-panel-text", block.text, function (v) { block.text = v; commit(); }));
        break;

      case "image":
        if (block.assetId || block.src) {
          var img = document.createElement("img");
          img.className = "blk-img";
          if (block.src) img.src = block.src;
          img.alt = block.alt || "";
          img.style.objectFit = block.fit || "cover";
          img.style.objectPosition = (block.focalX == null ? 50 : block.focalX) + "% " + (block.focalY == null ? 50 : block.focalY) + "%";
          if (block.assetId && global.FolioMedia) {
            global.FolioMedia.bindImage(img, block.assetId, false).then(function (found) {
              if (!found && img.isConnected) img.alt = "Missing media — choose a replacement";
            });
          }
          if (!document.body.classList.contains("reader")) {
            img.title = "Click to replace image";
            img.style.cursor = "pointer";
            img.addEventListener("click", function (ev) {
              ev.stopPropagation();
              global.FolioMediaLibrary.openForBlock(block);
            });
          }
          wrap.appendChild(img);
          if (block.caption) wrap.appendChild(editable("p", "blk-img-caption", block.caption, function (v) { block.caption = v; commit(); }));
        } else {
          var ph = document.createElement("div");
          ph.className = "blk-img-ph";
          ph.textContent = "Choose from Media Library";
          ph.addEventListener("click", function (e) {
            e.stopPropagation();
            global.FolioMediaLibrary.openForBlock(block);
          });
          wrap.appendChild(ph);
        }
        break;

      case "price":
        var row = document.createElement("div");
        row.className = "blk-price-row";
        var left = document.createElement("div");
        left.className = "blk-price-left";
        left.appendChild(editable("span", "blk-price-item", block.item, function (v) { block.item = v; commit(); }));
        left.appendChild(editable("small", "blk-price-desc", block.desc, function (v) { block.desc = v; commit(); }));
        var dots = document.createElement("i");
        dots.className = "blk-price-dots";
        var priceEl = editable("b", "blk-price-amount", block.price, function (v) { block.price = v; commit(); });
        row.appendChild(left); row.appendChild(dots); row.appendChild(priceEl);
        wrap.appendChild(row);
        break;

      case "quote":
        var q = document.createElement("blockquote");
        q.className = "blk-quote-box";
        q.appendChild(editable("p", "blk-quote-text", block.text, function (v) { block.text = v; commit(); }));
        q.appendChild(editable("cite", "blk-quote-cite", block.cite, function (v) { block.cite = v; commit(); }));
        wrap.appendChild(q);
        break;

      case "testimonial":
        var tq = document.createElement("blockquote");
        tq.className = "blk-quote-box blk-testimonial";
        tq.appendChild(editable("p", "blk-quote-text", block.text, function (v) { block.text = v; commit(); }));
        tq.appendChild(editable("cite", "blk-quote-cite", block.cite + (block.role ? " · " + block.role : ""), function (v) { block.cite = v; commit(); }));
        wrap.appendChild(tq);
        break;

      case "divider":
        wrap.appendChild(document.createElement("hr"));
        break;

      case "button":
        if (document.body.classList.contains("reader")) {
          var a = document.createElement("a");
          a.className = "blk-btn";
          a.href = sanitizeUrl(block.url);
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.textContent = block.label;
          wrap.appendChild(a);
        } else {
          var btn = document.createElement("span");
          btn.className = "blk-btn";
          btn.appendChild(editable("span", "blk-btn-label", block.label, function (v) { block.label = v; commit(); }));
          wrap.appendChild(btn);
          var urlLine = editable("small", "blk-btn-url edit-only", block.url, function (v) {
            var clean = sanitizeUrl(v);
            if (clean === "#") global.FolioToast.show("URL rejected — only https, http, mailto and tel links are allowed");
            block.url = clean;
            commit();
            global.FolioApp.render();
          });
          wrap.appendChild(urlLine);
        }
        break;

      case "stats":
      case "features":
        var srow = document.createElement("div");
        srow.className = "blk-stats-row";
        block.items.forEach(function (it) {
          var cell = document.createElement("div");
          cell.className = "blk-stat";
          cell.appendChild(editable("b", "blk-stat-v", it.v, function (v) { it.v = v; commit(); }));
          cell.appendChild(editable("small", "blk-stat-l", it.l, function (v) { it.l = v; commit(); }));
          srow.appendChild(cell);
        });
        wrap.appendChild(srow);
        break;

      case "product":
        wrap.classList.add("blk-product-card");
        wrap.appendChild(editable("h4", "blk-product-title", block.title, function (v) { block.title = v; commit(); }));
        wrap.appendChild(editable("p", "blk-panel-text", block.text, function (v) { block.text = v; commit(); }));
        wrap.appendChild(editable("b", "blk-price-amount", block.price, function (v) { block.price = v; commit(); }));
        break;

      case "comparison":
        wrap.appendChild(editable("h4", "blk-product-title", block.title, function (v) { block.title = v; commit(); }));
        var cg = document.createElement("div");
        cg.className = "blk-cols-grid blk-comparison";
        cg.appendChild(editable("p", "blk-col", block.left, function (v) { block.left = v; commit(); }));
        cg.appendChild(editable("p", "blk-col", block.right, function (v) { block.right = v; commit(); }));
        wrap.appendChild(cg);
        break;

      case "toc":
        wrap.appendChild(editable("h4", "blk-product-title", block.title, function (v) { block.title = v; commit(); }));
        var ol = document.createElement("ol");
        ol.className = "blk-toc";
        store.state.pages.forEach(function (pg, pi) {
          var liT = document.createElement("li");
          liT.innerHTML = "<span>" + store.escapeHtml(pg.title || "Untitled") + "</span><b>" + String(pi + 1).padStart(2, "0") + "</b>";
          ol.appendChild(liT);
        });
        wrap.appendChild(ol);
        break;

      case "contact":
        wrap.classList.add("blk-panel", "blk-contact");
        wrap.appendChild(editable("h4", "blk-panel-title", block.title, function (v) { block.title = v; commit(); }));
        wrap.appendChild(editable("p", "blk-contact-text", block.text, function (v) { block.text = v; commit(); }));
        break;

      case "cta":
        wrap.classList.add("blk-panel", "blk-cta");
        wrap.appendChild(editable("h4", "blk-panel-title", block.title, function (v) { block.title = v; commit(); }));
        wrap.appendChild(editable("p", "blk-panel-text", block.text, function (v) { block.text = v; commit(); }));
        var ca = document.createElement(document.body.classList.contains("reader") ? "a" : "span");
        ca.className = "blk-btn";
        ca.textContent = block.label;
        if (ca.tagName === "A") { ca.href = sanitizeUrl(block.url); ca.rel = "noopener noreferrer"; }
        wrap.appendChild(ca);
        break;

      case "visual":
        wrap.classList.add("blk-visual-" + (block.tone || "indigo"));
        var visualArt = document.createElement("div");
        visualArt.className = "blk-visual-art";
        visualArt.setAttribute("role", "img");
        visualArt.setAttribute("aria-label", block.title || "Decorative visual story");
        visualArt.innerHTML = "<i></i><i></i><i></i>";
        var visualCopy = document.createElement("div");
        visualCopy.className = "blk-visual-copy";
        visualCopy.appendChild(editable("h4", "blk-product-title", block.title, function (v) { block.title = v; commit(); }));
        visualCopy.appendChild(editable("p", "blk-panel-text", block.text, function (v) { block.text = v; commit(); }));
        wrap.appendChild(visualArt); wrap.appendChild(visualCopy);
        break;

      case "gallery":
        var gallery = document.createElement("div");
        gallery.className = "blk-gallery-grid";
        (block.items || []).forEach(function (item) {
          var galleryItem = document.createElement("div");
          galleryItem.className = "blk-gallery-item tone-" + (item.tone || "indigo");
          var galleryArt = document.createElement("div");
          galleryArt.className = "blk-gallery-art"; galleryArt.innerHTML = "<i></i><i></i>";
          galleryItem.appendChild(galleryArt);
          galleryItem.appendChild(editable("b", "blk-gallery-title", item.title, function (v) { item.title = v; commit(); }));
          galleryItem.appendChild(editable("small", "blk-gallery-text", item.text, function (v) { item.text = v; commit(); }));
          gallery.appendChild(galleryItem);
        });
        wrap.appendChild(gallery);
        break;

      case "list":
        var ul = document.createElement("ul");
        ul.className = "blk-list";
        block.items.forEach(function (item, ii) {
          var li = document.createElement("li");
          li.appendChild(editable("span", "blk-list-item", item, function (v) { block.items[ii] = v; commit(); }));
          ul.appendChild(li);
        });
        wrap.appendChild(ul);
        break;

      case "cols":
        var grid = document.createElement("div");
        grid.className = "blk-cols-grid ratio-" + (block.ratio || "1-1");
        grid.appendChild(editable("p", "blk-col", block.left, function (v) { block.left = v; commit(); }));
        grid.appendChild(editable("p", "blk-col", block.right, function (v) { block.right = v; commit(); }));
        wrap.appendChild(grid);
        break;
    }
    return wrap;
  }

  function renderAll(container, page) {
    var host = document.createElement("div");
    host.className = "blk-host";
    var blocks = page.blocks || [];
    if (!blocks.length && !document.body.classList.contains("reader")) {
      var empty = document.createElement("div");
      empty.className = "blk-empty";
      empty.textContent = "Empty page — add blocks from the panel on the right \u2192";
      host.appendChild(empty);
    }
    blocks.forEach(function (b) {
      host.appendChild(renderBlock(b, page));
    });
    container.appendChild(host);
  }

  /* ---------- Inspector panel: block list management ---------- */
  function renderPanel() {
    var wrap = document.getElementById("blockList");
    var page = store.state.pages[store.currentIndex];
    wrap.innerHTML = "";
    if (!page.blocks || !page.blocks.length) {
      wrap.innerHTML = '<div class="hint">No blocks yet — add one below.</div>';
      return;
    }
    page.blocks.forEach(function (b, bi) {
      var row = document.createElement("div");
      row.className = "hs-item" + (b.id === selectedId ? " selected" : "");
      row.draggable = true;
      var label = TYPES[b.type] ? TYPES[b.type].label : b.type;
      row.innerHTML = "<span style='cursor:pointer'>▤ " + label + "</span>";
      row.querySelector("span").addEventListener("click", function () {
        selectedId = b.id;
        global.FolioApp.render();
      });
      row.addEventListener("dragstart", function (e) { e.dataTransfer.setData("text/plain", String(bi)); });
      row.addEventListener("dragover", function (e) { e.preventDefault(); row.classList.add("drag-over"); });
      row.addEventListener("dragleave", function () { row.classList.remove("drag-over"); });
      row.addEventListener("drop", function (e) {
        e.preventDefault();
        row.classList.remove("drag-over");
        var from = parseInt(e.dataTransfer.getData("text/plain"), 10);
        if (isNaN(from) || from === bi) return;
        var moved = page.blocks.splice(from, 1)[0];
        page.blocks.splice(bi, 0, moved);
        store.save(true);
        global.FolioApp.render();
      });

      var actions = document.createElement("div");
      actions.style.display = "flex";

      var up = iconBtn("↑", "Move up", function () { move(bi, -1); });
      var down = iconBtn("↓", "Move down", function () { move(bi, 1); });
      var dup = iconBtn("⧉", "Duplicate block", function () {
        var copy = JSON.parse(JSON.stringify(b));
        copy.id = store.uid();
        page.blocks.splice(bi + 1, 0, copy);
        store.save(true);
        global.FolioApp.render();
      });
      var del = iconBtn("×", "Delete block", function () {
        var removed = page.blocks.splice(bi, 1)[0];
        store.save(true);
        global.FolioApp.render();
        global.FolioToast.show("Block deleted", "Undo", function () {
          page.blocks.splice(bi, 0, removed);
          store.save(true);
          global.FolioApp.render();
        });
      });
      del.classList.add("del");

      actions.appendChild(up); actions.appendChild(down); actions.appendChild(dup); actions.appendChild(del);
      row.appendChild(actions);
      wrap.appendChild(row);
    });

    renderProps(page);

    function move(bi, dir) {
      var to = bi + dir;
      if (to < 0 || to >= page.blocks.length) return;
      var b = page.blocks.splice(bi, 1)[0];
      page.blocks.splice(to, 0, b);
      store.save(true);
      global.FolioApp.render();
    }
  }

  /* ---------- Selected-block property inspector ---------- */
  function renderProps(page) {
    var host = document.getElementById("blockProps");
    host.innerHTML = "";
    var block = null;
    for (var i = 0; i < page.blocks.length; i++) {
      if (page.blocks[i].id === selectedId) { block = page.blocks[i]; break; }
    }
    if (!block) return;

    function field(labelText, el) {
      var w = document.createElement("label");
      w.className = "prop-field";
      var s = document.createElement("span");
      s.textContent = labelText;
      w.appendChild(s); w.appendChild(el);
      host.appendChild(w);
    }
    function sel(options, value, onChange) {
      var s = document.createElement("select");
      s.className = "field";
      options.forEach(function (o) {
        var op = document.createElement("option");
        op.value = o[0]; op.textContent = o[1];
        if (o[0] === value) op.selected = true;
        s.appendChild(op);
      });
      s.addEventListener("change", function () { onChange(s.value); commit(); global.FolioApp.render(); });
      return s;
    }
    function txt(value, onChange, placeholder) {
      var t = document.createElement("input");
      t.className = "field"; t.type = "text"; t.value = value || ""; t.placeholder = placeholder || "";
      t.addEventListener("change", function () { onChange(t.value); commit(); global.FolioApp.render(); });
      return t;
    }
    function chk(checked, onChange) {
      var c = document.createElement("input");
      c.type = "checkbox"; c.checked = !!checked;
      c.addEventListener("change", function () { onChange(c.checked); commit(); global.FolioApp.render(); });
      return c;
    }

    var title = document.createElement("div");
    title.className = "prop-title";
    title.textContent = (TYPES[block.type] ? TYPES[block.type].label : block.type) + " settings";
    host.appendChild(title);

    var ALIGN = [["left", "Left"], ["center", "Center"], ["right", "Right"]];

    if (block.type === "heading") {
      field("Alignment", sel(ALIGN, block.align || "left", function (v) { block.align = v; }));
      field("Size", sel([["m", "Medium"], ["l", "Large"], ["s", "Small"]], block.size || "m", function (v) { block.size = v; }));
    }
    if (block.type === "text" || block.type === "quote") {
      field("Alignment", sel(ALIGN, block.align || "left", function (v) { block.align = v; }));
    }
    if (block.type === "image") {
      field("Alt text", txt(block.alt, function (v) { block.alt = v; }, "Describe the image"));
      field("Caption", txt(block.caption, function (v) { block.caption = v; }, "Optional caption"));
      field("Fit", sel([["cover", "Cover"], ["contain", "Contain"]], block.fit || "cover", function (v) { block.fit = v; }));
      function rangeField(labelText, value, onChange) {
        var range = document.createElement("input");
        range.className = "field"; range.type = "range"; range.min = "0"; range.max = "100"; range.value = value == null ? 50 : value;
        range.addEventListener("input", function () { onChange(Number(range.value)); commit(); global.FolioApp.render(); });
        field(labelText, range);
      }
      rangeField("Horizontal focus", block.focalX, function (v) { block.focalX = v; });
      rangeField("Vertical focus", block.focalY, function (v) { block.focalY = v; });
      var rep = document.createElement("button");
      rep.className = "btn sm block"; rep.textContent = block.assetId || block.src ? "Replace from Media Library" : "Choose from Media Library";
      rep.addEventListener("click", function () { global.FolioMediaLibrary.openForBlock(block); });
      host.appendChild(rep);
      if (block.assetId || block.src) {
        var rem = document.createElement("button");
        rem.className = "btn sm ghost block"; rem.style.marginTop = "6px"; rem.textContent = "Remove image";
        rem.addEventListener("click", function () { block.assetId = ""; block.src = ""; commit(); global.FolioApp.render(); });
        host.appendChild(rem);
      }
    }
    if (block.type === "button") {
      field("URL", txt(block.url, function (v) {
        var clean = sanitizeUrl(v);
        if (clean === "#") global.FolioToast.show("URL rejected — only https, http, mailto and tel are allowed");
        block.url = clean;
      }, "https://…"));
      var row = document.createElement("label");
      row.className = "prop-check";
      var c = chk(block.newTab !== false, function (v) { block.newTab = v; });
      row.appendChild(c);
      row.appendChild(document.createTextNode(" Open in new tab"));
      host.appendChild(row);
      field("Alignment", sel(ALIGN, block.align || "left", function (v) { block.align = v; }));
    }
    if (block.type === "list") {
      var addI = document.createElement("button");
      addI.className = "btn sm block"; addI.textContent = "+ Add item";
      addI.addEventListener("click", function () { block.items.push("New point"); commit(); global.FolioApp.render(); });
      host.appendChild(addI);
      if (block.items.length > 1) {
        var remI = document.createElement("button");
        remI.className = "btn sm ghost block"; remI.style.marginTop = "6px"; remI.textContent = "– Remove last item";
        remI.addEventListener("click", function () { block.items.pop(); commit(); global.FolioApp.render(); });
        host.appendChild(remI);
      }
    }
    if (block.type === "cols") {
      field("Ratio", sel([["1-1", "1 : 1"], ["2-1", "2 : 1"], ["1-2", "1 : 2"]], block.ratio || "1-1", function (v) { block.ratio = v; }));
    }
    if (["hero", "product", "stats", "cta", "visual", "gallery", "image"].indexOf(block.type) !== -1) {
      var variants = block.type === "image" ? [["standard", "Standard"], ["full", "Full-image spread"], ["split", "Image + text"]]
        : (block.type === "gallery" ? [["editorial", "Editorial"], ["cards", "Cards"], ["strip", "Film strip"]]
        : [["standard", "Standard"], ["split", "Split"], ["minimal", "Minimal"], ["editorial", "Editorial"]]);
      field("Layout variant", sel(variants, block.variant || variants[0][0], function (v) { block.variant = v; }));
    }
  }

  function iconBtn(txt, title, onClick) {
    var b = document.createElement("button");
    b.className = "icon-btn";
    b.textContent = txt;
    b.title = title;
    b.setAttribute("aria-label", title);
    b.addEventListener("click", function (e) { e.stopPropagation(); onClick(); });
    return b;
  }

  function addBlockOfType(type) {
    var page = store.state.pages[store.currentIndex];
    if (!page.blocks) page.blocks = [];
    var nb = createBlock(type);
    if (!nb) return;
    page.blocks.push(nb);
    selectedId = nb.id;
    recentTypes = [type].concat(recentTypes.filter(function (item) { return item !== type; })).slice(0, 3);
    try { sessionStorage.setItem(RECENT_BLOCKS_KEY, JSON.stringify(recentTypes)); } catch (e) { /* session-only convenience */ }
    store.save(true);
    global.FolioApp.render();
    renderGallery();
    global.FolioToast.show(TYPES[type].label + " added");
  }

  function makeLibraryCard(type, compact) {
    var t = TYPES[type];
    var card = document.createElement("button");
    card.className = compact ? "recent-block-card" : "blk-card";
    card.setAttribute("aria-label", "Add " + t.label + " block");
    card.innerHTML = '<i aria-hidden="true">' + t.icon + '</i><span><b>' + t.label + '</b><small>' + t.desc + '</small></span><em aria-hidden="true">＋</em>';
    card.addEventListener("click", function () { addBlockOfType(type); });
    return card;
  }

  function renderGallery() {
    var g = document.getElementById("blockGallery");
    var recent = document.getElementById("recentBlocks");
    var recentSection = document.getElementById("recentBlockSection");
    var empty = document.getElementById("blockLibraryEmpty");
    var query = (document.getElementById("blockSearch").value || "").toLowerCase().trim();
    g.innerHTML = "";
    recent.innerHTML = "";
    recentTypes.forEach(function (type) { if (TYPES[type]) recent.appendChild(makeLibraryCard(type, true)); });
    recentSection.hidden = !recentTypes.length;
    var shown = 0;
    Object.keys(TYPES).forEach(function (k) {
      var t = TYPES[k];
      var matchesCategory = activeCategory === "all" || t.category === activeCategory;
      var haystack = (t.label + " " + t.desc + " " + t.category).toLowerCase();
      if (!matchesCategory || (query && haystack.indexOf(query) === -1)) return;
      g.appendChild(makeLibraryCard(k, false));
      shown++;
    });
    empty.hidden = shown !== 0;
  }

  /* Word count across all text-bearing blocks (used by inspector) */
  function wordCount(page) {
    var words = 0;
    (page.blocks || []).forEach(function (b) {
      ["text", "item", "desc", "left", "right", "label", "cite"].forEach(function (k) {
        if (b[k]) words += String(b[k]).trim().split(/\s+/).filter(Boolean).length;
      });
    });
    return words;
  }

  function init() {
    try { recentTypes = JSON.parse(sessionStorage.getItem(RECENT_BLOCKS_KEY) || "[]"); } catch (e) { recentTypes = []; }
    document.getElementById("blockSearch").addEventListener("input", renderGallery);
    document.querySelectorAll("[data-block-category]").forEach(function (button) {
      button.addEventListener("click", function () {
        activeCategory = button.dataset.blockCategory;
        document.querySelectorAll("[data-block-category]").forEach(function (item) { item.classList.toggle("active", item === button); });
        renderGallery();
      });
    });
    renderGallery();
  }

  global.FolioBlocks = {
    TYPES: TYPES,
    getSelectedId: function () { return selectedId; },
    clearSelection: function () { selectedId = null; },
    createBlock: createBlock,
    renderAll: renderAll,
    renderPanel: renderPanel,
    wordCount: wordCount,
    init: init
  };
})(window);
