/* ==========================================================================
   FOLIO ENGINE — Project Media Library
   IndexedDB-backed upload, optimization, reuse, metadata and focal controls.
   Exposes: window.FolioMediaLibrary
   ========================================================================== */
(function (global) {
  "use strict";

  var media = global.FolioMedia;
  var store = global.FolioStore;
  var assets = [];
  var selectedId = "";
  var targetBlock = null;
  var lastFocus = null;
  var initialized = false;
  var refreshGeneration = 0;

  function el(id) { return document.getElementById(id); }
  function bytes(value) {
    var n = Number(value || 0);
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / (1024 * 1024)).toFixed(2) + " MB";
  }
  function referenced() {
    return media.referencedIds(store.state);
  }
  function isUsed(id) { return referenced().indexOf(id) !== -1; }
  function announce(message) {
    if (global.FolioToast) global.FolioToast.show(message);
  }
  function setProgress(label, percent) {
    var host = el("mediaProgress");
    host.hidden = !label;
    el("mediaProgressText").textContent = label || "";
    el("mediaProgressBar").style.width = Math.max(0, Math.min(100, percent || 0)) + "%";
  }

  async function refresh() {
    var generation = ++refreshGeneration;
    var nextAssets = await media.listAssets(store.state.id);
    if (generation !== refreshGeneration) return false;
    assets = nextAssets;
    if (selectedId && !assets.some(function (item) { return item.id === selectedId; })) selectedId = "";
    renderGrid();
    renderDetail();
    updateStorage();
    return true;
  }

  async function updateStorage() {
    var estimate = await media.storageEstimate();
    var quota = Number(estimate.quota || 0);
    el("mediaUsage").textContent = bytes(estimate.appUsage) + (quota ? " app media" : " stored");
    el("mediaStorageType").textContent = media.isAvailable() ? "IndexedDB · " + (quota ? bytes(quota) + " browser quota" : "persistent local database") : "Media storage unavailable · uploads are disabled";
    el("mediaUsageBar").style.width = quota ? Math.min(100, (estimate.usage / quota) * 100) + "%" : "0%";
  }

  async function thumb(card, record) {
    var image = card.querySelector("img");
    await media.bindImage(image, record.id, true);
  }

  function filteredAssets() {
    var query = (el("mediaSearch").value || "").toLowerCase().trim();
    var filter = el("mediaFilter").value;
    var sort = el("mediaSort").value;
    var result = assets.filter(function (record) {
      var used = isUsed(record.id);
      if (filter === "used" && !used) return false;
      if (filter === "unused" && used) return false;
      return !query || (record.name + " " + record.alt + " " + record.caption).toLowerCase().indexOf(query) !== -1;
    });
    result.sort(function (a, b) {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "size") return b.optimizedSize - a.optimizedSize;
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
    return result;
  }

  function renderGrid() {
    var grid = el("mediaGrid");
    var list = filteredAssets();
    grid.innerHTML = "";
    el("mediaEmpty").hidden = list.length !== 0;
    list.forEach(function (record) {
      var card = document.createElement("button");
      card.className = "media-card" + (record.id === selectedId ? " selected" : "");
      card.setAttribute("aria-label", "Select " + record.name);
      card.innerHTML = '<span class="media-thumb"><img alt=""></span><span class="media-card-meta"><b></b><small></small></span><i>' + (isUsed(record.id) ? "Used" : "Unused") + "</i>";
      card.querySelector("b").textContent = record.name;
      card.querySelector("small").textContent = record.width + " × " + record.height + " · " + bytes(record.optimizedSize);
      card.addEventListener("click", function () { selectedId = record.id; renderGrid(); renderDetail(); });
      card.addEventListener("dblclick", function () { useSelected(); });
      grid.appendChild(card);
      thumb(card, record);
    });
  }

  function makeField(label, value, type, onChange) {
    var wrap = document.createElement("label");
    wrap.className = "prop-field";
    var title = document.createElement("span");
    title.textContent = label;
    var input = document.createElement(type === "textarea" ? "textarea" : "input");
    input.className = "field";
    if (type && type !== "textarea") input.type = type;
    input.value = value == null ? "" : value;
    if (type === "range") {
      var rangeTimer = null;
      input.addEventListener("input", function () {
        clearTimeout(rangeTimer);
        rangeTimer = setTimeout(function () { onChange(input.value); }, 140);
      });
      input.addEventListener("change", function () { clearTimeout(rangeTimer); onChange(input.value); });
    } else {
      var timer = null;
      input.addEventListener("input", function () {
        clearTimeout(timer);
        timer = setTimeout(function () { onChange(input.value); }, 180);
      });
      input.addEventListener("change", function () { clearTimeout(timer); onChange(input.value); });
    }
    wrap.appendChild(title); wrap.appendChild(input);
    return wrap;
  }

  async function persistMeta(record, patch) {
    var linkedBlocks = [];
    store.state.pages.forEach(function (page) {
      (page.blocks || []).forEach(function (block) {
        if (block.assetId === record.id) linkedBlocks.push(block);
      });
    });
    var previousRecord = {};
    Object.keys(patch).forEach(function (key) { previousRecord[key] = record[key]; });
    var previousBlocks = linkedBlocks.map(function (block) {
      var values = {};
      Object.keys(patch).forEach(function (key) { values[key] = block[key]; });
      return { block: block, values: values };
    });
    if (global.FolioHistory) global.FolioHistory.beginCompound();
    try {
      var updated = await media.updateAsset(record.id, patch);
      Object.assign(record, updated);
      linkedBlocks.forEach(function (block) {
        if (patch.alt !== undefined) block.alt = patch.alt;
        if (patch.caption !== undefined) block.caption = patch.caption;
        if (patch.fit !== undefined) block.fit = patch.fit;
        if (patch.focalX !== undefined) block.focalX = Number(patch.focalX);
        if (patch.focalY !== undefined) block.focalY = Number(patch.focalY);
      });
      if (linkedBlocks.length) {
        if (!store.save(true)) throw new Error("Media details were not saved because project storage is full.");
        global.FolioApp.render();
      } else if (global.FolioHistory) {
        global.FolioHistory.commitCompound();
      }
    } catch (error) {
      await media.updateAsset(record.id, previousRecord, { history: false }).catch(function () {});
      Object.assign(record, previousRecord);
      previousBlocks.forEach(function (entry) { Object.assign(entry.block, entry.values); });
      if (global.FolioHistory) global.FolioHistory.cancelCompound();
      throw error;
    }
  }

  function renderDetail() {
    var host = el("mediaDetail");
    var record = assets.find(function (item) { return item.id === selectedId; });
    host.innerHTML = "";
    if (!record) {
      host.innerHTML = '<div class="media-detail-empty">Select an asset to inspect or use it.</div>';
      return;
    }
    var preview = document.createElement("div");
    preview.className = "media-preview";
    preview.innerHTML = '<img alt=""><i class="media-focal" style="left:' + record.focalX + "%;top:" + record.focalY + '%"></i>';
    host.appendChild(preview);
    media.bindImage(preview.querySelector("img"), record.id, false);
    preview.querySelector("img").style.objectFit = record.fit || "cover";
    preview.querySelector("img").style.objectPosition = record.focalX + "% " + record.focalY + "%";
    preview.addEventListener("click", function (event) {
      var rect = preview.getBoundingClientRect();
      var x = Math.round(((event.clientX - rect.left) / rect.width) * 100);
      var y = Math.round(((event.clientY - rect.top) / rect.height) * 100);
      persistMeta(record, { focalX: x, focalY: y }).then(renderDetail);
    });
    host.appendChild(makeField("File name", record.name, "text", function (v) { persistMeta(record, { name: v }).then(renderGrid); }));
    host.appendChild(makeField("Alt text", record.alt, "text", function (v) { persistMeta(record, { alt: v }); }));
    host.appendChild(makeField("Caption", record.caption, "textarea", function (v) { persistMeta(record, { caption: v }); }));
    var fit = document.createElement("label");
    fit.className = "prop-field"; fit.innerHTML = "<span>Image fit</span>";
    var select = document.createElement("select");
    select.className = "field";
    [["cover", "Cover"], ["contain", "Contain"]].forEach(function (option) {
      var node = document.createElement("option"); node.value = option[0]; node.textContent = option[1]; node.selected = record.fit === option[0]; select.appendChild(node);
    });
    select.addEventListener("change", function () { persistMeta(record, { fit: select.value }).then(renderDetail); });
    fit.appendChild(select); host.appendChild(fit);
    host.appendChild(makeField("Horizontal focus", record.focalX, "range", function (v) { persistMeta(record, { focalX: v }).then(renderDetail); }));
    host.appendChild(makeField("Vertical focus", record.focalY, "range", function (v) { persistMeta(record, { focalY: v }).then(renderDetail); }));
    var facts = document.createElement("div");
    facts.className = "media-facts";
    facts.textContent = record.originalWidth + " × " + record.originalHeight + " · " + bytes(record.originalSize) + " → " + bytes(record.optimizedSize);
    host.appendChild(facts);
    var use = document.createElement("button");
    use.className = "btn primary block"; use.textContent = targetBlock ? "Use selected image" : "Set as current page image";
    use.addEventListener("click", useSelected); host.appendChild(use);
    var replace = document.createElement("button");
    replace.className = "btn sm block"; replace.textContent = "Replace file";
    replace.addEventListener("click", function () {
      var input = document.createElement("input"); input.type = "file"; input.accept = media.ALLOWED_TYPES.join(",");
      input.addEventListener("change", async function () {
        if (!input.files[0]) return;
        try { setProgress("Optimizing replacement…", 55); await media.replaceAsset(record.id, input.files[0]); setProgress("", 0); await refresh(); announce("Media replaced everywhere it is used"); }
        catch (error) { setProgress("", 0); announce(media.friendlyError(error)); }
      });
      input.click();
    });
    host.appendChild(replace);
    var remove = document.createElement("button");
    remove.className = "btn sm ghost danger block"; remove.textContent = "Delete unused asset"; remove.disabled = isUsed(record.id);
    remove.title = isUsed(record.id) ? "Remove this image from all blocks before deleting it." : "";
    remove.addEventListener("click", async function () {
      try { await media.deleteAsset(record.id); selectedId = ""; await refresh(); announce("Unused media deleted"); }
      catch (error) { announce(media.friendlyError(error)); }
    });
    host.appendChild(remove);
  }

  async function uploadFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    var combineAssignment = !!(targetBlock && files.length === 1 && global.FolioHistory && global.FolioHistory.beginCompound());
    var combinedRecord = null;
    for (var i = 0; i < files.length; i++) {
      try {
        setProgress("Optimizing " + files[i].name + " · " + (i + 1) + " of " + files.length, Math.round((i / files.length) * 100) + 20);
        var record = await media.createAsset(store.state.id, files[i]);
        if (combineAssignment) combinedRecord = record;
        selectedId = record.id;
      } catch (error) {
        if (combineAssignment && global.FolioHistory) {
          global.FolioHistory.cancelCompound();
          combineAssignment = false;
          selectedId = "";
        }
        announce(media.friendlyError(error));
      }
    }
    setProgress("", 0);
    await refresh();
    if (targetBlock && selectedId) {
      var assigned = useSelected();
      if (!assigned && combineAssignment) {
        if (global.FolioHistory) global.FolioHistory.cancelCompound();
        if (combinedRecord) await media.deleteAsset(combinedRecord.id, true).catch(function () {});
      }
    } else if (combineAssignment && global.FolioHistory) {
      global.FolioHistory.commitCompound();
    }
  }

  function useSelected() {
    var record = assets.find(function (item) { return item.id === selectedId; });
    if (!record) return false;
    var block = targetBlock;
    var page = store.state.pages[store.currentIndex];
    var createdBlock = false;
    var before = block ? JSON.parse(JSON.stringify(block)) : null;
    if (!block) {
      block = (page.blocks || []).find(function (item) { return item.type === "image"; });
      if (!block) {
        block = global.FolioBlocks.createBlock("image");
        page.blocks.push(block);
        createdBlock = true;
      }
      if (!before && !createdBlock) before = JSON.parse(JSON.stringify(block));
    }
    block.assetId = record.id;
    delete block.src;
    block.alt = record.alt || block.alt || "";
    block.caption = record.caption || "";
    block.fit = record.fit || "cover";
    block.focalX = record.focalX;
    block.focalY = record.focalY;
    if (!store.save(true)) {
      if (createdBlock) page.blocks.splice(page.blocks.indexOf(block), 1);
      else if (before) { Object.keys(block).forEach(function (key) { delete block[key]; }); Object.assign(block, before); }
      return false;
    }
    global.FolioApp.render();
    close();
    announce("Image added from the Media Library");
    return true;
  }

  function open(block) {
    var backdrop = el("mediaBackdrop");
    if (backdrop.classList.contains("open")) {
      el("mediaSearch").focus();
      return;
    }
    targetBlock = block || null;
    lastFocus = document.activeElement;
    backdrop.classList.add("open");
    el("mediaTitle").textContent = block ? "Choose an image" : "Media Library";
    refresh().then(function () { el("mediaSearch").focus(); });
  }
  function close() {
    el("mediaBackdrop").classList.remove("open");
    targetBlock = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function init() {
    if (initialized) return;
    initialized = true;
    media.init().then(function () { store.migrateActiveMedia(); updateStorage(); });
    el("btnMedia").addEventListener("click", function () { open(null); });
    el("btnMediaClose").addEventListener("click", close);
    el("mediaBackdrop").addEventListener("click", function (event) { if (event.target === el("mediaBackdrop")) close(); });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && el("mediaBackdrop").classList.contains("open")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
      }
    }, true);
    el("btnMediaUpload").addEventListener("click", function (event) { event.stopPropagation(); el("mediaInput").click(); });
    el("mediaDrop").addEventListener("click", function (event) { if (event.target.id !== "btnMediaUpload") el("mediaInput").click(); });
    el("mediaDrop").addEventListener("keydown", function (event) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); el("mediaInput").click(); } });
    ["dragenter", "dragover"].forEach(function (name) { el("mediaDrop").addEventListener(name, function (event) { event.preventDefault(); el("mediaDrop").classList.add("over"); }); });
    ["dragleave", "drop"].forEach(function (name) { el("mediaDrop").addEventListener(name, function (event) { event.preventDefault(); el("mediaDrop").classList.remove("over"); }); });
    el("mediaDrop").addEventListener("drop", function (event) { uploadFiles(event.dataTransfer.files); });
    el("mediaInput").addEventListener("change", function () { uploadFiles(el("mediaInput").files); el("mediaInput").value = ""; });
    ["mediaSearch", "mediaFilter", "mediaSort"].forEach(function (id) { el(id).addEventListener(id === "mediaSearch" ? "input" : "change", renderGrid); });
  }

  global.FolioMediaLibrary = { init: init, open: open, openForBlock: open, refresh: refresh };
})(window);
