// Admin — Posts + Assets (no modules, uses global marked & DOMPurify)

// CONFIG
const OWNER = "Wooldrum";
const REPO = "wooldrum.github.io";
const BRANCH = "main";
const POSTS_DIR = "_posts";
const IMAGES_DIR = "assets/images";
const LOGIN_PAGE = "/admin/login.html";

// DOM
const tabBtns = document.querySelectorAll(".tab-btn");
const tabPosts = document.getElementById("tab-posts");
const tabAssets = document.getElementById("tab-assets");

const postsList = document.getElementById("postsList");
const newPostBtn = document.getElementById("newPostBtn");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");

const titleEl = document.getElementById("title");
const dateEl = document.getElementById("date");
const imgFileEl = document.getElementById("imgFile");
const imgPathEl = document.getElementById("imgPath");
const bodyEl = document.getElementById("body");
const previewEl = document.getElementById("preview");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const assetUploadEl = document.getElementById("assetUpload");
const refreshAssetsBtn = document.getElementById("refreshAssets");
const assetsGrid = document.getElementById("assetsGrid");

let token = null;
let currentPath = null;
let currentSha = null;

// Helpers
const ghBase = `https://api.github.com/repos/${OWNER}/${REPO}`;
const headers = () => ({
  Accept: "application/vnd.github+json",
  Authorization: `token ${token}`,
  "Content-Type": "application/json",
});
const pad = (n) => String(n).padStart(2, "0");
const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
const localDateTimeValue = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

function parseFrontmatter(md) {
  if (!md.startsWith("---")) return { fm: {}, body: md };
  const end = md.indexOf("\n---", 3);
  if (end === -1) return { fm: {}, body: md };
  const yaml = md.slice(3, end).trim();
  const body = md.slice(end + 4).trim();
  const fm = {};
  yaml.split("\n").forEach((line) => {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  });
  return { fm, body };
}
function buildFrontmatter({ title, date, image, body }) {
  const iso = new Date(date || Date.now()).toISOString();
  const lines = [
    "---",
    `layout: post`,
    `author: Woodrum`,
    `title: "${String(title || "").replace(/"/g, '\\"')}"`,
    `date: ${iso}`,
  ];
  if (image) lines.push(`image: ${image}`);
  lines.push("---", "", body || "");
  return lines.join("\n") + "\n";
}
function md2html(md) {
  try {
    return DOMPurify.sanitize(marked.parse(md || ""));
  } catch {
    return "<p>Preview unavailable.</p>";
  }
}

// Auth
function setAuthedUI(on) {
  loginBtn.classList.toggle("hidden", on);
  logoutBtn.classList.toggle("hidden", !on);
  newPostBtn.classList.toggle("hidden", !on);
  saveBtn.classList.toggle("hidden", !on);
}
function readTokenFromHash() {
  if (location.hash.startsWith("#token=")) {
    const t = location.hash.slice(7);
    sessionStorage.setItem("gh_token", t);
    history.replaceState({}, "", location.pathname);
  }
}
function ensureAuthed() {
  readTokenFromHash();
  token = sessionStorage.getItem("gh_token");
  if (!token) {
    const next = `${location.pathname}${location.search}`;
    location.replace(`${LOGIN_PAGE}?next=${encodeURIComponent(next)}`);
    throw new Error("redirecting to login");
  }
  setAuthedUI(true);
}
loginBtn?.addEventListener("click", () => {
  const next = `${location.pathname}${location.search}`;
  location.href = `${LOGIN_PAGE}?next=${encodeURIComponent(next)}`;
});
logoutBtn?.addEventListener("click", () => {
  sessionStorage.removeItem("gh_token");
  token = null;
  setAuthedUI(false);
  location.replace(`${LOGIN_PAGE}?next=${encodeURIComponent("/admin/index.html")}`);
});

// Tabs
function setActiveTab(which) {
  const onPosts = which === "posts";
  tabBtns.forEach((b) => b.classList.toggle("active", b.dataset.tab === which));
  tabPosts.classList.toggle("hidden", !onPosts);
  tabAssets.classList.toggle("hidden", onPosts);
}
tabBtns.forEach((b) => b.addEventListener("click", () => setActiveTab(b.dataset.tab)));

// GitHub API
async function getJSON(url) {
  const r = await fetch(url, { headers: headers() });
  if (!r.ok) throw new Error(`${r.status}: ${url}`);
  return r.json();
}
async function getDir(dir) {
  return getJSON(`${ghBase}/contents/${dir}?ref=${BRANCH}`);
}
async function getFile(path) {
  return getJSON(`${ghBase}/contents/${path}?ref=${BRANCH}`);
}
async function putFile(path, contentB64, message, sha = null) {
  const body = { message, content: contentB64, branch: BRANCH };
  if (sha) body.sha = sha;
  const r = await fetch(`${ghBase}/contents/${path}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`PUT ${path} failed: ${await r.text()}`);
  return r.json();
}

// Posts
async function listPosts() {
  postsList.innerHTML = `<li class="text-sm text-dark-muted">Loading…</li>`;
  const items = await getDir(POSTS_DIR);
  const files = items
    .filter((i) => i.type === "file" && /\.md$/i.test(i.name))
    .sort((a, b) => b.name.localeCompare(a.name)); // newest by filename
  if (!files.length) {
    postsList.innerHTML = `<li class="text-sm text-dark-muted">No posts yet.</li>`;
    return;
  }
  postsList.innerHTML = "";
  for (const f of files) {
    const li = document.createElement("li");
    li.className = "flex items-center justify-between gap-2";
    const btn = document.createElement("button");
    btn.className = "text-left hover:underline";
    btn.textContent = f.name.replace(/\.md$/, "");
    btn.addEventListener("click", () => loadPost(`${POSTS_DIR}/${f.name}`));
    li.appendChild(btn);
    postsList.appendChild(li);
  }
}
async function loadPost(path) {
  const json = await getFile(path);
  const raw = atob(json.content);
  currentPath = path;
  currentSha = json.sha;

  const { fm, body } = parseFrontmatter(raw);
  titleEl.value = fm.title || "";
  dateEl.value = localDateTimeValue(fm.date ? new Date(fm.date) : new Date());
  imgPathEl.value = fm.image || "";
  bodyEl.value = body || "";
  updatePreview();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function setDateNow() {
  dateEl.value = localDateTimeValue(new Date());
}
function resetEditor() {
  currentPath = null;
  currentSha = null;
  titleEl.value = "";
  imgPathEl.value = "";
  bodyEl.value = "";
  setDateNow();
  updatePreview();
}
newPostBtn.addEventListener("click", resetEditor);
resetBtn.addEventListener("click", resetEditor);

async function savePost() {
  const title = titleEl.value.trim();
  if (!title) return alert("Title is required.");

  // Upload image if chosen
  if (imgFileEl.files?.[0]) {
    const f = imgFileEl.files[0];
    const clean = `${Date.now()}-${slugify(f.name)}`.replace(/[^a-z0-9.\-]/g, "");
    const path = `${IMAGES_DIR}/${clean}`;
    const buf = await f.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    await putFile(path, b64, `Upload ${clean}`);
    imgPathEl.value = `/${path}`;
  }

  const d = new Date(dateEl.value || Date.now());
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const base = `${yyyy}-${mm}-${dd}-${slugify(title) || "post"}.md`;
  const path = currentPath || `${POSTS_DIR}/${base}`;

  const content = buildFrontmatter({
    title,
    date: d.toISOString(),
    image: imgPathEl.value.trim() || undefined,
    body: bodyEl.value,
  });
  const b64 = btoa(unescape(encodeURIComponent(content)));
  const msg = currentPath ? `Update ${path}` : `Create ${path}`;
  await putFile(path, b64, msg, currentSha || null);

  alert("Saved!");
  await listPosts();
  await loadPost(path);
}
saveBtn.addEventListener("click", savePost);

// Editor toolbar
document.querySelector(".toolbar").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-cmd]");
  if (!b) return;
  const cmd = b.dataset.cmd;
  const wrap = (before, after = before, placeholder = "text") => {
    const s = bodyEl.selectionStart ?? 0;
    const epos = bodyEl.selectionEnd ?? 0;
    const v = bodyEl.value;
    const sel = v.slice(s, epos) || placeholder;
    bodyEl.value = v.slice(0, s) + before + sel + after + v.slice(epos);
    bodyEl.setSelectionRange(s + before.length + sel.length + after.length, s + before.length + sel.length + after.length);
    bodyEl.focus();
    updatePreview();
  };
  if (cmd === "bold") return wrap("**", "**", "bold");
  if (cmd === "italic") return wrap("*", "*", "italic");
  if (cmd === "highlight") return wrap("<mark>", "</mark>", "highlight");
  if (cmd === "link") {
    const url = prompt("Link URL:", "https://");
    if (!url) return;
    const s = bodyEl.selectionStart ?? 0;
    const epos = bodyEl.selectionEnd ?? 0;
    const v = bodyEl.value;
    const sel = v.slice(s, epos) || "link text";
    const out = `${v.slice(0, s)}[${sel}](${url})${v.slice(epos)}`;
    bodyEl.value = out;
    bodyEl.setSelectionRange(s + out.length, s + out.length);
    updatePreview();
  }
});
document.getElementById("fontSize").addEventListener("change", (e) => {
  const map = { small: "0.9em", normal: "1em", large: "1.25em", xlarge: "1.5em" };
  const em = map[e.target.value];
  if (em) {
    const s = bodyEl.selectionStart ?? 0;
    const epos = bodyEl.selectionEnd ?? 0;
    const v = bodyEl.value;
    const sel = v.slice(s, epos) || "text";
    bodyEl.value = `${v.slice(0, s)}<span style="font-size:${em}">${sel}</span>${v.slice(epos)}`;
    updatePreview();
    e.target.value = "normal";
  }
});

// Preview
function updatePreview() {
  const t = titleEl.value.trim() || "Untitled";
  const d = new Date(dateEl.value || Date.now());
  const img = imgPathEl.value.trim();
  let html = `<h1 class="text-2xl font-bold text-white">${t}</h1>`;
  html += `<p class="text-sm text-dark-muted">${d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p>`;
  if (img) html += `<img class="mt-4 rounded-xl border border-dark-line" src="${img}" alt="">`;
  html += `<div class="mt-4 text-dark-muted leading-relaxed">${md2html(bodyEl.value)}</div>`;
  previewEl.innerHTML = html;
}
["input", "change"].forEach((evt) => {
  [titleEl, dateEl, imgPathEl, bodyEl].forEach((n) => n.addEventListener(evt, updatePreview));
});

// Assets
async function loadAssets() {
  assetsGrid.innerHTML = `<div class="text-sm text-dark-muted">Loading…</div>`;
  let items = [];
  try {
    items = await getDir(IMAGES_DIR);
  } catch {}
  const files = items.filter((i) => i.type === "file").sort((a, b) => b.name.localeCompare(a.name));
  if (!files.length) {
    assetsGrid.innerHTML = `<div class="text-sm text-dark-muted">No images found.</div>`;
    return;
  }
  assetsGrid.innerHTML = "";
  for (const f of files) {
    const url = `/${IMAGES_DIR}/${f.name}`;
    const cell = document.createElement("div");
    cell.className = "space-y-2";
    const img = document.createElement("img");
    img.src = url; img.alt = f.name; img.className = "image-tile w-full";
    const row = document.createElement("div");
    row.className = "flex items-center justify-between text-xs text-dark-muted";
    const name = document.createElement("span");
    name.className = "truncate max-w-[10rem]";
    name.textContent = f.name;
    const add = document.createElement("button");
    add.className = "btn px-2 py-1";
    add.textContent = "Insert";
    add.addEventListener("click", () => {
      imgPathEl.value = url;
      updatePreview();
      setActiveTab("posts");
    });
    row.append(name, add);
    cell.append(img, row);
    assetsGrid.appendChild(cell);
  }
}
assetUploadEl.addEventListener("change", async () => {
  const f = assetUploadEl.files?.[0];
  if (!f) return;
  const clean = `${Date.now()}-${slugify(f.name)}`.replace(/[^a-z0-9.\-]/g, "");
  const path = `${IMAGES_DIR}/${clean}`;
  const buf = await f.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  await putFile(path, b64, `Upload ${clean}`);
  await loadAssets();
  alert("Uploaded.");
});
refreshAssetsBtn.addEventListener("click", loadAssets);

// Init
(async function init() {
  ensureAuthed();
  setActiveTab("posts");
  dateEl.value = localDateTimeValue(new Date()); // auto-fill now
  updatePreview();
  await listPosts();
  await loadAssets();
})();
