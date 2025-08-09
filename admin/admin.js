// --------- CONFIG ----------
const OWNER = "Wooldrum";
const REPO = "wooldrum.github.io";
const BRANCH = "main";
const POSTS_DIR = "_posts";
const IMAGES_DIR = "assets/images";

// Your deployed Vercel OAuth host
const OAUTH_HOST = "https://wooldrum-decap-oauth.vercel.app";
// We'll ask the backend to send the token back here:
const RETURN_TO = "https://wooldrum.github.io/admin/index.html";

// --------- STATE ----------
let token = null;
let current = null; // { path, sha, frontmatter, body }

// --------- ELEMENTS ----------
const el = (id) => document.getElementById(id);
const postList = el("postList");
const searchEl = el("search");
const titleEl = el("title");
const dateEl = el("date");
const imgFileEl = el("imageFile");
const imgUrlEl = el("imageUrl");
const bodyEl = el("body");
const editPathEl = el("editPath");
const previewEl = el("preview");
const loginBtn = el("loginBtn");
const logoutBtn = el("logoutBtn");
const newPostBtn = el("newPostBtn");
const saveBtn = el("saveBtn");
const deleteBtn = el("deleteBtn");
const resetBtn = el("resetBtn");

// --------- UTIL ----------
const b64 = (str) => btoa(unescape(encodeURIComponent(str)));
const unb64 = (str) => decodeURIComponent(escape(atob(str)));
const fmtDate = (d) =>
  new Date(d).toISOString().slice(0, 16); // yyyy-mm-ddThh:mm (local for input)
const toFrontmatter = (data) => {
  const lines = [
    "---",
    `layout: post`,
    `author: Woodrum`,
    `title: "${(data.title || "").replace(/"/g, '\\"')}"`,
    `date: ${new Date(data.date).toISOString()}`,
  ];
  if (data.image) lines.push(`image: ${data.image}`);
  lines.push("---", "", data.body || "");
  return lines.join("\n");
};
const parseFrontmatter = (raw) => {
  // very small parser: expects --- on top/bottom
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: raw };
  const fm = {};
  m[1].split("\n").forEach((line) => {
    const i = line.indexOf(":");
    if (i > -1) {
      const key = line.slice(0, i).trim();
      const value = line.slice(i + 1).trim().replace(/^"|"$/g, "");
      fm[key] = value;
    }
  });
  return { fm, body: m[2] || "" };
};
const slugify = (s) =>
  s.toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

// GitHub REST wrapper
async function gh(path, init = {}) {
  if (!token) throw new Error("Not logged in");
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `token ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${res.status}: ${t}`);
  }
  return res.json();
}
async function getContent(path) {
  return gh(`/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`);
}
async function putContent(path, contentB64, message, sha) {
  return gh(`/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: contentB64,
      branch: BRANCH,
      sha,
    }),
  });
}
async function deleteContent(path, message, sha) {
  return gh(`/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`, {
    method: "DELETE",
    body: JSON.stringify({ message, branch: BRANCH, sha }),
  });
}

// --------- AUTH ----------
function setAuthedUI(on) {
  loginBtn.classList.toggle("hidden", on);
  logoutBtn.classList.toggle("hidden", !on);
  newPostBtn.classList.toggle("hidden", !on);
}
function readTokenFromHash() {
  if (location.hash.startsWith("#token=")) {
    const t = location.hash.slice(7);
    sessionStorage.setItem("gh_token", t);
    history.replaceState({}, "", location.pathname);
  }
  token = sessionStorage.getItem("gh_token");
  setAuthedUI(!!token);
}
loginBtn.addEventListener("click", () => {
  // Send user to our auth endpoint, asking it to come back to RETURN_TO with #token
  const url = new URL(`${OAUTH_HOST}/api/auth`);
  url.searchParams.set("provider", "github");
  url.searchParams.set("site_id", "wooldrum.github.io");
  url.searchParams.set("scope", "repo,user");
  url.searchParams.set("returnTo", RETURN_TO);
  location.href = url.toString();
});
logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem("gh_token");
  token = null;
  setAuthedUI(false);
  postList.innerHTML = "";
  previewEl.innerHTML = `<p class="text-dark-muted">Logged out.</p>`;
});
readTokenFromHash();

// --------- POSTS LIST ----------
async function listPosts() {
  const items = await getContent(POSTS_DIR);
  // Only .md files, newest first by filename date
  const files = items
    .filter((i) => i.type === "file" && /\.md$/i.test(i.name))
    .sort((a, b) => (a.name < b.name ? 1 : -1));

  // Build list with titles by reading frontmatter quickly
  postList.innerHTML = "";
  for (const f of files) {
    const file = await getContent(`${POSTS_DIR}/${f.name}`);
    const raw = unb64(file.content);
    const { fm } = parseFrontmatter(raw);
    const li = document.createElement("li");
    li.className = "py-3";
    li.innerHTML = `
      <button class="w-full text-left px-3 py-3 ghost rounded-xl border border-dark-line hover:border-dark-accent">
        <div class="text-white font-semibold">${fm.title || f.name}</div>
        <div class="text-xs text-dark-muted">${fm.date ? new Date(fm.date).toLocaleString() : ""} • ${f.name}</div>
      </button>`;
    li.querySelector("button").addEventListener("click", () => loadPost(`${POSTS_DIR}/${f.name}`, file.sha, raw));
    postList.appendChild(li);
  }
}

// --------- LOAD / EDIT ----------
function fillEditor(path, sha, raw) {
  const { fm, body } = parseFrontmatter(raw);
  editPathEl.value = path;
  current = { path, sha, frontmatter: fm, body };
  titleEl.value = fm.title || "";
  dateEl.value = fm.date ? fmtDate(fm.date) : fmtDate(new Date());
  imgUrlEl.value = fm.image || "";
  bodyEl.value = body || "";
  deleteBtn.classList.remove("hidden");
  updatePreview();
}
async function loadPost(path, shaHint, rawHint) {
  if (!shaHint || !rawHint) {
    const file = await getContent(path);
    fillEditor(path, file.sha, unb64(file.content));
  } else {
    fillEditor(path, shaHint, rawHint);
  }
}
function resetEditor() {
  current = null;
  editPathEl.value = "";
  titleEl.value = "";
  dateEl.value = fmtDate(new Date());
  imgFileEl.value = "";
  imgUrlEl.value = "";
  bodyEl.value = "";
  deleteBtn.classList.add("hidden");
  updatePreview();
}
newPostBtn.addEventListener("click", resetEditor);
resetBtn.addEventListener("click", resetEditor);

// --------- PREVIEW ----------
function updatePreview() {
  const data = {
    title: titleEl.value.trim(),
    date: dateEl.value ? new Date(dateEl.value).toISOString() : new Date().toISOString(),
    image: (imgUrlEl.value || "").trim(),
    body: bodyEl.value,
  };
  let html = `<h1 class="text-2xl font-bold text-white">${data.title || "Untitled"}</h1>`;
  html += `<p class="text-sm text-dark-muted">${new Date(data.date).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})}</p>`;
  if (data.image) {
    html += `<img src="${data.image}" class="mt-4 rounded-xl border border-dark-line max-w-full"/>`;
  }
  html += `<div class="mt-3 whitespace-pre-wrap text-dark-muted">${data.body || ""}</div>`;
  previewEl.innerHTML = html;
}
titleEl.addEventListener("input", updatePreview);
dateEl.addEventListener("input", updatePreview);
imgUrlEl.addEventListener("input", updatePreview);
bodyEl.addEventListener("input", updatePreview);

// --------- IMAGE UPLOAD ----------
async function maybeUploadImage() {
  const file = imgFileEl.files?.[0];
  if (!file) return imgUrlEl.value.trim() || "";
  const array = new Uint8Array(await file.arrayBuffer());
  let binary = ""; array.forEach((b) => (binary += String.fromCharCode(b)));
  const contentB64 = b64(binary);

  const cleanName = file.name.replace(/\s+/g, "-");
  const path = `${IMAGES_DIR}/${Date.now()}-${cleanName}`;
  const res = await putContent(path, contentB64, `upload image ${cleanName}`);
  return `/${IMAGES_DIR}/${res.content.name}`.replace(/\/+/g, "/");
}

// --------- SAVE / DELETE ----------
async function savePost(e) {
  e?.preventDefault?.();
  const title = titleEl.value.trim();
  const date = dateEl.value ? new Date(dateEl.value) : new Date();
  if (!title) return alert("Title required");

  const imagePath = await maybeUploadImage();
  if (imagePath) imgUrlEl.value = imagePath;

  const data = {
    title,
    date: date.toISOString(),
    image: imgUrlEl.value.trim() || undefined,
    body: bodyEl.value,
  };
  const content = toFrontmatter(data);
  const contentB64 = b64(content);

  let path = editPathEl.value;
  let sha = current?.sha;

  if (!path) {
    const slug = slugify(title);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    path = `${POSTS_DIR}/${yyyy}-${mm}-${dd}-${slug}.md`;
  }

  const message = current ? `update post: ${title}` : `create post: ${title}`;
  const res = await putContent(path, contentB64, message, sha);
  // Reload list & load this file
  await listPosts();
  await loadPost(path, res.content.sha, content);
  alert("Saved!");
}
async function deletePostHandler() {
  if (!current?.path || !current?.sha) return;
  if (!confirm("Delete this post?")) return;
  await deleteContent(current.path, `delete post ${current.path}`, current.sha);
  resetEditor();
  await listPosts();
}
document.getElementById("editor").addEventListener("submit", savePost);
deleteBtn.addEventListener("click", deletePostHandler);

// --------- SEARCH ----------
searchEl.addEventListener("input", () => {
  const q = searchEl.value.toLowerCase();
  Array.from(postList.children).forEach((li) => {
    const txt = li.textContent.toLowerCase();
    li.classList.toggle("hidden", !txt.includes(q));
  });
});

// --------- INIT ----------
(async function init() {
  if (!token) return; // not logged in yet
  try {
    await listPosts();
  } catch (e) {
    console.error(e);
    alert("Failed to load posts. Are you logged into GitHub OAuth?");
  }
})();
