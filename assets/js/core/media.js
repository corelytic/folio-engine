/* ==========================================================================
   FOLIO ENGINE — IndexedDB media service
   All durable media persistence is centralized here. Projects store asset IDs;
   portable backups temporarily embed media only for transfer.
   Exposes: window.FolioMedia
   ========================================================================== */
(function (global) {
  "use strict";

  var demoMode = global.FolioRuntimeConfig && global.FolioRuntimeConfig.mode === "demo";
  var DB_NAME = demoMode ? "folio_engine_demo_media" : "folio_engine_media";
  var DB_VERSION = 1;
  var ASSET_STORE = "assets";
  var SNAPSHOT_STORE = "snapshots";
  var MAX_FILE_BYTES = 12 * 1024 * 1024;
  var MAX_WORKING_DIMENSION = 2200;
  var MAX_IMAGE_PIXELS = 80 * 1024 * 1024;
  var THUMB_DIMENSION = 500;
  var ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  var dbPromise = null;
  var available = true;
  var memoryAssets = new Map();
  var urlCache = new Map();

  function uid() {
    return "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function friendlyError(error, fallback) {
    if (!error) return fallback || "Media storage is unavailable.";
    if (error.name === "QuotaExceededError") return "Browser storage is full. Export a project backup, then remove unused media.";
    if (error.name === "AbortError") return "The media write was interrupted. Your project was not changed; retry when ready.";
    if (error.name === "NotAllowedError" || error.name === "SecurityError") return "This browser profile does not allow durable media storage. Try a regular browsing window and export a backup.";
    return fallback || "Media could not be saved. Your project content was preserved.";
  }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve) {
      if (!global.indexedDB) {
        available = false;
        resolve(null);
        return;
      }
      var request;
      try { request = indexedDB.open(DB_NAME, DB_VERSION); }
      catch (error) { available = false; resolve(null); return; }
      request.onupgradeneeded = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains(ASSET_STORE)) {
          var assets = db.createObjectStore(ASSET_STORE, { keyPath: "id" });
          assets.createIndex("projectIds", "projectIds", { multiEntry: true });
          assets.createIndex("updatedAt", "updatedAt", { unique: false });
        }
        if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
          db.createObjectStore(SNAPSHOT_STORE, { keyPath: "projectId" });
        }
      };
      request.onsuccess = function () {
        var db = request.result;
        db.onversionchange = function () { db.close(); dbPromise = null; };
        resolve(db);
      };
      request.onerror = function () { available = false; resolve(null); };
      request.onblocked = function () { available = false; resolve(null); };
    });
    return dbPromise;
  }

  function requestResult(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error("Media request failed")); };
    });
  }

  async function withStore(mode, work) {
    var db = await openDb();
    if (!db) {
      if (mode === "readwrite") {
        throw new DOMException("Durable media storage is unavailable; no media was saved.", "NotAllowedError");
      }
      return work(null, memoryAssets);
    }
    return new Promise(function (resolve, reject) {
      var tx;
      try { tx = db.transaction([ASSET_STORE], mode); }
      catch (error) { reject(error); return; }
      var store = tx.objectStore(ASSET_STORE);
      var result;
      try { result = work(store, null, tx); }
      catch (error2) { tx.abort(); reject(error2); return; }
      tx.oncomplete = function () { Promise.resolve(result).then(resolve, reject); };
      tx.onabort = tx.onerror = function () { reject(tx.error || new DOMException("Media transaction aborted", "AbortError")); };
    });
  }

  function extensionMatches(file) {
    var name = String(file.name || "").toLowerCase();
    var ext = name.split(".").pop();
    var expected = {
      "image/jpeg": ["jpg", "jpeg"],
      "image/png": ["png"],
      "image/webp": ["webp"],
      "image/gif": ["gif"]
    };
    return expected[file.type] && expected[file.type].indexOf(ext) !== -1;
  }

  function validateFile(file) {
    if (!file || ALLOWED.indexOf(file.type) === -1) throw new Error("Use a JPG, PNG, WebP, or GIF image. SVG uploads are not accepted.");
    if (!extensionMatches(file)) throw new Error("The filename extension does not match the image type.");
    if (file.size <= 0) throw new Error("That image file is empty.");
    if (file.size > MAX_FILE_BYTES) throw new Error("Image is larger than the 12 MB upload limit.");
  }

  function loadImage(blob) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(blob);
      var image = new Image();
      image.onload = function () { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = function () { URL.revokeObjectURL(url); reject(new Error("The image could not be decoded safely.")); };
      image.src = url;
    });
  }

  function canvasBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob);
        else reject(new Error("The optimized image could not be created."));
      }, type, quality);
    });
  }

  async function optimize(file) {
    validateFile(file);
    var image = await loadImage(file);
    var originalWidth = image.naturalWidth;
    var originalHeight = image.naturalHeight;
    if (!originalWidth || !originalHeight || originalWidth > 20000 || originalHeight > 20000 ||
        originalWidth * originalHeight > MAX_IMAGE_PIXELS) {
      throw new Error("Image dimensions are invalid or too large.");
    }
    var scale = Math.min(1, MAX_WORKING_DIMENSION / Math.max(originalWidth, originalHeight));
    var width = Math.max(1, Math.round(originalWidth * scale));
    var height = Math.max(1, Math.round(originalHeight * scale));
    var workingBlob = file;
    var workingType = file.type;
    if (file.type !== "image/gif" && (scale < 1 || file.size > 2.5 * 1024 * 1024)) {
      var canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      var context = canvas.getContext("2d", { alpha: file.type === "image/png" });
      context.drawImage(image, 0, 0, width, height);
      workingType = file.type === "image/png" ? "image/png" : (file.type === "image/webp" ? "image/webp" : "image/jpeg");
      workingBlob = await canvasBlob(canvas, workingType, workingType === "image/png" ? undefined : 0.84);
      if (workingBlob.size >= file.size && scale === 1) {
        workingBlob = file;
        workingType = file.type;
        width = originalWidth; height = originalHeight;
      }
    }
    var thumbScale = Math.min(1, THUMB_DIMENSION / Math.max(originalWidth, originalHeight));
    var thumbWidth = Math.max(1, Math.round(originalWidth * thumbScale));
    var thumbHeight = Math.max(1, Math.round(originalHeight * thumbScale));
    var thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = thumbWidth; thumbCanvas.height = thumbHeight;
    thumbCanvas.getContext("2d").drawImage(image, 0, 0, thumbWidth, thumbHeight);
    var thumbType = file.type === "image/png" ? "image/png" : "image/jpeg";
    var thumbBlob = await canvasBlob(thumbCanvas, thumbType, thumbType === "image/png" ? undefined : 0.78);
    return {
      blob: workingBlob,
      thumbBlob: thumbBlob,
      originalWidth: originalWidth,
      originalHeight: originalHeight,
      width: width,
      height: height,
      originalSize: file.size,
      optimizedSize: workingBlob.size,
      mime: workingType
    };
  }

  async function putRecord(record, replace) {
    record.updatedAt = new Date().toISOString();
    return withStore("readwrite", function (store, memory) {
      if (memory) {
        if (!replace && memory.has(record.id)) throw new Error("Duplicate asset ID.");
        memory.set(record.id, record);
        return record;
      }
      return requestResult(replace ? store.put(record) : store.add(record));
    }).then(function () { return record; });
  }

  function copyRecord(record) {
    if (!record) return null;
    var copy = Object.assign({}, record);
    copy.projectIds = Array.isArray(record.projectIds) ? record.projectIds.slice() : [];
    return copy;
  }

  function historyEligible(record) {
    var activeId = global.FolioStore && global.FolioStore.state && global.FolioStore.state.id;
    return !!(activeId && record && Array.isArray(record.projectIds) && record.projectIds.indexOf(activeId) !== -1 && global.FolioHistory);
  }

  function recordHistory(before, after, label) {
    var candidate = after || before;
    if (!historyEligible(candidate)) return;
    global.FolioHistory.recordMedia({
      assetId: candidate.id,
      label: label || "Media change",
      before: copyRecord(before),
      after: copyRecord(after)
    });
  }

  async function removeRecord(id) {
    return withStore("readwrite", function (store, memory) {
      if (memory) { memory.delete(id); return true; }
      return requestResult(store.delete(id));
    }).then(function () {
      [id + ":full", id + ":thumb"].forEach(function (key) {
        var url = urlCache.get(key);
        if (url) URL.revokeObjectURL(url);
        urlCache.delete(key);
      });
      return true;
    });
  }

  async function applyHistoryRecord(command, direction) {
    var target = direction === "undo" ? command.before : command.after;
    if (!target) {
      var active = global.FolioStore && global.FolioStore.state;
      if (active && referencedIds(active).indexOf(command.assetId) !== -1) {
        throw new Error("Media history stopped because the image is still used by the publication.");
      }
      await removeRecord(command.assetId);
      return null;
    }
    await putRecord(copyRecord(target), true);
    var verified = await getAsset(target.id);
    if (!verified || !verified.blob || Number(verified.optimizedSize) !== Number(target.optimizedSize)) {
      throw new Error("Media history verification failed; the previous state was kept.");
    }
    return verified;
  }

  async function createAsset(projectId, file, metadata) {
    metadata = metadata || {};
    var recordId = /^[a-z0-9_-]{4,120}$/i.test(String(metadata.id || "")) ? String(metadata.id) : uid();
    if (await getAsset(recordId)) throw new Error("Duplicate asset ID.");
    var optimized = await optimize(file);
    var record = {
      id: recordId,
      projectIds: [projectId],
      name: String(metadata.name || file.name || "Image").slice(0, 240),
      alt: String(metadata.alt || "").slice(0, 1000),
      caption: String(metadata.caption || "").slice(0, 2000),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mime: optimized.mime,
      originalMime: file.type,
      originalWidth: optimized.originalWidth,
      originalHeight: optimized.originalHeight,
      width: optimized.width,
      height: optimized.height,
      originalSize: optimized.originalSize,
      optimizedSize: optimized.optimizedSize,
      focalX: 50,
      focalY: 50,
      fit: "cover",
      blob: optimized.blob,
      thumbBlob: optimized.thumbBlob
    };
    await putRecord(record, false);
    var check = await getAsset(record.id);
    if (!check || !check.blob || check.optimizedSize !== record.optimizedSize) {
      await deleteAsset(record.id, true);
      throw new Error("Media verification failed; no project data was changed.");
    }
    if (metadata.history !== false) recordHistory(null, check, "Add media");
    return record;
  }

  function dataUrlToFile(dataUrl, name) {
    var match = /^data:(image\/(?:jpeg|png|webp|gif));base64,([a-z0-9+/=\s]+)$/i.exec(dataUrl || "");
    if (!match) throw new Error("Legacy image format is not supported.");
    var encoded = match[2].replace(/\s/g, "");
    if (encoded.length > Math.ceil(MAX_FILE_BYTES / 3) * 4 + 4) throw new Error("Legacy image exceeds the migration limit.");
    var binary = atob(encoded);
    if (binary.length > MAX_FILE_BYTES) throw new Error("Legacy image exceeds the migration limit.");
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    var ext = match[1].split("/")[1].replace("jpeg", "jpg");
    return new File([bytes], (name || "migrated-image") + "." + ext, { type: match[1] });
  }

  async function createFromDataUrl(projectId, dataUrl, metadata) {
    metadata = metadata || {};
    return createAsset(projectId, dataUrlToFile(dataUrl, metadata.name), metadata);
  }

  async function getAsset(id) {
    if (!id) return null;
    return withStore("readonly", function (store, memory) {
      if (memory) return memory.get(id) || null;
      return requestResult(store.get(id));
    });
  }

  async function listAssets(projectId) {
    return withStore("readonly", function (store, memory) {
      if (memory) return Array.from(memory.values()).filter(function (r) { return r.projectIds.indexOf(projectId) !== -1; });
      return requestResult(store.index("projectIds").getAll(projectId));
    });
  }

  async function updateAsset(id, patch, options) {
    options = options || {};
    var record = await getAsset(id);
    if (!record) throw new Error("Media record is missing.");
    var before = copyRecord(record);
    ["name", "alt", "caption"].forEach(function (key) {
      if (patch[key] !== undefined) record[key] = String(patch[key]).slice(0, key === "name" ? 240 : (key === "alt" ? 1000 : 2000));
    });
    if (patch.focalX !== undefined) record.focalX = Math.max(0, Math.min(100, Number(patch.focalX) || 0));
    if (patch.focalY !== undefined) record.focalY = Math.max(0, Math.min(100, Number(patch.focalY) || 0));
    if (patch.fit !== undefined) record.fit = patch.fit === "contain" ? "contain" : "cover";
    await putRecord(record, true);
    if (options.history !== false) recordHistory(before, record, "Edit media details");
    return record;
  }

  async function replaceAsset(id, file) {
    var current = await getAsset(id);
    if (!current) throw new Error("Media record is missing.");
    var backup = copyRecord(current);
    var optimized = await optimize(file);
    Object.assign(current, optimized, { originalMime: file.type });
    [id + ":full", id + ":thumb"].forEach(function (key) {
      var cached = urlCache.get(key);
      if (cached) URL.revokeObjectURL(cached);
      urlCache.delete(key);
    });
    await putRecord(current, true);
    var verified = await getAsset(id);
    if (!verified || !verified.blob || verified.optimizedSize !== current.optimizedSize) {
      await putRecord(backup, true);
      throw new Error("Replacement verification failed; the previous media was restored.");
    }
    recordHistory(backup, verified, "Replace media");
    return verified;
  }

  async function deleteAsset(id, force) {
    var record = await getAsset(id);
    if (!record) return false;
    if (!force && record.projectIds && record.projectIds.length > 1) throw new Error("This media is linked to another project.");
    await removeRecord(id);
    if (!force) recordHistory(record, null, "Delete media");
    return true;
  }

  async function linkAsset(id, projectId) {
    var record = await getAsset(id);
    if (!record) throw new Error("Media record is missing.");
    record.projectIds = Array.isArray(record.projectIds) ? record.projectIds : [];
    if (record.projectIds.indexOf(projectId) === -1) record.projectIds.push(projectId);
    return putRecord(record, true);
  }

  async function unlinkProject(projectId) {
    var assets = await listAssets(projectId);
    for (var i = 0; i < assets.length; i++) {
      var record = assets[i];
      record.projectIds = record.projectIds.filter(function (id) { return id !== projectId; });
      if (!record.projectIds.length) await deleteAsset(record.id, true);
      else await putRecord(record, true);
    }
  }

  async function objectUrl(id, thumbnail) {
    var key = id + (thumbnail ? ":thumb" : ":full");
    if (urlCache.has(key)) return urlCache.get(key);
    var record = await getAsset(id);
    if (!record) return "";
    var blob = thumbnail ? (record.thumbBlob || record.blob) : record.blob;
    if (!blob) return "";
    var url = URL.createObjectURL(blob);
    urlCache.set(key, url);
    return url;
  }

  async function bindImage(image, id, thumbnail) {
    var url = await objectUrl(id, thumbnail);
    if (!url || !image.isConnected) return false;
    image.src = url;
    return true;
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error("Media could not be read for backup.")); };
      reader.readAsDataURL(blob);
    });
  }

  function referencedIds(project) {
    var ids = [];
    (project.pages || []).forEach(function (page) {
      (page.blocks || []).forEach(function (block) {
        if (block.assetId && ids.indexOf(block.assetId) === -1) ids.push(block.assetId);
      });
      if (page.coverAssetId && ids.indexOf(page.coverAssetId) === -1) ids.push(page.coverAssetId);
    });
    return ids;
  }

  async function portableRecords(project) {
    var ids = referencedIds(project);
    var output = [];
    for (var i = 0; i < ids.length; i++) {
      var record = await getAsset(ids[i]);
      if (!record || !record.blob) throw new Error("Backup stopped because a referenced image is missing.");
      output.push({
        id: record.id,
        name: record.name,
        alt: record.alt || "",
        caption: record.caption || "",
        mime: record.mime,
        width: record.width,
        height: record.height,
        originalWidth: record.originalWidth,
        originalHeight: record.originalHeight,
        originalSize: record.originalSize,
        optimizedSize: record.optimizedSize,
        focalX: record.focalX,
        focalY: record.focalY,
        fit: record.fit,
        data: await blobToDataUrl(record.blob),
        thumbnail: record.thumbBlob ? await blobToDataUrl(record.thumbBlob) : ""
      });
    }
    return output;
  }

  async function hydrateProject(project) {
    var clone = JSON.parse(JSON.stringify(project));
    var missing = [];
    for (var pi = 0; pi < clone.pages.length; pi++) {
      var blocks = clone.pages[pi].blocks || [];
      for (var bi = 0; bi < blocks.length; bi++) {
        var block = blocks[bi];
        if (block.type === "image" && block.assetId) {
          var record = await getAsset(block.assetId);
          if (!record || !record.blob) { missing.push(block.assetId); block.src = ""; continue; }
          block.src = await blobToDataUrl(record.blob);
          block.alt = block.alt || record.alt || "";
          block.caption = block.caption || record.caption || "";
          block.fit = block.fit || record.fit || "cover";
          block.focalX = block.focalX == null ? record.focalX : block.focalX;
          block.focalY = block.focalY == null ? record.focalY : block.focalY;
        }
      }
    }
    if (missing.length) throw new Error("Export stopped because " + missing.length + " referenced image" + (missing.length === 1 ? " is" : "s are") + " missing.");
    return clone;
  }

  async function importPortable(projectId, records) {
    if (!Array.isArray(records)) return {};
    if (records.length > 120) throw new Error("Backup contains too many media files.");
    var mapping = Object.create(null);
    var created = [];
    try {
      for (var i = 0; i < records.length; i++) {
        var item = records[i] || {};
        if (!/^data:image\/(jpeg|png|webp|gif);base64,/i.test(item.data || "")) throw new Error("Backup contains an unsupported media payload.");
        var requestedId = /^[a-z0-9_-]{4,120}$/i.test(String(item.id || "")) ? String(item.id) : "";
        var nextId = requestedId && !(await getAsset(requestedId)) ? requestedId : uid();
        var record = await createFromDataUrl(projectId, item.data, {
          id: nextId,
          name: String(item.name || "Imported image").replace(/[\\/:*?"<>|]/g, "-"),
          alt: item.alt || "",
          caption: item.caption || "",
          history: false
        });
        await updateAsset(record.id, {
          focalX: item.focalX,
          focalY: item.focalY,
          fit: item.fit
        }, { history: false });
        if (requestedId) mapping[requestedId] = record.id;
        created.push(record.id);
      }
      return mapping;
    } catch (error) {
      for (var ci = 0; ci < created.length; ci++) await deleteAsset(created[ci], true);
      throw error;
    }
  }

  async function storageEstimate() {
    var own = 0;
    var dbAssets = await withStore("readonly", function (store, memory) {
      if (memory) return Array.from(memory.values());
      return requestResult(store.getAll());
    });
    dbAssets.forEach(function (record) { own += Number(record.optimizedSize || (record.blob && record.blob.size) || 0) + Number((record.thumbBlob && record.thumbBlob.size) || 0); });
    var estimate = { usage: own, quota: 0, appUsage: own, persistent: available };
    try {
      if (navigator.storage && navigator.storage.estimate) {
        var native = await navigator.storage.estimate();
        estimate.usage = native.usage || own;
        estimate.quota = native.quota || 0;
      }
    } catch (error) { /* app usage remains available */ }
    return estimate;
  }

  async function saveSnapshot(projectId, serialized) {
    var db = await openDb();
    if (!db) return false;
    return new Promise(function (resolve) {
      var tx = db.transaction([SNAPSHOT_STORE], "readwrite");
      tx.objectStore(SNAPSHOT_STORE).put({ projectId: projectId, serialized: serialized, createdAt: new Date().toISOString() });
      tx.oncomplete = function () { resolve(true); };
      tx.onerror = tx.onabort = function () { resolve(false); };
    });
  }

  async function getSnapshot(projectId) {
    var db = await openDb();
    if (!db) return null;
    var tx = db.transaction([SNAPSHOT_STORE], "readonly");
    return requestResult(tx.objectStore(SNAPSHOT_STORE).get(projectId)).catch(function () { return null; });
  }

  async function resetDemoData() {
    if (!demoMode) return false;
    try {
      var db = await dbPromise;
      if (db) db.close();
    } catch (error) { /* continue with deletion */ }
    dbPromise = null;
    urlCache.forEach(function (url) { URL.revokeObjectURL(url); });
    urlCache.clear();
    memoryAssets.clear();
    return new Promise(function (resolve) {
      var request;
      try { request = indexedDB.deleteDatabase(DB_NAME); }
      catch (error) { resolve(false); return; }
      request.onsuccess = function () { resolve(true); };
      request.onerror = request.onblocked = function () { resolve(false); };
    });
  }

  global.FolioMedia = {
    DB_NAME: DB_NAME,
    DB_VERSION: DB_VERSION,
    ALLOWED_TYPES: ALLOWED.slice(),
    MAX_FILE_BYTES: MAX_FILE_BYTES,
    init: openDb,
    isAvailable: function () { return available; },
    friendlyError: friendlyError,
    validateFile: validateFile,
    createAsset: createAsset,
    createFromDataUrl: createFromDataUrl,
    getAsset: getAsset,
    listAssets: listAssets,
    updateAsset: updateAsset,
    replaceAsset: replaceAsset,
    deleteAsset: deleteAsset,
    applyHistoryRecord: applyHistoryRecord,
    linkAsset: linkAsset,
    unlinkProject: unlinkProject,
    objectUrl: objectUrl,
    bindImage: bindImage,
    referencedIds: referencedIds,
    portableRecords: portableRecords,
    hydrateProject: hydrateProject,
    importPortable: importPortable,
    storageEstimate: storageEstimate,
    saveSnapshot: saveSnapshot,
    getSnapshot: getSnapshot,
    resetDemoData: demoMode ? resetDemoData : null
  };
})(window);
