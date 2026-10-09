// Site-wide script for psilodu.mp, loaded from Bandzoogle's Header content:
//   <script defer src="https://psilodump.github.io/website-data/site.js"></script>
// Bandzoogle uses Turbo (pages swap <body> without a reload), so everything
// lives in one guarded function and re-runs its work on "turbo:load".
(function () {
if (window.__psdSite) return;

var SITE_VERSION = "1.0.0";

// --- Blog dates: YYYY-MM-DD in front of the post title ---
// The header's inline CSS hides Bandzoogle's own (US-format) date until a post
// has data-date-fixed, so the old format never flashes.

// Prefer the machine-readable timestamp Bandzoogle puts in data-time
// (e.g. "2025-08-09T01:06:15+02:00"); fall back to parsing MM/DD/YYYY text.
function isoDate(span) {
  var stamp = span.getAttribute("data-time") || "";
  if (/^\d{4}-\d{2}-\d{2}/.test(stamp)) return stamp.slice(0, 10);
  var text = span.textContent.trim();
  var m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return m[3] + "-" + m[1].padStart(2, "0") + "-" + m[2].padStart(2, "0");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function fixDates() {
  document.querySelectorAll("article.post:not([data-date-fixed])").forEach(function (post) {
    var dateEl = post.querySelector("footer.blog-footer p.post-info span");
    if (!dateEl) return;
    // List pages use h2.heading-secondary.heading-blog; single posts use h2.heading-blog.
    var titleEl = post.querySelector("h2.heading-blog, h2.heading-secondary");
    var iso = isoDate(dateEl);

    if (iso && titleEl) {
      // Move the date in front of the title.
      var time = document.createElement("time");
      time.className = "moved-date";
      time.dateTime = iso;
      time.textContent = iso + " | ";
      titleEl.prepend(time);
      dateEl.style.display = "none";
    } else {
      // No title found: keep the date where Bandzoogle put it, reformatted if possible.
      if (iso) dateEl.textContent = iso;
      dateEl.style.display = "inline";
    }
    post.setAttribute("data-date-fixed", "1");
  });
}

// --- Start-up ---
function run() {
  fixDates();
}

// One observer for content added without a page load; re-pointed at the new
// <body> after each Turbo navigation (Turbo swaps the whole body).
var observer = new MutationObserver(run);
function start() {
  run();
  observer.disconnect();
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
}

window.__psdSite = { version: SITE_VERSION, run: run };
document.addEventListener("turbo:load", start);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
})();
