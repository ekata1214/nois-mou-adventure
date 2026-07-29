const KIND_LABEL = {
  all: "すべて",
  essay: "批評",
  film: "映画",
  music: "音楽",
  anime: "アニメ",
  book: "本",
  game: "ゲーム",
  about: "紹介",
};

const shell = document.getElementById("app-shell");
const panels = [...document.querySelectorAll(".tab-panel")];
const tabButtons = [...document.querySelectorAll(".tab-btn")];
const noticeList = document.getElementById("notice-list");
const mediaList = document.getElementById("media-list");
const filterChips = [...document.querySelectorAll(".filter-chip")];
const playerDialog = document.getElementById("player-dialog");
const playerFrame = document.getElementById("player-frame");
const playerTitle = document.getElementById("player-title");
const playerOpen = document.getElementById("player-open");

let archive = null;
let activeFilter = "all";

function setTab(tab) {
  shell.dataset.tab = tab;
  tabButtons.forEach((btn) => {
    btn.classList.toggle("is-on", btn.dataset.tab === tab);
  });
  panels.forEach((panel) => {
    const on = panel.dataset.panel === tab;
    panel.classList.toggle("is-active", on);
    panel.hidden = !on;
    if (on) {
      panel.style.animation = "none";
      // force reflow for enter motion
      void panel.offsetWidth;
      panel.style.animation = "";
    }
  });
  document.querySelector(".app-main")?.scrollTo({ top: 0, behavior: "smooth" });
  history.replaceState(null, "", tab === "home" ? "#" : `#${tab}`);
}

function bindTabs() {
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => setTab(btn.dataset.tab));
  });
  document.querySelectorAll("[data-go-tab]").forEach((el) => {
    el.addEventListener("click", () => setTab(el.dataset.goTab));
  });
  const hash = location.hash.replace("#", "");
  if (["home", "archive", "play", "about"].includes(hash)) setTab(hash);
}

function renderNotices(notices) {
  noticeList.innerHTML = notices
    .map(
      (n) => `
      <a class="notice-item" href="${escapeAttr(n.href)}" ${n.href.startsWith("http") || n.href.startsWith("mailto:") ? 'target="_blank" rel="noopener"' : ""}>
        <span class="notice-label">${escapeHtml(n.label)}</span>
        <span>
          <span class="notice-title">${escapeHtml(n.title)}</span>
          <span class="notice-body">${escapeHtml(n.body)}</span>
        </span>
      </a>`
    )
    .join("");
}

function renderMedia(videos) {
  const list =
    activeFilter === "all" ? videos : videos.filter((v) => v.kind === activeFilter);

  if (!list.length) {
    mediaList.innerHTML = `<p class="panel-intro" style="color:var(--muted)">このカテゴリにはまだありません。</p>`;
    return;
  }

  mediaList.innerHTML = list
    .map(
      (v) => `
      <button type="button" class="media-item" data-video-id="${escapeAttr(v.id)}" data-url="${escapeAttr(v.url)}" data-title="${escapeAttr(v.title)}">
        <img class="media-thumb" src="${escapeAttr(v.thumb)}" alt="" loading="lazy" />
        <span class="media-meta">
          <span class="media-kind">${escapeHtml(KIND_LABEL[v.kind] || v.kind)}</span>
          <span class="media-title">${escapeHtml(v.title)}</span>
          <span class="media-date">${escapeHtml(v.published || "ARCHIVE")}</span>
        </span>
      </button>`
    )
    .join("");

  mediaList.querySelectorAll(".media-item").forEach((btn) => {
    btn.addEventListener("click", () => openPlayer(btn.dataset.videoId, btn.dataset.title, btn.dataset.url));
  });
}

function openPlayer(id, title, url) {
  playerTitle.textContent = title;
  playerOpen.href = url;
  playerFrame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
  if (typeof playerDialog.showModal === "function") playerDialog.showModal();
  else window.open(url, "_blank", "noopener");
}

function closePlayer() {
  playerFrame.src = "";
}

function renderAbout(brand) {
  document.getElementById("hero-banner").src = brand.banner;
  document.getElementById("about-avatar").src = brand.avatar;
  document.getElementById("about-statement").textContent = brand.statement;
  document.getElementById("game-blurb").textContent = archive.game.blurb;
  document.getElementById("mail-link").href = `mailto:${brand.email}`;
  document.getElementById("mail-link").textContent = brand.email;

  const portfolio = document.getElementById("portfolio-link");
  portfolio.href = brand.portfolio;

  document.getElementById("role-list").innerHTML = brand.roles
    .map((r) => `<li>${escapeHtml(r)}</li>`)
    .join("");
  document.getElementById("keyword-list").innerHTML = brand.keywords
    .map((k) => `<li>#${escapeHtml(k)}</li>`)
    .join("");

  const stats = [
    ["YouTube", brand.stats.youtubeSubscribers],
    ["Views", brand.stats.youtubeViews],
    ["TikTok", brand.stats.tiktokFollowers],
    ["Likes", brand.stats.tiktokLikes],
  ];
  document.getElementById("stat-grid").innerHTML = stats
    .map(
      ([label, value]) => `
      <div class="stat-cell">
        <strong>${escapeHtml(value)}</strong>
        <span>${escapeHtml(label)}</span>
      </div>`
    )
    .join("");

  document.getElementById("link-grid").innerHTML = brand.links
    .map(
      (l) => `<a href="${escapeAttr(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`
    )
    .join("");

  const episode = archive.game.episode;
  const episodeLink = document.getElementById("episode-link");
  if (episode) {
    episodeLink.href = episode.url;
    episodeLink.textContent = `${episode.title} を見る`;
  } else {
    episodeLink.hidden = true;
  }
}

function bindFilters(videos) {
  filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      activeFilter = chip.dataset.filter;
      filterChips.forEach((c) => c.classList.toggle("is-on", c === chip));
      renderMedia(videos);
    });
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

playerDialog?.addEventListener("close", closePlayer);

async function boot() {
  bindTabs();
  const res = await fetch(`data/archive.json?v=${Date.now()}`);
  if (!res.ok) throw new Error("archive.json failed");
  archive = await res.json();
  renderNotices(archive.notices);
  renderAbout(archive.brand);
  bindFilters(archive.videos);
  renderMedia(archive.videos);
}

boot().catch((err) => {
  console.error(err);
  noticeList.innerHTML = `<p class="notice-body">アーカイブデータの読み込みに失敗しました。</p>`;
});
