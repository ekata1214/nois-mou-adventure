const KIND = {
  essay: "批評",
  film: "映画",
  music: "音楽",
  anime: "アニメ",
  book: "本",
  game: "ゲーム",
  about: "紹介",
};

const shell = document.getElementById("app-shell");
const pages = [...document.querySelectorAll(".page")];
const dockBtns = [...document.querySelectorAll(".dock-btn[data-go]")];
const noticeList = document.getElementById("notice-list");
const homeFeed = document.getElementById("home-feed");
const mediaList = document.getElementById("media-list");
const chips = [...document.querySelectorAll(".chip")];
const playerDialog = document.getElementById("player-dialog");
const playerFrame = document.getElementById("player-frame");
const playerTitle = document.getElementById("player-title");
const playerOpen = document.getElementById("player-open");
const mouLaunch = document.getElementById("mou-launch");
const bootFade = document.getElementById("boot-fade");
const dockPlay = document.getElementById("dock-play");

let archive = null;
let filter = "all";

function setPage(name) {
  shell.dataset.tab = name;
  pages.forEach((p) => {
    const on = p.dataset.page === name;
    p.classList.toggle("is-on", on);
    p.hidden = !on;
    if (on) {
      p.style.animation = "none";
      void p.offsetWidth;
      p.style.animation = "";
    }
  });
  dockBtns.forEach((b) => b.classList.toggle("is-on", b.dataset.go === name));
  document.getElementById("screen")?.scrollTo({ top: 0 });
  history.replaceState(null, "", name === "home" ? "#" : `#${name}`);
}

function bindNav() {
  dockBtns.forEach((b) => b.addEventListener("click", () => setPage(b.dataset.go)));
  document.querySelectorAll("[data-go]").forEach((el) => {
    if (el.classList.contains("dock-btn")) return;
    el.addEventListener("click", () => setPage(el.dataset.go));
  });
  const hash = location.hash.replace("#", "");
  if (["home", "feed", "about"].includes(hash)) setPage(hash);
}

function tickClock() {
  const el = document.getElementById("status-time");
  if (!el) return;
  const d = new Date();
  el.textContent = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
const escapeAttr = escapeHtml;

function renderNotices(notices) {
  noticeList.innerHTML = notices
    .map(
      (n) => `
      <a class="notice-item" href="${escapeAttr(n.href)}" ${
        /^https?:|mailto:/.test(n.href) ? 'target="_blank" rel="noopener"' : ""
      }>
        <span class="label">${escapeHtml(n.label)}</span>
        <span>
          <span class="ttl">${escapeHtml(n.title)}</span>
          <span class="body">${escapeHtml(n.body)}</span>
        </span>
      </a>`
    )
    .join("");
}

function renderHomeFeed(videos) {
  const top = videos.slice(0, 8);
  homeFeed.innerHTML = top
    .map(
      (v) => `
      <button type="button" class="feed-card" data-id="${escapeAttr(v.id)}" data-title="${escapeAttr(v.title)}" data-url="${escapeAttr(v.url)}">
        <img src="${escapeAttr(v.thumb)}" alt="" loading="lazy" />
        <span class="meta">
          <span class="kind">${escapeHtml(KIND[v.kind] || v.kind)}</span>
          <span class="ttl">${escapeHtml(v.title)}</span>
        </span>
      </button>`
    )
    .join("");
  homeFeed.querySelectorAll(".feed-card").forEach((btn) => {
    btn.addEventListener("click", () => openPlayer(btn.dataset.id, btn.dataset.title, btn.dataset.url));
  });
}

function renderMedia(videos) {
  const list = filter === "all" ? videos : videos.filter((v) => v.kind === filter);
  if (!list.length) {
    mediaList.innerHTML = `<p style="color:var(--muted);padding:12px 0">このカテゴリはまだ空です。</p>`;
    return;
  }
  mediaList.innerHTML = list
    .map(
      (v) => `
      <button type="button" class="media-item" data-id="${escapeAttr(v.id)}" data-title="${escapeAttr(v.title)}" data-url="${escapeAttr(v.url)}">
        <img src="${escapeAttr(v.thumb)}" alt="" loading="lazy" />
        <span>
          <div class="kind">${escapeHtml(KIND[v.kind] || v.kind)}</div>
          <div class="ttl">${escapeHtml(v.title)}</div>
          <div class="date">${escapeHtml(v.published || "ARCHIVE")}</div>
        </span>
      </button>`
    )
    .join("");
  mediaList.querySelectorAll(".media-item").forEach((btn) => {
    btn.addEventListener("click", () => openPlayer(btn.dataset.id, btn.dataset.title, btn.dataset.url));
  });
}

function openPlayer(id, title, url) {
  playerTitle.textContent = title;
  playerOpen.href = url;
  playerFrame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
  if (typeof playerDialog.showModal === "function") playerDialog.showModal();
  else window.open(url, "_blank", "noopener");
}

function renderAbout(brand) {
  document.getElementById("about-statement").textContent = brand.statement;
  document.getElementById("mail-link").href = `mailto:${brand.email}`;
  document.getElementById("mail-link").textContent = brand.email;
  document.getElementById("portfolio-link").href = brand.portfolio;
  document.getElementById("role-list").innerHTML = brand.roles.map((r) => `<li>${escapeHtml(r)}</li>`).join("");
  document.getElementById("keyword-list").innerHTML = brand.keywords.map((k) => `<li>#${escapeHtml(k)}</li>`).join("");
  const stats = [
    ["YouTube", brand.stats.youtubeSubscribers],
    ["Views", brand.stats.youtubeViews],
    ["TikTok", brand.stats.tiktokFollowers],
    ["Likes", brand.stats.tiktokLikes],
  ];
  document.getElementById("stat-grid").innerHTML = stats
    .map(([l, v]) => `<div><strong>${escapeHtml(v)}</strong><span>${escapeHtml(l)}</span></div>`)
    .join("");
  document.getElementById("link-grid").innerHTML = brand.links
    .map((l) => `<a href="${escapeAttr(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`)
    .join("");
}

function bindFilters(videos) {
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      filter = chip.dataset.filter;
      chips.forEach((c) => c.classList.toggle("is-on", c === chip));
      renderMedia(videos);
    });
  });
}

function launchGame(href) {
  mouLaunch?.classList.add("is-leaving");
  bootFade.hidden = false;
  requestAnimationFrame(() => bootFade.classList.add("show"));
  setTimeout(() => {
    location.href = href;
  }, 320);
}

function bindGameLaunch() {
  const go = (e) => {
    e.preventDefault();
    launchGame(e.currentTarget.getAttribute("href") || "game.html");
  };
  mouLaunch?.addEventListener("click", go);
  dockPlay?.addEventListener("click", go);
}

playerDialog?.addEventListener("close", () => {
  playerFrame.src = "";
});

async function boot() {
  tickClock();
  setInterval(tickClock, 30000);
  bindNav();
  bindGameLaunch();

  const res = await fetch(`data/archive.json?v=${Date.now()}`);
  archive = await res.json();
  renderNotices(archive.notices);
  renderHomeFeed(archive.videos);
  bindFilters(archive.videos);
  renderMedia(archive.videos);
  renderAbout(archive.brand);
}

boot().catch((err) => {
  console.error(err);
  noticeList.innerHTML = `<p class="body">データの読み込みに失敗しました。</p>`;
});
