// Bandzoogle uses Turbo: every page change swaps in a new <body> and re-runs
// this <script>. Everything lives inside this function so a second run can't
// hit "Identifier has already been declared"; a re-run just re-initialises.
(function () {
if (window.__psdCatalogue) { window.__psdCatalogue.init(); return; }

const JS_VERSION = "1.1.0";
const HTML_VERSION = "1.0.0";

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
  const title = r._titleHref ? `<a href="${esc(r._titleHref)}" target="_blank" rel="noopener nofollow">${esc(r[TITLE_COL] || "(untitled)")}</a>` : esc(r[TITLE_COL] || "(untitled)");
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
}

function renderFilterPills(){
  const pillsWin = document.getElementById("rel-pills");
  if (!pillsWin) return;
  const cat = window._psilodumpCat;
  const pills = [];

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
  ).join("") + `<button type="button" class="rel-clear-all">Clear all</button>`;

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
    const cover = t.closest('[data-lightbox]');
    if (cover) { window.openLightbox(cover.getAttribute('data-lightbox'), cover.getAttribute('data-thumb')); return; }
    const listen = t.closest('[data-listen]');
    if (listen) { window.openListenModal(Number(listen.getAttribute('data-listen'))); return; }
    const pill = t.closest('[data-pill]');
    if (pill) { window.removePill(Number(pill.getAttribute('data-pill'))); return; }
    if (t.closest('.rel-clear-all')) window.clearAllFilters();
  });

  // Keyboard: Escape closes any open pop-up; Enter/Space on a focused cover
  // or filter pill acts like a click.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.rel-modal-overlay.active').forEach(m => m.classList.remove('active'));
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
  const grid = document.getElementById("rel-grid");
  if (!grid) return;
  moveModalsToBody();
  const cat = window._psilodumpCat;

  if (cat.loaded) {
    bindUIEvents();
    populateSelectOptions();
    applyFilters();
    updateJsonLd();
  } else if (!cat.loading) {
    cat.loading = true;
    fetch(CSV_URL + "?v=" + Date.now())
      .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
      .then(text => {
        const {headers: h, rows: raw} = toObjects(parseCSV(text));
        cat.rows = withDerived(raw);
        cat.viewRows = [...cat.rows];
        cat.loaded = true;
        cat.loading = false;

        bindUIEvents();
        populateSelectOptions();
        sortView();
        render();
        updateJsonLd();
      })
      .catch(err => {
        cat.loading = false;
        console.error("Failed to load release data:", err);
        const g = document.getElementById("rel-grid");
        if(g) g.innerHTML = `<div style="grid-column: 1/-1; padding: 2rem 0; text-align: center; opacity: 0.8;">Unable to load discography data right now. Please refresh the page.</div>`;
      });
  }
}

window.__psdCatalogue = { init: initApp, version: JS_VERSION };

// Re-initialise whenever placeholder cards appear. Watch <html>, not <body>:
// Turbo replaces <body> on every page change, <html> stays.
new MutationObserver(() => {
  const grid = document.getElementById("rel-grid");
  if (grid && grid.querySelector(".sk")) initApp();
}).observe(document.documentElement, { childList: true, subtree: true });

// Also re-initialise after each Turbo page change.
document.addEventListener("turbo:load", initApp);
document.addEventListener("turbo:render", initApp);

initApp();
})();
