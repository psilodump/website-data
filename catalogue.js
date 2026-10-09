// Bandzoogle uses Turbo: every page change swaps in a new <body> and re-runs
// this <script>. Everything lives inside this function so a second run can't
// hit "Identifier has already been declared"; a re-run just re-initialises.
(function () {
if (window.__psdCatalogue) { window.__psdCatalogue.init(); return; }

const JS_VERSION = "1.4.0";
const HTML_VERSION = "2.0.0";

// Log version silently to Browser Console (F12) on every load
console.log(`[Psilodump Catalogue] Loaded JS: v${JS_VERSION} | HTML: v${HTML_VERSION}`);

// Secret Debug Trigger: Double-click "Showing X releases" to toggle version badge
function attachDebugTrigger() {
  const stats = document.getElementById("rel-stats");
  if (stats && !stats._debugBound) {
    stats._bound = true;
    stats._debugBound = true;
    stats.style.cursor = "pointer";
    stats.title = "Double-click for script version info";
    stats.addEventListener("dblclick", () => {
      let badge = document.getElementById("rel-debug-badge");
      if (badge) {
        badge.remove();
      } else {
        badge = document.createElement("span");
        badge.id = "rel-debug-badge";
        badge.style.cssText = "display:inline-block; margin-left:8px; padding:2px 6px; background:#333; color:#00ffcc; font-family:monospace; font-size:11px; border-radius:4px;";
        badge.textContent = `JS: v${JS_VERSION} | HTML: v${HTML_VERSION} | Loaded: ${new Date().toLocaleTimeString()}`;
        stats.appendChild(badge);
      }
    });
  }
}

// Safe localStorage access: private browsing, blocked cookies or sandboxed
// embeds can make localStorage throw. Fall back to defaults instead.
function storageGet(key){
  try { return window.localStorage.getItem(key); } catch (e) { return null; }
}
function storageSet(key, value){
  try { window.localStorage.setItem(key, value); } catch (e) { /* ignore */ }
}

// --- Styles and markup ---
// The Bandzoogle embed is only <div id="psd-catalogue"></div> plus this script,
// so Bandzoogle serving a stale edit of the page can't bring back an old
// catalogue: the styles and HTML live here. An older embed that still carries
// its own HTML is left as it is.
const CATALOGUE_CSS = `
/* Container */
.rel-wrap { max-width: 1100px !important; margin: 0 auto !important; font-family: system-ui, -apple-system, sans-serif !important; }

/* Toolbar & Filters Layout */
.rel-controls { margin-bottom: 1rem !important; color: inherit !important; }
.rel-toolbar { display: flex !important; flex-wrap: wrap !important; gap: .5rem !important; margin-bottom: .5rem !important; }

#rel-q { flex: 1 1 220px !important; min-width: 180px !important; padding: .6rem .8rem !important; border: 1px solid #ccc !important; border-radius: 6px !important; background: #fff !important; color: #000 !important; font-size: 14px !important; box-sizing: border-box !important; }

/* Compact Filter Select Dropdowns */
.rel-select { flex: 0 1 auto !important; min-width: 110px !important; padding: .6rem .8rem !important; border: 1px solid #ccc !important; border-radius: 6px !important; background: #fff !important; color: #111 !important; font-size: 13px !important; cursor: pointer !important; outline: none !important; }
.rel-select:focus { border-color: #222 !important; }

/* Active Filter Pills */
.rel-pills { display: flex !important; flex-wrap: wrap !important; gap: .4rem !important; align-items: center !important; margin-top: .6rem !important; min-height: 28px !important; }
.rel-pill { display: inline-flex !important; align-items: center !important; gap: .3rem !important; background: #222 !important; color: #fff !important; padding: .2rem .55rem !important; border-radius: 999px !important; font-size: 12px !important; line-height: 1 !important; }
.rel-pill-remove { cursor: pointer !important; font-weight: bold !important; margin-left: 2px !important; opacity: .8 !important; }
.rel-pill-remove:hover { opacity: 1 !important; }
.rel-clear-all { background: none !important; border: none !important; color: #d9534f !important; font-size: 12px !important; cursor: pointer !important; text-decoration: underline !important; padding: .2rem .4rem !important; }
.rel-copy-link { background: none !important; border: none !important; color: inherit !important; font-size: 12px !important; cursor: pointer !important; text-decoration: underline !important; padding: .2rem .4rem !important; opacity: .85 !important; }

#rel-stats { margin-top: .5rem !important; font-size: 13px !important; opacity: .85 !important; color: inherit !important; }

/* Sort & View Bar */
.rel-sort { display: flex !important; gap: .5rem !important; margin: .6rem 0 1rem !important; flex-wrap: wrap !important; color: inherit !important; }
.rel-sort button { border: 1px solid #bbb !important; background: #fff !important; color: #000 !important; padding: .35rem .6rem !important; border-radius: 6px !important; cursor: pointer !important; font-size: 13px !important; }
.rel-sort button[aria-pressed="true"] { background: #e0e0e0 !important; font-weight: 600 !important; }

/* Grid & Cards */
.rel-grid { display: grid !important; grid-template-columns: repeat( auto-fill, minmax(220px, 1fr) ) !important; gap: 16px !important; }
.rel-card { border: 1px solid #ddd !important; background: #fff !important; color: #111 !important; border-radius: 8px !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; transition: transform 0.15s ease, box-shadow 0.15s ease !important; }
.rel-card:hover { transform: translateY(-2px) !important; box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important; }

/* Cover container with CSS background pattern fallback */
.rel-cover { position: relative !important; width: 100% !important; aspect-ratio: 1/1 !important; background: repeating-linear-gradient(45deg,#eee,#eee 8px,#f6f6f6 8px,#f6f6f6 16px) !important; cursor: pointer !important; }
.rel-cover img { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; position: relative !important; z-index: 1 !important; }

.rel-body { padding: 10px 12px 12px !important; display: flex !important; flex-direction: column !important; flex-grow: 1 !important; }
.rel-title { margin: 0 0 4px !important; font-size: 15px !important; line-height: 1.25 !important; font-weight: 600 !important; }
.rel-title a { color: inherit !important; text-decoration: none !important; }
.rel-title a:hover { text-decoration: underline !important; }
.rel-meta { margin: 0 0 10px !important; font-size: 12px !important; opacity: .8 !important; color: #333 !important; }

/* Listen Button */
.btn-listen { margin-top: auto !important; width: 100% !important; padding: .45rem .6rem !important; background: #222 !important; color: #fff !important; border: none !important; border-radius: 6px !important; font-size: 12px !important; font-weight: 600 !important; cursor: pointer !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: .4rem !important; transition: background 0.15s ease !important; }
.btn-listen:hover { background: #444 !important; }

/* Compact View */
.rel-wrap.compact .rel-grid { grid-template-columns: repeat( auto-fill, minmax(160px, 1fr) ) !important; gap: 12px !important; }
.rel-wrap.compact .rel-title { font-size: 13px !important; }
.rel-wrap.compact .rel-meta { font-size: 11px !important; }
.rel-wrap.compact .btn-listen { padding: .35rem .45rem !important; font-size: 11px !important; }

/* Row/List Layout View */
.rel-wrap.row-view .rel-grid { display: flex !important; flex-direction: column !important; gap: 8px !important; }
.rel-wrap.row-view .rel-card { flex-direction: row !important; align-items: center !important; padding: 8px 12px !important; }
.rel-wrap.row-view .rel-cover { width: 52px !important; height: 52px !important; flex-shrink: 0 !important; border-radius: 4px !important; overflow: hidden !important; }
.rel-wrap.row-view .rel-body { padding: 0 0 0 12px !important; flex-direction: row !important; align-items: center !important; justify-content: space-between !important; gap: 12px !important; width: 100% !important; }
.rel-wrap.row-view .rel-title { font-size: 14px !important; margin: 0 !important; flex: 1 1 auto !important; }
.rel-wrap.row-view .rel-meta { margin: 0 !important; font-size: 12px !important; white-space: nowrap !important; }
.rel-wrap.row-view .btn-listen { width: auto !important; margin: 0 !important; padding: .35rem .75rem !important; white-space: nowrap !important; }

/* Modals with Elevated Z-Index above Site Footer Layer */
.rel-modal-overlay { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(0, 0, 0, 0.85) !important; backdrop-filter: blur(5px) !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 999999 !important; opacity: 0 !important; pointer-events: none !important; transition: opacity 0.2s ease !important; padding: 15px !important; box-sizing: border-box !important; }
.rel-modal-overlay.active { opacity: 1 !important; pointer-events: auto !important; }

.rel-lightbox-img { max-width: 90vw !important; max-height: 85vh !important; border-radius: 8px !important; box-shadow: 0 8px 30px rgba(0,0,0,0.5) !important; object-fit: contain !important; }

.rel-modal-card { background: #181818; color: #fff; width: 100% !important; max-width: 380px !important; border-radius: 12px !important; padding: 20px !important; box-shadow: 0 10px 40px rgba(0,0,0,0.6) !important; text-align: center !important; position: relative !important; }
.rel-modal-cover { width: 110px !important; height: 110px !important; border-radius: 8px !important; margin: 0 auto 12px !important; object-fit: cover !important; display: block !important; box-shadow: 0 4px 15px rgba(0,0,0,0.4) !important; }
.rel-modal-title { font-size: 18px !important; font-weight: 700 !important; margin: 0 0 4px !important; color: #fff !important; }
.rel-modal-meta { font-size: 12px !important; color: #aaa !important; margin-bottom: 16px !important; }
.rel-modal-links { display: flex !important; flex-direction: column !important; gap: 8px !important; }
.rel-svc-link { display: flex !important; align-items: center !important; justify-content: space-between !important; background: #282828 !important; color: #fff !important; text-decoration: none !important; padding: 10px 14px !important; border-radius: 8px !important; font-weight: 600 !important; font-size: 13px !important; transition: background 0.15s ease !important; }
.rel-svc-link:hover { background: #383838 !important; }
.rel-svc-left { display: flex !important; align-items: center !important; gap: 10px !important; }
.rel-svc-icon { 
  width: 20px !important; 
  height: 20px !important; 
  object-fit: contain !important; 
  display: block !important; 
}

.svc-bc { color: #629aa9 !important; }
.svc-sp { color: #1db954 !important; }
.svc-yt { color: #ff0000 !important; }
.svc-am { color: #fc3c44 !important; }

/* Skeleton Loader */
@keyframes rel-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.rel-card.sk { pointer-events: none !important; border-color: #eee !important; }
.sk-block { background: linear-gradient(90deg, #eee 25%, #f7f7f7 50%, #eee 75%) !important; background-size: 200% 100% !important; animation: rel-shimmer 1.4s infinite !important; }
.sk-cover { width: 100% !important; aspect-ratio: 1/1 !important; }
.sk-title { height: 14px !important; margin: 10px 12px 6px !important; border-radius: 4px !important; width: 70% !important; }
.sk-meta { height: 11px !important; margin: 0 12px 12px !important; border-radius: 4px !important; width: 45% !important; }
/* Release page (psilodu.mp/release?r=...) — colours come from the release (--rel-*) */
.psd-rel { max-width: 1000px !important; margin: 0 auto !important; padding: 20px !important; box-sizing: border-box !important; font-family: system-ui, -apple-system, sans-serif !important; background: var(--rel-bg, #181818) !important; color: var(--rel-text, #fff) !important; border-radius: 12px !important; }
.psd-rel a { color: inherit !important; text-decoration: underline !important; text-underline-offset: 2px !important; }
.psd-rel-loading { opacity: .7 !important; background: transparent !important; color: inherit !important; }
.psd-rel-nav { display: flex !important; justify-content: space-between !important; gap: 12px !important; font-size: 14px !important; margin-bottom: 16px !important; }
.psd-rel-nav a { text-decoration: none !important; opacity: .85 !important; }
.psd-rel-nav a:hover { opacity: 1 !important; text-decoration: underline !important; }
.psd-rel-step { display: flex !important; gap: 16px !important; }
.psd-rel-hero { display: grid !important; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr) !important; gap: 28px !important; align-items: start !important; }
.psd-rel-cover { width: 100% !important; aspect-ratio: 1/1 !important; border-radius: 8px !important; overflow: hidden !important; background: var(--rel-deep, #2a2a2a) !important; box-shadow: 0 8px 30px rgba(0,0,0,.35) !important; cursor: zoom-in !important; }
.psd-rel-cover img { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; }
.psd-rel-title { font-size: clamp(24px, 4vw, 38px) !important; line-height: 1.1 !important; margin: 0 0 6px !important; color: inherit !important; font-weight: 700 !important; }
.psd-rel-sub { font-size: 14px !important; opacity: .8 !important; margin-bottom: 18px !important; }
.psd-rel-listen { display: flex !important; flex-wrap: wrap !important; gap: 8px !important; margin-bottom: 18px !important; }
.psd-rel-svc { display: inline-flex !important; align-items: center !important; gap: 8px !important; padding: 8px 12px !important; border-radius: 8px !important; background: var(--rel-deep, #2a2a2a) !important; color: var(--rel-deep-text, #fff) !important; text-decoration: none !important; font-size: 13px !important; font-weight: 600 !important; }
.psd-rel-svc:hover { filter: brightness(1.15) !important; }
.psd-rel-facts { display: grid !important; grid-template-columns: max-content 1fr !important; gap: 6px 14px !important; margin: 0 !important; font-size: 14px !important; }
.psd-rel-facts dt { opacity: .7 !important; margin: 0 !important; font-weight: 400 !important; }
.psd-rel-facts dd { margin: 0 !important; }
.psd-rel-player { margin-top: 24px !important; }
.psd-rel-more { margin-top: 18px !important; font-size: 13px !important; opacity: .85 !important; }
.psd-embed { width: 100% !important; border: 0 !important; border-radius: 12px !important; display: block !important; }
.psd-player { background: var(--rel-soft, #222) !important; color: var(--rel-soft-text, #fff) !important; border-radius: 10px !important; padding: 12px !important; }
.psd-player-note { opacity: .75 !important; font-size: 13px !important; padding: 8px 0 !important; }
.psd-player-bar { display: flex !important; align-items: center !important; gap: 12px !important; }
.psd-pp { width: 44px !important; height: 44px !important; flex: 0 0 44px !important; border-radius: 50% !important; border: none !important; cursor: pointer !important; font-size: 15px !important; background: var(--rel-deep, #2a2a2a) !important; color: var(--rel-deep-text, #fff) !important; }
.psd-now { display: flex !important; flex-direction: column !important; min-width: 0 !important; }
.psd-now-title { font-weight: 600 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
.psd-time { font-size: 12px !important; opacity: .75 !important; font-variant-numeric: tabular-nums !important; }
.psd-progress { height: 6px !important; margin: 12px 0 8px !important; border-radius: 3px !important; background: rgba(127,127,127,.35) !important; cursor: pointer !important; position: relative !important; }
.psd-progress-fill { height: 100% !important; width: 0; border-radius: 3px !important; background: currentColor !important; }
.psd-tracks { list-style: none !important; margin: 0 !important; padding: 0 !important; }
.psd-tracks li { margin: 0 !important; padding: 0 !important; list-style: none !important; }
.psd-tracks button { display: flex !important; width: 100% !important; gap: 10px !important; align-items: baseline !important; padding: 8px 6px !important; border: none !important; border-radius: 6px !important; background: transparent !important; color: inherit !important; font: inherit !important; font-size: 14px !important; text-align: left !important; cursor: pointer !important; }
.psd-tracks button:hover { background: rgba(127,127,127,.18) !important; }
.psd-tracks button.is-current { background: var(--rel-deep, #2a2a2a) !important; color: var(--rel-deep-text, #fff) !important; font-weight: 600 !important; }
.psd-n { opacity: .6 !important; min-width: 1.6em !important; text-align: right !important; font-variant-numeric: tabular-nums !important; }
.psd-t { flex: 1 1 auto !important; }
.psd-d { opacity: .7 !important; font-variant-numeric: tabular-nums !important; }
@media (max-width: 700px) {
  .psd-rel { padding: 14px !important; border-radius: 0 !important; }
  .psd-rel-hero { grid-template-columns: 1fr !important; gap: 18px !important; }
  .psd-rel-cover { max-width: 420px !important; margin: 0 auto !important; }
}
`;

const CATALOGUE_HTML = `
<div class="rel-wrap">
  <div class="rel-controls">
    <div class="rel-toolbar">
      <input id="rel-q" type="search" placeholder="Filter catalogue…">
      <select id="rel-sel-decade" class="rel-select"><option value="">All Decades</option></select>
      <select id="rel-sel-year" class="rel-select"><option value="">All Years</option></select>
      <select id="rel-sel-type" class="rel-select"><option value="">All Types</option></select>
      <select id="rel-sel-series" class="rel-select"><option value="">All Series</option></select>
    </div>

    <!-- Active Filter Badges/Pills -->
    <div id="rel-pills" class="rel-pills"></div>

    <div id="rel-stats" aria-live="polite">Loading release catalogue…</div>
  </div>

  <div class="rel-sort">
    <button type="button" id="rel-sort-date" aria-pressed="true">Newest first</button>
    <button type="button" id="rel-sort-title" aria-pressed="false">Title A→Z</button>
    <button type="button" id="rel-date-mode" aria-pressed="false" title="Toggle date basis">Timeline: Catalogue</button>
    <button type="button" id="rel-view-compact" aria-pressed="false" title="Toggle compact grid">Compact grid</button>
    <button type="button" id="rel-view-rows" aria-pressed="false" title="Toggle list view">Row view</button>
  </div>

  <div id="rel-grid" class="rel-grid" aria-live="polite">
    <article class="rel-card sk"><div class="sk-block sk-cover"></div>
<div class="sk-block sk-title"></div>
<div class="sk-block sk-meta"></div></article>
    <article class="rel-card sk"><div class="sk-block sk-cover"></div>
<div class="sk-block sk-title"></div>
<div class="sk-block sk-meta"></div></article>
    <article class="rel-card sk"><div class="sk-block sk-cover"></div>
<div class="sk-block sk-title"></div>
<div class="sk-block sk-meta"></div></article>
    <article class="rel-card sk"><div class="sk-block sk-cover"></div>
<div class="sk-block sk-title"></div>
<div class="sk-block sk-meta"></div></article>
  </div>
</div>

<!-- Image Lightbox Modal -->
<div id="rel-lightbox" class="rel-modal-overlay">
  <img id="rel-lightbox-img" class="rel-lightbox-img" src="" alt="Album Artwork">
</div>

<!-- Listen / Streaming Links Modal -->
<div id="rel-listen-modal" class="rel-modal-overlay">
  <div class="rel-modal-card">
    <img id="rel-m-cover" class="rel-modal-cover" src="" alt="">
    <h3 id="rel-m-title" class="rel-modal-title"></h3>
    <div id="rel-m-meta" class="rel-modal-meta"></div>
    <div id="rel-m-links" class="rel-modal-links"></div>
  </div>
</div>
`;

function ensureStyles(){
  let el = document.getElementById("psd-catalogue-css");
  if (!el) {
    el = document.createElement("style");
    el.id = "psd-catalogue-css";
    (document.head || document.documentElement).appendChild(el);
  }
  if (el.textContent !== CATALOGUE_CSS) el.textContent = CATALOGUE_CSS;
}

function mountMarkup(){
  const mount = document.getElementById("psd-catalogue");
  if (mount && !mount.firstElementChild && !document.getElementById("rel-grid")) {
    mount.innerHTML = CATALOGUE_HTML;
  }
}

// Persistent Global State to Survive Bandzoogle AJAX Page Swaps
if (!window._psilodumpCat) {
  window._psilodumpCat = {
    rows: [],
    viewRows: [],
    loaded: false,
    loading: false,
    activeDecade: "",
    activeYear: "",
    activeType: "",
    activeSeries: "",
    sortMode: "date",
    dateMode: storageGet("relDateMode") === "released" ? "released" : "catalogue"
  };
}

const CSV_URL = "https://raw.githubusercontent.com/psilodump/website-data/refs/heads/main/releases.csv";
// Icons are static, so they come from the jsDelivr CDN (raw.githubusercontent.com is not meant as a CDN).
const ICON_BASE = "https://cdn.jsdelivr.net/gh/psilodump/website-data@main/icons/";

const DATE_COL    = "Released";
const CATDATE_COL = "Cat Date";
const TITLE_COL   = "Title";
const TYPE_COL    = "Type";
const CAT_COL     = "Cat#";
const SERIES_COL  = "Series";
const COVER_COL   = "Cover";

const TITLE_LINK_FROM = ["Source","Sources","Bandcamp","Spotify","YouTube","Apple"];

const SERVICES = [
  { col:"Bandcamp", label:"Bandcamp", key:"bandcamp", class:"svc-bc" },
  { col:"Spotify",  label:"Spotify",  key:"spotify",  class:"svc-sp" },
  { col:"YouTube",  label:"YouTube",  key:"youtube",  class:"svc-yt" },
  { col:"Apple",    label:"Apple Music", key:"apple", class:"svc-am" },
];

const MULTI_LINK_SEP = /(?:\r?\n|[,;])+/;
const TYPE_SPLIT = /[,;|/]+/;
const SERIES_SPLIT = /[,;|/]+/;

function parseCSV(text){
  const out = []; let row=[], cell="", i=0, q=false;
  while (i < text.length){
    const ch = text[i];
    if (q){ 
      if (ch === '"'){ 
        if (text[i+1] === '"'){ cell += '"'; i++; } else q = false; 
      } else cell += ch; 
    } else { 
      if (ch === '"') q = true; 
      else if (ch === ","){ row.push(cell); cell = ""; }
      else if (ch === "\n"){ row.push(cell); out.push(row); row = []; cell = ""; }
      else if (ch === "\r"){ } 
      else cell += ch; 
    }
    i++;
  }
  if (cell.length || row.length){ row.push(cell); out.push(row); }
  return out.filter(r => r.some(c => String(c).trim() !== ""));
}

function toObjects(matrix){
  const head = matrix[0] || []; 
  const body = matrix.slice(1);
  const alias = {
    'cat_num': 'Cat#', 'cat#': 'Cat#',
    'title': 'Title', 'type': 'Type',
    'released': 'Released', 'cat_date': 'Cat Date',
    'series': 'Series', 'cover': 'Cover',
    'bandcamp': 'Bandcamp', 'spotify': 'Spotify',
    'youtube': 'YouTube', 'apple': 'Apple',
    'source': 'Source', 'sources': 'Sources',
    'label': 'Label', 'artist': 'Artist',
    'bg_color': 'Bg Color', 'bg color': 'Bg Color',
    'text_color': 'Text Color', 'text color': 'Text Color',
    'musicbrainz': 'MusicBrainz', 'part of': 'Part Of', 'part_of': 'Part Of'
  };

  const normHead = head.map(h => {
    const clean = String(h || "").replace(/^\uFEFF/, "").trim();
    return alias[clean.toLowerCase()] || clean;
  });

  return { 
    headers: normHead, 
    rows: body.map(r => Object.fromEntries(normHead.map((h,i) => [h, (r[i]??"").trim()]))) 
  };
}

const esc = s => String(s ?? "")
  .replace(/&/g, "\u0026amp;")
  .replace(/</g, "\u0026lt;")
  .replace(/>/g, "\u0026gt;")
  .replace(/"/g, "\u0026quot;")
  .replace(/'/g, "\u0026#39;");

function expandPlatformUrl(val, platform) {
  if (!val) return "";
  let h = val.trim();
  if (!h) return "";
  if (/^https?:\/\//i.test(h)) return h;
  switch (platform) {
    case "spotify":  return "https://open.spotify.com/album/" + h;
    case "apple":    return "https://music.apple.com/us/album/" + h;
    case "bandcamp": return "https://psilodump.bandcamp.com/album/" + h;
    case "source":
      // The release's page on psilodu.mp: an album number or a page name.
      if (/^\d+$/.test(h)) return "https://psilodu.mp/album/" + h;
      if (/^[a-z0-9-]+$/i.test(h)) return "https://psilodu.mp/" + h;
      return "https://" + h;
    default:         return "https://" + h;
  }
}

function normHref(v){ 
  if(!v) return ""; let h = v.trim(); if(!h) return "";
  if(/^mailto:/i.test(h) || /^https?:/i.test(h)) return h; 
  return "https://" + h; 
}

function firstUrlFrom(row, cols){
  for (const c of cols){ 
    const v = row[c]; 
    if(v){ 
      const f = String(v).split(MULTI_LINK_SEP).map(x => x.trim()).filter(Boolean)[0]; 
      if(f) {
        const expanded = expandPlatformUrl(f, c.toLowerCase());
        return normHref(expanded);
      }
    } 
  }
  return "";
}

// Read the year straight from the text. Parsing with Date.parse() treats
// "1996" / "2005-01-01" as midnight UTC, so visitors west of UTC got the
// previous year from getFullYear().
function yearFromString(raw){
  const s = String(raw ?? "").trim();
  if (!s) return "Unknown";
  const m = s.match(/(?:^|\D)(\d{4})(?!\d)/);
  if (m) return m[1];
  const t = Date.parse(s);
  return isNaN(t) ? "Unknown" : String(new Date(t).getUTCFullYear());
}

function decadeFromYear(y){
  if (!y || y === "Unknown") return "Unknown";
  const n = Number(y);
  return isNaN(n) ? "Unknown" : Math.floor(n / 10) * 10 + "s";
}

function getCoverUrl(r, isLarge = false) {
  if (r[COVER_COL] && r[COVER_COL].trim() !== "") {
    let url = r[COVER_COL].trim();
    return isLarge ? url.replace('/thumb_', '/large_') : url;
  }
  return "";
}

function withDerived(arr){
  return arr.map(r => {
    const svc = SERVICES.map(s => {
      const raw = r[s.col] || ""; 
      const f = String(raw).split(MULTI_LINK_SEP).map(x => x.trim()).filter(Boolean)[0] || "";
      const expanded = expandPlatformUrl(f, s.key);
      return expanded ? { href: normHref(expanded), label: s.label, key: s.key, class: s.class } : null;
    }).filter(Boolean);
    
    const relDate = r[DATE_COL] || "";
    const catDate = r[CATDATE_COL] || "";
    const yearRel = yearFromString(relDate);
    const yearCat = yearFromString(catDate);

    const searchTerms = [
      r[TITLE_COL], r[TYPE_COL], r[CAT_COL], r[SERIES_COL],
      r["Label"], r["Source"], r["Sources"],
      relDate, catDate, yearRel, yearCat
    ].filter(Boolean).join(" ").toLowerCase();

    return {
      ...r,
      _released:  relDate,
      _catalogue: catDate,
      _yearRel:   yearRel,
      _yearCat:   yearCat,
      _types: String(r[TYPE_COL] || "").split(TYPE_SPLIT).map(x => x.trim()).filter(Boolean),
      _series: String(r[SERIES_COL] || "").split(SERIES_SPLIT).map(x => x.trim()).filter(Boolean),
      _titleHref: firstUrlFrom(r, TITLE_LINK_FROM),
      _svc: svc,
      _thumbUrl: getCoverUrl(r, false),
      _largeUrl: getCoverUrl(r, true),
      _searchStr: searchTerms
    };
  });
}

const currentYear = r => window._psilodumpCat.dateMode === "catalogue" ? r._yearCat : r._yearRel;
const currentDecade = r => decadeFromYear(currentYear(r));

function currentDateValue(r){
  const raw = window._psilodumpCat.dateMode === "catalogue" ? r._catalogue : r._released;
  const t = Date.parse(raw);
  return isNaN(t) ? -Infinity : t;
}

function sortView(){
  const cat = window._psilodumpCat;
  if (cat.sortMode === "title"){
    // numeric: "vol.2" before "vol.10"; sensitivity base: ignore case/accents when comparing
    cat.viewRows.sort((a,b) => String(a[TITLE_COL] || "").localeCompare(String(b[TITLE_COL] || ""), undefined, { numeric: true, sensitivity: "base" }));
  } else {
    cat.viewRows.sort((a,b) => currentDateValue(b) - currentDateValue(a));
  }
}

function icon(key){
  const iconMap = {
    "bandcamp": "bandcamp.png",
    "spotify":  "spotify.png",
    "youtube":  "youtube.png",
    "apple":    "applemusic.png"
  };
  const fileName = iconMap[key];
  if (!fileName) return "";
  return `<img src="${ICON_BASE}${fileName}" alt="${esc(key)}" class="rel-svc-icon">`;
}

// --- Release colours ---
// Each release has a background colour from the admin tool. The Listen button
// uses it 15% darker and the pop-up links 40% darker, so the text colour is
// worked out here for each shade (WCAG contrast: white or near-black,
// whichever reads better), instead of reusing one stored text colour.
function hexToRgb(hex){
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) return null;                     // ignore anything that isn't a plain #rrggbb
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function luminance(rgb){
  const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
}
const DARK_TEXT_LUM = luminance([17, 17, 17]);
// Returns {bg, text} for the colour darkened to `shade` (1 = as is), or null.
function releaseSurface(bgHex, shade){
  const rgb = hexToRgb(bgHex);
  if (!rgb) return null;
  const c = rgb.map(v => Math.round(v * shade));
  const L = luminance(c);
  const onDark = (L + 0.05) / (DARK_TEXT_LUM + 0.05);
  const onWhite = 1.05 / (L + 0.05);
  return { bg: `rgb(${c.join(",")})`, text: onDark > onWhite ? "#111111" : "#ffffff" };
}

function card(r, idx){
  const coverHtml = r._thumbUrl 
    ? `<img loading="lazy" src="${esc(r._thumbUrl)}" alt="${esc(r[TITLE_COL] || "Cover")}" onerror="this.style.display='none'">` 
    : '';
  // data-* attributes + one shared click listener (below) instead of inline onclick,
  // so URLs containing quotes can't break the handler.
  const coverClick = r._largeUrl ? `data-lightbox="${esc(r._largeUrl)}" data-thumb="${esc(r._thumbUrl)}" role="button" tabindex="0" aria-label="View larger artwork: ${esc(r[TITLE_COL] || "")}"` : '';
  const title = RELEASE_LINKS
    ? `<a href="${esc(releaseHref(r))}">${esc(r[TITLE_COL] || "(untitled)")}</a>`
    : r._titleHref ? `<a href="${esc(r._titleHref)}" target="_blank" rel="noopener nofollow">${esc(r[TITLE_COL] || "(untitled)")}</a>` : esc(r[TITLE_COL] || "(untitled)");
  const activeDate = window._psilodumpCat.dateMode === "catalogue" ? r._catalogue : r._released;
  const metaBits = [ activeDate, r[TYPE_COL], r[CAT_COL] ].filter(Boolean).map(esc);
  const meta = metaBits.join(" • ");
  
  const btn = releaseSurface(r['Bg Color'] || r['bg_color'], 0.85);
  const btnStyle = btn
    ? `style="background-color: ${btn.bg} !important; color: ${btn.text} !important;"`
    : '';

  const listenBtn = r._svc.length 
    ? `<button class="btn-listen" ${btnStyle} data-listen="${idx}">Listen / Download</button>` 
    : ``;

  return `<article class="rel-card">
    <div class="rel-cover" ${coverClick}>${coverHtml}</div>
    <div class="rel-body">
      <h3 class="rel-title">${title}</h3>
      ${meta ? `<div class="rel-meta">${meta}</div>` : ``}
      ${listenBtn}
    </div>
  </article>`;
}

function render(){
  const grid = document.getElementById("rel-grid");
  if (!grid) return;
  const cat = window._psilodumpCat;
  grid.innerHTML = cat.viewRows.map((r, idx) => card(r, idx)).join("");
  const stats = document.getElementById("rel-stats");
  if (stats) stats.innerHTML = `Showing <strong>${cat.viewRows.length}</strong> release${cat.viewRows.length === 1 ? "" : "s"}`;
  renderFilterPills();
  syncHash();
}

function renderFilterPills(){
  const pillsWin = document.getElementById("rel-pills");
  if (!pillsWin) return;
  const cat = window._psilodumpCat;
  const pills = [];

  const qEl = document.getElementById("rel-q");
  const q = qEl ? qEl.value.trim() : "";
  if (q) pills.push({ label: `Search: ${q}`, clear: () => { const el = document.getElementById("rel-q"); if(el) el.value = ""; } });
  if (cat.activeDecade) pills.push({ label: `Decade: ${cat.activeDecade}`, clear: () => { cat.activeDecade = ""; const el = document.getElementById("rel-sel-decade"); if(el) el.value = ""; } });
  if (cat.activeYear) pills.push({ label: `Year: ${cat.activeYear}`, clear: () => { cat.activeYear = ""; const el = document.getElementById("rel-sel-year"); if(el) el.value = ""; } });
  if (cat.activeType) pills.push({ label: `Type: ${cat.activeType}`, clear: () => { cat.activeType = ""; const el = document.getElementById("rel-sel-type"); if(el) el.value = ""; } });
  if (cat.activeSeries) pills.push({ label: `Series: ${cat.activeSeries}`, clear: () => { cat.activeSeries = ""; const el = document.getElementById("rel-sel-series"); if(el) el.value = ""; } });

  if (!pills.length) {
    pillsWin.innerHTML = "";
    return;
  }

  pillsWin.innerHTML = pills.map((p, i) => 
    `<span class="rel-pill">${esc(p.label)} <span class="rel-pill-remove" data-pill="${i}" role="button" tabindex="0" aria-label="Remove filter">✕</span></span>`
  ).join("") + `<button type="button" class="rel-clear-all">Clear all</button>`
    + `<button type="button" class="rel-copy-link">Copy link</button>`;

  window._currentPills = pills;
}

window.removePill = function(index){
  if (window._currentPills && window._currentPills[index]){
    window._currentPills[index].clear();
    applyFilters();
  }
};

window.clearAllFilters = function(){
  const cat = window._psilodumpCat;
  cat.activeDecade = ""; cat.activeYear = ""; cat.activeType = ""; cat.activeSeries = "";
  const d = document.getElementById("rel-sel-decade"); if(d) d.value = "";
  const y = document.getElementById("rel-sel-year"); if(y) y.value = "";
  const t = document.getElementById("rel-sel-type"); if(t) t.value = "";
  const s = document.getElementById("rel-sel-series"); if(s) s.value = "";
  const q = document.getElementById("rel-q"); if(q) q.value = "";
  applyFilters();
};

// --- Shareable links: the filters live in the address, e.g. #type=EP&q=saturnus ---
// replaceState (not pushState) so typing doesn't add a history entry per key,
// and it passes history.state through because Turbo keeps its own data there.
const HASH_KEYS = ["q", "decade", "year", "type", "series", "sort", "timeline"];

function hashParams(){
  const p = new URLSearchParams(location.hash.replace(/^#/, ""));
  return HASH_KEYS.some(k => p.has(k)) ? p : null;
}

function stateToHash(){
  const cat = window._psilodumpCat;
  const qEl = document.getElementById("rel-q");
  const p = new URLSearchParams();
  const q = qEl ? qEl.value.trim() : "";
  if (q) p.set("q", q);
  if (cat.activeDecade) p.set("decade", cat.activeDecade);
  if (cat.activeYear) p.set("year", cat.activeYear);
  if (cat.activeType) p.set("type", cat.activeType);
  if (cat.activeSeries) p.set("series", cat.activeSeries);
  if (cat.sortMode === "title") p.set("sort", "title");
  // Years differ between the two timelines, so a link with a year or decade says which one.
  if (cat.activeYear || cat.activeDecade) p.set("timeline", cat.dateMode);
  return p.toString().replace(/\+/g, "%20");
}

function syncHash(){
  if (!document.getElementById("rel-grid")) return;
  const h = stateToHash();
  const current = location.hash.replace(/^#/, "");
  if (h === current) return;
  if (!h && current && !hashParams()) return;      // someone else's #anchor: leave it alone
  history.replaceState(history.state, "", location.pathname + location.search + (h ? "#" + h : ""));
}

// Apply the filters from the address. Returns false if it has none of ours.
function applyHash(){
  const p = hashParams();
  if (!p) return false;
  const cat = window._psilodumpCat;
  cat.activeDecade = p.get("decade") || "";
  cat.activeYear = p.get("year") || "";
  cat.activeType = p.get("type") || "";
  cat.activeSeries = p.get("series") || "";
  cat.sortMode = p.get("sort") === "title" ? "title" : "date";
  const tl = p.get("timeline");
  if (tl === "released" || tl === "catalogue") cat.dateMode = tl;   // for this visit only, not saved
  const qEl = document.getElementById("rel-q"); if (qEl) qEl.value = p.get("q") || "";
  document.getElementById("rel-sort-date")?.setAttribute("aria-pressed", cat.sortMode === "date" ? "true" : "false");
  document.getElementById("rel-sort-title")?.setAttribute("aria-pressed", cat.sortMode === "title" ? "true" : "false");
  return true;
}

function copyViewLink(btn){
  const url = location.href;
  const done = () => { btn.textContent = "Link copied ✓"; setTimeout(() => { btn.textContent = "Copy link"; }, 2000); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(done, () => window.prompt("Copy this link:", url));
  } else {
    window.prompt("Copy this link:", url);
  }
}

function populateSelectOptions(){
  const cat = window._psilodumpCat;
  const decades = Array.from(new Set(cat.rows.map(currentDecade))).filter(d => d !== "Unknown").sort((a,b) => Number(b.replace("s","")) - Number(a.replace("s","")));
  const years = Array.from(new Set(cat.rows.map(currentYear))).sort((a,b) => (a === "Unknown") - (b === "Unknown") || Number(b) - Number(a));
  const types = Array.from(new Set(cat.rows.flatMap(r => r._types))).sort((a,b) => a.localeCompare(b));
  const series = Array.from(new Set(cat.rows.flatMap(r => r._series))).sort((a,b) => a.localeCompare(b));

  const elD = document.getElementById("rel-sel-decade"); if(elD) elD.innerHTML = `<option value="">All Decades</option>` + decades.map(d => `<option value="${esc(d)}" ${d===cat.activeDecade?'selected':''}>${esc(d)}</option>`).join("");
  const elY = document.getElementById("rel-sel-year"); if(elY) elY.innerHTML = `<option value="">All Years</option>` + years.map(y => `<option value="${esc(y)}" ${y===cat.activeYear?'selected':''}>${esc(y)}</option>`).join("");
  const elT = document.getElementById("rel-sel-type"); if(elT) elT.innerHTML = `<option value="">All Types</option>` + types.map(t => `<option value="${esc(t)}" ${t===cat.activeType?'selected':''}>${esc(t)}</option>`).join("");
  const elS = document.getElementById("rel-sel-series"); if(elS) elS.innerHTML = `<option value="">All Series</option>` + series.map(s => `<option value="${esc(s)}" ${s===cat.activeSeries?'selected':''}>${esc(s)}</option>`).join("");
}

function applyFilters(){
  const cat = window._psilodumpCat;
  const qEl = document.getElementById("rel-q");
  const q = qEl ? qEl.value.trim().toLowerCase() : "";
  cat.viewRows = cat.rows.filter(r => {
    if (cat.activeDecade && currentDecade(r) !== cat.activeDecade) return false;
    if (cat.activeYear && currentYear(r) !== cat.activeYear) return false;
    if (cat.activeType && !r._types.some(t => t.toLowerCase() === cat.activeType.toLowerCase())) return false;
    if (cat.activeSeries && !r._series.some(s => s.toLowerCase() === cat.activeSeries.toLowerCase())) return false;
    if (q && !r._searchStr.includes(q)) return false;
    return true;
  });
  sortView();
  render();
}

// Show the cover's thumbnail at once (the browser already has it from the
// grid), then swap in the large image when it has downloaded. Without this the
// previously viewed cover stayed on screen while the new one loaded.
let lightboxRequest = 0;
window.openLightbox = function(url, thumbUrl){
  const lb = document.getElementById("rel-lightbox");
  const img = document.getElementById("rel-lightbox-img");
  if (img) {
    const request = ++lightboxRequest;            // ignore late loads from earlier clicks
    if (thumbUrl) {
      img.src = thumbUrl;
      img.style.visibility = "visible";
    } else {
      img.style.visibility = "hidden";            // nothing to show yet: show nothing, not the old cover
    }
    if (url && url !== thumbUrl) {
      const large = new Image();
      large.onload = () => {
        if (request !== lightboxRequest) return;
        img.src = url;
        img.style.visibility = "visible";
      };
      large.onerror = () => { if (request === lightboxRequest) img.style.visibility = "visible"; };
      large.src = url;
    } else if (url) {
      img.src = url;
      img.style.visibility = "visible";
    }
  }
  if (lb) lb.classList.add("active");
};

window.openListenModal = function(idx){
  const cat = window._psilodumpCat;
  const r = cat.viewRows[idx];
  if (!r) return;
  
  const bgHex = hexToRgb(r['Bg Color'] || r['bg_color']) ? (r['Bg Color'] || r['bg_color']) : '#181818';
  const panel = releaseSurface(bgHex, 1);
  const link = releaseSurface(bgHex, 0.6);

  const card = document.querySelector('.rel-modal-card');
  if (card) {
    card.style.setProperty('background-color', panel.bg, 'important');
    card.style.setProperty('color', panel.text, 'important');
  }
  
  const cov = document.getElementById("rel-m-cover"); 
  if(cov) {
    cov.src = r._thumbUrl || "";
    cov.style.display = r._thumbUrl ? "block" : "none";
  }
  
  const tit = document.getElementById("rel-m-title"); if(tit) tit.textContent = r[TITLE_COL] || "";
  // Same date as the card: follows the Catalogue / Released timeline toggle.
  const activeDate = cat.dateMode === "catalogue" ? r._catalogue : r._released;
  const met = document.getElementById("rel-m-meta"); if(met) met.textContent = [ activeDate, r[TYPE_COL], r[CAT_COL] ].filter(Boolean).join(" • ");
  // bandzoogle.php's CSS fixes the title to white and the meta line to grey;
  // follow the panel's text colour instead so light covers stay readable.
  if (tit) tit.style.setProperty('color', panel.text, 'important');
  if (met) { met.style.setProperty('color', panel.text, 'important'); met.style.setProperty('opacity', '0.75', 'important'); }
  
  const linkBtnStyle = `style="background-color: ${link.bg} !important; color: ${link.text} !important;"`;

  const linksWin = document.getElementById("rel-m-links");
  if(linksWin) {
    linksWin.innerHTML = r._svc.map(s => 
      `<a class="rel-svc-link" ${linkBtnStyle} href="${esc(s.href)}" target="_blank" rel="noopener nofollow">
        <span class="rel-svc-left"><span class="${s.class}">${icon(s.key)}</span> ${esc(s.label)}</span>
        <span>&#10140;</span>
      </a>`
    ).join("");
  }

  const modal = document.getElementById("rel-listen-modal");
  if(modal) modal.classList.add("active");
};

if (!window._psilodumpModalDelegated) {
  window._psilodumpModalDelegated = true;

  // One click listener for the whole catalogue (survives Turbo page swaps,
  // because it sits on document and the grid is re-rendered inside it).
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.classList.contains('rel-modal-overlay') || t.classList.contains('rel-lightbox-img')) {
      t.closest('.rel-modal-overlay')?.classList.remove('active');
      return;
    }
    // Release page player
    const track = t.closest('[data-psd-track]');
    if (track) {
      const i = Number(track.getAttribute('data-psd-track')), p = window._psdPlayer;
      if (p && p.index === i && !p.audio.paused) p.audio.pause(); else playTrack(i);
      return;
    }
    if (t.closest('[data-psd-play]')) {
      const p = window._psdPlayer;
      if (p) { if (p.audio.paused) playTrack(p.index); else p.audio.pause(); }
      return;
    }
    const seek = t.closest('[data-psd-seek]');
    if (seek) {
      const p = window._psdPlayer;
      if (p && isFinite(p.audio.duration)) {
        const box = seek.getBoundingClientRect();
        p.audio.currentTime = Math.max(0, Math.min(1, (e.clientX - box.left) / box.width)) * p.audio.duration;
      }
      return;
    }
    const cover = t.closest('[data-lightbox]');
    if (cover) { window.openLightbox(cover.getAttribute('data-lightbox'), cover.getAttribute('data-thumb')); return; }
    const listen = t.closest('[data-listen]');
    if (listen) { window.openListenModal(Number(listen.getAttribute('data-listen'))); return; }
    const pill = t.closest('[data-pill]');
    if (pill) { window.removePill(Number(pill.getAttribute('data-pill'))); return; }
    if (t.closest('.rel-clear-all')) { window.clearAllFilters(); return; }
    const copy = t.closest('.rel-copy-link');
    if (copy) copyViewLink(copy);
  });

  // A link or an edited address with new filters, while already on the page.
  window.addEventListener('hashchange', () => {
    const cat = window._psilodumpCat;
    if (!cat.loaded || !document.getElementById('rel-grid') || !applyHash()) return;
    populateSelectOptions();
    applyDateModeUI();
    applyFilters();
  });

  // Keyboard: Escape closes any open pop-up; Enter/Space on a focused cover
  // or filter pill acts like a click.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.rel-modal-overlay.active').forEach(m => m.classList.remove('active'));
      return;
    }
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.target instanceof Element && e.target.matches('[data-psd-seek]')) {
      const p = window._psdPlayer;
      if (p && isFinite(p.audio.duration)) { e.preventDefault(); p.audio.currentTime = Math.max(0, Math.min(p.audio.duration, p.audio.currentTime + (e.key === 'ArrowLeft' ? -5 : 5))); }
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target instanceof Element && e.target.matches('[data-lightbox], [data-pill]')) {
      e.preventDefault();
      e.target.click();
    }
  });
}

function applyView(compact, rowView){
  const wrap = document.querySelector('.rel-wrap');
  if(!wrap) return;
  wrap.classList.toggle('compact', !!compact);
  wrap.classList.toggle('row-view', !!rowView);
  document.getElementById('rel-view-compact')?.setAttribute('aria-pressed', compact ? 'true' : 'false');
  document.getElementById('rel-view-rows')?.setAttribute('aria-pressed', rowView ? 'true' : 'false');
}

function initViewToggle(){
  const savedViewCompact = storageGet('relViewCompact') !== '0';
  const savedViewRows = storageGet('relViewRows') === '1';
  applyView(savedViewCompact, savedViewRows);
  
  const btnCompact = document.getElementById('rel-view-compact');
  if (btnCompact && !btnCompact._bound) {
    btnCompact._bound = true;
    btnCompact.addEventListener('click', () => {
      const wrap = document.querySelector('.rel-wrap');
      const nowCompact = !wrap.classList.contains('compact');
      storageSet('relViewCompact', nowCompact ? '1' : '0');
      if (nowCompact) storageSet('relViewRows', '0');
      applyView(nowCompact, false);
    });
  }

  const btnRows = document.getElementById('rel-view-rows');
  if (btnRows && !btnRows._bound) {
    btnRows._bound = true;
    btnRows.addEventListener('click', () => {
      const wrap = document.querySelector('.rel-wrap');
      const nowRows = !wrap.classList.contains('row-view');
      storageSet('relViewRows', nowRows ? '1' : '0');
      if (nowRows) storageSet('relViewCompact', '0');
      applyView(false, nowRows);
    });
  }
}

function applyDateModeUI(){
  const cat = window._psilodumpCat;
  const modeBtn = document.getElementById("rel-date-mode");
  if(!modeBtn) return;
  modeBtn.textContent = "Timeline: " + (cat.dateMode === "catalogue" ? "Catalogue" : "Released");
  modeBtn.setAttribute("aria-pressed", cat.dateMode === "catalogue" ? "true" : "false");
}

function initDateModeToggle(){
  applyDateModeUI();
  const modeBtn = document.getElementById("rel-date-mode");
  if (modeBtn && !modeBtn._bound) {
    modeBtn._bound = true;
    modeBtn.addEventListener("click", () => {
      const cat = window._psilodumpCat;
      cat.dateMode = (cat.dateMode === "released") ? "catalogue" : "released";
      storageSet("relDateMode", cat.dateMode);
      populateSelectOptions();
      applyFilters();
      applyDateModeUI();
    });
  }
}

function bindUIEvents() {
  const cat = window._psilodumpCat;

  const q = document.getElementById("rel-q");
  if (q && !q._bound) { q._bound = true; q.addEventListener("input", applyFilters); }

  const selD = document.getElementById("rel-sel-decade");
  if (selD && !selD._bound) { selD._bound = true; selD.addEventListener("change", (e) => { cat.activeDecade = e.target.value; applyFilters(); }); }

  const selY = document.getElementById("rel-sel-year");
  if (selY && !selY._bound) { selY._bound = true; selY.addEventListener("change", (e) => { cat.activeYear = e.target.value; applyFilters(); }); }

  const selT = document.getElementById("rel-sel-type");
  if (selT && !selT._bound) { selT._bound = true; selT.addEventListener("change", (e) => { cat.activeType = e.target.value; applyFilters(); }); }

  const selS = document.getElementById("rel-sel-series");
  if (selS && !selS._bound) { selS._bound = true; selS.addEventListener("change", (e) => { cat.activeSeries = e.target.value; applyFilters(); }); }

  const btnDate = document.getElementById("rel-sort-date");
  if (btnDate && !btnDate._bound) {
    btnDate._bound = true;
    btnDate.addEventListener("click", () => {
      cat.sortMode = "date";
      document.getElementById("rel-sort-date")?.setAttribute("aria-pressed","true");
      document.getElementById("rel-sort-title")?.setAttribute("aria-pressed","false");
      sortView(); render();
    });
    attachDebugTrigger();
  }

  const btnTitle = document.getElementById("rel-sort-title");
  if (btnTitle && !btnTitle._bound) {
    btnTitle._bound = true;
    btnTitle.addEventListener("click", () => {
      cat.sortMode = "title";
      document.getElementById("rel-sort-title")?.setAttribute("aria-pressed","true");
      document.getElementById("rel-sort-date")?.setAttribute("aria-pressed","false");
      sortView(); render();
    });
  }

  initViewToggle();
  initDateModeToggle();
}

// The pop-ups sit inside a Bandzoogle section with its own stacking layer
// (z-index: 1), so the site footer is drawn over them. Moving them to be
// direct children of <body> lets their z-index apply to the whole page.
function moveModalsToBody(){
  ["rel-lightbox", "rel-listen-modal"].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.parentElement !== document.body) document.body.appendChild(el);
  });
}

// --- Release page: psilodu.mp/release?r=<id> ---
// One Bandzoogle page (/release) with <div id="psd-release"></div> + this script
// shows any release. <id> is the Cat# (DMTCD19/20 -> DMTCD19-20) or, without a
// Cat#, title + year (psilodumputer-2000). Releases on Bandzoogle get our own
// player, built from their album page's track list (same site, so it can be read).
const RELEASE_PATH = "/release";
const CATALOGUE_PATH = "/";
// Catalogue titles link to the release page. Turn on once the /release page exists.
const RELEASE_LINKS = false;

function slugify(s){
  return String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function releaseKey(r){
  const cat = String(r[CAT_COL] || "").trim().replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (cat) return cat;
  const y = r._yearRel !== "Unknown" ? r._yearRel : (r._yearCat !== "Unknown" ? r._yearCat : "");
  return [slugify(r[TITLE_COL]), y].filter(Boolean).join("-");
}
const releaseHref = r => RELEASE_PATH + "?r=" + encodeURIComponent(releaseKey(r));

// The Bandzoogle album number in Source ("3319229" or a psilodu.mp/album/... address), or "".
function bzAlbumId(r){
  const s = String(r["Source"] || "").trim();
  if (/^\d+$/.test(s)) return s;
  const m = s.match(/psilodu\.mp\/album\/(\d+)/i);
  return m ? m[1] : "";
}
function platformId(r, col, re){
  const v = String(r[col] || "").split(MULTI_LINK_SEP).map(x => x.trim()).filter(Boolean)[0] || "";
  if (!v) return "";
  if (!/^https?:\/\//i.test(v)) return v;
  const m = v.match(re);
  return m ? m[1] : "";
}
const fmtTime = s => !isFinite(s) || s < 0 ? "0:00" : Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

// Load releases.csv once per visit; shared by the catalogue and the release page.
function loadCatalogue(){
  const cat = window._psilodumpCat;
  if (cat.loaded) return Promise.resolve(cat.rows);
  if (!cat._promise) {
    cat.loading = true;
    cat._promise = fetch(CSV_URL + "?v=" + Date.now())
      .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
      .then(text => {
        const { rows: raw } = toObjects(parseCSV(text));
        cat.rows = withDerived(raw);
        cat.viewRows = [...cat.rows];
        cat.loaded = true;
        cat.loading = false;
        return cat.rows;
      })
      .catch(err => { cat.loading = false; cat._promise = null; throw err; });
  }
  return cat._promise;
}

function initRelease(){
  const mount = document.getElementById("psd-release");
  if (!mount || mount._psdShown === location.search) return;
  mount._psdShown = location.search;
  ensureStyles();
  mount.innerHTML = `<div class="psd-rel psd-rel-loading">Loading release…</div>`;
  loadCatalogue()
    .then(rows => renderRelease(mount, rows))
    .catch(err => {
      console.error("Failed to load release data:", err);
      mount.innerHTML = `<div class="psd-rel">Unable to load the release right now. Please refresh the page.</div>`;
    });
}

function renderRelease(mount, rows){
  const key = (new URLSearchParams(location.search).get("r") || "").trim();
  const r = key && rows.find(x => releaseKey(x).toLowerCase() === key.toLowerCase());
  if (!r) {
    mount.innerHTML = `<div class="psd-rel"><nav class="psd-rel-nav"><a href="${CATALOGUE_PATH}">← Catalogue</a></nav>
      <h1 class="psd-rel-title">Release not found</h1>
      <p>${key ? `Nothing in the catalogue is called “${esc(key)}”. <a href="${CATALOGUE_PATH}#q=${encodeURIComponent(key)}">Search the catalogue</a>.` : `<a href="${CATALOGUE_PATH}">Browse the catalogue</a>.`}</p></div>`;
    document.title = "Release not found | psilodump";
    return;
  }

  // Newer / older neighbours in catalogue order (catalogue date, newest first).
  const byDate = v => { const t = Date.parse(v._catalogue || v._released); return isNaN(t) ? -Infinity : t; };
  const ordered = [...rows].sort((a, b) => byDate(b) - byDate(a));
  const pos = ordered.indexOf(r);
  const newer = ordered[pos - 1], older = ordered[pos + 1];

  const panel = releaseSurface(r["Bg Color"], 1) || { bg: "#181818", text: "#ffffff" };
  const soft = releaseSurface(r["Bg Color"], 0.85) || { bg: "#222222", text: "#ffffff" };
  const deep = releaseSurface(r["Bg Color"], 0.6) || { bg: "#2a2a2a", text: "#ffffff" };
  const vars = `--rel-bg:${panel.bg};--rel-text:${panel.text};--rel-soft:${soft.bg};--rel-soft-text:${soft.text};--rel-deep:${deep.bg};--rel-deep-text:${deep.text}`;

  const title = r[TITLE_COL] || "(untitled)";
  const link = (x, label) => `<a href="${esc(releaseHref(x))}">${esc(label || x[TITLE_COL] || "(untitled)")}</a>`;
  const facts = [];
  if (r._released) facts.push(["Released", esc(r._released)]);
  if (r._catalogue && r._catalogue !== r._released) facts.push(["Catalogue date", esc(r._catalogue)]);
  if (r[TYPE_COL]) facts.push(["Type", esc(r[TYPE_COL])]);
  if (r[CAT_COL]) facts.push(["Cat#", esc(r[CAT_COL])]);
  if (r._series.length) facts.push(["Series", r._series.map(s => `<a href="${CATALOGUE_PATH}#series=${encodeURIComponent(s)}">${esc(s)}</a>`).join(", ")]);
  const parent = r["Part Of"] && rows.find(x => x["MusicBrainz"] && x["MusicBrainz"] === r["Part Of"]);
  if (parent) facts.push(["Part of", link(parent)]);
  const children = r["MusicBrainz"] ? rows.filter(x => x["Part Of"] === r["MusicBrainz"]) : [];
  if (children.length) facts.push(["Contains", children.map(c => link(c)).join(", ")]);
  const norm = s => slugify(s);
  const editions = rows.filter(x => x !== r && norm(x[TITLE_COL]) === norm(title));
  if (editions.length) facts.push(["Other editions", editions.map(x => link(x, `${x[TITLE_COL]} (${x._yearRel !== "Unknown" ? x._yearRel : x._yearCat})`)).join(", ")]);

  const listen = r._svc.map(s => `<a class="psd-rel-svc" href="${esc(s.href)}" target="_blank" rel="noopener nofollow">${icon(s.key)}<span>${esc(s.label)}</span></a>`).join("");

  const albumId = bzAlbumId(r);
  const more = [];
  if (albumId) more.push(`<a href="${SITE}/album/${albumId}">Album page on psilodu.mp</a>`);
  else if (r["Source"]) more.push(`<a href="${esc(normHref(expandPlatformUrl(r["Source"], "source")))}">Release page</a>`);
  String(r["Sources"] || "").split(MULTI_LINK_SEP).map(x => x.trim()).filter(Boolean)
    .forEach(u => { const h = normHref(u); more.push(`<a href="${esc(h)}" target="_blank" rel="noopener nofollow">${esc(h.replace(/^https?:\/\/(www\.)?/, "").split("/")[0])}</a>`); });
  if (MBID_RE.test(r["MusicBrainz"] || "")) more.push(`<a href="${MB_RG_URL}${esc(r["MusicBrainz"])}" target="_blank" rel="noopener">MusicBrainz</a>`);

  const cover = r._largeUrl || r._thumbUrl;
  mount.innerHTML = `
  <div class="psd-rel" style="${vars}">
    <nav class="psd-rel-nav">
      <a href="${CATALOGUE_PATH}">← Catalogue</a>
      <span class="psd-rel-step">
        ${newer ? `<a href="${esc(releaseHref(newer))}" title="${esc(newer[TITLE_COL])}">‹ Newer</a>` : ""}
        ${older ? `<a href="${esc(releaseHref(older))}" title="${esc(older[TITLE_COL])}">Older ›</a>` : ""}
      </span>
    </nav>
    <div class="psd-rel-hero">
      <div class="psd-rel-cover"${cover ? ` data-lightbox="${esc(r._largeUrl || cover)}" data-thumb="${esc(r._thumbUrl)}" role="button" tabindex="0" aria-label="View larger artwork"` : ""}>
        ${cover ? `<img src="${esc(cover)}" alt="${esc(title)}">` : ""}
      </div>
      <div class="psd-rel-info">
        <h1 class="psd-rel-title">${esc(title)}</h1>
        <div class="psd-rel-sub">${[r[TYPE_COL], r._yearRel !== "Unknown" ? r._yearRel : "", r[CAT_COL]].filter(Boolean).map(esc).join(" • ")}</div>
        ${listen ? `<div class="psd-rel-listen">${listen}</div>` : ""}
        <dl class="psd-rel-facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>
      </div>
    </div>
    <section class="psd-rel-player" id="psd-player"></section>
    ${more.length ? `<div class="psd-rel-more">${more.join(" · ")}</div>` : ""}
  </div>
  <div id="rel-lightbox" class="rel-modal-overlay"><img id="rel-lightbox-img" class="rel-lightbox-img" src="" alt="Album Artwork"></div>`;
  moveModalsToBody();
  document.title = title + " | psilodump";
  renderPlayer(document.getElementById("psd-player"), r, albumId);
}

// --- Player ---
// Bandzoogle album: read the track list from the album page and play the tracks
// with one <audio> element. Otherwise: the Spotify / Apple Music / YouTube player.
function renderPlayer(box, r, albumId){
  if (!box) return;
  stopPlayer();
  if (albumId) {
    box.innerHTML = `<div class="psd-player-note">Loading tracks…</div>`;
    fetch(`/album/${albumId}`)
      .then(res => { if (!res.ok) throw new Error("HTTP " + res.status); return res.text(); })
      .then(html => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const tracks = [...doc.querySelectorAll("li.track-list-item a[data-dest]")].map(a => ({
          id: a.getAttribute("data-id"),
          title: a.getAttribute("data-title") || "",
          duration: a.getAttribute("data-duration") || "",
          src: a.getAttribute("data-dest"),
        })).filter(t => t.src);
        if (!document.body.contains(box)) return;          // the visitor has moved on
        if (!tracks.length) throw new Error("no tracks");
        buildTrackPlayer(box, r, tracks, albumId);
      })
      .catch(err => {
        console.warn("Bandzoogle tracks unavailable, using another player:", err.message);
        if (document.body.contains(box)) renderEmbed(box, r);
      });
  } else {
    renderEmbed(box, r);
  }
}

function renderEmbed(box, r){
  const spotify = platformId(r, "Spotify", /album\/([A-Za-z0-9]+)/);
  const apple = platformId(r, "Apple", /(?:album\/[^/]*\/|\/)(\d+)(?:\?|$)/);
  const yt = String(r["YouTube"] || "").trim();
  const ytList = (yt.match(/[?&]list=([A-Za-z0-9_-]+)/) || [])[1];
  const ytVideo = (yt.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/) || [])[1];
  let src = "", height = 352;
  if (spotify) src = `https://open.spotify.com/embed/album/${spotify}`;
  else if (apple) { src = `https://embed.music.apple.com/us/album/${apple}`; height = 450; }
  else if (ytList) src = `https://www.youtube-nocookie.com/embed/videoseries?list=${ytList}`;
  else if (ytVideo) src = `https://www.youtube-nocookie.com/embed/${ytVideo}`;
  box.innerHTML = src
    ? `<iframe class="psd-embed" src="${esc(src)}" height="${height}" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" title="Player"></iframe>`
    : "";
}

function buildTrackPlayer(box, r, tracks, albumId){
  box.innerHTML = `
    <div class="psd-player">
      <div class="psd-player-bar">
        <button type="button" class="psd-pp" data-psd-play aria-label="Play">▶</button>
        <div class="psd-now"><span class="psd-now-title">${esc(tracks[0].title)}</span><span class="psd-time">0:00 / ${esc(tracks[0].duration)}</span></div>
      </div>
      <div class="psd-progress" data-psd-seek role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="psd-progress-fill"></div></div>
      <ol class="psd-tracks">${tracks.map((t, i) => `<li><button type="button" data-psd-track="${i}"><span class="psd-n">${i + 1}</span><span class="psd-t">${esc(t.title)}</span><span class="psd-d">${esc(t.duration)}</span></button></li>`).join("")}</ol>
    </div>`;
  const audio = new Audio();
  audio.preload = "none";
  const p = window._psdPlayer = { audio, tracks, index: 0, box, title: r[TITLE_COL] || "", cover: r._largeUrl || r._thumbUrl || "" };
  audio.addEventListener("timeupdate", () => updatePlayerUI());
  audio.addEventListener("loadedmetadata", () => updatePlayerUI());
  audio.addEventListener("play", () => updatePlayerUI());
  audio.addEventListener("pause", () => updatePlayerUI());
  audio.addEventListener("ended", () => { if (p.index + 1 < p.tracks.length) playTrack(p.index + 1); else updatePlayerUI(); });
}

function playTrack(i){
  const p = window._psdPlayer;
  if (!p || !p.tracks[i]) return;
  if (i !== p.index || !p.audio.src) {
    p.index = i;
    p.audio.src = p.tracks[i].src;
  }
  p.audio.play().catch(() => {});
  if ("mediaSession" in navigator && window.MediaMetadata) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: p.tracks[i].title, artist: "psilodump", album: p.title, artwork: p.cover ? [{ src: p.cover }] : [] });
    navigator.mediaSession.setActionHandler("nexttrack", () => playTrack(p.index + 1));
    navigator.mediaSession.setActionHandler("previoustrack", () => playTrack(Math.max(0, p.index - 1)));
  }
  updatePlayerUI();
}

function updatePlayerUI(){
  const p = window._psdPlayer;
  if (!p || !document.body.contains(p.box)) return;
  const a = p.audio, t = p.tracks[p.index];
  const playing = !a.paused && !a.ended;
  const pp = p.box.querySelector(".psd-pp");
  if (pp) { pp.textContent = playing ? "❚❚" : "▶"; pp.setAttribute("aria-label", playing ? "Pause" : "Play"); }
  const nowT = p.box.querySelector(".psd-now-title"); if (nowT) nowT.textContent = t.title;
  const time = p.box.querySelector(".psd-time"); if (time) time.textContent = fmtTime(a.currentTime) + " / " + (isFinite(a.duration) ? fmtTime(a.duration) : t.duration);
  const pct = isFinite(a.duration) && a.duration > 0 ? (a.currentTime / a.duration) * 100 : 0;
  const fill = p.box.querySelector(".psd-progress-fill"); if (fill) fill.style.width = pct + "%";
  const bar = p.box.querySelector(".psd-progress"); if (bar) bar.setAttribute("aria-valuenow", String(Math.round(pct)));
  p.box.querySelectorAll("[data-psd-track]").forEach(b => {
    const on = Number(b.getAttribute("data-psd-track")) === p.index && (playing || a.currentTime > 0);
    b.classList.toggle("is-current", on);
    b.setAttribute("aria-current", on ? "true" : "false");
  });
}

// Removing the page doesn't stop an <audio> element by itself, so stop it on page changes.
function stopPlayer(){
  const p = window._psdPlayer;
  if (p) { p.audio.pause(); p.audio.removeAttribute("src"); p.audio.load(); window._psdPlayer = null; }
}

// --- Structured data (JSON-LD) for search engines ---
// Describes every release as a schema.org MusicAlbum, invisible to visitors.
// "sameAs" ties each release to the same release elsewhere (MusicBrainz, Bandcamp,
// Spotify, Apple Music); "isPartOf" links e.g. a disc to its double album.
const SITE = "https://psilodu.mp";
const ARTIST_ID = SITE + "/#psilodump";
const ARTIST_JSONLD = {
  "@type": "MusicGroup",
  "@id": ARTIST_ID,
  "name": "psilodump",
  "url": SITE + "/",
  "sameAs": [
    "https://musicbrainz.org/artist/cb85543c-e95b-463b-a111-d04d290b4a2a",
    "https://www.wikidata.org/wiki/Q6057584",
    "https://en.wikipedia.org/wiki/Psilodump",
    "https://psilodump.bandcamp.com/",
    "https://open.spotify.com/artist/3PK6tofxvZyHdmKIZw6Mx1",
    "https://music.apple.com/artist/127084265",
    "https://www.youtube.com/channel/UC8WBPyxIU5AXvqaBsl6aKqw"
  ]
};
const MB_RG_URL = "https://musicbrainz.org/release-group/";
const MBID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function releaseTypeJsonLd(type){
  const t = String(type || "").toLowerCase();
  if (t === "single") return { albumReleaseType: "SingleRelease" };
  if (t === "ep" || t === "minialbum") return { albumReleaseType: "EPRelease" };
  if (t === "album") return { albumReleaseType: "AlbumRelease" };
  if (t === "compilation") return { albumReleaseType: "AlbumRelease", albumProductionType: "CompilationAlbum" };
  return {};
}

function buildJsonLd(rows){
  // Each release needs its own @id so others can point to it (isPartOf).
  // Prefer its psilodu.mp page; otherwise an anchor on the catalogue page.
  const used = new Set();
  const idOf = rows.map((r, i) => {
    const page = expandPlatformUrl(r["Source"] || "", "source");
    const key = String(r[CAT_COL] || (i + 1)).replace(/[^A-Za-z0-9._~-]+/g, "-");   // "DMTCD19/20" -> "DMTCD19-20"
    let id = /^https:\/\/psilodu\.mp\//.test(page) ? page : SITE + "/#release-" + key;
    if (used.has(id)) id += "-" + (i + 1);
    used.add(id);
    return { id, page: /^https:\/\/psilodu\.mp\//.test(page) ? page : "" };
  });
  // The first release with a given MusicBrainz group, for resolving "Part Of".
  const byMbid = {};
  rows.forEach((r, i) => { const m = r["MusicBrainz"]; if (MBID_RE.test(m || "") && !(m in byMbid)) byMbid[m] = i; });

  const items = rows.map((r, i) => {
    const item = { "@type": "MusicAlbum", "@id": idOf[i].id, "name": r[TITLE_COL] || "" };
    if (idOf[i].page) item.url = idOf[i].page;
    Object.assign(item, releaseTypeJsonLd(r[TYPE_COL]));
    const date = r[DATE_COL] || r[CATDATE_COL] || "";
    if (/^\d{4}(-\d{2}(-\d{2})?)?$/.test(date)) item.datePublished = date;
    item.byArtist = { "@id": ARTIST_ID };
    if (r._largeUrl) item.image = r._largeUrl;
    if (r[CAT_COL]) item.identifier = { "@type": "PropertyValue", "propertyID": "catalogNumber", "value": r[CAT_COL] };

    const sameAs = [];
    if (MBID_RE.test(r["MusicBrainz"] || "")) sameAs.push(MB_RG_URL + r["MusicBrainz"].toLowerCase());
    r._svc.forEach(s => {
      // A YouTube link counts as "the same release" only when it is a playlist (a whole release).
      if (s.key === "youtube" && !/[?&]list=/.test(s.href)) return;
      sameAs.push(s.href);
    });
    if (sameAs.length) item.sameAs = sameAs;

    const parent = r["Part Of"];
    if (MBID_RE.test(parent || "")) {
      const pi = byMbid[parent];
      item.isPartOf = (pi !== undefined && pi !== i)
        ? { "@id": idOf[pi].id }
        : { "@type": "MusicAlbum", "sameAs": MB_RG_URL + parent.toLowerCase() };
    }
    return { "@type": "ListItem", "position": i + 1, "item": item };
  });

  return {
    "@context": "https://schema.org",
    "@graph": [
      ARTIST_JSONLD,
      { "@type": "ItemList", "@id": SITE + "/#catalogue", "name": "psilodump discography", "numberOfItems": items.length, "itemListElement": items }
    ]
  };
}

// Put the JSON-LD into the page (inside the catalogue wrapper, so Turbo page swaps
// remove it with the catalogue and it is added again when the catalogue returns).
function updateJsonLd(){
  const cat = window._psilodumpCat;
  const wrap = document.querySelector(".rel-wrap");
  if (!wrap || !cat.rows.length) return;
  if (!cat._jsonLd) {
    // "<" escaped so no value can close the <script> element early.
    cat._jsonLd = JSON.stringify(buildJsonLd(cat.rows)).replace(/</g, "\\u003c");
  }
  let el = document.getElementById("psd-jsonld");
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = "psd-jsonld";
    wrap.appendChild(el);
  }
  if (el.textContent !== cat._jsonLd) el.textContent = cat._jsonLd;
}

function initApp(){
  initRelease();
  mountMarkup();
  const grid = document.getElementById("rel-grid");
  if (!grid) return;
  ensureStyles();
  moveModalsToBody();
  const cat = window._psilodumpCat;

  if (cat.loaded) {
    applyHash();
    bindUIEvents();
    populateSelectOptions();
    applyFilters();
    updateJsonLd();
  } else if (!grid._psdPending) {
    grid._psdPending = true;                 // one request per grid (a release page may already be loading it)
    loadCatalogue()
      .then(() => {
        applyHash();
        bindUIEvents();
        populateSelectOptions();
        applyFilters();
        updateJsonLd();
      })
      .catch(err => {
        console.error("Failed to load release data:", err);
        const g = document.getElementById("rel-grid");
        if(g) g.innerHTML = `<div style="grid-column: 1/-1; padding: 2rem 0; text-align: center; opacity: 0.8;">Unable to load discography data right now. Please refresh the page.</div>`;
      });
  }
}

window.__psdCatalogue = { init: initApp, version: JS_VERSION };

// Re-initialise whenever an empty embed or placeholder cards appear. Watch <html>, not <body>:
// Turbo replaces <body> on every page change, <html> stays.
new MutationObserver(() => {
  const mount = document.getElementById("psd-catalogue");
  if (mount && !mount.firstElementChild) { initApp(); return; }
  const rel = document.getElementById("psd-release");
  if (rel && rel._psdShown !== location.search) { initRelease(); return; }
  const grid = document.getElementById("rel-grid");
  if (grid && grid.querySelector(".sk")) initApp();
}).observe(document.documentElement, { childList: true, subtree: true });

// Also re-initialise after each Turbo page change.
document.addEventListener("turbo:load", initApp);
document.addEventListener("turbo:render", initApp);
// Leaving a release page: stop its music (a removed <audio> element keeps playing).
document.addEventListener("turbo:before-render", stopPlayer);

initApp();
})();
