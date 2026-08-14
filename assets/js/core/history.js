/* ==========================================================================
   FOLIO ENGINE — Editor History (global undo/redo)
   Snapshot-based: every successful save records the previous project state.
   Exposes: window.FolioHistory
   ========================================================================== */
(function (global) {
  "use strict";

  var MAX = 30;
  var undoStack = [];
  var redoStack = [];
  var last = null;       // state and selected page matching what is currently on screen
  var suppress = false;  // true while applying a snapshot (don't re-record)
  var applying = false;
  var compound = null;

  function comparable(serialized) {
    try {
      var value = JSON.parse(serialized);
      delete value.updatedAt;
      return JSON.stringify(value);
    } catch (e) { return serialized; }
  }

  function capture(serialized) {
    return { serialized: serialized, index: Math.max(0, Number(global.FolioStore.currentIndex) || 0) };
  }

  function release(entry) {
    if (entry && entry.media) entry.media.length = 0;
  }

  function clearStack(stack) {
    while (stack.length) release(stack.pop());
  }

  function pushEntry(entry) {
    undoStack.push(entry);
    if (undoStack.length > MAX) release(undoStack.shift());
    clearStack(redoStack);
  }

  /* Called by FolioStore.save() after every successful write. */
  function onSave(serialized) {
    var next = capture(serialized);
    if (suppress || applying) { last = next; return; }
    if (compound) {
      if (compound.media.length || comparable(compound.before.serialized) !== comparable(serialized)) {
        pushEntry({ type: "compound", before: compound.before, after: next, media: compound.media });
      }
      compound = null;
      last = next;
      return;
    }
    if (last !== null && comparable(last.serialized) !== comparable(serialized)) {
      pushEntry({ type: "document", before: last, after: next });
    }
    last = next;
  }

  /* Project switches must not let you "undo" into a different project. */
  function resetFor(serialized) {
    clearStack(undoStack);
    clearStack(redoStack);
    compound = null;
    last = capture(serialized);
  }

  function beginCompound() {
    if (compound || applying) return false;
    compound = { before: last, media: [] };
    return true;
  }

  function commitCompound() {
    if (!compound) return;
    if (compound.media.length) pushEntry({ type: "media", media: compound.media });
    compound = null;
  }

  function cancelCompound() {
    if (compound) compound.media.length = 0;
    compound = null;
  }

  function recordMedia(command) {
    if (!command || applying) return;
    if (compound) compound.media.push(command);
    else pushEntry({ type: "media", media: [command] });
  }

  function clear() {
    clearStack(undoStack);
    clearStack(redoStack);
    cancelCompound();
    last = null;
  }

  function apply(snapshot) {
    suppress = true;
    global.FolioStore.currentIndex = snapshot.index;
    var ok = global.FolioStore.applySnapshot(snapshot.serialized);
    suppress = false;
    if (ok) {
      global.FolioBlocks.clearSelection();
      global.FolioApp.render();
      global.FolioApp.applyPubTheme();
    }
    return ok;
  }

  async function applyMedia(commands, direction) {
    var order = direction === "undo" ? commands.slice().reverse() : commands.slice();
    var applied = [];
    try {
      for (var i = 0; i < order.length; i++) {
        await global.FolioMedia.applyHistoryRecord(order[i], direction);
        applied.push(order[i]);
      }
      return true;
    } catch (error) {
      var rollback = direction === "undo" ? "redo" : "undo";
      for (var ri = applied.length - 1; ri >= 0; ri--) {
        try { await global.FolioMedia.applyHistoryRecord(applied[ri], rollback); }
        catch (rollbackError) { /* keep the original failure */ }
      }
      throw error;
    }
  }

  async function applyEntry(entry, direction) {
    var target = direction === "undo" ? entry.before : entry.after;
    var reverse = direction === "undo" ? "redo" : "undo";
    applying = true;
    try {
      if (direction === "undo" && target) {
        if (!apply(target)) return false;
        try {
          if (entry.media && entry.media.length) await applyMedia(entry.media, direction);
        } catch (mediaError) {
          if (entry.after) apply(entry.after);
          throw mediaError;
        }
      } else {
        if (entry.media && entry.media.length) await applyMedia(entry.media, direction);
        if (target && !apply(target)) {
          if (entry.media && entry.media.length) await applyMedia(entry.media, reverse);
          return false;
        }
      }
      if (target) last = target;
      if (!target) {
        global.FolioBlocks.clearSelection();
        global.FolioApp.render();
        global.FolioApp.applyPubTheme();
      }
      if (global.FolioMediaLibrary) global.FolioMediaLibrary.refresh().catch(function () {});
      return true;
    } catch (error) {
      if (global.FolioToast) global.FolioToast.show(global.FolioMedia ? global.FolioMedia.friendlyError(error, "History could not be applied; the current publication was kept.") : "History could not be applied.");
      return false;
    } finally {
      applying = false;
      suppress = false;
    }
  }

  function undo() {
    return undoMediaAware();
  }

  function redo() {
    return redoMediaAware();
  }

  async function undoMediaAware() {
    if (!undoStack.length) { global.FolioToast.show("Nothing to undo"); return false; }
    var entry = undoStack[undoStack.length - 1];
    if (!(await applyEntry(entry, "undo"))) return false;
    undoStack.pop();
    redoStack.push(entry);
    global.FolioToast.show("Undone");
    return true;
  }

  async function redoMediaAware() {
    if (!redoStack.length) { global.FolioToast.show("Nothing to redo"); return false; }
    var entry = redoStack[redoStack.length - 1];
    if (!(await applyEntry(entry, "redo"))) return false;
    redoStack.pop();
    undoStack.push(entry);
    global.FolioToast.show("Redone");
    return true;
  }

  document.addEventListener("keydown", function (e) {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (document.body.classList.contains("reader")) return;
    var el = document.activeElement;
    if (el && (el.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(el.tagName))) return;
    if (e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    }
  });

  global.FolioHistory = {
    onSave: onSave,
    resetFor: resetFor,
    clear: clear,
    beginCompound: beginCompound,
    commitCompound: commitCompound,
    cancelCompound: cancelCompound,
    recordMedia: recordMedia,
    undo: undo,
    redo: redo,
    undoMediaAware: undoMediaAware,
    redoMediaAware: redoMediaAware,
    status: function () { return { undo: undoStack.length, redo: redoStack.length, applying: applying }; }
  };
})(window);
