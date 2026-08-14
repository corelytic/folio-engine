/* ==========================================================================
   FOLIO ENGINE — Standalone HTML Export
   Generates ONE self-contained .html file: read-only viewer with book/story
   modes, hotspots, themes, watermark, password gate. No dependencies.
   Exposes: window.FolioExport
   ========================================================================== */
(function (global) {
  "use strict";

  var store = global.FolioStore;

  /* ---------- Minimal ZIP writer (STORE method, no compression, no deps) ---------- */
  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function strBytes(s) { return new TextEncoder().encode(s); }

  function buildZip(entries) {
    var chunks = [], central = [], offset = 0;
    entries.forEach(function (en) {
      var nameB = strBytes(en.name);
      var data = typeof en.data === "string" ? strBytes(en.data) : en.data;
      var crc = crc32(data);
      var local = new Uint8Array(30 + nameB.length);
      var dv = new DataView(local.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);          // version needed
      dv.setUint16(8, 0, true);           // method: STORE
      dv.setUint32(14, crc, true);
      dv.setUint32(18, data.length, true);
      dv.setUint32(22, data.length, true);
      dv.setUint16(26, nameB.length, true);
      local.set(nameB, 30);
      chunks.push(local, data);

      var cen = new Uint8Array(46 + nameB.length);
      var cv = new DataView(cen.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(10, 0, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true);
      cv.setUint16(28, nameB.length, true);
      cv.setUint32(42, offset, true);
      cen.set(nameB, 46);
      central.push(cen);
      offset += local.length + data.length;
    });
    var cenSize = 0;
    central.forEach(function (c) { chunks.push(c); cenSize += c.length; });
    var eocd = new Uint8Array(22);
    var ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, entries.length, true);
    ev.setUint16(10, entries.length, true);
    ev.setUint32(12, cenSize, true);
    ev.setUint32(16, offset, true);
    chunks.push(eocd);
    return new Blob(chunks, { type: "application/zip" });
  }

  function attrEsc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function sanitizeUrl(u) {
    u = String(u || "").trim();
    if (!u) return "#";
    if (/^#[A-Za-z][A-Za-z0-9_:.-]*$/.test(u)) return u;
    if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return "#";
    if (/^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,62}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}(?::\d{1,5})?(?:[/?#][^\s]*)?$/.test(u)) return "https://" + u;
    return "#";
  }

  function sanitizeBrand(brand) {
    brand = brand || {};
    var fonts = ["", "Georgia, 'Times New Roman', serif", "'Segoe UI', Arial, sans-serif", "'Courier New', monospace"];
    var radii = ["", "0px", "14px", "24px"];
    return {
      accent: /^#[0-9a-f]{6}$/i.test(brand.accent || "") ? brand.accent : "",
      page: /^#[0-9a-f]{6}$/i.test(brand.page || "") ? brand.page : "",
      viewer: /^#[0-9a-f]{6}$/i.test(brand.viewer || "") ? brand.viewer : "",
      text: /^#[0-9a-f]{6}$/i.test(brand.text || "") ? brand.text : "",
      muted: /^#[0-9a-f]{6}$/i.test(brand.muted || "") ? brand.muted : "",
      headingFont: fonts.indexOf(brand.headingFont) !== -1 ? brand.headingFont : "",
      bodyFont: fonts.indexOf(brand.bodyFont) !== -1 ? brand.bodyFont : "",
      radius: radii.indexOf(brand.radius) !== -1 ? brand.radius : ""
    };
  }

  function viewerData(opts, source) {
    opts = opts || {};
    var s = source || store.state;
    return {
      meta: { title: opts.title || s.meta.title, author: opts.author || s.meta.author || "", desc: opts.desc || "", templateKey: s.meta.templateKey || "" },
      brand: sanitizeBrand(s.meta.brand),
      settings: {
        mode: opts.mode || s.settings.mode,
        start: opts.start || 1,
        pass: s.settings.password ? (s.settings.passwordEncoded ? s.settings.password : btoa(s.settings.password)) : "",
        wm: !!s.settings.watermark,
        wmText: s.settings.watermarkText || ""
      },
      pages: s.pages.map(function (p) {
        var blocks = (p.blocks || []).map(function (b) {
          var c = JSON.parse(JSON.stringify(b));
          if (c.type === "image" && c.src && !/^data:image\/(jpeg|png|webp|gif);base64,/.test(c.src)) c.src = "";
          if (c.type === "button" || c.type === "cta") c.url = sanitizeUrl(c.url);
          if (c.type === "heading" || c.type === "text" || c.type === "button") {
            c.align = ["left", "center", "right"].indexOf(c.align) !== -1 ? c.align : "left";
          }
          if (c.type === "image") c.fit = ["cover", "contain"].indexOf(c.fit) !== -1 ? c.fit : "cover";
          if (c.type === "cols") c.ratio = ["1-1", "2-1", "1-2"].indexOf(c.ratio) !== -1 ? c.ratio : "1-1";
          return c;
        });
        return { title: p.title, layout: p.layout || "", cover: p.cover || null, blocks: blocks, hotspots: (p.hotspots || []).filter(function (h) { return h.enabled !== false; }) };
      })
    };
  }

  function buildViewer(opts, source) {
    opts = opts || {};
    var project = source || store.state;
    var data = viewerData(opts, project);
    var templateClass = "template-" + String(data.meta.templateKey || "publication").replace(/[^a-z0-9_-]/gi, "").toLowerCase();
    var br = data.brand || {};
    var brandCss =
      (br.accent ? ".eyebrow{color:" + br.accent + "}.bbtn{background:" + br.accent + "}.bq{border-left-color:" + br.accent + "}.prog span.on{background:" + br.accent + "}" : "") +
      (br.headingFont ? ".bh{font-family:" + br.headingFont + "}" : "") +
      (br.bodyFont ? ".front,.slide{font-family:" + br.bodyFont + "}" : "") +
      (br.radius ? ".face{border-radius:" + br.radius + "}" : "") +
      (br.viewer ? "html,body{background:" + br.viewer + "}" : "") +
      (br.page ? ".front,.slide{background-color:" + br.page + "}" : "") +
      (br.text ? ".front,.slide{color:" + br.text + "}" : "") +
      (br.muted ? ".bt,.bcols{color:" + br.muted + "}" : "");
    var json = JSON.stringify(data)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026");
    var theme = project.meta.pubtheme || "ivory";
    var themes = {
      ivory: ["#FDFBF6", "#F4F0E6", "#26221A", "#6B6353"],
      noir: ["#171B24", "#12151D", "#EDEFF5", "#9AA4B8"],
      azure: ["#F4F9FF", "#E8F1FC", "#0F2540", "#4A6484"]
    };
    var t = themes[theme] || themes.ivory;

    return "<!DOCTYPE html>\n<html lang=\"en\"><head><meta charset=\"UTF-8\">" +
    "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
    "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'\">" +
"<title>" + store.escapeHtml(data.meta.title) + "</title>" +
"<meta name=\"description\" content=\"" + attrEsc(data.meta.desc) + "\">" +
(data.meta.author ? "<meta name=\"author\" content=\"" + attrEsc(data.meta.author) + "\">" : "") +
"<style>" +
"*{box-sizing:border-box;margin:0;padding:0}html{background:#0D1017}" +
"body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0D1017;color:#E8ECF2;height:100vh;display:flex;flex-direction:column;overflow:hidden}" +
".bar{display:flex;justify-content:space-between;align-items:center;padding:12px 18px;border-bottom:1px solid #242C38;flex:none}" +
".bar b{font-size:14px}.bar .modes button{background:#141922;border:1px solid #242C38;color:#8A94A6;padding:6px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;cursor:pointer}" +
".bar .modes button:first-child{border-radius:14px 0 0 14px}.bar .modes button:last-child{border-radius:0 14px 14px 0}" +
".bar .modes button.on{background:linear-gradient(135deg,#6366F1,#22D3EE);color:#fff;border-color:transparent}" +
".stage{flex:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}" +
".book{width:min(620px,92vw);height:min(420px,70vh);position:relative;perspective:2600px}" +
".leaf{position:absolute;inset:0;transform-style:preserve-3d;transform-origin:left center;transition:transform .7s cubic-bezier(.35,.1,.2,1);cursor:pointer}" +
".leaf.f{transform:rotateY(-180deg)}" +
".face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:6px;overflow:hidden;box-shadow:0 20px 50px -20px rgba(0,0,0,.7)}" +
".lc{display:flex;flex-direction:column;justify-content:center;text-align:center}.lc .bhost{justify-content:center}.lc .bh{font-size:32px}.lc .bstats{margin-top:8px}" +
".front{background:" + t[0] + ";color:" + t[2] + ";padding:32px 36px}" +
".back{transform:rotateY(180deg);background:" + t[1] + ";display:flex;align-items:center;justify-content:center;color:#9AA3B5;font-size:11px;letter-spacing:3px}" +
".eyebrow{font-size:9px;letter-spacing:2px;color:#6366F1;text-transform:uppercase;margin-bottom:12px;font-family:monospace}" +
".bhost{display:flex;flex-direction:column;gap:13px;height:calc(100% - 26px);overflow-y:auto}" +
".bh{font-size:23px;font-weight:800;letter-spacing:-.4px}.bh-s{font-size:17px}.bh-l{font-size:29px}.bt{font-size:13.5px;color:" + t[3] + ";line-height:1.7}" +
".bimg{width:100%;max-height:170px;object-fit:cover;border-radius:6px}.bcap{font-size:9px;color:#6b7280;margin-top:4px}" +
".bpr{display:flex;align-items:baseline;gap:8px}.bpr .l{display:flex;flex-direction:column;min-width:0}" +
".bpr .i{font-size:14px;font-weight:700}.bpr .d{font-size:11px;color:" + t[3] + "}" +
".bpr .dots{flex:1;border-bottom:2px dotted rgba(120,130,150,.5);transform:translateY(-4px)}.bpr .p{font-size:14px;font-weight:800;white-space:nowrap}" +
".bq{border-left:3px solid #6366F1;padding:6px 0 6px 14px;font-style:italic;font-size:14px;line-height:1.6}" +
".bq cite{display:block;font-size:11px;color:" + t[3] + ";margin-top:6px;font-style:normal}.bq cite:before{content:'\\2014 '}" +
"hr{border:none;border-top:1px solid rgba(120,130,150,.35)}" +
".bbtn{display:inline-flex;background:linear-gradient(135deg,#6366F1,#22D3EE);color:#fff;font-size:12px;font-weight:700;padding:9px 18px;border-radius:8px;text-decoration:none}" +
".bcols{display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:12px;color:" + t[3] + ";line-height:1.65}" +
".bpanel{border:1px solid rgba(120,130,150,.35);border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:8px}.bpanel.hero{background:linear-gradient(145deg,rgba(99,102,241,.18),rgba(34,211,238,.08));padding:22px}.bintro small{font-size:9px;letter-spacing:1.5px;color:#6366F1}.bintro{display:flex;flex-direction:column;gap:6px}" +
".bvisual{min-height:140px;display:grid;grid-template-columns:1.3fr 1fr;border-radius:10px;overflow:hidden;background:#111827;color:#fff}.bvart{position:relative;background:linear-gradient(145deg,#4338ca,#0f172a);min-height:130px}.bvart:before,.bvart:after{content:'';position:absolute;border-radius:50%;background:rgba(255,255,255,.2)}.bvart:before{width:110px;height:110px;right:-24px;top:-32px}.bvart:after{width:56px;height:56px;left:18px;bottom:-18px;border-radius:12px;transform:rotate(22deg)}.bvcopy{padding:16px;display:flex;flex-direction:column;justify-content:flex-end}.bvcopy .bt{color:rgba(255,255,255,.7)}.bvisual.rose .bvart{background:linear-gradient(145deg,#be185d,#3f0a25)}.bvisual.amber .bvart{background:linear-gradient(145deg,#d97706,#451a03)}.bvisual.teal .bvart{background:linear-gradient(145deg,#0f766e,#164e63)}.bvisual.stone .bvart{background:linear-gradient(145deg,#78716c,#292524)}" +
".template-catalog .bvart{background:linear-gradient(90deg,#ece3d2 0 66%,#10263f 66%)}.template-catalog .bvart:before{width:74px;height:94px;border:5px solid #10263f;background:transparent;border-radius:40px 40px 6px 6px;left:25px;right:auto;top:20px}.template-catalog .bvart:after{width:112px;height:8px;background:#bd5a3d;border-radius:0;left:10px;bottom:18px;transform:none}.template-lookbook .bvart{background:linear-gradient(110deg,#f1d7cc 0 43%,#bd3e63 43% 48%,#25131a 48%)}.template-lookbook .bvart:before{width:54px;height:112px;background:#171218;border-radius:48% 48% 12% 12%;left:38px;right:auto;top:12px;transform:rotate(-5deg)}.template-lookbook .bvart:after{width:65px;height:1px;background:#f1d7cc;border-radius:0;left:auto;right:18px;bottom:44px;transform:none}.template-hotel .bvart{background:linear-gradient(#9bd1df 0 47%,#f2cc93 47% 61%,#18728b 61%)}.template-hotel .bvart:before{width:82px;height:116px;background:#f4eee2;border-radius:44px 44px 0 0;left:25px;right:auto;top:18px;box-shadow:inset 0 0 0 16px #21657a}.template-hotel .bvart:after{width:36px;height:36px;background:#f3b950;border-radius:50%;left:auto;right:26px;bottom:auto;top:20px;transform:none}.template-company .bvart{background:linear-gradient(130deg,#eff1e9 0 64%,#103d40 64%)}.template-company .bvart:before{width:98px;height:64px;border:1px solid #0f766e;background:repeating-linear-gradient(90deg,transparent 0 20px,rgba(15,118,110,.2) 21px);border-radius:0;left:20px;right:auto;top:22px}.template-company .bvart:after{width:11px;height:38px;background:#e26d4a;border-radius:0;left:36px;bottom:31px;transform:none;box-shadow:23px -14px 0 #0f766e,46px -5px 0 #e9b44c}.template-restaurant .bvart{background:radial-gradient(circle at 32% 48%,#f0dfbe 0 29px,#bd7c42 30px 37px,transparent 38px),linear-gradient(120deg,#2c1817,#6f3023)}.template-restaurant .bvart:before{width:66px;height:4px;background:#d3b276;border-radius:0;left:8px;right:auto;top:20px;transform:rotate(-28deg)}.template-restaurant .bvart:after{width:1px;height:92px;background:rgba(255,255,255,.34);border-radius:0;left:auto;right:50px;bottom:auto;top:18px;transform:none}" +
".bgallery{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.bgitem i{display:block;height:76px;border-radius:7px;background:linear-gradient(145deg,#4338ca,#172554);position:relative;overflow:hidden}.bgitem i:after{content:'';position:absolute;width:55px;height:55px;border-radius:50%;right:-12px;top:-12px;background:rgba(255,255,255,.2)}.bgitem.rose i{background:linear-gradient(145deg,#be185d,#3f0a25)}.bgitem.amber i{background:linear-gradient(145deg,#d97706,#451a03)}.bgitem.teal i{background:linear-gradient(145deg,#0f766e,#164e63)}.bgitem.stone i{background:linear-gradient(145deg,#78716c,#292524)}.bgitem b{font-size:9px;display:block;margin-top:4px}.bgitem small{font-size:8px;color:#6b7280}" +
".hs{position:absolute;width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#6366F1,#22D3EE);border:2px solid #fff;cursor:pointer;transform:translate(-50%,-50%);z-index:5}" +
".pop{position:absolute;min-width:170px;max-width:230px;background:#141922;border:1px solid #242C38;border-radius:6px;padding:11px;z-index:40;transform:translate(-50%,12px);color:#E8ECF2}" +
".pop h4{font-size:12px;color:#22D3EE;margin-bottom:4px}.pop p{font-size:11px;color:#8A94A6;line-height:1.5}" +
".story{width:min(330px,92vw);height:min(568px,80vh);background:" + t[0] + ";color:" + t[2] + ";border-radius:24px;overflow-y:auto;scroll-snap-type:y mandatory;display:none;border:1px solid #242C38}" +
".story::-webkit-scrollbar{display:none}" +
".slide{width:100%;height:100%;scroll-snap-align:start;display:flex;flex-direction:column;justify-content:flex-end;padding:30px 24px 40px;position:relative}" +
".slide .bhost{height:auto;max-height:75%}.slide .bh{font-size:19px}.slide .bt{font-size:12px}" +
".prog{position:absolute;top:12px;left:16px;right:16px;display:flex;gap:4px}.prog span{flex:1;height:3px;background:rgba(128,140,160,.3);border-radius:3px}.prog span.on{background:linear-gradient(135deg,#6366F1,#22D3EE)}" +
".arrow{position:absolute;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;border:1px solid #242C38;background:#141922;color:#E8ECF2;font-size:16px;cursor:pointer;z-index:30}" +
".arrow:disabled{opacity:.3}.arrow.l{left:16px}.arrow.r{right:16px}button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid #22D3EE;outline-offset:3px}" +
".count{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);font-family:monospace;font-size:11px;color:#8A94A6;letter-spacing:2px;background:#141922;border:1px solid #242C38;padding:6px 16px;border-radius:20px}" +
".wm{position:absolute;inset:0;pointer-events:none;z-index:25;overflow:hidden}" +
".wm span{position:absolute;font-family:monospace;font-size:13px;color:rgba(128,140,160,.18);white-space:nowrap;transform:rotate(-28deg)}" +
".gate{position:fixed;inset:0;background:#0D1017;display:flex;align-items:center;justify-content:center;z-index:99;flex-direction:column;gap:12px}" +
".gate input{background:#141922;border:1px solid #242C38;border-radius:6px;color:#E8ECF2;padding:9px 12px;width:230px;text-align:center;outline:none}" +
".gate button{background:linear-gradient(135deg,#6366F1,#22D3EE);border:none;color:#fff;font-weight:700;padding:9px 22px;border-radius:6px;cursor:pointer}" +
"@media(max-width:640px){.book{display:none!important}.story{display:block!important}.modes{display:none}}" +
"@media(prefers-reduced-motion:reduce){.leaf{transition:none!important}.story{scroll-behavior:auto!important}}" +
".print{display:none}" +
"@media print{.bar,.stage,.gate{display:none!important}body{overflow:visible;height:auto;background:#fff;color:#111}.print{display:block}.psheet{page-break-after:always;padding:40px 46px;min-height:90vh}.psheet .bh{color:#111}.psheet .bt,.psheet .d,.psheet .bcols{color:#333}.psheet .bpr .dots{border-color:#999}}" +
brandCss +
"</style></head><body class=\"" + templateClass + "\">" +
"<div class=\"bar\"><b id=\"vTitle\"></b><div class=\"modes\" role=\"group\" aria-label=\"Reader mode\"><button type=\"button\" id=\"mB\" class=\"on\" aria-label=\"Use book reader\" aria-pressed=\"true\">Book</button><button type=\"button\" id=\"mS\" aria-label=\"Use story reader\" aria-pressed=\"false\">Story</button></div></div>" +
"<div class=\"stage\" id=\"stage\"><div class=\"book\" id=\"book\"></div><div class=\"story\" id=\"story\"></div>" +
"<button type=\"button\" class=\"arrow l\" id=\"aP\" aria-label=\"Previous page\">\u2039</button><button type=\"button\" class=\"arrow r\" id=\"aN\" aria-label=\"Next page\">\u203a</button>" +
"<div class=\"wm\" id=\"wm\" aria-hidden=\"true\"></div><div class=\"count\" id=\"count\" role=\"status\" aria-live=\"polite\" aria-atomic=\"true\"></div></div>" +
"<div class=\"print\" id=\"print\"></div>" +
"<div class=\"gate\" id=\"gate\" style=\"display:none\"><b>This publication is protected</b><label for=\"gIn\">Publication password</label><input id=\"gIn\" type=\"password\" autocomplete=\"current-password\"><button type=\"button\" id=\"gGo\">Unlock publication</button></div>" +
"<script type=\"application/json\" id=\"folio-data\">" + json + "<" + "/script>" +
"<script>" + viewerScript() + "<" + "/script></body></html>";
  }

  /* Viewer runtime — kept dependency-free and compact. */
  function viewerScript() {
    return [
"(function(){",
"var D=JSON.parse(document.getElementById('folio-data').textContent);",
"var idx=0,pop=null;",
"function esc(s){var d=document.createElement('div');d.textContent=s==null?'':String(s);return d.innerHTML}",
"function attr(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/\"/g,'&quot;').replace(/</g,'&lt;')}",
"function enc(s){return btoa(unescape(encodeURIComponent(s)))}",
"function blockHTML(b){switch(b.type){",
" case 'heading':return '<div class=\"bh bh-'+(b.size||'m')+'\" style=\"text-align:'+(b.align||'left')+'\">'+esc(b.text)+'</div>';",
" case 'text':return '<p class=\"bt\" style=\"text-align:'+(b.align||'left')+'\">'+esc(b.text)+'</p>';",
" case 'image':return b.src?'<img class=\"bimg\" style=\"object-fit:'+(b.fit||'cover')+';object-position:'+(b.focalX==null?50:b.focalX)+'% '+(b.focalY==null?50:b.focalY)+'%\" src=\"'+attr(b.src)+'\" alt=\"'+attr(b.alt||'')+'\">'+(b.caption?'<p class=\"bcap\">'+esc(b.caption)+'</p>':''):'';",
" case 'price':return '<div class=\"bpr\"><span class=\"l\"><span class=\"i\">'+esc(b.item)+'</span><small class=\"d\">'+esc(b.desc)+'</small></span><i class=\"dots\"></i><b class=\"p\">'+esc(b.price)+'</b></div>';",
" case 'quote':return '<div class=\"bq\">'+esc(b.text)+'<cite>'+esc(b.cite)+'</cite></div>';",
" case 'divider':return '<hr>';",
" case 'button':return '<div style=\"text-align:'+(b.align||'left')+'\"><a class=\"bbtn\" href=\"'+attr(b.url||'#')+'\"'+(b.newTab===false?'':' target=\"_blank\" rel=\"noopener noreferrer\"')+'>'+esc(b.label)+'</a></div>';",
" case 'stats':return '<div class=\"bstats\">'+ (b.items||[]).map(function(it){return '<div class=\"bstat\"><b>'+esc(it.v)+'</b><small>'+esc(it.l)+'</small></div>'}).join('') +'</div>';",
" case 'list':return '<ul class=\"blist\">'+ (b.items||[]).map(function(it){return '<li>'+esc(it)+'</li>'}).join('') +'</ul>';",
" case 'cols':var rt=b.ratio==='2-1'?'2fr 1fr':(b.ratio==='1-2'?'1fr 2fr':'1fr 1fr');return '<div class=\"bcols\" style=\"grid-template-columns:'+rt+'\"><p>'+esc(b.left)+'</p><p>'+esc(b.right)+'</p></div>';",
" case 'hero':case 'highlight':return '<div class=\"bpanel '+b.type+'\"><div class=\"bh\">'+esc(b.title)+'</div><p class=\"bt\">'+esc(b.text)+'</p></div>';",
" case 'intro':return '<div class=\"bintro\"><small>'+esc(b.eyebrow)+'</small><div class=\"bh\">'+esc(b.title)+'</div><p class=\"bt\">'+esc(b.text)+'</p></div>';",
" case 'testimonial':return '<div class=\"bq\">'+esc(b.text)+'<cite>'+esc(b.cite)+(b.role?' · '+esc(b.role):'')+'</cite></div>';",
" case 'product':return '<div class=\"bpanel\"><div class=\"bh bh-s\">'+esc(b.title)+'</div><p class=\"bt\">'+esc(b.text)+'</p><b>'+esc(b.price)+'</b></div>';",
" case 'features':return '<div class=\"bstats\">'+(b.items||[]).map(function(it){return '<div class=\"bstat\"><b>'+esc(it.v)+'</b><small>'+esc(it.l)+'</small></div>'}).join('')+'</div>';",
" case 'comparison':return '<div><div class=\"bh bh-s\">'+esc(b.title)+'</div><div class=\"bcols\"><p>'+esc(b.left)+'</p><p>'+esc(b.right)+'</p></div></div>';",
" case 'toc':return '<div><div class=\"bh bh-s\">'+esc(b.title)+'</div><ol class=\"bt\">'+D.pages.map(function(p,i){return '<li>'+esc(p.title)+' · '+(i+1)+'</li>'}).join('')+'</ol></div>';",
" case 'contact':return '<div class=\"bpanel\"><div class=\"bh bh-s\">'+esc(b.title)+'</div><p class=\"bt\">'+esc(b.text)+'</p></div>';",
" case 'cta':return '<div class=\"bpanel\"><div class=\"bh bh-s\">'+esc(b.title)+'</div><p class=\"bt\">'+esc(b.text)+'</p><a class=\"bbtn\" href=\"'+attr(b.url||'#')+'\">'+esc(b.label)+'</a></div>';",
" case 'visual':return '<div class=\"bvisual '+attr(b.tone||'indigo')+'\"><div class=\"bvart\" aria-hidden=\"true\"></div><div class=\"bvcopy\"><div class=\"bh bh-s\">'+esc(b.title)+'</div><p class=\"bt\">'+esc(b.text)+'</p></div></div>';",
" case 'gallery':return '<div class=\"bgallery\">'+(b.items||[]).map(function(it){return '<div class=\"bgitem '+attr(it.tone||'indigo')+'\"><i aria-hidden=\"true\"></i><b>'+esc(it.title)+'</b><small>'+esc(it.text)+'</small></div>'}).join('')+'</div>';",
" default:return ''}}",
"function hotspots(host,p){ (p.hotspots||[]).forEach(function(h){",
" var d=document.createElement('button');d.type='button';d.className='hs';d.setAttribute('aria-label','Open hotspot: '+(h.label||'Note'));d.style.left=h.x+'%';d.style.top=h.y+'%';",
" d.onclick=function(e){e.stopPropagation();closePop();pop=document.createElement('div');pop.className='pop';pop.style.left=h.x+'%';pop.style.top=h.y+'%';",
"  pop.innerHTML='<h4>'+esc(h.label)+'</h4><p>'+esc(h.text)+'</p>';host.appendChild(pop)};host.appendChild(d)})}",
"function closePop(){if(pop&&pop.parentNode)pop.parentNode.removeChild(pop);pop=null}",
"document.addEventListener('click',function(e){if(pop&&!e.target.closest('.hs')&&!e.target.closest('.pop'))closePop()});",
"function renderBook(){var el=document.getElementById('book');el.innerHTML='';",
" D.pages.forEach(function(p,i){var lf=document.createElement('div');lf.className='leaf'+(i<idx?' f':'');",
"  lf.style.zIndex=i<idx?i+1:D.pages.length-i;",
"  var fr=document.createElement('div');fr.className='face front'+(p.layout==='cover'?' lc':'');",
"  if(p.cover){fr.style.background=p.cover.treatment==='solid'?p.cover.color1:'linear-gradient(145deg,'+p.cover.color1+','+p.cover.color2+')';fr.style.color='#fff';fr.style.textAlign=p.cover.align||'center';fr.style.justifyContent=p.cover.vertical||'center'}",
"  fr.innerHTML='<div class=\"eyebrow\">'+esc(D.meta.title)+' \u2014 '+(i+1)+' / '+D.pages.length+'</div>';",
"  var host=document.createElement('div');host.className='bhost';host.innerHTML=(p.blocks||[]).map(blockHTML).join('');fr.appendChild(host);",
"  hotspots(fr,p);",
"  var bk=document.createElement('div');bk.className='face back';bk.textContent='FOLIO \u00b7 '+(i+1);",
"  lf.appendChild(fr);lf.appendChild(bk);",
"  lf.onclick=function(e){if(e.target.closest('.hs')||e.target.closest('.pop')||e.target.closest('a'))return;",
"   if(i===idx&&idx<D.pages.length-1){idx++;sync()}else if(i<idx){idx=i;sync()}};",
"  el.appendChild(lf)})}",
"function renderStory(){var el=document.getElementById('story');el.innerHTML='';",
" D.pages.forEach(function(p,i){var s=document.createElement('div');s.className='slide';",
"  if(p.cover){s.style.background=p.cover.treatment==='solid'?p.cover.color1:'linear-gradient(145deg,'+p.cover.color1+','+p.cover.color2+')';s.style.color='#fff';s.style.textAlign=p.cover.align||'center';s.style.justifyContent=p.cover.vertical||'center'}",
"  s.innerHTML='<div class=\"prog\">'+D.pages.map(function(_,di){return '<span class=\"'+(di<=i?'on':'')+'\"></span>'}).join('')+'</div>';",
"  var host=document.createElement('div');host.className='bhost';host.innerHTML=(p.blocks||[]).map(blockHTML).join('');s.appendChild(host);",
"  hotspots(s,p);el.appendChild(s)});",
" el.onscroll=function(){var i=Math.round(el.scrollTop/el.clientHeight);if(i!==idx&&i>=0&&i<D.pages.length){idx=i;syncCount()}}}",
"function sync(){renderBook();syncCount()}",
"function syncCount(){document.getElementById('count').textContent=String(idx+1).padStart(2,'0')+' / '+String(D.pages.length).padStart(2,'0');",
" document.getElementById('aP').disabled=idx===0;document.getElementById('aN').disabled=idx===D.pages.length-1}",
"var mode='book';",
"function setMode(m){mode=m;var b=m==='book';document.getElementById('book').style.display=b?'block':'none';",
" document.getElementById('story').style.display=b?'none':'block';",
" document.getElementById('mB').classList.toggle('on',b);document.getElementById('mS').classList.toggle('on',!b);document.getElementById('mB').setAttribute('aria-pressed',String(b));document.getElementById('mS').setAttribute('aria-pressed',String(!b))}",
"document.getElementById('mB').onclick=function(){setMode('book')};",
"document.getElementById('mS').onclick=function(){setMode('story')};",
"function go(d){var n=idx+d;if(n<0||n>=D.pages.length)return;idx=n;",
" if(mode==='book'){sync()}else{var st=document.getElementById('story');var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;st.scrollTo({top:idx*st.clientHeight,behavior:reduce?'auto':'smooth'});syncCount()}}",
"document.getElementById('aP').onclick=function(){go(-1)};",
"document.getElementById('aN').onclick=function(){go(1)};",
"document.addEventListener('keydown',function(e){if(e.key==='ArrowRight')go(1);if(e.key==='ArrowLeft')go(-1);if(e.key==='Escape')closePop()});",
"var wasMobile=window.innerWidth<=640;",
"window.addEventListener('resize',function(){var m=window.innerWidth<=640;if(m!==wasMobile){wasMobile=m;setMode(m?'story':'book')}});",
"if(D.settings.wm){var wm=document.getElementById('wm');var stamp=(D.settings.wmText||'CONFIDENTIAL')+' \u00b7 '+new Date().toLocaleDateString();",
" for(var r=0;r<6;r++)for(var c=0;c<4;c++){var sp=document.createElement('span');sp.textContent=stamp;sp.style.top=(r*18+4)+'%';sp.style.left=(c*28-6)+'%';wm.appendChild(sp)}}",
"if(D.settings.pass){var g=document.getElementById('gate');g.style.display='flex';",
" var go=function(){if(enc(document.getElementById('gIn').value)===D.settings.pass){g.style.display='none'}else{document.getElementById('gIn').value='';document.getElementById('gIn').placeholder='Wrong password'}};",
" document.getElementById('gGo').onclick=go;document.getElementById('gIn').onkeydown=function(e){if(e.key==='Enter')go()}}",
"idx=Math.max(0,Math.min(D.pages.length-1,(D.settings.start||1)-1));",
"var hash=parseInt((location.hash.match(/page=(\\d+)/)||[])[1],10);if(hash&&hash>=1&&hash<=D.pages.length)idx=hash-1;",
"var pr=document.getElementById('print');D.pages.forEach(function(p,i){var s=document.createElement('div');s.className='psheet';s.innerHTML='<div class=\"eyebrow\">'+esc(D.meta.title)+' \u00b7 '+(i+1)+'/'+D.pages.length+'</div>'+(p.blocks||[]).map(blockHTML).join('');pr.appendChild(s)});",
"document.getElementById('vTitle').textContent=D.meta.title;",
"renderStory();sync();setMode(window.innerWidth<=640?'story':D.settings.mode||'book');",
"requestAnimationFrame(function(){var st=document.getElementById('story');if(st.style.display!=='none'&&idx>0)st.scrollTop=idx*st.clientHeight});",
"})();"
    ].join("\n");
  }

  /* ---------- Preflight ---------- */
  function preflight() {
    var errs = [], warns = [];
    var s = store.state;
    if (!s.meta.title || s.meta.title === "Untitled Publication") errs.push("Publication has no real title (set it in the Publication panel).");
    var titles = {};
    s.pages.forEach(function (p, i) {
      var n = "Page " + (i + 1);
      if (!p.blocks || !p.blocks.length) errs.push(n + " is empty.");
      if (titles[p.title]) warns.push('Duplicate page title "' + p.title + '".');
      titles[p.title] = true;
      (p.blocks || []).forEach(function (b) {
        if (b.type === "image") {
          if (!b.src && !b.assetId) warns.push(n + ": image block has no image.");
          else if (!b.alt) warns.push(n + ": image is missing alt text.");
          if (b.src && b.src.length > 1.2 * 1024 * 1024) warns.push(n + ": very large image (slows the exported file).");
        }
        if (b.type === "button") {
          if (!b.label || !b.label.trim()) errs.push(n + ": button has no label.");
          if (!b.url || /example\.com/i.test(b.url)) warns.push(n + ": button still points to a placeholder URL.");
          else if (sanitizeUrl(b.url) === "#" && b.url.trim() !== "#") errs.push(n + ": button URL is invalid or uses a blocked scheme.");
        }
        if (b.type === "cta" && (!b.url || (sanitizeUrl(b.url) === "#" && b.url.trim() !== "#"))) errs.push(n + ": CTA URL is invalid or uses a blocked scheme.");
        if (b.text && (/Your title here|Start writing|Untitled publication/.test(b.text))) warns.push(n + ": placeholder text left in content.");
      });
    });
    if (s.settings.password) warns.push("Access Prompt is enabled — recipients will need the password (deterrence only, not encryption).");
    return { errs: errs, warns: warns };
  }

  function renderPreflight() {
    var pf = preflight();
    var list = document.getElementById("preflightList");
    list.innerHTML = "";
    function row(cls, icon, text) {
      var d = document.createElement("div");
      d.className = "pf-item " + cls;
      d.textContent = icon + " " + text;
      list.appendChild(d);
    }
    pf.errs.forEach(function (t) { row("err", "✕", t); });
    pf.warns.forEach(function (t) { row("warn", "!", t); });
    if (!pf.errs.length && !pf.warns.length) row("ok", "✓", "All checks passed — ready to publish.");
    var btn = document.getElementById("btnRunExport");
    btn.disabled = pf.errs.length > 0;
    btn.textContent = pf.errs.length
      ? "Fix errors to export"
      : (document.getElementById("expFormat").value === "zip" ? "Export Website ZIP" : "Export HTML");
    return pf;
  }

  function openCenter() {
    var s = store.state;
    document.getElementById("expFilename").value = (s.meta.title || "publication").replace(/\s+/g, "-").toLowerCase();
    document.getElementById("expTitle").value = s.meta.title || "";
    document.getElementById("expDesc").value = s.meta.desc || "";
    document.getElementById("expAuthor").value = s.meta.author || "";
    document.getElementById("expMode").value = s.settings.mode;
    document.getElementById("expStart").max = s.pages.length;
    document.getElementById("expStart").value = 1;
    var h = document.getElementById("expHistory");
    if (s.exportHistory) {
      var changed = s.updatedAt > s.exportHistory.revision;
      h.innerHTML = "Last export: <b>" + store.escapeHtml(s.exportHistory.filename) + "</b> · " +
        new Date(s.exportHistory.at).toLocaleString() +
        (changed ? ' · <span style="color:var(--warn)">changed since last export</span>' : ' · up to date');
    } else {
      h.textContent = "This publication has not been exported yet.";
    }
    renderPreflight();
    document.getElementById("exportBackdrop").classList.add("open");
  }

  async function runExport() {
    var s = store.state;
    var opts = {
      title: document.getElementById("expTitle").value.trim() || s.meta.title,
      desc: document.getElementById("expDesc").value.trim(),
      author: document.getElementById("expAuthor").value.trim(),
      mode: document.getElementById("expMode").value,
      start: Math.max(1, Math.min(s.pages.length, parseInt(document.getElementById("expStart").value, 10) || 1))
    };
    var fname = (document.getElementById("expFilename").value.trim() || "publication")
      .replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/^-|-$/g, "") || "publication";
    s.meta.desc = opts.desc;
    s.meta.author = opts.author;
    var runButton = document.getElementById("btnRunExport");
    runButton.disabled = true;
    runButton.textContent = "Embedding media…";
    var hydrated;
    try {
      hydrated = global.FolioMedia ? await global.FolioMedia.hydrateProject(s) : s;
    } catch (error) {
      runButton.disabled = false;
      runButton.textContent = "Publish";
      global.FolioToast.show("Publish stopped — " + global.FolioMedia.friendlyError(error, "media could not be embedded"));
      return;
    }
    var html = buildViewer(opts, hydrated);
    var asZip = document.getElementById("expFormat").value === "zip";
    var blob, downloadName;
    if (asZip) {
      var readme =
        "HOSTING YOUR PUBLICATION\n" +
        "========================\n" +
        "Upload the entire '" + fname + "' folder to any static host:\n" +
        "- Shared hosting: copy the folder via FTP; visit /" + fname + "/\n" +
        "- Netlify: drag this folder onto app.netlify.com/drop\n" +
        "- GitHub Pages: commit the folder, enable Pages in repo settings\n" +
        "No build step or server code is required. Deep-link a page with #page=N.\n";
      blob = buildZip([
        { name: fname + "/index.html", data: html },
        { name: fname + "/README.txt", data: readme }
      ]);
      downloadName = fname + ".zip";
    } else {
      blob = new Blob([html], { type: "text/html" });
      downloadName = fname + ".html";
    }
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    s.exportHistory = { at: new Date().toISOString(), filename: downloadName, revision: s.updatedAt, pages: s.pages.length };
    store.save(true);
    document.getElementById("exportBackdrop").classList.remove("open");
    global.FolioToast.show("Published — one file, ready to send or host (print to PDF from the browser)");
    runButton.disabled = false;
    runButton.textContent = "Publish";
  }

  function init() {
    document.getElementById("btnExportHtml").addEventListener("click", openCenter);
    document.getElementById("btnRunExport").addEventListener("click", runExport);
    document.getElementById("expFormat").addEventListener("change", renderPreflight);
    document.getElementById("btnExportCancel").addEventListener("click", function () {
      document.getElementById("exportBackdrop").classList.remove("open");
    });
    document.getElementById("exportBackdrop").addEventListener("click", function (ev) {
      if (ev.target === ev.currentTarget) ev.currentTarget.classList.remove("open");
    });
  }

  global.FolioExport = { init: init, buildViewer: buildViewer };
})(window);
