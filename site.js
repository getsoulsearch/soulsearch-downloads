// Shared by every page: highlight the visitor's own computer, and fill the download buttons from the
// release list (real version and size; "Not up yet" if a file is missing).
//
// THE ONE PLACE THE RELEASE REPOSITORY IS NAMED. When releases move to a new GitHub organisation, change this
// line (and the two no-JavaScript download links in index.html, which say the same thing).
const REPO = "getsoulsearch/soulsearch-downloads";

const ua = navigator.userAgent || "";
const platform = navigator.platform || ua;
const onMac = /Mac/i.test(platform) && !/iPhone|iPad/i.test(ua) && !(navigator.maxTouchPoints > 1);
const onWin = /Win/i.test(platform);
// Phones and tablets can't run the app: the home page says so.
if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (/Mac/i.test(platform) && navigator.maxTouchPoints > 1)) document.documentElement.classList.add("is-phone");
const mine = onMac ? "mac" : onWin ? "win" : "";
for (const el of document.querySelectorAll(`[data-os="${mine}"]`)) {
  if (el.matches("details")) el.setAttribute("open", "");
  else el.classList.add("mine");
}

// "All versions" links in the footers.
for (const a of document.querySelectorAll("[data-releases]")) {
  a.href = `https://github.com/${REPO}/releases`;
  a.hidden = false;
}

const cards = [...document.querySelectorAll(".dl[data-asset]")];
const bar = document.querySelector("[data-count]");
const fmt = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// Same-origin copy of the release list first (written by tools/make_latest_json.py, no rate limit), then GitHub's API
// (60 requests an hour per connection, which a shared mobile connection can use up).
async function loadReleases() {
  try {
    const r = await fetch("latest.json", { cache: "no-cache" });
    if (r.ok) {
      const j = await r.json();
      if (Array.isArray(j.releases) && j.releases.length) return j.releases;
    }
  } catch (e) { /* fall through to the API */ }
  const r = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100`, { headers: { Accept: "application/vnd.github+json" } });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

if (cards.length || bar) {
  loadReleases()
    .then((all) => {
      const live = all.filter((x) => !x.draft && !x.prerelease);
      const rel = live[0];
      if (!rel) return Promise.reject("no release");
      if (bar) bar.textContent = `${rel.tag_name} · updated ${fmt(rel.published_at)}`;
      // Each button takes the newest release that actually has its file, so a release that is
      // Windows-only for a while doesn't take the Mac button away.
      for (const card of cards) {
        const from = live.find((x) => (x.assets || []).some((a) => a.name === card.dataset.asset));
        const asset = from && from.assets.find((a) => a.name === card.dataset.asset);
        const meta = card.querySelector("[data-meta]");
        if (asset) {
          card.href = asset.browser_download_url;
          meta.textContent = `${from.tag_name} · ${(asset.size / 1048576).toFixed(0)} MB · ${fmt(from.published_at)}`;
        } else {
          card.classList.add("soon");
          meta.textContent = "Not up yet";
        }
      }
    })
    .catch(() => { for (const card of cards) card.href = `https://github.com/${REPO}/releases/latest`; });

  // The download counter only exists in GitHub's own API, so it is a best-effort extra: asked after the buttons are
  // already filled in, ignored if GitHub says no, and not shown at all under 100.
  if (bar) {
    fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100`, { headers: { Accept: "application/vnd.github+json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((all) => {
        const total = all.reduce((n, x) => n + (x.assets || []).reduce((m, a) => m + (a.download_count || 0), 0), 0);
        if (total >= 100 && bar.textContent) bar.textContent += ` · ${total.toLocaleString("en-GB")} downloads`;
      })
      .catch(() => {});
  }
}
