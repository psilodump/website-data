// Bandzoogle uses Turbo: every page change swaps in a new <body> and re-runs
// this <script>. Everything lives inside this function so a second run can't
// hit "Identifier has already been declared"; a re-run just re-initialises.
(function () {
if (window.__psdCatalogue) { window.__psdCatalogue.init(); return; }

const JS_VERSION = "1.24.0";
const HTML_VERSION = "2.2.0";

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
a.rel-cover { display: block !important; text-decoration: none !important; }
.rel-cover img { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; position: relative !important; z-index: 1 !important; }

.rel-body { padding: 10px 12px 12px !important; display: flex !important; flex-direction: column !important; flex-grow: 1 !important; }
.rel-title { margin: 0 0 4px !important; font-size: 15px !important; line-height: 1.25 !important; font-weight: 600 !important; }
.rel-title a { color: inherit !important; text-decoration: none !important; }
.rel-title a:hover { text-decoration: underline !important; }
.rel-meta a.rel-parts { color: inherit !important; text-decoration: underline !important; }
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
.svc-bp { color: #a2d80c !important; }
.rel-m-note { margin: 10px 0 0 !important; font-size: 12px !important; opacity: .8 !important; }
.psd-rel-store { font-size: 13px !important; opacity: .85 !important; margin: -10px 0 18px !important; }
.psd-rel-store .dot { display: inline-block !important; width: 8px !important; height: 8px !important; border-radius: 50% !important; background: #2bd96b !important; margin-right: 6px !important; vertical-align: 1px !important; }

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
.psd-rel a.psd-rel-svc, .psd-rel a.psd-rel-phys-btn, .psd-rel a.psd-ed-buy { text-decoration: none !important; }
.psd-rel-loading { opacity: .7 !important; background: transparent !important; color: inherit !important; }
.psd-rel-nav { display: flex !important; justify-content: space-between !important; gap: 12px !important; font-size: 14px !important; margin-bottom: 16px !important; }
.psd-rel-nav a { text-decoration: none !important; opacity: .85 !important; }
.psd-rel-nav a:hover { opacity: 1 !important; text-decoration: underline !important; }
.psd-rel-step { display: flex !important; gap: 16px !important; }
.psd-rel-hero { display: grid !important; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr) !important; gap: 28px !important; align-items: start !important; }
.psd-rel-cover { width: 100% !important; aspect-ratio: 1/1 !important; border-radius: 8px !important; overflow: hidden !important; background: var(--rel-deep, #2a2a2a) !important; box-shadow: 0 8px 30px rgba(0,0,0,.35) !important; cursor: zoom-in !important; }
.psd-rel-cover img { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; }
.psd-rel-title { font-size: clamp(24px, 4vw, 38px) !important; line-height: 1.1 !important; margin: 0 0 6px !important; color: inherit !important; font-weight: 700 !important; }
.psd-rel-by { font-size: 17px !important; margin: 0 0 4px !important; }
.psd-rel-orig { font-size: 13px !important; opacity: .7 !important; font-style: italic !important; margin-bottom: 8px !important; }
.psd-rel-sub { font-size: 14px !important; opacity: .8 !important; margin-bottom: 18px !important; }
.psd-rel-credits { margin-top: 22px !important; font-size: 14px !important; line-height: 1.6 !important; }
.psd-rel-credits h2 { font-size: 15px !important; margin: 0 0 6px !important; color: inherit !important; opacity: .75 !important; font-weight: 600 !important; text-transform: uppercase !important; letter-spacing: .06em !important; }
.psd-rel-credits p { margin: 0 !important; }
.psd-rel-listen { display: flex !important; flex-wrap: wrap !important; gap: 8px !important; margin-bottom: 18px !important; }
.psd-rel-svc { display: inline-flex !important; align-items: center !important; gap: 8px !important; padding: 8px 12px !important; border-radius: 8px !important; background: var(--rel-deep, #2a2a2a) !important; color: var(--rel-deep-text, #fff) !important; text-decoration: none !important; font-size: 13px !important; font-weight: 600 !important; }
.psd-rel-svc:hover { filter: brightness(1.15) !important; }
.psd-rel-phys { display: flex !important; flex-wrap: wrap !important; align-items: center !important; gap: 8px !important; margin: -6px 0 18px !important; }
.psd-rel-phys-label { font-size: 13px !important; opacity: .75 !important; margin-right: 2px !important; }
.psd-rel-phys-btn { display: inline-flex !important; align-items: center !important; gap: 6px !important; padding: 6px 10px !important; border-radius: 999px !important; border: 1px solid currentColor !important; color: inherit !important; text-decoration: none !important; font-size: 13px !important; font-weight: 600 !important; }
a.psd-rel-phys-btn:hover { background: var(--rel-deep, #2a2a2a) !important; color: var(--rel-deep-text, #fff) !important; }
.psd-phys-icon { width: 16px !important; height: 16px !important; display: block !important; flex: 0 0 16px !important; }
.rel-phys { display: flex !important; gap: 6px !important; margin: -4px 0 10px !important; color: #333 !important; opacity: .75 !important; }
.rel-phys .psd-phys-icon { width: 15px !important; height: 15px !important; }
.rel-wrap.row-view .rel-phys { margin: 0 !important; }
.rel-phys .is-past { opacity: .4 !important; }
.psd-rel-editions { margin-top: 22px !important; }
.psd-rel-editions h2 { font-size: 15px !important; margin: 0 0 8px !important; color: inherit !important; opacity: .75 !important; font-weight: 600 !important; text-transform: uppercase !important; letter-spacing: .06em !important; }
.psd-rel-editions ul { list-style: none !important; margin: 0 !important; padding: 0 !important; }
.psd-rel-editions li { display: flex !important; align-items: center !important; gap: 10px !important; padding: 8px 0 !important; border-top: 1px solid rgba(127,127,127,.25) !important; margin: 0 !important; list-style: none !important; }
.psd-ed-main { flex: 1 1 auto !important; display: flex !important; flex-direction: column !important; font-size: 14px !important; }
.psd-ed-meta { font-size: 12px !important; opacity: .75 !important; }
.psd-ed-buy { padding: 5px 12px !important; border-radius: 999px !important; background: var(--rel-deep, #2a2a2a) !important; color: var(--rel-deep-text, #fff) !important; text-decoration: none !important; font-size: 13px !important; font-weight: 600 !important; }
.psd-ed-status { font-size: 12px !important; opacity: .65 !important; white-space: nowrap !important; }
.psd-rel-facts { display: grid !important; grid-template-columns: max-content 1fr !important; gap: 6px 14px !important; margin: 0 !important; font-size: 14px !important; }
.psd-rel-facts dt { opacity: .7 !important; margin: 0 !important; font-weight: 400 !important; }
.psd-rel-facts dd { margin: 0 !important; }
.psd-rel-player { margin-top: 24px !important; }
.psd-rel-more { margin-top: 18px !important; font-size: 13px !important; opacity: .85 !important; }
.psd-vpage-bar { display: flex !important; flex-wrap: wrap !important; gap: 6px !important; align-items: center !important; margin: 0 0 16px !important; }
.psd-vpage-bar button { border: 1px solid rgba(127,127,127,.45) !important; background: transparent !important; color: inherit !important; border-radius: 999px !important; padding: 5px 12px !important; font: inherit !important; font-size: 13px !important; cursor: pointer !important; }
.psd-vpage-bar button[aria-pressed="true"] { background: var(--rel-deep, #2a2a2a) !important; color: var(--rel-deep-text, #fff) !important; border-color: transparent !important; font-weight: 600 !important; }
.psd-vpage-bar input { flex: 1 1 180px !important; min-width: 140px !important; padding: 6px 10px !important; border-radius: 999px !important; border: 1px solid rgba(127,127,127,.45) !important; background: transparent !important; color: inherit !important; font: inherit !important; font-size: 13px !important; }
.psd-vpage section { margin: 0 0 26px !important; }
.psd-vpage h2 { font-size: 15px !important; margin: 0 0 10px !important; color: inherit !important; opacity: .8 !important; font-weight: 600 !important; text-transform: uppercase !important; letter-spacing: .06em !important; }
.psd-vpage h2 small { font-weight: normal !important; opacity: .7 !important; text-transform: none !important; letter-spacing: 0 !important; }
.psd-vpage h3 { font-size: 13px !important; margin: 14px 0 8px !important; color: inherit !important; opacity: .75 !important; font-weight: 600 !important; }
.psd-vpage .psd-vothers { margin-top: 36px !important; padding-top: 18px !important; border-top: 1px solid rgba(127,127,127,.3) !important; opacity: .92 !important; }
.psd-vpage .psd-vempty { opacity: .7 !important; font-size: 14px !important; }
.psd-disco section { margin: 0 0 24px !important; }
.psd-disco h2 { font-size: 15px !important; margin: 0 0 8px !important; color: inherit !important; opacity: .8 !important; font-weight: 600 !important; text-transform: uppercase !important; letter-spacing: .06em !important; }
.psd-disco h2 small { font-weight: normal !important; opacity: .7 !important; letter-spacing: 0 !important; text-transform: none !important; }
.psd-disco ol { list-style: none !important; margin: 0 !important; padding: 0 !important; }
.psd-disco li { display: flex !important; gap: 12px !important; align-items: baseline !important; padding: 5px 0 !important; border-top: 1px solid rgba(127,127,127,.18) !important; margin: 0 !important; list-style: none !important; font-size: 14px !important; }
.psd-disco .y { flex: 0 0 3em !important; opacity: .65 !important; font-variant-numeric: tabular-nums !important; }
.psd-disco .t { flex: 1 1 auto !important; min-width: 0 !important; }
.psd-disco .t small { opacity: .7 !important; }
.psd-disco .c { flex: 0 0 auto !important; opacity: .65 !important; font-size: 12px !important; text-align: right !important; }
.psd-ctab-wrap { overflow-x: auto !important; }
.psd-ctab { width: 100% !important; border-collapse: collapse !important; font-size: 13px !important; }
.psd-ctab th, .psd-ctab td { text-align: left !important; padding: 5px 8px !important; border-bottom: 1px solid rgba(127,127,127,.2) !important; vertical-align: top !important; white-space: nowrap !important; }
.psd-ctab td.w { white-space: normal !important; min-width: 180px !important; }
.psd-ctab th { cursor: pointer !important; user-select: none !important; opacity: .85 !important; font-weight: 600 !important; }
.psd-ctab th[aria-sort="ascending"]::after { content: " ▲" !important; font-size: 10px !important; }
.psd-ctab th[aria-sort="descending"]::after { content: " ▼" !important; font-size: 10px !important; }
.psd-ctab tr:hover td { background: rgba(127,127,127,.1) !important; }
.psd-phys-grid { display: grid !important; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)) !important; gap: 16px !important; }
.psd-phys-card { margin: 0 !important; display: flex !important; flex-direction: column !important; gap: 8px !important; }
.psd-phys-card .cv { position: relative !important; aspect-ratio: 1 !important; border-radius: 8px !important; overflow: hidden !important; background: rgba(127,127,127,.15) !important; display: flex !important; align-items: center !important; justify-content: center !important; }
.psd-phys-card .cv img { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; }
.psd-phys-card .cv .psd-phys-icon { width: 46px !important; height: 46px !important; opacity: .6 !important; }
.psd-phys-card .cv .kind { position: absolute !important; left: 8px !important; bottom: 8px !important; display: inline-flex !important; gap: 5px !important; align-items: center !important; background: rgba(0,0,0,.7) !important; color: #fff !important; border-radius: 999px !important; padding: 3px 9px 3px 6px !important; font-size: 12px !important; }
.psd-phys-card .cv .kind .psd-phys-icon { width: 15px !important; height: 15px !important; opacity: 1 !important; }
.psd-phys-card h3 { font-size: 15px !important; margin: 0 !important; color: inherit !important; line-height: 1.3 !important; }
.psd-phys-card h3 small { font-weight: normal !important; opacity: .75 !important; }
.psd-phys-card .meta { font-size: 12px !important; opacity: .75 !important; line-height: 1.45 !important; }
.psd-phys-card .meta a { color: inherit !important; }
.psd-phys-card .act { margin-top: auto !important; }
.psd-phys-card .act a.buy { display: inline-block !important; padding: 6px 14px !important; border-radius: 999px !important; background: var(--rel-deep, #2a2a2a) !important; color: var(--rel-deep-text, #fff) !important; font-weight: 600 !important; font-size: 13px !important; text-decoration: none !important; }
.psd-phys-card .act .st { font-size: 12px !important; opacity: .7 !important; }
.psd-phys-card.past .cv img { filter: grayscale(.6) !important; opacity: .75 !important; }
.psd-today-nav { display: flex !important; align-items: center !important; gap: 10px !important; flex-wrap: wrap !important; margin: 0 0 18px !important; }
.psd-today-nav h2 { flex: 1 1 auto !important; text-align: center !important; margin: 0 !important; font-size: 20px !important; color: inherit !important; }
.psd-today-nav button { font: inherit !important; font-size: 13px !important; padding: 5px 12px !important; border-radius: 999px !important; border: 1px solid rgba(127,127,127,.35) !important; background: transparent !important; color: inherit !important; cursor: pointer !important; }
.psd-today-nav button:hover { background: rgba(127,127,127,.15) !important; }
.psd-today section { margin: 0 0 26px !important; }
.psd-today h3 { font-size: 15px !important; margin: 0 0 10px !important; color: inherit !important; opacity: .8 !important; font-weight: 600 !important; text-transform: uppercase !important; letter-spacing: .06em !important; }
.psd-today h3 small { font-weight: normal !important; opacity: .7 !important; letter-spacing: 0 !important; text-transform: none !important; }
.psd-today-rels { display: grid !important; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)) !important; gap: 12px !important; }
.psd-today-rel { display: flex !important; gap: 12px !important; align-items: center !important; padding: 10px !important; border-radius: 10px !important; background: var(--rel-bg, rgba(127,127,127,.1)) !important; color: var(--rel-text, inherit) !important; text-decoration: none !important; }
.psd-today-rel img, .psd-today-rel .ph { width: 72px !important; height: 72px !important; border-radius: 6px !important; object-fit: cover !important; flex: 0 0 72px !important; background: rgba(127,127,127,.2) !important; }
.psd-today-rel b { display: block !important; font-size: 15px !important; line-height: 1.3 !important; }
.psd-today-rel small { display: block !important; font-size: 12px !important; opacity: .8 !important; line-height: 1.45 !important; }
.psd-rel a.psd-today-rel, .psd-today-rel * { text-decoration: none !important; }
.psd-rel a.psd-today-rel { color: var(--rel-text, inherit) !important; }
.psd-today-empty { opacity: .75 !important; }
.psd-gigs .psd-vpage-bar select { font: inherit !important; font-size: 13px !important; padding: 5px 8px !important; border-radius: 6px !important; border: 1px solid rgba(127,127,127,.35) !important; background: transparent !important; color: inherit !important; }
.psd-gigs .psd-vpage-bar select option { color: #111 !important; }
.psd-gig-media { font-size: 13px !important; opacity: .85 !important; display: inline-flex !important; gap: 6px !important; align-items: center !important; }
.psd-gcount { font-size: 13px !important; opacity: .75 !important; }
.psd-gig-list section { margin: 0 0 22px !important; }
.psd-gig-list h2 { font-size: 15px !important; margin: 0 0 6px !important; color: inherit !important; opacity: .8 !important; font-weight: 600 !important; letter-spacing: .06em !important; }
.psd-gig-list h2 small { font-weight: normal !important; opacity: .7 !important; }
.psd-gig-list ol { list-style: none !important; margin: 0 !important; padding: 0 !important; }
.psd-gig-list li { display: flex !important; gap: 12px !important; align-items: baseline !important; padding: 6px 0 !important; border-top: 1px solid rgba(127,127,127,.18) !important; margin: 0 !important; list-style: none !important; font-size: 14px !important; }
.psd-gig-list .d { flex: 0 0 3.2em !important; opacity: .65 !important; font-variant-numeric: tabular-nums !important; }
.psd-gig-list .e { flex: 1 1 auto !important; min-width: 0 !important; }
.psd-gig-list .e small { opacity: .7 !important; }
.psd-gig-list .e small.p { display: block !important; font-size: 12px !important; }
.psd-gig-list .i { flex: 0 0 auto !important; display: inline-flex !important; gap: 6px !important; opacity: .7 !important; }
.psd-gig-list .i svg, .psd-today-gig .i svg { width: 16px !important; height: 16px !important; display: block !important; }
.psd-gig-list li.psd-gig-off .e a { text-decoration: line-through !important; }
.psd-gig-main { width: 100% !important; border-radius: 8px !important; overflow: hidden !important; box-shadow: 0 8px 30px rgba(0,0,0,.35) !important; cursor: zoom-in !important; background: rgba(127,127,127,.15) !important; }
.psd-gig-main img { width: 100% !important; height: auto !important; display: block !important; }
.psd-rel-hero.psd-gig-noimg { grid-template-columns: minmax(0, 1fr) !important; }
.psd-gig-note { font-size: 14px !important; line-height: 1.55 !important; opacity: .9 !important; margin: 14px 0 0 !important; }
.psd-gig section { margin-top: 26px !important; }
.psd-gig-roles { display: grid !important; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important; gap: 8px 24px !important; }
.psd-gig-role h3 { font-size: 13px !important; margin: 0 0 4px !important; color: inherit !important; opacity: .7 !important; text-transform: uppercase !important; letter-spacing: .06em !important; }
.psd-gig-role ul { list-style: none !important; margin: 0 !important; padding: 0 !important; }
.psd-gig-role li { font-size: 14px !important; padding: 2px 0 !important; margin: 0 !important; list-style: none !important; }
.psd-gig-role li.me { font-weight: 700 !important; }
.psd-gig-grid { display: grid !important; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)) !important; gap: 12px !important; }
.psd-gig-img { margin: 0 !important; }
.psd-gig-img button { display: block !important; width: 100% !important; padding: 0 !important; border: 0 !important; background: rgba(127,127,127,.15) !important; border-radius: 6px !important; overflow: hidden !important; cursor: zoom-in !important; aspect-ratio: 1 !important; }
.psd-gig-img img { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; }
.psd-gig-img.flyer img { object-fit: contain !important; }
.psd-gig-img figcaption { font-size: 12px !important; margin-top: 4px !important; opacity: .85 !important; line-height: 1.4 !important; }
.psd-gig-img figcaption small { display: block !important; opacity: .75 !important; }
.psd-today-gigs { list-style: none !important; margin: 0 !important; padding: 0 !important; }
.psd-today-gig { display: flex !important; gap: 12px !important; align-items: baseline !important; padding: 6px 0 !important; border-top: 1px solid rgba(127,127,127,.18) !important; margin: 0 !important; list-style: none !important; font-size: 14px !important; }
.psd-today-gig .y { flex: 0 0 3em !important; opacity: .65 !important; }
.psd-today-gig .e { flex: 1 1 auto !important; }
.psd-today-gig .e small { display: block !important; font-size: 12px !important; opacity: .7 !important; }
.psd-today-gig .i { display: inline-flex !important; gap: 6px !important; opacity: .7 !important; }
.psd-rel-videos { margin-top: 22px !important; }
.psd-rel-videos h2 { font-size: 15px !important; margin: 0 0 10px !important; color: inherit !important; opacity: .75 !important; font-weight: 600 !important; text-transform: uppercase !important; letter-spacing: .06em !important; }
.psd-vgrid { display: grid !important; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)) !important; gap: 14px !important; }
.psd-vcard { margin: 0 !important; }
.psd-vcard figcaption { font-size: 13px !important; margin-top: 6px !important; line-height: 1.35 !important; }
.psd-vcard figcaption small { display: block !important; opacity: .7 !important; font-size: 12px !important; }
.psd-yt { position: relative !important; display: block !important; width: 100% !important; aspect-ratio: 16 / 9 !important; padding: 0 !important; border: 0 !important; border-radius: 10px !important; overflow: hidden !important; cursor: pointer !important; background: #000 !important; }
.psd-yt img { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; opacity: .9 !important; }
.psd-yt:hover img { opacity: 1 !important; }
.psd-yt .psd-yt-play { position: absolute !important; left: 50% !important; top: 50% !important; transform: translate(-50%, -50%) !important; width: 56px !important; height: 56px !important; border-radius: 50% !important; background: rgba(0,0,0,.65) !important; color: #fff !important; display: flex !important; align-items: center !important; justify-content: center !important; }
.psd-yt .psd-yt-play svg { width: 26px !important; height: 26px !important; }
.psd-yt iframe, iframe.psd-yt-frame { position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; border: 0 !important; }
.psd-ytbox { position: relative !important; width: 100% !important; aspect-ratio: 16 / 9 !important; border-radius: 10px !important; overflow: hidden !important; background: #000 !important; }
.psd-tracks li.psd-row { display: flex !important; align-items: center !important; gap: 4px !important; }
.psd-tracks li.psd-row > button, .psd-tracks li.psd-row > .psd-off { flex: 1 1 auto !important; min-width: 0 !important; }
.psd-tlinks { display: flex !important; gap: 2px !important; flex: 0 0 auto !important; justify-content: flex-end !important; }
.psd-tlinks a, .psd-tlinks button { display: inline-flex !important; align-items: center !important; justify-content: center !important; width: 28px !important; height: 28px !important; border-radius: 6px !important; border: 0 !important; background: transparent !important; color: inherit !important; opacity: .65 !important; cursor: pointer !important; padding: 0 !important; text-decoration: none !important; }
.psd-tlinks a:hover, .psd-tlinks button:hover { opacity: 1 !important; background: rgba(127,127,127,.18) !important; }
.psd-tlinks svg { width: 16px !important; height: 16px !important; }
.psd-embed { width: 100% !important; border: 0 !important; border-radius: 12px !important; display: block !important; }
.psd-player { background: var(--rel-soft, #222) !important; color: var(--rel-soft-text, #fff) !important; border-radius: 10px !important; padding: 12px !important; }
.psd-player-note { opacity: .75 !important; font-size: 13px !important; padding: 8px 0 !important; }
.psd-player-bar { display: flex !important; align-items: center !important; gap: 12px !important; }
.psd-pp svg { width: 20px !important; height: 20px !important; display: block !important; margin: auto !important; }
.psd-pp { display: inline-flex !important; align-items: center !important; justify-content: center !important; padding: 0 !important; width: 44px !important; height: 44px !important; flex: 0 0 44px !important; border-radius: 50% !important; border: none !important; cursor: pointer !important; font-size: 15px !important; background: var(--rel-deep, #2a2a2a) !important; color: var(--rel-deep-text, #fff) !important; }
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
.psd-tracks .psd-h { padding: 14px 6px 4px !important; font-size: 12px !important; font-weight: 700 !important; letter-spacing: .06em !important; text-transform: uppercase !important; opacity: .8 !important; }
.psd-tracks .psd-h:first-child { padding-top: 4px !important; }
.psd-tracks .psd-v { opacity: .7 !important; }
.psd-tracks .psd-sub { display: block !important; font-size: 12px !important; opacity: .65 !important; font-weight: normal !important; }
.psd-tracks .psd-off { display: flex !important; gap: 10px !important; align-items: baseline !important; padding: 8px 6px !important; font-size: 14px !important; opacity: .55 !important; }
.psd-tracks button.is-broken { opacity: .45 !important; cursor: default !important; }
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
      <select id="rel-sel-when" class="rel-select" aria-label="Decade or year"><option value="">All Years</option></select>
      <select id="rel-sel-type" class="rel-select"><option value="">All Types</option></select>
      <select id="rel-sel-series" class="rel-select"><option value="">All Series</option></select>
      <select id="rel-sel-label" class="rel-select"><option value="">All Labels</option></select>
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
    activeLabel: "",
    activeWork: "",
    sortMode: "date",
    dateMode: storageGet("relDateMode") === "released" ? "released" : "catalogue"
  };
}

const CSV_URL = "https://raw.githubusercontent.com/psilodump/website-data/refs/heads/main/releases.csv";
// Physical editions (vinyl / CD pressings); "Releases" holds the IDs of the releases each contains.
const EDITIONS_URL = "https://raw.githubusercontent.com/psilodump/website-data/refs/heads/main/editions.csv";
// Tracks and track lists (release pages only; loaded when a release page is opened).
const TRACKS_URL = "https://raw.githubusercontent.com/psilodump/website-data/refs/heads/main/tracks.csv";
const TRACKLISTS_URL = "https://raw.githubusercontent.com/psilodump/website-data/refs/heads/main/tracklists.csv";
const VIDEOS_URL = "https://raw.githubusercontent.com/psilodump/website-data/refs/heads/main/videos.csv";
// Order and names of video kinds (admin: VIDEO_KINDS in videos_lib.php).
const VIDEO_KINDS = { music_video: "Music video", tracker: "Tracker video", visualiser: "Visualiser", vinyl: "Vinyl playback", live: "Live",
  teaser: "Teaser / trailer", full_album: "Full album audio", audio: "Audio", scrapbook: "Scrapbook", dj_set: "DJ set / mix", tribute: "Cover / tribute", other: "Video" };
// Icons come from GitHub Pages like this script (jsDelivr's @main can serve an old commit
// for hours, so a newly added icon would 404 there).
const ICON_BASE = "https://psilodump.github.io/website-data/icons/";

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
  { col:"Beatport", label:"Beatport", key:"beatport", class:"svc-bp" },
];

const MULTI_LINK_SEP = /(?:\r?\n|[,;])+/;
const TYPE_SPLIT = /[,;|/]+/;
const SERIES_SPLIT = /[,;|/]+/;
// Labels are comma-separated; typographic hyphens ("The X‐Dump") count as "-".
const labelList = v => String(v || "").split(",").map(x => x.replace(/[\u2010-\u2015]/g, "-").trim()).filter(Boolean);

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
    case "beatport": return "https://www.beatport.com/release/" + h;      // "<slug>/<id>"
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

// The store version of a release can have another name (e.g. Whut is in stores only as
// "Whut (Hardfloor Remix)"), so listeners aren't surprised by a different track list.
function storeNote(r){
  return r["In Stores As"] ? `In stores as “${esc(r["In Stores As"])}”` : "";
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
      r["Label"], r["Source"], r["Sources"], r["Artist"], r["Original Credit"],
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
      _labels: labelList(r["Label"]),
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

// Tie-breaker everywhere releases are ordered: a release directly before its parts
// (via Part Of), then the Cat# (numeric-aware), releases without one last. Same-date
// releases then read The Nya Albumet (DMTCD19/20), The Otukset (DMTCD19), The Koneet (DMTCD20).
function catOrder(a, b){
  const isPartOf = (x, y) => !!x["Part Of"] && x["Part Of"] === y["MusicBrainz"];
  if (isPartOf(b, a)) return -1;
  if (isPartOf(a, b)) return 1;
  const ca = String(a[CAT_COL] || "").trim(), cb = String(b[CAT_COL] || "").trim();
  if (!ca || !cb) return (!ca) - (!cb);
  return ca.localeCompare(cb, undefined, { numeric: true, sensitivity: "base" });
}

function sortView(){
  const cat = window._psilodumpCat;
  if (cat.sortMode === "title"){
    // numeric: "vol.2" before "vol.10"; sensitivity base: ignore case/accents when comparing
    cat.viewRows.sort((a,b) => String(a[TITLE_COL] || "").localeCompare(String(b[TITLE_COL] || ""), undefined, { numeric: true, sensitivity: "base" }) || catOrder(a, b));
  } else {
    cat.viewRows.sort((a,b) => (currentDateValue(b) - currentDateValue(a)) || catOrder(a, b));
  }
}

function icon(key){
  const iconMap = {
    "bandcamp": "bandcamp.png",
    "spotify":  "spotify.png",
    "youtube":  "youtube.png",
    "apple":    "applemusic.png",
    "beatport": "beatport.png"
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
  // With release pages, the cover opens the release page like the title does (the
  // full-size artwork is one click further, on that page). The cover link is left out
  // of keyboard/screen-reader navigation so each card has one link, not two the same.
  // Without release pages: data-* attributes + the shared click listener open the lightbox.
  const coverClick = r._largeUrl ? `data-lightbox="${esc(r._largeUrl)}" data-thumb="${esc(r._thumbUrl)}" role="button" tabindex="0" aria-label="View larger artwork: ${esc(r[TITLE_COL] || "")}"` : '';
  const cover = RELEASE_LINKS
    ? `<a class="rel-cover" href="${esc(releaseHref(r))}" tabindex="-1" aria-hidden="true">${coverHtml}</a>`
    : `<div class="rel-cover" ${coverClick}>${coverHtml}</div>`;
  const title = RELEASE_LINKS
    ? `<a href="${esc(releaseHref(r))}">${esc(r[TITLE_COL] || "(untitled)")}</a>`
    : r._titleHref ? `<a href="${esc(r._titleHref)}" target="_blank" rel="noopener nofollow">${esc(r[TITLE_COL] || "(untitled)")}</a>` : esc(r[TITLE_COL] || "(untitled)");
  const activeDate = window._psilodumpCat.dateMode === "catalogue" ? r._catalogue : r._released;
  const metaBits = [ activeDate, r[TYPE_COL], r[CAT_COL] ].filter(Boolean).map(esc);
  if (r._hiddenParts) metaBits.push(`<a class="rel-parts" href="${esc(workHref(r))}">${r._hiddenParts} part${r._hiddenParts === 1 ? "" : "s"}</a>`);
  const meta = metaBits.join(" • ");
  
  const btn = releaseSurface(r['Bg Color'] || r['bg_color'], 0.85);
  const btnStyle = btn
    ? `style="background-color: ${btn.bg} !important; color: ${btn.text} !important;"`
    : '';

  const listenBtn = r._svc.length 
    ? `<button class="btn-listen" ${btnStyle} data-listen="${idx}">Listen / Download</button>` 
    : ``;

  return `<article class="rel-card">
    ${cover}
    <div class="rel-body">
      <h3 class="rel-title">${title}</h3>
      ${meta ? `<div class="rel-meta">${meta}</div>` : ``}
      ${physicalFormats(r).length ? `<div class="rel-phys">${physicalFormats(r).map(p => `<span class="${p.available ? "" : "is-past"}" title="${p.available ? "Available on " + p.kind : "Released on " + p.kind}">${PHYS_ICONS[p.kind]}</span>`).join("")}</div>` : ``}
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
  if (cat.activeDecade) pills.push({ label: `Decade: ${cat.activeDecade}`, clear: () => { cat.activeDecade = ""; const el = document.getElementById("rel-sel-decade"); if(el) el.value = ""; const w = document.getElementById("rel-sel-when"); if(w) w.value = ""; } });
  if (cat.activeYear) pills.push({ label: `Year: ${cat.activeYear}`, clear: () => { cat.activeYear = ""; const el = document.getElementById("rel-sel-year"); if(el) el.value = ""; const w = document.getElementById("rel-sel-when"); if(w) w.value = ""; } });
  if (cat.activeType) pills.push({ label: `Type: ${cat.activeType}`, clear: () => { cat.activeType = ""; const el = document.getElementById("rel-sel-type"); if(el) el.value = ""; } });
  if (cat.activeSeries) pills.push({ label: `Series: ${cat.activeSeries}`, clear: () => { cat.activeSeries = ""; const el = document.getElementById("rel-sel-series"); if(el) el.value = ""; } });
  if (cat.activeLabel) pills.push({ label: `Label: ${cat.activeLabel}`, clear: () => { cat.activeLabel = ""; const el = document.getElementById("rel-sel-label"); if(el) el.value = ""; } });
  if (cat.activeWork) { const w = workParent(cat.rows, cat.activeWork); pills.push({ label: `Part of: ${w ? w[TITLE_COL] : cat.activeWork}`, clear: () => { cat.activeWork = ""; } }); }

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
  cat.activeDecade = ""; cat.activeYear = ""; cat.activeType = ""; cat.activeSeries = ""; cat.activeLabel = ""; cat.activeWork = "";
  const d = document.getElementById("rel-sel-decade"); if(d) d.value = "";
  const y = document.getElementById("rel-sel-year"); if(y) y.value = "";
  const w = document.getElementById("rel-sel-when"); if(w) w.value = "";
  const t = document.getElementById("rel-sel-type"); if(t) t.value = "";
  const s = document.getElementById("rel-sel-series"); if(s) s.value = "";
  const l = document.getElementById("rel-sel-label"); if(l) l.value = "";
  const q = document.getElementById("rel-q"); if(q) q.value = "";
  applyFilters();
};

// --- Shareable links: the filters live in the address, e.g. #type=EP&q=saturnus ---
// replaceState (not pushState) so typing doesn't add a history entry per key,
// and it passes history.state through because Turbo keeps its own data there.
const HASH_KEYS = ["q", "decade", "year", "type", "series", "label", "work", "sort", "timeline"];

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
  if (cat.activeLabel) p.set("label", cat.activeLabel);
  if (cat.activeWork) p.set("work", cat.activeWork);
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
  if (cat.activeYear) cat.activeDecade = "";
  cat.activeType = p.get("type") || "";
  cat.activeSeries = p.get("series") || "";
  cat.activeLabel = p.get("label") || "";
  cat.activeWork = p.get("work") || "";
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
  const decades = Array.from(new Set((cat.fixedTypes && cat.fixedTypes.length ? cat.rows.filter(r => r._types.some(t => cat.fixedTypes.includes(t.toLowerCase()))) : cat.rows).map(currentDecade))).filter(d => d !== "Unknown").sort((a,b) => Number(b.replace("s","")) - Number(a.replace("s","")));
  const years = Array.from(new Set((cat.fixedTypes && cat.fixedTypes.length ? cat.rows.filter(r => r._types.some(t => cat.fixedTypes.includes(t.toLowerCase()))) : cat.rows).map(currentYear))).sort((a,b) => (a === "Unknown") - (b === "Unknown") || Number(b) - Number(a));
  const types = Array.from(new Set(cat.rows.flatMap(r => r._types))).sort((a,b) => a.localeCompare(b));
  const fixed = cat.fixedTypes || [];
  const pool = fixed.length ? cat.rows.filter(r => r._types.some(t => fixed.includes(t.toLowerCase()))) : cat.rows;
  const series = Array.from(new Set(cat.rows.flatMap(r => r._series))).sort((a,b) => a.localeCompare(b));
  const labels = Array.from(new Set(cat.rows.flatMap(r => r._labels))).sort((a,b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  const elD = document.getElementById("rel-sel-decade"); if(elD) elD.innerHTML = `<option value="">All Decades</option>` + decades.map(d => `<option value="${esc(d)}" ${d===cat.activeDecade?'selected':''}>${esc(d)}</option>`).join("");
  const elW = document.getElementById("rel-sel-when");
  if (elW) {
    const cur = cat.activeYear ? "y:" + cat.activeYear : (cat.activeDecade ? "d:" + cat.activeDecade : "");
    const opt = (v, label) => `<option value="${esc(v)}" ${v === cur ? "selected" : ""}>${esc(label)}</option>`;
    elW.innerHTML = opt("", "All Years") + decades.map(d => `<optgroup label="${esc(d)}">${opt("d:" + d, "All " + d)}${years.filter(y => y !== "Unknown" && Math.floor(Number(y) / 10) * 10 + "s" === d).map(y => opt("y:" + y, y)).join("")}</optgroup>`).join("")
      + (years.includes("Unknown") ? opt("y:Unknown", "Unknown year") : "");
  }
  const elY = document.getElementById("rel-sel-year"); if(elY) elY.innerHTML = `<option value="">All Years</option>` + years.map(y => `<option value="${esc(y)}" ${y===cat.activeYear?'selected':''}>${esc(y)}</option>`).join("");
  const elT = document.getElementById("rel-sel-type"); if(elT) elT.innerHTML = `<option value="">All Types</option>` + types.map(t => `<option value="${esc(t)}" ${t===cat.activeType?'selected':''}>${esc(t)}</option>`).join("");
  const elL = document.getElementById("rel-sel-label"); if(elL) elL.innerHTML = `<option value="">All Labels</option>` + labels.map(s => `<option value="${esc(s)}" ${s.toLowerCase()===cat.activeLabel.toLowerCase()?'selected':''}>${esc(s)}</option>`).join("");
  const elS = document.getElementById("rel-sel-series"); if(elS) elS.innerHTML = `<option value="">All Series</option>` + series.map(s => `<option value="${esc(s)}" ${s===cat.activeSeries?'selected':''}>${esc(s)}</option>`).join("");
}

// A work = a release whose parts point to it with Part Of (The Ground → Vol. 1, Vol. 2).
// In links it is named by its title slug: #work=the-ground
function workParent(rows, key){
  const k = String(key || "").toLowerCase();
  return rows.find(x => x["MusicBrainz"] && slugify(x[TITLE_COL]) === k && rows.some(y => y["Part Of"] === x["MusicBrainz"])) || null;
}
function workHref(parent){ return `${CATALOGUE_PATH}#work=${encodeURIComponent(slugify(parent[TITLE_COL]))}`; }

function applyFilters(){
  const cat = window._psilodumpCat;
  const qEl = document.getElementById("rel-q");
  const q = qEl ? qEl.value.trim().toLowerCase() : "";
  const work = cat.activeWork ? workParent(cat.rows, cat.activeWork) : null;
  // "Hide in grid" (admin) only applies to the plain grid: a search or any filter shows everything.
  const plain = !q && !cat.activeDecade && !cat.activeYear && !cat.activeType && !cat.activeSeries && !cat.activeLabel && !work;
  const hiddenParts = {};
  for (const r of cat.rows) if (r["Hidden"] === "1" && r["Part Of"]) hiddenParts[r["Part Of"]] = (hiddenParts[r["Part Of"]] || 0) + 1;
  for (const r of cat.rows) r._hiddenParts = plain && r["MusicBrainz"] ? (hiddenParts[r["MusicBrainz"]] || 0) : 0;
  cat.viewRows = cat.rows.filter(r => {
    if (plain && r["Hidden"] === "1") return false;
    if (cat.activeDecade && currentDecade(r) !== cat.activeDecade) return false;
    if (cat.activeYear && currentYear(r) !== cat.activeYear) return false;
    if (cat.activeType && !r._types.some(t => t.toLowerCase() === cat.activeType.toLowerCase())) return false;
    if (cat.fixedTypes && cat.fixedTypes.length && !r._types.some(t => cat.fixedTypes.includes(t.toLowerCase()))) return false;
    if (cat.activeSeries && !r._series.some(s => s.toLowerCase() === cat.activeSeries.toLowerCase())) return false;
    if (cat.activeLabel && !r._labels.some(s => s.toLowerCase() === cat.activeLabel.toLowerCase())) return false;
    if (cat.activeWork && !(work && (r === work || (r["Part Of"] && r["Part Of"] === work["MusicBrainz"])))) return false;
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
    ).join("") + (storeNote(r) && r._svc.length ? `<p class="rel-m-note" style="color: ${panel.text} !important;">${storeNote(r)}</p>` : "");
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
    const dy = t.closest('[data-psd-day]');
    if (dy) { const m = document.getElementById("psd-today"); if (m && m._psdToday) { const v = dy.getAttribute("data-psd-day"); const d = new Date(); m._psdToday.md = v === "today" ? pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) : v; m._psdTodayRender(); } return; }
    const pk = t.closest('[data-psd-pkind]');
    if (pk) { const m = document.getElementById("psd-physical"); if (m && m._psdPhys) { m._psdPhys.kind = pk.getAttribute("data-psd-pkind"); m._psdPhysRender(); } return; }
    const th = t.closest('[data-psd-sort]');
    if (th) { const m = document.getElementById("psd-catalogue-table"); if (m && m._psdTab) { const k = th.getAttribute("data-psd-sort"); m._psdTab.dir = m._psdTab.sort === k ? -m._psdTab.dir : 1; m._psdTab.sort = k; m._psdTabRender(); } return; }
    const rb = t.closest('[data-psd-rby]');
    if (rb) { const m = document.getElementById("psd-remixes-page"); if (m && m._psdRemix) { m._psdRemix.by = rb.getAttribute("data-psd-rby"); m._psdRemixRender(); } return; }
    const vk = t.closest('[data-psd-vkind]');
    if (vk) { const m = document.getElementById("psd-videos-page"); if (m && m._psdState) { m._psdState.kind = vk.getAttribute("data-psd-vkind"); m._psdRender(); } return; }
    const yt = t.closest('[data-psd-yt]');
    if (yt) { playLiteYouTube(yt); return; }
    const tv = t.closest('[data-psd-video]');
    if (tv) {
      const card = document.getElementById("psd-v-" + tv.getAttribute("data-psd-video"));
      if (card) { card.scrollIntoView({ behavior: "smooth", block: "center" }); const b = card.querySelector("[data-psd-yt]"); if (b) playLiteYouTube(b); }
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
  if (selD && !selD._bound) { selD._bound = true; selD.addEventListener("change", (e) => { cat.activeDecade = e.target.value; cat.activeYear = ""; const y = document.getElementById("rel-sel-year"); if (y) y.value = ""; applyFilters(); }); }

  const selW = document.getElementById("rel-sel-when");
  if (selW && !selW._bound) { selW._bound = true; selW.addEventListener("change", (e) => {
    const v = e.target.value;
    cat.activeDecade = v.startsWith("d:") ? v.slice(2) : "";
    cat.activeYear = v.startsWith("y:") ? v.slice(2) : "";
    applyFilters();
  }); }

  const selY = document.getElementById("rel-sel-year");
  if (selY && !selY._bound) { selY._bound = true; selY.addEventListener("change", (e) => { cat.activeYear = e.target.value; cat.activeDecade = ""; const d = document.getElementById("rel-sel-decade"); if (d) d.value = ""; applyFilters(); }); }

  const selT = document.getElementById("rel-sel-type");
  if (selT && !selT._bound) { selT._bound = true; selT.addEventListener("change", (e) => { cat.activeType = e.target.value; applyFilters(); }); }

  const selS = document.getElementById("rel-sel-series");
  if (selS && !selS._bound) { selS._bound = true; selS.addEventListener("change", (e) => { cat.activeSeries = e.target.value; applyFilters(); }); }

  const selL = document.getElementById("rel-sel-label");
  if (selL && !selL._bound) { selL._bound = true; selL.addEventListener("change", (e) => { cat.activeLabel = e.target.value; applyFilters(); }); }

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

// --- Credits (JSON in the Credits column; the admin's creditLines() builds the same lines) ---
function releaseCredits(r){
  try { const c = JSON.parse(r["Credits"] || "{}"); return c && typeof c === "object" ? c : {}; } catch (e) { return {}; }
}
function creditLines(c){
  const lines = [];
  if (c.written_by) lines.push(`${c.role || "Written & Produced"} by ${c.written_by}${c.studio ? " @ " + c.studio : ""}${c.years ? ", " + c.years : ""}.`);
  if (c.remixed_by) lines.push(`Remixed by ${c.remixed_by}.`);
  if (c.mastered_by || c.mastered_at) lines.push(`${c.remaster ? "Remastered" : "Mastered"}${c.mastered_by ? " by " + c.mastered_by : ""}${c.mastered_at ? " at " + c.mastered_at : ""}.`);
  if (c.artwork_by) lines.push(`Artwork by ${c.artwork_by}.`);
  if (c.copyright_holder || c.copyright_year) lines.push(`© ${[c.copyright_holder, c.copyright_year].filter(Boolean).join(" ")}`);
  if (c.other) String(c.other).split(/\n+/).map(l => l.trim()).filter(Boolean).forEach(l => lines.push(l));
  return lines;
}
// Escaped text with web addresses turned into links.
const linkify = s => esc(s).replace(/\b((?:https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?)])/gi,
  u => `<a href="${/^www\./i.test(u) ? "https://" + u : u}" target="_blank" rel="noopener nofollow">${u}</a>`);
// "psilodump & Paza Rahm", "Methadump, psilodump", "psilodump feat. Son of Sun" -> names.
// Only ", ", " & " and " feat. " separate names ("Puskajussi and The Apinat" is one name).
const releaseArtist = r => String(r["Artist"] || "").trim() || "psilodump";
const artistNames = credit => String(credit).split(/\s*,\s*|\s+&\s+|\s+(?:feat\.?|ft\.?|featuring)\s+/i).map(x => x.trim()).filter(Boolean);
const splitList = v => String(v || "").split(",").map(x => x.trim()).filter(Boolean);

// --- Physical editions (CD / Vinyl, e.g. on elastic stage) ---
const PHYS_ICONS = {
  CD: '<svg class="psd-phys-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 5.2a6.8 6.8 0 0 1 6.8 6.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".55"/></svg>',
  Cassette: '<svg class="psd-phys-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="1.5" y="5" width="21" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="8" cy="11" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="16" cy="11" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10.2 11h3.6M6 19l1.5-3.5h9L18 19" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  Floppy: '<svg class="psd-phys-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h15l3 3v15H3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><rect x="7" y="3" width="9" height="6" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="12.5" y="4.3" width="2" height="3.4" fill="currentColor"/><rect x="6" y="13" width="12" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  Vinyl: '<svg class="psd-phys-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="currentColor"/><circle cx="12" cy="12" r="8" fill="none" stroke="#000" stroke-opacity=".35" stroke-width=".8"/><circle cx="12" cy="12" r="6" fill="none" stroke="#000" stroke-opacity=".35" stroke-width=".8"/><circle cx="12" cy="12" r="3.4" fill="#fff" fill-opacity=".85"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>',
};
// Edition statuses: available, upcoming, sold_out, not_for_sale (exists, but isn't sold,
// e.g. the 476 Vol. CD-Rs). The last two are "past": listed after the others, icon dimmed.
const EDITION_STATUS_LABELS = { sold_out: "Sold out", upcoming: "Upcoming", not_for_sale: "Not for sale" };
const editionPast = e => e.Status === "sold_out" || e.Status === "not_for_sale";
// Order of a release's editions: buyable first, then those with a cat# (the label's own
// pressing, e.g. 476WAX003 before a variant without one), then newest first.
const editionOrder = (a, b) => editionPast(a) - editionPast(b)
  || (!a["Cat#"]) - (!b["Cat#"]) || String(b.Year).localeCompare(String(a.Year));
const EDITION_KINDS = ["Vinyl", "CD", "Cassette", "Floppy"];
const editionKind = fmt => /vinyl|\b(7|10|12)"/i.test(fmt) ? "Vinyl" : /\bcd\b/i.test(fmt) ? "CD"
  : /cassette|\btape\b/i.test(fmt) ? "Cassette" : /floppy|diskette/i.test(fmt) ? "Floppy" : "";
// Kinds (CD / Vinyl) of a release's editions: [{ kind, available }], available if any edition of that kind is.
function physicalFormats(r){
  const kinds = {};
  (r._editions || []).forEach(e => {
    const k = editionKind(e.Format);
    if (k) kinds[k] = kinds[k] || e.Status === "available";
  });
  return EDITION_KINDS.filter(k => k in kinds).map(k => ({ kind: k, available: kinds[k] }));
}

// --- Release page: psilodu.mp/release?r=<id> ---
// One Bandzoogle page (/release) with <div id="psd-release"></div> + this script
// shows any release. <id> is the Cat# (DMTCD19/20 -> DMTCD19-20) or, without a
// Cat#, title + year (psilodumputer-2000). Releases on Bandzoogle get our own
// player, built from their album page's track list (same site, so it can be read).
const RELEASE_PATH = "/release";
const CATALOGUE_PATH = "/";
const TODAY_PATH = "/today";
// A full YYYY-MM-DD date as a link to "On this day" for that day; other dates (YYYY, empty) as plain text.
function dayLink(date){
  const m = String(date || "").match(/^\d{4}-(\d{2})-(\d{2})$/);
  return m ? `<a class="psd-day" href="${TODAY_PATH}?date=${m[1]}-${m[2]}" title="On this day">${esc(date)}</a>` : esc(date || "");
}
// Catalogue titles link to the release page (the Bandzoogle page /release exists since 2026-10-09).
const RELEASE_LINKS = true;

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
// tracks.csv + tracklists.csv → { lists: {releaseId: [rows in order]} }, once per visit.
// Optional: without them the release page uses Bandzoogle's track list as before.
function loadTrackData(){
  const cat = window._psilodumpCat;
  if (!cat._trackPromise) {
    const get = url => fetch(url + "?v=" + Date.now()).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); }).then(t => toObjects(parseCSV(t)).rows);
    const vids = get(VIDEOS_URL).catch(() => []);   // optional
    cat._trackPromise = Promise.all([get(TRACKS_URL), get(TRACKLISTS_URL), vids]).then(([tracks, rows, videos]) => {
      const byId = {}; tracks.forEach(t => { byId[t.ID] = t; });
      const lists = {};
      rows.forEach(r => { const t = byId[r["Track ID"]]; if (t) (lists[r["Release ID"]] = lists[r["Release ID"]] || []).push({ row: r, t }); });
      Object.values(lists).forEach(l => l.sort((a, b) => (+a.row.Disc - +b.row.Disc) || (+a.row.Position - +b.row.Position)));
      const videosByTrack = {}, videosByRelease = {};
      // "From Others" (fan videos, DJ sets, audience recordings) only appear on the VIDEOS page.
      videos.filter(v => v["From Others"] !== "1").forEach(v => {
        if (v["Track ID"]) (videosByTrack[v["Track ID"]] = videosByTrack[v["Track ID"]] || []).push(v);
        if (v["Release ID"]) (videosByRelease[v["Release ID"]] = videosByRelease[v["Release ID"]] || []).push(v);
      });
      return { byId, lists, videosByTrack, videosByRelease, videos };
    }).catch(err => { console.warn("Track lists unavailable:", err.message); cat._trackPromise = null; return { byId: {}, lists: {}, videosByTrack: {}, videosByRelease: {}, videos: [] }; });
  }
  return cat._trackPromise;
}
const secToTime = s => { s = parseInt(s, 10); return s > 0 ? Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0") : ""; };

// Our track list for a release as player items: title/version/artist/former titles, length (this
// release's, else the track's), disc + heading, and the audio address when the track has a page.
function releaseTrackItems(list){
  return list.map(({ row, t }) => {
    // A release can print its own title for the track (a remaster renamed) and have its own upload.
    const bz = (String(row.Source || t.Source || "").match(/track\/(\d+)/) || [])[1];
    return {
      title: row.Title || t.Title || "(untitled)", version: row.Title ? "" : (t.Version || ""), artist: t.Artist || "",
      former: String(t["Former Titles"] || "").split(" | ").filter(Boolean),
      duration: secToTime(row.Length) || secToTime(t.Length), disc: +row.Disc || 1, pos: +row.Position || 0,
      heading: row.Heading || "", note: row.Note || "", src: bz ? "/player/tracks/" + bz + ".mp3" : "",
      trackId: t.ID, ytMusic: row["YouTube Music"] || "",
    };
  });
}

function loadCatalogue(){
  const cat = window._psilodumpCat;
  if (cat.loaded) return Promise.resolve(cat.rows);
  if (!cat._promise) {
    cat.loading = true;
    // editions.csv is optional: if it can't be loaded the catalogue works without it.
    const editions = fetch(EDITIONS_URL + "?v=" + Date.now())
      .then(r => r.ok ? r.text() : "").then(t => t ? toObjects(parseCSV(t)).rows : []).catch(() => []);
    cat._promise = fetch(CSV_URL + "?v=" + Date.now())
      .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
      .then(text => editions.then(eds => [text, eds]))
      .then(([text, eds]) => {
        const { rows: raw } = toObjects(parseCSV(text));
        cat.rows = withDerived(raw);
        cat.editions = eds;
        const byRelease = {};
        eds.forEach(e => splitList(e["Releases"]).forEach(id => (byRelease[id] = byRelease[id] || []).push(e)));
        cat.rows.forEach(r => {
          r._editions = (byRelease[r["ID"]] || []).sort(editionOrder);
          if (r._editions.length) r._searchStr += " " + r._editions.map(e => [e["Cat#"], e.Format, e.Title].join(" ")).join(" ").toLowerCase();
        });
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
  // During a Turbo visit the address changes before the new page is swapped in
  // (<html aria-busy>); the old page must not render the next address. turbo:render
  // / turbo:load call this again once the new page is there.
  if (document.documentElement.hasAttribute("aria-busy")) return;
  if (location.pathname.replace(/\/+$/, "") !== RELEASE_PATH) return;
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
  const ordered = [...rows].sort((a, b) => (byDate(b) - byDate(a)) || catOrder(a, b));
  const pos = ordered.indexOf(r);
  const newer = ordered[pos - 1], older = ordered[pos + 1];

  const panel = releaseSurface(r["Bg Color"], 1) || { bg: "#181818", text: "#ffffff" };
  const soft = releaseSurface(r["Bg Color"], 0.85) || { bg: "#222222", text: "#ffffff" };
  const deep = releaseSurface(r["Bg Color"], 0.6) || { bg: "#2a2a2a", text: "#ffffff" };
  const vars = `--rel-bg:${panel.bg};--rel-text:${panel.text};--rel-soft:${soft.bg};--rel-soft-text:${soft.text};--rel-deep:${deep.bg};--rel-deep-text:${deep.text}`;

  const title = r[TITLE_COL] || "(untitled)";
  const link = (x, label) => `<a href="${esc(releaseHref(x))}">${esc(label || x[TITLE_COL] || "(untitled)")}</a>`;
  const facts = [];
  if (r._released) facts.push(["Released", dayLink(r._released)]);
  if (r._catalogue && r._catalogue !== r._released) facts.push(["Catalogue date", dayLink(r._catalogue)]);
  if (r[TYPE_COL]) facts.push(["Type", esc(r[TYPE_COL])]);
  if (r[CAT_COL]) facts.push(["Cat#", esc(r[CAT_COL])]);
  if (r._labels.length) facts.push(["Label", r._labels.map(l => `<a href="${CATALOGUE_PATH}#label=${encodeURIComponent(l)}">${esc(l)}</a>`).join(", ")]);
  if (r["Formats"]) facts.push(["Format", esc(r["Formats"])]);
  if (r["Barcode"]) facts.push(["Barcode", esc(r["Barcode"])]);
  if (r._series.length) facts.push(["Series", r._series.map(s => `<a href="${CATALOGUE_PATH}#series=${encodeURIComponent(s)}">${esc(s)}</a>`).join(", ")]);
  const parent = r["Part Of"] && rows.find(x => x["MusicBrainz"] && x["MusicBrainz"] === r["Part Of"]);
  if (parent) facts.push(["Part of", `${link(parent)} · <a href="${esc(workHref(parent))}">all parts</a>`]);
  const children = r["MusicBrainz"] ? rows.filter(x => x["Part Of"] === r["MusicBrainz"]).sort(catOrder) : [];
  if (children.length) facts.push(["Contains", children.map(c => link(c)).join(", ") + ` · <a href="${esc(workHref(r))}">show in catalogue</a>`]);
  const norm = s => slugify(s);
  // Same title AND (when both are on MusicBrainz) the same release group: the psilodumputer singles
  // (2000, 2023) are editions of each other, not of the 2006 album with the same name.
  const editions = rows.filter(x => x !== r && norm(x[TITLE_COL]) === norm(title)
    && !(x["MusicBrainz"] && r["MusicBrainz"] && x["MusicBrainz"] !== r["MusicBrainz"]));
  if (editions.length) facts.push(["Other editions", editions.map(x => link(x, `${x[TITLE_COL]} (${x._yearRel !== "Unknown" ? x._yearRel : x._yearCat})`)).join(", ")]);

  const listen = r._svc.map(s => `<a class="psd-rel-svc" href="${esc(s.href)}" target="_blank" rel="noopener nofollow">${icon(s.key)}<span>${esc(s.label)}</span></a>`).join("");

  const albumId = bzAlbumId(r);
  const more = [];
  if (albumId) more.push(`<a href="${SITE}/album/${albumId}">Album page on psilodu.mp</a>`);
  else if (r["Source"]) more.push(`<a href="${esc(normHref(expandPlatformUrl(r["Source"], "source")))}">Release page</a>`);
  String(r["Sources"] || "").split(MULTI_LINK_SEP).map(x => x.trim()).filter(Boolean)
    .forEach(u => { const h = normHref(u); more.push(`<a href="${esc(h)}" target="_blank" rel="noopener nofollow">${esc(h.replace(/^https?:\/\/(www\.)?/, "").split("/")[0])}</a>`); });
  if (MBID_RE.test(r["MusicBrainz"] || "")) more.push(`<a href="${MB_RG_URL}${esc(r["MusicBrainz"])}" target="_blank" rel="noopener">MusicBrainz</a>`);
  if (/^https:\/\/www\.discogs\.com\//.test(r["Discogs"] || "")) more.push(`<a href="${esc(r["Discogs"])}" target="_blank" rel="noopener">Discogs</a>`);

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
        <div class="psd-rel-by">by ${esc(releaseArtist(r))}</div>
        ${r["Original Credit"] && slugify(r["Original Credit"]) !== slugify(releaseArtist(r)) ? `<div class="psd-rel-orig">Originally released as ${esc(r["Original Credit"])}</div>` : ""}
        <div class="psd-rel-sub">${[r[TYPE_COL], r._yearRel !== "Unknown" ? r._yearRel : "", r[CAT_COL]].filter(Boolean).map(esc).join(" • ")}</div>
        ${listen ? `<div class="psd-rel-listen">${listen}</div>` : ""}
        ${(() => {
          const bits = [];
          if (r["Live"] === "1") bits.push(`<span class="dot" aria-hidden="true"></span>Live on streaming services`);
          if (storeNote(r)) bits.push(storeNote(r));
          return bits.length ? `<div class="psd-rel-store">${bits.join(" · ")}</div>` : "";
        })()}
        ${(() => {
          // One button per kind that can be bought now, linking to the first such edition's shop page.
          const buy = EDITION_KINDS.map(k => r._editions.find(e => editionKind(e.Format) === k && e.Status === "available" && e.URL)).filter(Boolean);
          if (!buy.length) return "";
          return `<div class="psd-rel-phys"><span class="psd-rel-phys-label">Available on</span>${buy.map(e => { const k = editionKind(e.Format);
            return `<a class="psd-rel-phys-btn" href="${esc(e.URL)}" target="_blank" rel="noopener">${PHYS_ICONS[k]}<span>${k}</span></a>`; }).join("")}</div>`;
        })()}
        <dl class="psd-rel-facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>
      </div>
    </div>
    <section class="psd-rel-player" id="psd-player"></section>
    <section class="psd-rel-videos" id="psd-videos"></section>
    ${r._editions.length ? `<section class="psd-rel-editions"><h2>Physical editions</h2><ul>${r._editions.map(e => {
        const k = editionKind(e.Format);
        const status = e.Status === "available" && e.URL ? `<a class="psd-ed-buy" href="${esc(e.URL)}" target="_blank" rel="noopener">Buy</a>`
          : `<span class="psd-ed-status">${EDITION_STATUS_LABELS[e.Status] || "Available soon"}</span>`;
        const other = e.Artist && e.Artist.toLowerCase() !== "psilodump" ? `${esc(e.Artist)} – ` : "";
        return `<li>${k ? PHYS_ICONS[k] : ""}<span class="psd-ed-main"><b>${other}${esc(e.Title)}</b>
          <span class="psd-ed-meta">${[e.Format, e["Cat#"], e.Label, e.Year].filter(Boolean).map(esc).join(" · ")}${e.Note ? " — " + esc(e.Note) : ""}${/^https:\/\/www\.discogs\.com\//.test(e.Discogs || "") ? ` · <a href="${esc(e.Discogs)}" target="_blank" rel="noopener">Discogs</a>` : ""}</span></span>${status}</li>`;
      }).join("")}</ul></section>` : ""}
    ${(() => { const lines = creditLines(releaseCredits(r)); return lines.length ? `<section class="psd-rel-credits"><h2>Credits</h2><p>${lines.map(linkify).join("<br>")}</p></section>` : ""; })()}
    ${more.length ? `<div class="psd-rel-more">${more.join(" · ")}</div>` : ""}
  </div>
  <div id="rel-lightbox" class="rel-modal-overlay"><img id="rel-lightbox-img" class="rel-lightbox-img" src="" alt="Album Artwork"></div>`;
  moveModalsToBody();
  document.title = title + " | psilodump";
  renderPlayer(document.getElementById("psd-player"), r, albumId);
}

// --- Player ---
// Play / pause as SVG: iPhone and iPad render the "▶" character as a colour emoji.
const PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>';
const PAUSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5.5" width="4" height="13" rx="1" fill="currentColor"/><rect x="13.5" y="5.5" width="4" height="13" rx="1" fill="currentColor"/></svg>';
// Bandzoogle album: read the track list from the album page and play the tracks
// with one <audio> element. Otherwise: the Spotify / Apple Music / YouTube player.
const VIDEO_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 10.5l5-3v9l-5-3z" fill="currentColor"/></svg>';
const YTMUSIC_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 8.5v7l6-3.5z" fill="currentColor"/></svg>';
// A YouTube video that only loads (from youtube-nocookie.com) when clicked.
function liteYouTube(id, label){
  return `<button type="button" class="psd-yt" data-psd-yt="${esc(id)}" aria-label="Play video: ${esc(label)}"><img src="https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg" alt="" loading="lazy"><span class="psd-yt-play">${PLAY_ICON}</span></button>`;
}
function playLiteYouTube(btn){
  const id = btn.getAttribute("data-psd-yt");
  if (!/^[A-Za-z0-9_-]{11}$/.test(id || "")) return;
  const p = window._psdPlayer; if (p && !p.audio.paused) p.audio.pause();      // one sound at a time
  const frame = document.createElement("iframe");
  frame.className = "psd-yt-frame";
  frame.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0";
  frame.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture";
  frame.allowFullscreen = true;
  frame.title = btn.getAttribute("aria-label") || "Video";
  const box = document.createElement("div"); box.className = "psd-ytbox"; box.appendChild(frame);
  btn.replaceWith(box);
}
const kindOrder = k => { const i = Object.keys(VIDEO_KINDS).indexOf(k); return i < 0 ? 99 : i; };
// The release's videos: its own (full album audio, teasers …) and those of its tracks, without duplicates.
function releaseVideos(r, data, items){
  const seen = new Set(), out = [];
  const add = (v, label) => { if (seen.has(v["Video ID"])) return; seen.add(v["Video ID"]); out.push({ id: v["Video ID"], kind: v.Kind, label, note: v.Note || "" }); };
  (data.videosByRelease[r["ID"]] || []).forEach(v => add(v, r[TITLE_COL] || ""));
  (items || []).forEach(x => (data.videosByTrack[x.trackId] || []).forEach(v => add(v, x.title + (x.version ? " (" + x.version + ")" : ""))));
  return out.sort((a, b) => kindOrder(a.kind) - kindOrder(b.kind));
}
function renderVideos(r, data, items){
  const sec = document.getElementById("psd-videos");
  if (!sec) return;
  const vids = releaseVideos(r, data, items);
  if (!vids.length) { sec.innerHTML = ""; return; }
  sec.innerHTML = `<h2>Videos</h2><div class="psd-vgrid">${vids.map(v => `<figure class="psd-vcard" id="psd-v-${esc(v.id)}">${liteYouTube(v.id, v.label)}<figcaption>${esc(v.label)}<small>${esc(VIDEO_KINDS[v.kind] || "Video")}${v.note ? " · " + esc(v.note) : ""}</small></figcaption></figure>`).join("")}</div>`;
}

function renderPlayer(box, r, albumId){
  if (!box) return;
  stopPlayer();
  box.innerHTML = `<div class="psd-player-note">Loading tracks…</div>`;
  loadTrackData().then(data => {
    if (!document.body.contains(box)) return;
    const list = data.lists[r["ID"]];
    const full = (data.videosByRelease[r["ID"]] || []).find(v => v.Kind === "full_album");
    r._fullAlbum = full ? full["Video ID"] : "";          // the player for releases without our audio
    const items0 = list && list.length ? releaseTrackItems(list) : [];
    items0.forEach(x => { x.video = ((data.videosByTrack[x.trackId] || [])[0] || {})["Video ID"] || ""; });
    renderVideos(r, data, items0);
    if (list && list.length) {
      const items = items0;
      if (items.some(x => x.src)) return buildTrackPlayer(box, r, items, albumId);
      if (albumId) return renderBzPlayer(box, r, albumId, items);    // our list has no audio: Bandzoogle's
      box.innerHTML = trackListHtml(items, false);                    // list only, plus an embed below
      const emb = document.createElement("div"); emb.style.marginTop = "14px"; box.appendChild(emb); renderEmbed(emb, r);
      return;
    }
    renderBzPlayer(box, r, albumId, null);
  });
}

// Bandzoogle's own album track list (releases without our list, or without track pages in it).
function renderBzPlayer(box, r, albumId, items){
  if (albumId) {
    box.innerHTML = `<div class="psd-player-note">Loading tracks…</div>`;
    // Bandzoogle's album page lists only the first 20 tracks (then data-load-more="true");
    // /go/albums/<n>/tracks returns the track list alone, all of it with amount=1000.
    // Not an official address, so the album page (first 20 tracks) is the fallback.
    const readTracks = html => [...new DOMParser().parseFromString(html, "text/html")
      .querySelectorAll("li.track-list-item a[data-dest]")].map(a => ({
        id: a.getAttribute("data-id"),
        title: a.getAttribute("data-title") || "",
        duration: a.getAttribute("data-duration") || "",
        src: a.getAttribute("data-dest"),
      })).filter(t => t.src);
    const getTracks = url => fetch(url)
      .then(res => { if (!res.ok) throw new Error("HTTP " + res.status); return res.text(); })
      .then(html => { const t = readTracks(html); if (!t.length) throw new Error("no tracks"); return t; });
    getTracks(`/go/albums/${albumId}/tracks?offset=0&amount=1000`)
      .catch(() => getTracks(`/album/${albumId}`))
      .then(tracks => {
        if (!document.body.contains(box)) return;          // the visitor has moved on
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

// The track list as HTML. Discs restart the numbering; a heading starts a chapter (or names the disc).
// playable = buttons (data-psd-track = index into the player's items); otherwise plain rows.
function trackListHtml(items, playable){
  const discs = new Set(items.map(x => x.disc)).size > 1;
  // Icons sit right of the length; every row reserves the same width so the lengths line up.
  const iconSlots = Math.max(0, ...items.map(x => (x.video ? 1 : 0) + (x.ytMusic ? 1 : 0)));
  let html = "", lastDisc = 0;
  items.forEach((x, i) => {
    if (discs && x.disc !== lastDisc) html += `<li class="psd-h">Disc ${x.disc}${x.heading ? " · " + esc(x.heading) : ""}</li>`;
    else if (x.heading) html += `<li class="psd-h">${esc(x.heading)}</li>`;
    lastDisc = x.disc;
    const sub = [x.artist && x.artist.toLowerCase() !== "psilodump" ? "by " + esc(x.artist) : "", x.former.length ? "previously " + x.former.map(esc).join(", ") : "", x.note ? esc(x.note) : ""].filter(Boolean).join(" · ");
    const inner = `<span class="psd-n">${x.pos === null ? "" : (x.pos || i + 1)}</span><span class="psd-t">${esc(x.title)}${x.version ? ` <span class="psd-v">(${esc(x.version)})</span>` : ""}${sub ? `<span class="psd-sub">${sub}</span>` : ""}</span><span class="psd-d">${esc(x.duration)}</span>`;
    const links = (x.video ? `<button type="button" data-psd-video="${esc(x.video)}" title="Video" aria-label="Video: ${esc(x.title)}">${VIDEO_ICON}</button>` : "")
      + (x.ytMusic ? `<a href="https://music.youtube.com/watch?v=${esc(x.ytMusic)}" target="_blank" rel="noopener" title="YouTube Music" aria-label="${esc(x.title)} on YouTube Music">${YTMUSIC_ICON}</a>` : "");
    const body = playable && x.src ? `<button type="button" data-psd-track="${i}">${inner}</button>` : `<div class="psd-off">${inner}</div>`;
    html += `<li class="psd-row">${body}${iconSlots ? `<span class="psd-tlinks" style="width:${iconSlots * 30}px">${links}</span>` : ""}</li>`;
  });
  return `<ol class="psd-tracks">${html}</ol>`;
}

function renderEmbed(box, r){
  if (r._fullAlbum) { box.innerHTML = liteYouTube(r._fullAlbum, (r[TITLE_COL] || "") + " – full album"); return; }
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
  tracks.forEach(t => { if (!("former" in t)) Object.assign(t, { version: "", artist: "", former: [], note: "", heading: "", disc: 1, pos: 0 }); });
  const first = Math.max(0, tracks.findIndex(t => t.src));
  box.innerHTML = `
    <div class="psd-player">
      <div class="psd-player-bar">
        <button type="button" class="psd-pp" data-psd-play aria-label="Play">${PLAY_ICON}</button>
        <div class="psd-now"><span class="psd-now-title">${esc(tracks[first].title)}</span><span class="psd-time">0:00 / ${esc(tracks[first].duration)}</span></div>
      </div>
      <div class="psd-progress" data-psd-seek role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="psd-progress-fill"></div></div>
      ${trackListHtml(tracks, true)}
    </div>`;
  const audio = new Audio();
  audio.preload = "none";
  const p = window._psdPlayer = { audio, tracks, index: first, box, title: r[TITLE_COL] || "", cover: r._largeUrl || r._thumbUrl || "" };
  audio.addEventListener("timeupdate", () => updatePlayerUI());
  audio.addEventListener("loadedmetadata", () => updatePlayerUI());
  audio.addEventListener("play", () => updatePlayerUI());
  audio.addEventListener("pause", () => updatePlayerUI());
  const nextPlayable = from => { for (let k = from; k < p.tracks.length; k++) if (p.tracks[k].src && !p.tracks[k].broken) return k; return -1; };
  p.next = nextPlayable;
  audio.addEventListener("ended", () => { const n = nextPlayable(p.index + 1); if (n >= 0) playTrack(n); else updatePlayerUI(); });
  // A track page that no longer exists: mark it and go on with the next one.
  audio.addEventListener("error", () => {
    const t = p.tracks[p.index]; if (!t || !audio.getAttribute("src")) return;
    t.broken = true;
    const b = p.box.querySelector(`[data-psd-track="${p.index}"]`); if (b) { b.classList.add("is-broken"); b.disabled = true; b.title = "Not available"; }
    const n = nextPlayable(p.index + 1); if (n >= 0) playTrack(n); else updatePlayerUI();
  });
}

function playTrack(i){
  const p = window._psdPlayer;
  if (!p || !p.tracks[i] || !p.tracks[i].src || p.tracks[i].broken) return;
  if (i !== p.index || !p.audio.src) {
    p.index = i;
    p.audio.src = p.tracks[i].src;
  }
  p.audio.play().catch(() => {});
  if ("mediaSession" in navigator && window.MediaMetadata) {
    const tr = p.tracks[i];
    navigator.mediaSession.metadata = new MediaMetadata({ title: tr.title + (tr.version ? " (" + tr.version + ")" : ""), artist: tr.artist || "psilodump", album: p.title, artwork: p.cover ? [{ src: p.cover }] : [] });
    navigator.mediaSession.setActionHandler("nexttrack", () => { const n = p.next ? p.next(p.index + 1) : p.index + 1; if (n >= 0) playTrack(n); });
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
  if (pp) { pp.innerHTML = playing ? PAUSE_ICON : PLAY_ICON; pp.setAttribute("aria-label", playing ? "Pause" : "Play"); }
  const nowT = p.box.querySelector(".psd-now-title"); if (nowT) nowT.textContent = t.title + (t.version ? " (" + t.version + ")" : "");
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

// MusicBrainz format -> schema.org MusicReleaseFormatType (formats without one are left out).
function releaseFormatJsonLd(fmt){
  const f = String(fmt).toLowerCase();
  if (/digital/.test(f)) return "https://schema.org/DigitalFormat";
  if (/\bcd\b|cd-r|compact disc/.test(f)) return "https://schema.org/CDFormat";
  if (/vinyl|\b(7|10|12)"/.test(f)) return "https://schema.org/VinylFormat";
  if (/cassette/.test(f)) return "https://schema.org/CassetteFormat";
  if (/dvd/.test(f)) return "https://schema.org/DVDFormat";
  if (/laserdisc/.test(f)) return "https://schema.org/LaserDiscFormat";
  return "";
}
const one = list => list.length === 1 ? list[0] : list;

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
    item.byArtist = one(artistNames(releaseArtist(r)).map(n => n.toLowerCase() === "psilodump"
      ? { "@id": ARTIST_ID }
      : { "@type": "MusicGroup", "name": n }));
    if (r._largeUrl) item.image = r._largeUrl;
    // The release (this edition): catalogue number, label, format, barcode.
    const release = { "@type": "MusicRelease", "name": r[TITLE_COL] || "" };
    if (r[CAT_COL]) release.catalogNumber = r[CAT_COL];
    const labels = splitList(r["Label"]);
    if (labels.length) release.recordLabel = one(labels.map(n => ({ "@type": "Organization", "name": n })));
    const formats = [...new Set(splitList(r["Formats"]).map(releaseFormatJsonLd).filter(Boolean))];
    if (formats.length) release.musicReleaseFormat = one(formats);
    // Barcode: schema.org has no barcode property for music releases (gtin is for
    // products/offers), so it goes in identifier, named by its type.
    const barcode = splitList(r["Barcode"]).find(b => /^\d{8,14}$/.test(b));
    if (barcode) release.identifier = { "@type": "PropertyValue", "propertyID": barcode.length === 12 ? "UPC" : barcode.length === 13 ? "EAN-13" : "GTIN", "value": barcode };
    const releases = Object.keys(release).length > 2 ? [release] : [];
    (r._editions || []).forEach(e => {
      const ed = { "@type": "MusicRelease", "name": e.Title };
      if (e["Cat#"]) ed.catalogNumber = e["Cat#"];
      if (e.Label) ed.recordLabel = { "@type": "Organization", "name": e.Label };
      const k = editionKind(e.Format);
      const schemaFormat = { Vinyl: "VinylFormat", CD: "CDFormat", Cassette: "CassetteFormat" }[k];
      if (schemaFormat) ed.musicReleaseFormat = "https://schema.org/" + schemaFormat;
      if (/^\d{4}$/.test(e.Year || "")) ed.datePublished = e.Year;
      if (e.URL) ed.url = e.URL;
      if (/^https:\/\/www\.discogs\.com\//.test(e.Discogs || "")) ed.sameAs = e.Discogs;
      const eb = String(e.Barcode || "").trim();
      if (/^\d{8,14}$/.test(eb)) ed.identifier = { "@type": "PropertyValue", "propertyID": eb.length === 12 ? "UPC" : eb.length === 13 ? "EAN-13" : "GTIN", "value": eb };
      releases.push(ed);
    });
    if (releases.length) item.albumRelease = one(releases);
    const credits = releaseCredits(r);
    const creditText = creditLines(credits).join(" ");
    if (creditText) item.creditText = creditText;
    if (credits.copyright_holder) item.copyrightHolder = { "@type": "Organization", "name": credits.copyright_holder };
    if (/^\d{4}$/.test(credits.copyright_year || "")) item.copyrightYear = Number(credits.copyright_year);

    const sameAs = [];
    if (MBID_RE.test(r["MusicBrainz"] || "")) sameAs.push(MB_RG_URL + r["MusicBrainz"].toLowerCase());
    if (/^https:\/\/www\.discogs\.com\//.test(r["Discogs"] || "")) sameAs.push(r["Discogs"]);
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

// --- DISCOGRAPHY: <div id="psd-discography"> — compact list by type, newest first (parts hidden in the grid are left out) ---
const TYPE_ORDER = ["Album", "MiniAlbum", "EP", "Single", "Compilation"];
const TYPE_NAMES = { Album: "Albums", MiniAlbum: "Mini-albums", EP: "EPs", Single: "Singles", Compilation: "Compilations" };
function initDiscography(){
  const mount = document.getElementById("psd-discography");
  if (!mount || mount._psdShown) return;
  if (document.documentElement.hasAttribute("aria-busy")) return;
  mount._psdShown = true;
  ensureStyles();
  mount.innerHTML = `<div class="psd-rel psd-rel-loading">Loading discography…</div>`;
  loadCatalogue().then(rows => {
    const when = r => r._catalogue || r._released || "";
    const groups = {};
    rows.filter(r => r["Hidden"] !== "1").forEach(r => { const t = (r._types[0] || "Other"); (groups[t] = groups[t] || []).push(r); });
    const order = [...TYPE_ORDER.filter(t => groups[t]), ...Object.keys(groups).filter(t => !TYPE_ORDER.includes(t))];
    mount.innerHTML = `<div class="psd-rel psd-disco">${order.map(t => {
      const list = groups[t].sort((a, b) => when(b).localeCompare(when(a)) || catOrder(a, b));
      return `<section><h2>${esc(TYPE_NAMES[t] || t)} <small>${list.length}</small></h2><ol>${list.map(r => {
        const artist = releaseArtist(r);
        return `<li><span class="y">${esc((when(r).match(/^\d{4}/) || [""])[0])}</span><span class="t"><a href="${esc(releaseHref(r))}">${esc(r[TITLE_COL] || "(untitled)")}</a>${artist.toLowerCase() !== "psilodump" ? ` <small>by ${esc(artist)}</small>` : ""}</span><span class="c">${esc([r[CAT_COL], r["Label"]].filter(Boolean).join(" · "))}</span></li>`;
      }).join("")}</ol></section>`;
    }).join("")}</div>`;
  }).catch(err => { console.error("Failed to load discography:", err); mount.innerHTML = `<div class="psd-rel">Unable to load the discography right now. Please refresh the page.</div>`; });
}

// --- CATALOGUE table: <div id="psd-catalogue-table"> — every release, sortable, searchable ---
const CTAB_COLS = [
  ["cat", "Cat#", r => r[CAT_COL] || ""], ["title", "Title", r => r[TITLE_COL] || ""], ["artist", "Artist", r => releaseArtist(r)],
  ["type", "Type", r => r[TYPE_COL] || ""], ["released", "Released", r => r._released || ""], ["catdate", "Cat. date", r => r._catalogue || ""],
  ["label", "Label", r => r["Label"] || ""], ["format", "Format", r => r["Formats"] || ""], ["barcode", "Barcode", r => r["Barcode"] || ""],
];
function initCatalogueTable(){
  const mount = document.getElementById("psd-catalogue-table");
  if (!mount || mount._psdShown) return;
  if (document.documentElement.hasAttribute("aria-busy")) return;
  mount._psdShown = true;
  ensureStyles();
  mount.innerHTML = `<div class="psd-rel psd-rel-loading">Loading catalogue…</div>`;
  loadCatalogue().then(rows => {
    const st = mount._psdTab = { sort: "catdate", dir: -1, q: "" };
    mount.innerHTML = `<div class="psd-rel psd-vpage"><div class="psd-vpage-bar"><input type="search" placeholder="Search the catalogue…" aria-label="Search the catalogue"><span class="psd-tcount" style="font-size:13px;opacity:.75"></span></div>
      <div class="psd-ctab-wrap"><table class="psd-ctab"><thead><tr>${CTAB_COLS.map(([k, l]) => `<th data-psd-sort="${k}" scope="col">${l}</th>`).join("")}</tr></thead><tbody></tbody></table></div></div>`;
    const render = () => {
      const col = CTAB_COLS.find(c => c[0] === st.sort), q = st.q.trim().toLowerCase();
      const list = rows.filter(r => !q || CTAB_COLS.some(c => String(c[2](r)).toLowerCase().includes(q)))
        .sort((a, b) => { const x = String(col[2](a)), y = String(col[2](b));
          if (!x !== !y) return !x ? 1 : -1;                     // empty values last, in both directions
          return (x.localeCompare(y, undefined, { numeric: true, sensitivity: "base" }) || catOrder(a, b)) * st.dir; });
      mount.querySelector("tbody").innerHTML = list.map(r => `<tr>${CTAB_COLS.map(([k, , get]) => {
        const v = esc(get(r));
        if (k === "released" || k === "catdate") return `<td>${dayLink(get(r))}</td>`;
        return k === "title" ? `<td class="w"><a href="${esc(releaseHref(r))}">${v || "(untitled)"}</a></td>` : `<td${k === "label" || k === "format" || k === "artist" ? ' class="w"' : ""}>${v}</td>`;
      }).join("")}</tr>`).join("");
      mount.querySelectorAll("[data-psd-sort]").forEach(th => th.setAttribute("aria-sort", th.getAttribute("data-psd-sort") === st.sort ? (st.dir > 0 ? "ascending" : "descending") : "none"));
      mount.querySelector(".psd-tcount").textContent = list.length + " releases";
    };
    mount._psdTabRender = render;
    mount.querySelector("input").addEventListener("input", e => { st.q = e.target.value; render(); });
    render();
  }).catch(err => { console.error("Failed to load catalogue:", err); mount.innerHTML = `<div class="psd-rel">Unable to load the catalogue right now. Please refresh the page.</div>`; });
}

// --- PHYSICAL page: <div id="psd-physical" data-kind="Vinyl"> — every physical edition (editions.csv) ---
const PHYS_STATUS = [["available", "Available now"], ["upcoming", "Coming soon"], ["sold_out", "Sold out"], ["not_for_sale", "Not for sale"]];
function initPhysical(){
  const mount = document.getElementById("psd-physical");
  if (!mount || mount._psdShown) return;
  if (document.documentElement.hasAttribute("aria-busy")) return;
  mount._psdShown = true;
  ensureStyles();
  mount.innerHTML = `<div class="psd-rel psd-rel-loading">Loading physical editions…</div>`;
  loadCatalogue().then(rows => {
    const cat = window._psilodumpCat, relById = {};
    rows.forEach(r => { relById[r["ID"]] = r; });
    const eds = (cat.editions || []).map(e => {
      const rels = splitList(e["Releases"]).map(id => relById[id]).filter(Boolean);
      return { e, kind: editionKind(e.Format) || "Other", rels, cover: (rels.find(r => r._thumbUrl) || {})._thumbUrl || "" };
    });
    const kinds = [...EDITION_KINDS.filter(k => eds.some(x => x.kind === k)), ...(eds.some(x => x.kind === "Other") ? ["Other"] : [])];
    const preset = mount.getAttribute("data-kind") || "";
    const st = mount._psdPhys = { kind: "" };
    const fromHash = () => { const k = new URLSearchParams(location.hash.replace(/^#/, "")).get("kind") || preset; st.kind = kinds.find(x => x.toLowerCase() === String(k).toLowerCase()) || ""; };
    fromHash();
    const card = x => {
      const e = x.e, past = editionPast(e), artist = e.Artist && e.Artist.toLowerCase() !== "psilodump" ? e.Artist : "";
      const buy = e.Status === "available" && e.URL ? `<a class="buy" href="${esc(e.URL)}" target="_blank" rel="noopener">Buy</a>` : `<span class="st">${esc(EDITION_STATUS_LABELS[e.Status] || (e.Status === "available" ? "Available" : ""))}</span>`;
      const contains = x.rels.length ? "Contains " + x.rels.map(r => `<a href="${esc(releaseHref(r))}">${esc(r[TITLE_COL])}</a>`).join(", ") : "";
      return `<figure class="psd-phys-card${past ? " past" : ""}"><div class="cv">${x.cover ? `<img src="${esc(x.cover)}" alt="" loading="lazy">` : (PHYS_ICONS[x.kind] || "")}<span class="kind">${PHYS_ICONS[x.kind] || ""}${esc(e.Format || x.kind)}</span></div>
        <h3>${esc(e.Title || "(untitled)")}${artist ? ` <small>by ${esc(artist)}</small>` : ""}</h3>
        <div class="meta">${esc([e["Cat#"], e.Label, e.Year].filter(Boolean).join(" · "))}${e.Note ? "<br>" + esc(e.Note) : ""}${contains ? "<br>" + contains : ""}${/^https:\/\/www\.discogs\.com\//.test(e.Discogs || "") ? ` · <a href="${esc(e.Discogs)}" target="_blank" rel="noopener">Discogs</a>` : ""}</div>
        <div class="act">${buy}</div></figure>`;
    };
    const render = () => {
      const shown = eds.filter(x => !st.kind || x.kind === st.kind);
      mount.querySelector(".psd-phys-list").innerHTML = PHYS_STATUS.map(([k, label]) => {
        const list = shown.filter(x => (x.e.Status || "available") === k).sort((a, b) => String(b.e.Year).localeCompare(String(a.e.Year)) || String(a.e.Title).localeCompare(String(b.e.Title)));
        return list.length ? `<section><h2>${label} <small>${list.length}</small></h2><div class="psd-phys-grid">${list.map(card).join("")}</div></section>` : "";
      }).join("") || `<p class="psd-vempty">Nothing here yet.</p>`;
      mount.querySelectorAll("[data-psd-pkind]").forEach(b => b.setAttribute("aria-pressed", b.getAttribute("data-psd-pkind") === st.kind ? "true" : "false"));
      const h = st.kind && st.kind !== preset ? "kind=" + st.kind.toLowerCase() : "";
      if (h !== location.hash.replace(/^#/, "")) history.replaceState(history.state, "", location.pathname + location.search + (h ? "#" + h : ""));
    };
    mount._psdPhysRender = render;
    mount.innerHTML = `<div class="psd-rel psd-vpage"><div class="psd-vpage-bar"><button type="button" data-psd-pkind="">All <small>${eds.length}</small></button>${kinds.map(k => `<button type="button" data-psd-pkind="${k}">${esc(k)} <small>${eds.filter(x => x.kind === k).length}</small></button>`).join("")}</div><div class="psd-phys-list"></div></div>`;
    if (!mount._psdHash) { mount._psdHash = true; window.addEventListener("hashchange", () => { const m = document.getElementById("psd-physical"); if (m && m._psdPhys) { const k = new URLSearchParams(location.hash.replace(/^#/, "")).get("kind") || m.getAttribute("data-kind") || ""; m._psdPhys.kind = kinds.find(x => x.toLowerCase() === k.toLowerCase()) || ""; m._psdPhysRender(); } }); }
    render();
  }).catch(err => { console.error("Failed to load editions:", err); mount.innerHTML = `<div class="psd-rel">Unable to load the physical editions right now. Please refresh the page.</div>`; });
}

// --- ON THIS DAY: <div id="psd-today"> — what happened on this day in earlier years (?date=MM-DD) ---
// Releases by Released, tracks by Finished (and by their own Released when on no catalogue release),
// videos by Published. Full YYYY-MM-DD dates only; dates are read from the text, never via Date.
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const mdOf = v => { const m = String(v || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[2] + "-" + m[3] : ""; };
const pad2 = n => String(n).padStart(2, "0");
function todayTarget(){
  const v = new URLSearchParams(location.search).get("date") || "";
  const m = v.match(/^(?:\d{4}[-/.])?(\d{1,2})[-/.](\d{1,2})$/);
  if (m && +m[1] >= 1 && +m[1] <= 12 && +m[2] >= 1 && +m[2] <= 31) return pad2(m[1]) + "-" + pad2(m[2]);
  const d = new Date(); return pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}
const shiftDay = (md, n) => { const d = new Date(2024, +md.slice(0, 2) - 1, +md.slice(3) + n); return pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); };   // 2024: has 29 Feb
function initToday(){
  const mount = document.getElementById("psd-today");
  if (!mount || mount._psdShown) return;
  if (document.documentElement.hasAttribute("aria-busy")) return;
  mount._psdShown = true;
  ensureStyles();
  mount.innerHTML = `<div class="psd-rel psd-rel-loading">Loading “On this day”…</div>`;
  Promise.all([loadCatalogue(), loadTrackData(), loadGigs().catch(() => ({ gigs: [] }))]).then(([rows, data, { gigs }]) => {
    const relById = {}; rows.forEach(r => { relById[r["ID"]] = r; });
    const onRelease = {};
    Object.entries(data.lists).forEach(([rid, list]) => list.forEach(({ t }) => { if (relById[rid] && !(onRelease[t.ID] || []).includes(relById[rid])) (onRelease[t.ID] = onRelease[t.ID] || []).push(relById[rid]); }));
    const thisYear = new Date().getFullYear();
    const ago = date => { const n = thisYear - +date.slice(0, 4); return n > 0 ? ` · ${n} year${n > 1 ? "s" : ""} ago` : (n === 0 ? " · this year" : ""); };
    const tracks = Object.values(data.byId);
    const videos = (data.videos || []).filter(v => v["From Others"] !== "1");
    // Everything per day, so empty days can point to the next day with something.
    const byDay = {};
    const add = (md, kind, x) => { if (!md) return; const d = byDay[md] = byDay[md] || { rels: [], tracks: [], vids: [], gigs: [] }; d[kind].push(x); };
    gigs.filter(g => g.Cancelled !== "1").forEach(g => add(mdOf(g.Date), "gigs", g));
    rows.forEach(r => add(mdOf(r._released), "rels", r));
    tracks.forEach(t => {
      add(mdOf(t.Finished), "tracks", { t, date: t.Finished, how: "finished" });
      if (!onRelease[t.ID] && mdOf(t.Released) && t.Released !== t.Finished) add(mdOf(t.Released), "tracks", { t, date: t.Released, how: "released" });
    });
    videos.forEach(v => add(mdOf(v.Published), "vids", v));
    const st = mount._psdToday = { md: todayTarget() };
    const render = () => {
      const md = st.md, day = byDay[md] || { rels: [], tracks: [], vids: [], gigs: [] };
      const now = new Date(), isToday = md === pad2(now.getMonth() + 1) + "-" + pad2(now.getDate());
      const label = +md.slice(3) + " " + MONTHS[+md.slice(0, 2) - 1];
      stopPlayer();
      const rels = day.rels.slice().sort((a, b) => a._released.localeCompare(b._released) || catOrder(a, b));
      const relHtml = rels.map(r => {
        const sf = releaseSurface(r["Bg Color"], 1) || { bg: "rgba(127,127,127,.12)", text: "inherit" };
        return `<a class="psd-today-rel" href="${esc(releaseHref(r))}" style="--rel-bg:${esc(sf.bg)};--rel-text:${esc(sf.text)}">${r._thumbUrl ? `<img src="${esc(r._thumbUrl)}" alt="" loading="lazy">` : '<span class="ph"></span>'}<span><b>${esc(r[TITLE_COL] || "(untitled)")}</b><small>${esc([r._released.slice(0, 4), r[TYPE_COL], r[CAT_COL]].filter(Boolean).join(" · "))}${esc(ago(r._released))}</small>${releaseArtist(r).toLowerCase() !== "psilodump" ? `<small>by ${esc(releaseArtist(r))}</small>` : ""}</span></a>`;
      }).join("");
      let lastYear = null;
      const items = day.tracks.slice().sort((a, b) => a.date.localeCompare(b.date) || String(a.t.Title).localeCompare(String(b.t.Title))).map(({ t, date, how }) => {
        const year = date.slice(0, 4), heading = year !== lastYear ? year : ""; lastYear = year;
        const bz = (String(t.Source || "").match(/track\/(\d+)/) || [])[1];
        const rels = onRelease[t.ID] || [];
        return { title: t.Title || "(untitled)", version: t.Version || "", artist: t.Artist || "", former: String(t["Former Titles"] || "").split(" | ").filter(Boolean),
          duration: secToTime(t.Length), disc: 1, pos: null, heading,
          note: [how + ago(date).replace(/^ · /, ", "), rels.length ? "on " + rels.map(r => r[TITLE_COL]).join(", ") : (t.Released ? "" : "unreleased")].filter(Boolean).join(" · "),
          src: bz ? "/player/tracks/" + bz + ".mp3" : "", trackId: t.ID, ytMusic: "", video: ((data.videosByTrack[t.ID] || [])[0] || {})["Video ID"] || "" };
      });
      const vids = day.vids.slice().sort((a, b) => String(a.Published).localeCompare(String(b.Published))).map(v => {
        const t = data.byId[v["Track ID"]], r = relById[v["Release ID"]];
        const title = t ? t.Title + (t.Version ? " (" + t.Version + ")" : "") : (r ? r[TITLE_COL] : (v["YouTube Title"] || "Video"));
        return `<figure class="psd-vcard">${liteYouTube(v["Video ID"], title)}<figcaption>${esc(title)}<small>${esc(VIDEO_KINDS[v.Kind] || "Video")} · ${esc(String(v.Published).slice(0, 4))}${esc(ago(String(v.Published)))}</small></figcaption></figure>`;
      }).join("");
      const gigList = day.gigs.slice().sort((a, b) => String(a.Date).localeCompare(String(b.Date))).map(g => `<li class="psd-today-gig"><span class="y">${esc(String(g.Date).slice(0, 4))}</span><span class="e"><a href="${esc(gigHref(g))}">${esc(g.Event || "Gig")}</a><small>${esc(gigPlace(g))}${esc(ago(String(g.Date)))}</small></span><span class="i">${gigIcons(g)}</span></li>`).join("");
      let next = "";
      if (!rels.length && !items.length && !vids.length && !gigList) { for (let i = 1; i <= 366; i++) { const n = shiftDay(md, i); if (byDay[n]) { next = n; break; } } }
      mount.innerHTML = `<div class="psd-rel psd-today"><div class="psd-today-nav"><button type="button" data-psd-day="${shiftDay(md, -1)}">← ${esc(+shiftDay(md, -1).slice(3) + " " + MONTHS[+shiftDay(md, -1).slice(0, 2) - 1].slice(0, 3))}</button><h2>${esc(label)}</h2><button type="button" data-psd-day="${shiftDay(md, 1)}">${esc(+shiftDay(md, 1).slice(3) + " " + MONTHS[+shiftDay(md, 1).slice(0, 2) - 1].slice(0, 3))} →</button></div>
        ${!isToday ? `<p style="text-align:center;margin:-8px 0 18px"><button type="button" data-psd-day="today" style="font:inherit;font-size:13px;background:none;border:0;color:inherit;text-decoration:underline;cursor:pointer">back to today</button></p>` : ""}
        ${rels.length ? `<section><h3>Released <small>${rels.length}</small></h3><div class="psd-today-rels">${relHtml}</div></section>` : ""}
        ${items.length ? `<section><h3>Tracks <small>${items.length}</small></h3><div class="psd-rel-player" id="psd-player"></div></section>` : ""}
        ${gigList ? `<section><h3>Gigs <small>${day.gigs.length}</small></h3><ul class="psd-today-gigs">${gigList}</ul></section>` : ""}
        ${vids.length ? `<section><h3>Videos <small>${day.vids.length}</small></h3><div class="psd-vgrid">${vids}</div></section>` : ""}
        ${next ? `<p class="psd-today-empty">Nothing on ${esc(label)} yet. Next: <button type="button" data-psd-day="${next}" style="font:inherit;background:none;border:0;color:inherit;text-decoration:underline;cursor:pointer;padding:0">${esc(+next.slice(3) + " " + MONTHS[+next.slice(0, 2) - 1])}</button></p>` : ""}</div>`;
      const box = document.getElementById("psd-player");
      if (box) { if (items.some(x => x.src)) buildTrackPlayer(box, { [TITLE_COL]: "On " + label }, items, ""); else box.innerHTML = trackListHtml(items, false); }
      const q = new URLSearchParams(location.search); if (isToday) q.delete("date"); else q.set("date", md);
      const url = location.pathname + (q.toString() ? "?" + q.toString() : "") + location.hash;
      if (url !== location.pathname + location.search + location.hash) history.replaceState(history.state, "", url);
    };
    mount._psdTodayRender = render;
    render();
  }).catch(err => { console.error("Failed to load On this day:", err); mount.innerHTML = `<div class="psd-rel">Unable to load “On this day” right now. Please refresh the page.</div>`; });
}

// --- GIGS: list (<div id="psd-gigs">) and one gig (<div id="psd-gig"> on /gig?g=<key>) from gigs.csv ---
const GIGS_URL = "https://raw.githubusercontent.com/psilodump/website-data/refs/heads/main/gigs.csv";
const GIG_IMAGES_URL = "https://raw.githubusercontent.com/psilodump/website-data/refs/heads/main/gig_images.csv";
const GIG_SETLISTS_URL = "https://raw.githubusercontent.com/psilodump/website-data/refs/heads/main/gig_setlists.csv";
const GIG_PATH = "/gig", GIGS_PATH = "/gigs";
const GIG_ROLE_NAMES = { live: "Live", dj: "DJ", vj: "VJ", mc: "MC" };
const GIG_SELF = /psilodump|r\.?i\.?p\.?c|psilodumputer|pushiro|insekt 476|art of realistix|simon rahm/i;
const PHOTO_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12.5" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 6l1.5-2h5L16 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
const FLYER_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 11h7M9 15h7" stroke="currentColor" stroke-width="2"/></svg>';
const AUDIO_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="3" y="13" width="4" height="7" rx="1.5" fill="currentColor"/><rect x="17" y="13" width="4" height="7" rx="1.5" fill="currentColor"/></svg>';
function loadGigs(){
  const cat = window._psilodumpCat;
  if (!cat._gigPromise) {
    const get = url => fetch(url + "?v=" + Date.now()).then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); }).then(t => toObjects(parseCSV(t)).rows);
    cat._gigPromise = Promise.all([get(GIGS_URL), get(GIG_IMAGES_URL).catch(() => []), loadTrackData(), get(GIG_SETLISTS_URL).catch(() => [])]).then(([gigs, imgs, data, sets]) => {
      gigs.sort((a, b) => String(b.Date).localeCompare(String(a.Date)) || (+b.ID - +a.ID));
      const images = {}, videos = {}, setlists = {};
      sets.forEach(x => (setlists[x["Gig ID"]] = setlists[x["Gig ID"]] || []).push(x));
      Object.values(setlists).forEach(l => l.sort((a, b) => +a.Position - +b.Position));
      imgs.forEach(i => { if (i.Image) (images[i["Gig ID"]] = images[i["Gig ID"]] || []).push(i); });
      (data.videos || []).forEach(v => { if (v["Gig ID"]) (videos[v["Gig ID"]] = videos[v["Gig ID"]] || []).push(v); });
      const seen = {};
      gigs.forEach(g => { const k = (g.Date + "-" + slugify(g.Event || "gig")).replace(/-+$/, ""); g._key = seen[k] ? k + "-" + g.ID : k; seen[k] = 1;
        g._images = images[g.ID] || []; g._videos = videos[g.ID] || []; g._setlist = setlists[g.ID] || []; g._links = String(g.Links || "").split(" | ").filter(u => /^https?:\/\//.test(u)); g._acts = String(g["Line-up"] || "").split(" | ").filter(Boolean); });
      return { gigs, data };
    }).catch(err => { cat._gigPromise = null; throw err; });
  }
  return cat._gigPromise;
}
const gigHref = g => GIG_PATH + "?g=" + encodeURIComponent(g._key);
const gigPlace = g => [g.Venue, g.City, g.Country].filter(Boolean).join(", ");
function gigDateText(d){
  const m = String(d || "").match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!m) return "";
  return [m[3] ? +m[3] : "", m[2] ? MONTHS[+m[2] - 1] : "", m[1]].filter(Boolean).join(" ");
}
const gigLarge = i => String(i.Image).replace("/thumb_", "/large_");
function gigLinkLabel(u){
  const host = (String(u).match(/^https?:\/\/(?:www\.)?([^/]+)/i) || [])[1] || u;
  return { "mixcloud.com": "Mixcloud", "youtube.com": "YouTube", "youtu.be": "YouTube", "soundcloud.com": "SoundCloud", "archive.org": "Internet Archive", "bandcamp.com": "Bandcamp" }[host.toLowerCase()] || host;
}
function gigIcons(g){
  const f = g._images.some(i => i.Kind === "flyer"), p = g._images.some(i => i.Kind === "photo");
  return [f ? `<span title="Flyer">${FLYER_ICON}</span>` : "", p ? `<span title="Photos">${PHOTO_ICON}</span>` : "", g.Source ? `<span title="Live recording">${AUDIO_ICON}</span>` : "", g._videos.length ? `<span title="Video">${VIDEO_ICON}</span>` : ""].join("");
}

function initGigsList(){
  const mount = document.getElementById("psd-gigs");
  if (!mount || mount._psdShown) return;
  if (document.documentElement.hasAttribute("aria-busy")) return;
  mount._psdShown = true;
  ensureStyles();
  mount.innerHTML = `<div class="psd-rel psd-rel-loading">Loading gigs…</div>`;
  Promise.all([loadCatalogue(), loadGigs()]).then(([, { gigs }]) => {
    const countries = [...new Set(gigs.map(g => g.Country).filter(Boolean))].sort();
    const types = [...new Set(gigs.map(g => g.Type).filter(Boolean))].sort();
    const st = mount._psdGigs = { q: "", country: "", type: "", media: false };
    const h = new URLSearchParams(location.hash.replace(/^#/, ""));
    st.q = h.get("q") || ""; st.country = h.get("country") || ""; st.type = h.get("type") || ""; st.media = h.get("media") === "1";
    const opt = (list, v, all) => `<option value="">${all}</option>` + list.map(x => `<option${x === v ? " selected" : ""}>${esc(x)}</option>`).join("");
    mount.innerHTML = `<div class="psd-rel psd-vpage psd-gigs"><div class="psd-vpage-bar">
      <input type="search" placeholder="Search gigs, places, line-ups…" aria-label="Search gigs" value="${esc(st.q)}">
      <select data-k="country" aria-label="Country">${opt(countries, st.country, "All countries")}</select>
      <select data-k="type" aria-label="Type">${opt(types, st.type, "All types")}</select>
      <label class="psd-gig-media"><input type="checkbox"${st.media ? " checked" : ""}> with flyers, photos, recordings or video</label>
      <span class="psd-gcount"></span></div><div class="psd-gig-list"></div></div>`;
    const render = () => {
      const q = st.q.trim().toLowerCase();
      const list = gigs.filter(g => (!st.country || g.Country === st.country) && (!st.type || g.Type === st.type)
        && (!st.media || g._images.length || g.Source || g._videos.length)
        && (!q || [g.Date, g.Event, g.Venue, g.City, g.Country, g.Credit, g["Line-up"], g.Organizer].join(" ").toLowerCase().includes(q)));
      let year = null;
      const rows = list.map(g => {
        const y = String(g.Date).slice(0, 4), head = y !== year ? `${year !== null ? "</ol></section>" : ""}<section><h2>${esc(y)} <small>${list.filter(x => String(x.Date).startsWith(y)).length}</small></h2><ol>` : "";
        year = y;
        return head + `<li class="${g.Cancelled === "1" ? "psd-gig-off" : ""}"><span class="d">${esc(String(g.Date).slice(5).replace("-", "/"))}</span><span class="e"><a href="${esc(gigHref(g))}">${esc(g.Event || "(untitled)")}</a>${g.Cancelled === "1" ? " <small>cancelled</small>" : ""}${g.Role && g.Role !== "Live" ? ` <small>${esc(g.Role)}</small>` : ""}<small class="p">${esc(gigPlace(g))}</small></span><span class="i">${gigIcons(g)}</span></li>`;
      }).join("") + (year !== null ? "</ol></section>" : "");
      mount.querySelector(".psd-gig-list").innerHTML = rows || `<p class="psd-vempty">No gigs match.</p>`;
      mount.querySelector(".psd-gcount").textContent = list.length + " gig" + (list.length === 1 ? "" : "s");
      const p = new URLSearchParams();
      if (st.q) p.set("q", st.q); if (st.country) p.set("country", st.country); if (st.type) p.set("type", st.type); if (st.media) p.set("media", "1");
      const hs = p.toString();
      if (hs !== location.hash.replace(/^#/, "")) history.replaceState(history.state, "", location.pathname + location.search + (hs ? "#" + hs : ""));
    };
    mount.querySelector("input[type=search]").addEventListener("input", e => { st.q = e.target.value; render(); });
    mount.querySelectorAll("select[data-k]").forEach(s => s.addEventListener("change", e => { st[s.getAttribute("data-k")] = e.target.value; render(); }));
    mount.querySelector(".psd-gig-media input").addEventListener("change", e => { st.media = e.target.checked; render(); });
    render();
  }).catch(err => { console.error("Failed to load gigs:", err); mount.innerHTML = `<div class="psd-rel">Unable to load the gigs right now. Please refresh the page.</div>`; });
}

function initGig(){
  const mount = document.getElementById("psd-gig");
  if (!mount || mount._psdShown === location.search) return;
  if (document.documentElement.hasAttribute("aria-busy")) return;
  if (location.pathname.replace(/\/+$/, "") !== GIG_PATH) return;
  mount._psdShown = location.search;
  ensureStyles();
  mount.innerHTML = `<div class="psd-rel psd-rel-loading">Loading gig…</div>`;
  Promise.all([loadCatalogue(), loadGigs()]).then(([, { gigs, data }]) => renderGig(mount, gigs, data))
    .catch(err => { console.error("Failed to load gig:", err); mount.innerHTML = `<div class="psd-rel">Unable to load the gig right now. Please refresh the page.</div>`; });
}
function renderGig(mount, gigs, data){
  const key = (new URLSearchParams(location.search).get("g") || "").trim().toLowerCase();
  const i = gigs.findIndex(g => g._key.toLowerCase() === key || g.ID === key);
  if (i < 0) {
    mount.innerHTML = `<div class="psd-rel"><nav class="psd-rel-nav"><a href="${GIGS_PATH}">← All gigs</a></nav><h1 class="psd-rel-title">Gig not found</h1>
      <p><a href="${GIGS_PATH}${key ? "#q=" + encodeURIComponent(key) : ""}">Search the gigs</a>.</p></div>`;
    document.title = "Gig not found | psilodump";
    return;
  }
  const g = gigs[i], newer = gigs[i - 1], older = gigs[i + 1];
  const flyers = g._images.filter(x => x.Kind === "flyer"), photos = g._images.filter(x => x.Kind !== "flyer");
  const main = flyers[0] || photos[0];
  const facts = [];
  facts.push(["Date", dayLink(g.Date)]);
  if (g.Venue) facts.push(["Venue", esc(g.Venue)]);
  if (g.City || g.Country) facts.push(["Place", esc([g.City, g.Country].filter(Boolean).join(", "))]);
  if (g.Type) facts.push(["Type", `<a href="${GIGS_PATH}#type=${encodeURIComponent(g.Type)}">${esc(g.Type)}</a>`]);
  if (g.Role) facts.push(["psilodump", esc(g.Role === "Live" ? "Live set" : g.Role)]);
  if (g.Credit && !/^psilodump$/i.test(g.Credit)) facts.push(["Billed as", esc(g.Credit)]);
  if (g.Organizer) facts.push(["Organiser", esc(g.Organizer)]);
  const links = [];
  if (/^https?:\/\//.test(g.URL || "")) links.push(`<a href="${esc(g.URL)}" target="_blank" rel="noopener nofollow">Event page</a> <small>(may be gone)</small>`);
  g._links.forEach(u => links.push(`<a href="${esc(u)}" target="_blank" rel="noopener nofollow">${esc(gigLinkLabel(u))}</a>`));
  if (/^[0-9a-f-]{36}$/.test(g.MusicBrainz || "")) links.push(`<a href="https://musicbrainz.org/event/${esc(g.MusicBrainz)}" target="_blank" rel="noopener">MusicBrainz</a>`);
  if (links.length) facts.push(["Links", links.join(" · ")]);
  // Line-up by role, psilodump's own entry highlighted
  const roles = {};
  g._acts.forEach(a => { const m = a.match(/^(live|dj|vj|mc):\s*(.*)$/i); const r = m ? m[1].toLowerCase() : "live"; (roles[r] = roles[r] || []).push(m ? m[2] : a); });
  const lineup = Object.keys(GIG_ROLE_NAMES).filter(r => roles[r]).map(r => `<div class="psd-gig-role"><h3>${GIG_ROLE_NAMES[r]}</h3><ul>${roles[r].map(a => `<li${GIG_SELF.test(a) ? ' class="me"' : ""}>${esc(a)}</li>`).join("")}</ul></div>`).join("");
  const vids = g._videos.map(v => {
    const t = data.byId[v["Track ID"]];
    const label = t ? t.Title + (t.Version ? " (" + t.Version + ")" : "") : (v["YouTube Title"] || "Video");
    return `<figure class="psd-vcard">${liteYouTube(v["Video ID"], label)}<figcaption>${esc(label)}<small>${[VIDEO_KINDS[v.Kind] || "Video", v["Made By"] ? (v["From Others"] === "1" ? "by " : "video by ") + esc(v["Made By"]) : (v["From Others"] === "1" ? "from the audience" : "")].filter(Boolean).join(" · ")}</small></figcaption></figure>`;
  }).join("");
  const imgFig = x => `<figure class="psd-gig-img${x.Kind === "flyer" ? " flyer" : ""}"><button type="button" data-lightbox="${esc(gigLarge(x))}" data-thumb="${esc(x.Image)}" aria-label="View larger: ${esc(x.Caption || (x.Kind === "flyer" ? "flyer" : "photo"))}"><img src="${esc(x.Image)}" alt="${esc(x.Caption || "")}" loading="lazy"></button>${x.Caption || x.Credit ? `<figcaption>${esc(x.Caption || "")}${x.Credit ? `<small>${x.Kind === "flyer" ? "Design" : "Photo"}: ${esc(x.Credit)}</small>` : ""}</figcaption>` : ""}</figure>`;
  const bz = (String(g.Source || "").match(/track\/(\d+)/) || [])[1];
  const setItems = g._setlist.map(x => {
    const t = x["Track ID"] ? data.byId[x["Track ID"]] : null;
    return { title: t ? t.Title || "(untitled)" : x.Title, version: t ? t.Version || "" : "", artist: t ? t.Artist || "" : "",
      former: t ? String(t["Former Titles"] || "").split(" | ").filter(Boolean) : [], duration: "", disc: 1, pos: +x.Position || 0, heading: "",
      note: x.Note || "", src: "", trackId: t ? t.ID : "", ytMusic: "", video: t ? ((data.videosByTrack[t.ID] || [])[0] || {})["Video ID"] || "" : "" };
  });
  mount.innerHTML = `
  <div class="psd-rel psd-gig">
    <nav class="psd-rel-nav"><a href="${GIGS_PATH}">← All gigs</a>
      <span class="psd-rel-step">${newer ? `<a href="${esc(gigHref(newer))}" title="${esc(newer.Event)}">‹ Newer</a>` : ""}${older ? `<a href="${esc(gigHref(older))}" title="${esc(older.Event)}">Older ›</a>` : ""}</span></nav>
    <div class="psd-rel-hero${main ? "" : " psd-gig-noimg"}">
      ${main ? `<div class="psd-gig-main" data-lightbox="${esc(gigLarge(main))}" data-thumb="${esc(main.Image)}" role="button" tabindex="0" aria-label="View larger"><img src="${esc(main.Image)}" alt="${esc(main.Caption || (main.Kind === "flyer" ? "Flyer" : "Photo"))}"></div>` : ""}
      <div class="psd-rel-info">
        <h1 class="psd-rel-title">${esc(g.Event || "Gig")}</h1>
        <div class="psd-rel-sub">${esc([gigDateText(g.Date), g.City].filter(Boolean).join(" · "))}${g.Cancelled === "1" ? " · <b>cancelled</b>" : ""}</div>
        <dl class="psd-rel-facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>
        ${g.Note ? `<p class="psd-gig-note">${linkify(g.Note.replace(/<br\s*\/?>/gi, "\n")).replace(/\n/g, "<br>")}</p>` : ""}
      </div>
    </div>
    ${bz ? `<section class="psd-rel-player" id="psd-player"></section>` : ""}
    ${setItems.length ? `<section class="psd-gig-setlist"><h2>Setlist</h2>${trackListHtml(setItems, false)}</section>` : ""}
    ${lineup ? `<section class="psd-gig-lineup"><h2>Line-up</h2><div class="psd-gig-roles">${lineup}</div></section>` : ""}
    ${vids ? `<section class="psd-rel-videos"><h2>Video</h2><div class="psd-vgrid">${vids}</div></section>` : ""}
    ${g._images.length > 1 ? `<section class="psd-gig-photos"><h2>${flyers.length && photos.length ? "Flyers & photos" : photos.length ? "Photos" : "Flyers"}</h2><div class="psd-gig-grid">${[...flyers, ...photos].map(imgFig).join("")}</div></section>` : ""}
  </div>`;
  if (!document.getElementById("rel-lightbox")) mount.insertAdjacentHTML("beforeend", `<div id="rel-lightbox" class="rel-modal-overlay"><img id="rel-lightbox-img" class="rel-lightbox-img" src="" alt=""></div>`);
  moveModalsToBody();
  document.title = (g.Event || "Gig") + " · " + String(g.Date).slice(0, 4) + " | psilodump";
  if (bz) buildTrackPlayer(document.getElementById("psd-player"), { [TITLE_COL]: g.Event }, [{ title: "Live at " + (g.Event || "the gig"), version: "", artist: "", former: [], duration: "", disc: 1, pos: 1, heading: "", note: "Live recording", src: "/player/tracks/" + bz + ".mp3", trackId: "", ytMusic: "", video: "" }], "");
}

// --- REMIXES page: <div id="psd-remixes-page"> — psilodump's remixes, from tracks.csv ---
// A remix = type Remix and either another artist's track or psilodump named in the version.
const PSILO_ALIAS = /psilodump|psilo|insekt|r\.?i\.?p\.?c|trmc|jumix/i;      // remix credits that are psilodump himself
const isPsilodumpRemix = t => /remix/i.test(t.Type || "") && ((t.Artist && !/psilodump/i.test(t.Artist)) || PSILO_ALIAS.test(t.Version || ""));
// Others' remixes of psilodump tracks: type Remix, the original is psilodump's (artist empty / incl. psilodump), remixer not psilodump.
const isRemixOfPsilodump = t => /remix/i.test(t.Type || "") && (!t.Artist || /psilodump/i.test(t.Artist)) && !!t.Version && !PSILO_ALIAS.test(t.Version);
function initRemixesPage(){
  const mount = document.getElementById("psd-remixes-page");
  if (!mount || mount._psdShown) return;
  if (document.documentElement.hasAttribute("aria-busy")) return;
  mount._psdShown = true;
  ensureStyles();
  mount.innerHTML = `<div class="psd-rel psd-rel-loading">Loading remixes…</div>`;
  Promise.all([loadCatalogue(), loadTrackData()])
    .then(([rows, data]) => buildRemixesPage(mount, rows, data))
    .catch(err => { console.error("Failed to load remixes:", err); mount.innerHTML = `<div class="psd-rel">Unable to load the remixes right now. Please refresh the page.</div>`; });
}
function buildRemixesPage(mount, rows, data){
  const relById = {}; rows.forEach(r => { relById[r["ID"]] = r; });
  const onRelease = {};       // track ID → the catalogue releases it is on
  Object.entries(data.lists).forEach(([rid, list]) => list.forEach(({ t }) => { if (relById[rid]) (onRelease[t.ID] = onRelease[t.ID] || []).push(relById[rid]); }));
  const date = t => t.Released || t.Finished || "";
  const listFor = test => { let lastYear = null;
    return Object.values(data.byId).filter(test).sort((a, b) => date(b).localeCompare(date(a)) || a.Title.localeCompare(b.Title)).map(t => {
    const year = (date(t).match(/^\d{4}/) || ["Undated"])[0];   // (inside listFor)
    const heading = year !== lastYear ? year : ""; lastYear = year;
    const bz = (String(t.Source || "").match(/track\/(\d+)/) || [])[1];
    const ytm = (String(t.YouTube || "").match(/music\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/) || [])[1] || "";
    const rels = onRelease[t.ID] || [];
    return { title: t.Title || "(untitled)", version: t.Version || "", artist: t.Artist || "", former: [], duration: secToTime(t.Length), disc: 1, pos: null, heading,
      note: [t.Description, rels.length ? "on " + rels.map(r => r[TITLE_COL]).join(", ") : ""].filter(Boolean).join(" · "),
      src: bz ? "/player/tracks/" + bz + ".mp3" : "", trackId: t.ID, ytMusic: ytm, video: ((data.videosByTrack[t.ID] || [])[0] || {})["Video ID"] || "" };
    }); };
  const views = { mine: { label: "psilodump remixes", items: listFor(isPsilodumpRemix) }, others: { label: "Remixes of psilodump", items: listFor(isRemixOfPsilodump) } };
  const st = mount._psdRemix = { by: /(^|[#&])by=others(&|$)/.test(location.hash) ? "others" : "mine" };
  mount.innerHTML = `<div class="psd-rel psd-vpage"><div class="psd-vpage-bar">${Object.entries(views).map(([k, v]) => `<button type="button" data-psd-rby="${k}">${esc(v.label)} <small>${v.items.length}</small></button>`).join("")}</div>
    <p class="psd-rel-sub psd-rcount"></p><section class="psd-rel-player" id="psd-player"></section><section class="psd-rel-videos" id="psd-videos"></section></div>`;
  const render = () => {
    const v = views[st.by], items = v.items;
    stopPlayer();
    mount.querySelectorAll("[data-psd-rby]").forEach(b => b.setAttribute("aria-pressed", b.getAttribute("data-psd-rby") === st.by ? "true" : "false"));
    mount.querySelector(".psd-rcount").textContent = `${items.length} remixes · ${items.filter(x => x.src).length} playable here`;
    const box = document.getElementById("psd-player");
    if (items.some(x => x.src)) buildTrackPlayer(box, { [TITLE_COL]: v.label }, items, "");
    else box.innerHTML = trackListHtml(items, false);
    renderVideos({ ID: "" }, data, items);
    const h = st.by === "others" ? "by=others" : "";
    if (h !== location.hash.replace(/^#/, "")) history.replaceState(history.state, "", location.pathname + location.search + (h ? "#" + h : ""));
  };
  mount._psdRemixRender = render;
  render();
}

// --- VIDEOS page: <div id="psd-videos-page" data-kind="tracker"> (data-kind optional: preset filter) ---
function initVideosPage(){
  const mount = document.getElementById("psd-videos-page");
  if (!mount || mount._psdShown) return;
  if (document.documentElement.hasAttribute("aria-busy")) return;
  mount._psdShown = true;
  ensureStyles();
  mount.innerHTML = `<div class="psd-rel psd-vpage psd-rel-loading">Loading videos…</div>`;
  Promise.all([loadCatalogue(), loadTrackData()])
    .then(([rows, data]) => buildVideosPage(mount, rows, data))
    .catch(err => { console.error("Failed to load videos:", err); mount.innerHTML = `<div class="psd-rel">Unable to load the videos right now. Please refresh the page.</div>`; });
}

function buildVideosPage(mount, rows, data){
  const relById = {}; rows.forEach(r => { relById[r["ID"]] = r; });
  const relDate = r => r ? (r._released || r._catalogue || "") : "";
  // a track's release = the earliest release it is on
  const trackRel = {};
  Object.entries(data.lists).forEach(([rid, list]) => { const r = relById[rid]; if (!r) return;
    list.forEach(({ t }) => { const cur = trackRel[t.ID]; if (!cur || relDate(r) < relDate(cur)) trackRel[t.ID] = r; }); });
  const items = data.videos.filter(v => /^[A-Za-z0-9_-]{11}$/.test(v["Video ID"] || "")).map(v => {
    const t = data.byId[v["Track ID"]];
    const rel = relById[v["Release ID"]] || (t ? trackRel[t.ID] : null);
    const label = t ? t.Title + (t.Version ? " (" + t.Version + ")" : "") : (relById[v["Release ID"]] ? relById[v["Release ID"]][TITLE_COL] : (v["YouTube Title"] || "Video"));
    const artist = t && t.Artist && t.Artist.toLowerCase() !== "psilodump" ? t.Artist : "";
    return { id: v["Video ID"], kind: VIDEO_KINDS[v.Kind] ? v.Kind : "other", label, artist, by: v["Made By"] || "", others: v["From Others"] === "1", note: v.Note || "", rel, date: relDate(rel) || v.Published || "",
      search: [label, artist, v.Note, v["Made By"], rel ? rel[TITLE_COL] : "", v["YouTube Title"]].join(" ").toLowerCase() };
  }).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const preset = mount.getAttribute("data-kind") || "";
  const st = mount._psdState = { kind: preset, q: "" };
  const OTHERS = "others";      // pseudo-kind: everything made by others
  const validKind = k => VIDEO_KINDS[k] || k === OTHERS;
  const fromHash = () => { const p = new URLSearchParams(location.hash.replace(/^#/, "")); if (p.has("kind")) st.kind = validKind(p.get("kind")) ? p.get("kind") : ""; if (p.has("q")) st.q = p.get("q"); };
  fromHash();
  const counts = {}; items.forEach(x => { const k = x.others ? OTHERS : x.kind; counts[k] = (counts[k] || 0) + 1; });
  const kinds = Object.keys(VIDEO_KINDS).filter(k => counts[k]);   // (OTHERS is added separately, last)
  const card = x => `<figure class="psd-vcard" id="psd-v-${esc(x.id)}">${liteYouTube(x.id, x.label)}<figcaption>${esc(x.label)}${x.artist ? " <small style=\"display:inline!important\">by " + esc(x.artist) + "</small>" : ""}<small>${[st.kind && !x.others ? "" : esc(VIDEO_KINDS[x.kind]), x.by ? (x.others ? "by " : "video by ") + esc(x.by) : "", x.note && x.kind !== "tracker" ? esc(x.note) : "", x.rel ? `from <a href="${esc(releaseHref(x.rel))}">${esc(x.rel[TITLE_COL])}</a>${x.date ? " (" + esc(x.date.slice(0, 4)) + ")" : ""}` : ""].filter(Boolean).join(" · ")}</small></figcaption></figure>`;
  const grid = list => `<div class="psd-vgrid">${list.map(card).join("")}</div>`;
  const render = () => {
    const q = st.q.trim().toLowerCase();
    const shown = items.filter(x => (!st.kind || (st.kind === OTHERS ? x.others : !x.others && x.kind === st.kind)) && (!q || x.search.includes(q)));
    const sections = (st.kind ? [st.kind] : [...kinds, OTHERS]).map(k => {
      // "From others" collects every kind made by others, at the end of the page
      const list = k === OTHERS ? shown.filter(x => x.others) : shown.filter(x => !x.others && x.kind === k);
      if (!list.length) return "";
      // tracker videos: grouped by the tracker software (the video's note)
      const body = k === "tracker"
        ? [...new Set(list.map(x => x.note))].map(n => (n ? `<h3>${esc(n)}</h3>` : "") + grid(list.filter(x => x.note === n))).join("")
        : grid(list);
      if (k === OTHERS) return `<section class="psd-vothers"><h2>From others <small>${list.length} · fan videos, DJ sets, covers, audience recordings</small></h2>${grid(list)}</section>`;
      return `<section><h2>${esc(VIDEO_KINDS[k])} <small>${list.length}</small></h2>${body}</section>`;
    }).join("");
    mount.querySelector(".psd-vpage-list").innerHTML = sections || `<p class="psd-vempty">No videos match.</p>`;
    mount.querySelectorAll("[data-psd-vkind]").forEach(b => b.setAttribute("aria-pressed", b.getAttribute("data-psd-vkind") === st.kind ? "true" : "false"));
    const p = new URLSearchParams(); if (st.kind && st.kind !== preset) p.set("kind", st.kind); if (st.q.trim()) p.set("q", st.q.trim());
    const h = p.toString().replace(/\+/g, "%20");
    if (h !== location.hash.replace(/^#/, "")) history.replaceState(history.state, "", location.pathname + location.search + (h ? "#" + h : ""));
  };
  mount._psdRender = render;
  mount.innerHTML = `<div class="psd-rel psd-vpage">
    <div class="psd-vpage-bar"><button type="button" data-psd-vkind="">All <small>${items.length}</small></button>${kinds.map(k => `<button type="button" data-psd-vkind="${k}">${esc(VIDEO_KINDS[k])} <small>${counts[k]}</small></button>`).join("")}${counts[OTHERS] ? `<button type="button" data-psd-vkind="${OTHERS}">From others <small>${counts[OTHERS]}</small></button>` : ""}
      <input type="search" placeholder="Search videos…" aria-label="Search videos" value="${esc(st.q)}"></div>
    <div class="psd-vpage-list"></div></div>`;
  mount.querySelector(".psd-vpage-bar input").addEventListener("input", e => { st.q = e.target.value; render(); });
  if (!mount._psdHash) { mount._psdHash = true; window.addEventListener("hashchange", () => { const m = document.getElementById("psd-videos-page"); if (m && m._psdState && m._psdRender) { const p = new URLSearchParams(location.hash.replace(/^#/, "")); m._psdState.kind = (VIDEO_KINDS[p.get("kind")] || p.get("kind") === "others") ? p.get("kind") : (m.getAttribute("data-kind") || ""); m._psdRender(); } }); }
  render();
}

// Type pages: the embed's data-type ("Album" or "Album,MiniAlbum") fixes the types shown; the
// type dropdown is hidden there. Read on every init so the home catalogue is never left filtered.
function applyFixedType(){
  const cat = window._psilodumpCat;
  const mount = document.getElementById("psd-catalogue");
  const raw = mount ? (mount.getAttribute("data-type") || "") : "";
  cat.fixedTypes = raw.split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  const sel = document.getElementById("rel-sel-type");
  if (sel) sel.style.display = cat.fixedTypes.length ? "none" : "";
  if (cat.fixedTypes.length) cat.activeType = "";
}

function initApp(){
  initGigsList();
  initGig();
  initToday();
  initPhysical();
  initDiscography();
  initCatalogueTable();
  initVideosPage();
  initRemixesPage();
  initRelease();
  mountMarkup();
  const grid = document.getElementById("rel-grid");
  if (!grid) return;
  ensureStyles();
  moveModalsToBody();
  const cat = window._psilodumpCat;
  applyFixedType();

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
  const vp = document.getElementById("psd-videos-page");
  if (vp && !vp._psdShown) { initVideosPage(); return; }
  const rp = document.getElementById("psd-remixes-page");
  if (rp && !rp._psdShown) { initRemixesPage(); return; }
  const gl = document.getElementById("psd-gigs");
  if (gl && !gl._psdShown) { initGigsList(); return; }
  const gp = document.getElementById("psd-gig");
  if (gp && gp._psdShown !== location.search) { initGig(); return; }
  const td = document.getElementById("psd-today");
  if (td && !td._psdShown) { initToday(); return; }
  const ph = document.getElementById("psd-physical");
  if (ph && !ph._psdShown) { initPhysical(); return; }
  const dg = document.getElementById("psd-discography");
  if (dg && !dg._psdShown) { initDiscography(); return; }
  const ct = document.getElementById("psd-catalogue-table");
  if (ct && !ct._psdShown) { initCatalogueTable(); return; }
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
