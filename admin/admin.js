/* admin/admin.js — custom admin with Posts + Assets

   CONFIG
*/
const OWNER = "Wooldrum";
const REPO = "wooldrum.github.io";
const BRANCH = "main";
const POSTS_DIR = "_posts";
const IMAGES_DIR = "assets/images";
const LOGIN_PAGE = "/admin/login.html";

const OAUTH_HOST = "https://wooldrum-decap-oauth.vercel.app";
const RETURN_TO = `${location.origin}${LOGIN_PAGE}`;

// DOM
const postsList = document.getElementById("postsList");
const tabBtns = document.querySelectorAll(".tab-btn");
const tabPosts = document.getElementById("tab-posts");
const tabAssets = document.getElementById("tab-assets");

const titleEl = document.getElementById("title");
const dateEl = document.getElementById("date");
const imgFileEl = document.getElementById("imgFile");
const imgPathEl = document.getElementById("imgPath");
const bodyEl = document.getElementById("body");

const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const newPostBtn = document.getElementById("newPostBtn");
const previewEl = document.getElementById("preview");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const toolbar = document.querySelector(".toolbar");
const fontSizeSel = document.getElementById("fontSize");

// ASSETS
const assetUploadEl = document.getElementById("assetUpload");
const refreshAssetsBtn = document.getElementById("refreshAssets");
const assetsGrid = document.getElementById("assetsGrid");

// STATE
let token = null;
let currentPath = null; // e.g., "_posts/2025-08-09-slug.md"
let currentSha = null;

/* --------- Helpers --------- */
const gh = (path) => `https://api.github.com/repos/${OWNER}/${REPO}/${path}`;
const headers = () => ({
  "Accept": "application/vnd.github+json",
  "Authorization": `token ${token}`,
  "Content-Type": "application/json"
});

function toBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}
async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
function pad(n){return `${n}`.padStart(2,"0")}
function localDateTimeValue(d=new Date()){
  // yyyy-MM-ddTHH:mm (LOCAL)
  const yy=d.getFullYear();
  const mm=pad(d.getMonth()+1);
  const dd=pad(d.getDate());
  const hh=pad(d.getHours());
  const mi=pad(d.getMinutes());
  return `${yy}-${mm}-${dd}T${hh}:${mi}`;
}
function parseMDFrontmatter(md){
  // very small parser: returns {frontmatter:{}, body:""}
  if(!md.startsWith("---")) return {frontmatter:{}, body:md};
  const end = md.indexOf("\n---", 3);
  if(end === -1) return {frontmatter:{}, body:md};
  const yaml = md.slice(3, end).trim();
  const body = md.slice(end + 4).trim();
  const fm = {};
  yaml.split("\n").forEach(line=>{
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if(m){ fm[m[1]] = m[2].replace(/^"(.*)"$/,"$1"); }
  });
  return {frontmatter:fm, body};
}
function buildMarkdown({title,date,image,body}){
  const iso = new Date(date || Date.now()).toISOString();
  const lines = [
    "---",
    `title: "${(title||"").replace(/"/g,'\\"')}"`,
    `date: ${iso}`,
    ...(image ? [`image: ${image}`] : []),
    'layout: "post"',
    "---",
    body || ""
  ];
  return lines.join("\n")+"\n";
}
function md2html(md){
  try{
    const raw = marked.parse(md || "");
    return DOMPurify.sanitize(raw);
  }catch(e){ return "<p>Preview unavailable.</p>"; }
}
function setAuthedUI(on){
  loginBtn.classList.toggle("hidden", on);
  logoutBtn.classList.toggle("hidden", !on);
  newPostBtn.classList.toggle("hidden", !on);
  saveBtn.classList.toggle("hidden", !on);
}

/* --------- AUTH ---------- */
function readTokenFromHash() {
  if (location.hash.startsWith("#token=")) {
    const t = location.hash.slice(7);
    sessionStorage.setItem("gh_token", t);
    history.replaceState({}, "", location.pathname);
  }
}
function ensureAuthed(){
  readTokenFromHash();
  token = sessionStorage.getItem("gh_token");
  if(!token){
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

/* --------- Tabs ---------- */
function setActiveTab(which){
  const onPosts = which === "posts";
  tabBtns.forEach(b=>{
    b.classList.toggle("active", b.dataset.tab===which);
  });
  tabPosts.classList.toggle("hidden", !onPosts);
  tabAssets.classList.toggle("hidden", onPosts);
}

/* --------- GitHub contents API ---------- */
async function getJSON(url){
  const r = await fetch(url, { headers: headers() });
  if(!r.ok) throw new Error(`GitHub ${r.status}: ${url}`);
  return r.json();
}
async function getDir(dir){
  return getJSON(gh(`contents/${dir}?ref=${BRANCH}`));
}
async function getFile(path){
  return getJSON(gh(`contents/${path}?ref=${BRANCH}`));
}
async function putFile(path, contentBase64, message, sha=null){
  const body = { message, content: contentBase64, branch: BRANCH };
  if(sha) body.sha = sha;
  const r = await fetch(gh(`contents/${path}`), {
    method:"PUT", headers: headers(), body: JSON.stringify(body)
  });
  if(!r.ok){
    const t = await r.text();
    throw new Error(`PUT ${path} failed: ${r.status} ${t}`);
  }
  return r.json();
}

/* --------- Posts ---------- */
async function listPosts(){
  postsList.innerHTML = `<li class="text-sm text-dark-muted">Loading…</li>`;
  const items = await getDir(POSTS_DIR);
  const files = items
    .filter(i=> i.type==="file" && /\.md$/i.test(i.name))
    .sort((a,b)=> b.name.localeCompare(a.name)); // newest by filename date
  if(!files.length){
    postsList.innerHTML = `<li class="text-sm text-dark-muted">No posts yet.</li>`;
    return;
  }
  postsList.innerHTML = "";
  for(const f of files){
    const li = document.createElement("li");
    li.className = "flex items-center justify-between gap-2";
    const btn = document.createElement("button");
    btn.className = "text-left hover:underline";
    btn.textContent = f.name.replace(/\.md$/,"");
    btn.addEventListener("click", ()=> loadPost(`${POSTS_DIR}/${f.name}`));
    li.appendChild(btn);
    postsList.appendChild(li);
  }
}
async function loadPost(path){
  const json = await getFile(path);
  const raw = atob(json.content);
  currentPath = path;
  currentSha  = json.sha;

  const {frontmatter, body} = parseMDFrontmatter(raw);
  titleEl.value = frontmatter.title || "";
  // prefer FM date, else derive from filename
  const dt = frontmatter.date ? new Date(frontmatter.date) : new Date();
  dateEl.value = localDateTimeValue(dt);
  imgPathEl.value = (frontmatter.image || "");
  bodyEl.value = body || "";

  updatePreview();
  window.scrollTo({top:0, behavior:"smooth"});
}
function setDateNow(){
  dateEl.value = localDateTimeValue(new Date());
}
function resetEditor(){
  currentPath = null; currentSha = null;
  titleEl.value = ""; imgPathEl.value = ""; bodyEl.value = "";
  setDateNow();
  updatePreview();
}
newPostBtn.addEventListener("click", resetEditor);
resetBtn.addEventListener("click", resetEditor);

async function savePost(){
  const title = titleEl.value.trim();
  const body  = bodyEl.value;
  if(!title){ alert("Title is required."); return; }

  // filename from date + slug
  const d = new Date(dateEl.value || Date.now());
  const yyyy = d.getFullYear(), mm = (`0${d.getMonth()+1}`).slice(-2), dd=(`0${d.getDate()}`).slice(-2);
  const base = `${yyyy}-${mm}-${dd}-${slugify(title) || "post"}.md`;
  const path = currentPath || `${POSTS_DIR}/${base}`;

  const md = buildMarkdown({
    title,
    date: d.toISOString(),
    image: imgPathEl.value.trim() || undefined,
    body
  });

  const contentB64 = btoa(unescape(encodeURIComponent(md)));
  const msg = currentPath ? `Update ${path}` : `Create ${path}`;
  await putFile(path, contentB64, msg, currentSha || null);

  currentPath = path;
  currentSha = null; // will refresh on next load
  alert("Saved!");
  listPosts();
}
saveBtn.addEventListener("click", savePost);

/* --------- Editor toolbar ---------- */
function surround(selStart, selEnd, before, after){
  const el = bodyEl;
  const v = el.value;
  const start = el.selectionStart ?? 0;
  const end   = el.selectionEnd ?? 0;
  const left = v.slice(0,start), mid = v.slice(start,end) || selStart, right = v.slice(end);
  const out = `${left}${before}${mid}${after}${right}`;
  el.value = out;
  const pos = left.length + before.length + (mid.length===0 ? selStart.length : mid.length);
  el.setSelectionRange(pos, pos);
  el.focus(); updatePreview();
}
toolbar.addEventListener("click", (e)=>{
  const b = e.target.closest("button[data-cmd]");
  if(!b) return;
  const cmd = b.dataset.cmd;
  if(cmd==="bold") surround("bold","", "**","**");
  if(cmd==="italic") surround("em","", "*","*");
  if(cmd==="highlight") surround("text","", "<mark>","</mark>");
  if(cmd==="link"){
    const url = prompt("Link to (https://…):", "https://");
    if(!url) return;
    const el = bodyEl;
    const s = el.value.slice(el.selectionStart, el.selectionEnd) || "link";
    const left = el.value.slice(0, el.selectionStart);
    const right= el.value.slice(el.selectionEnd);
    el.value = `${left}[${s}](${url})${right}`;
    updatePreview();
  }
});
fontSizeSel.addEventListener("change", ()=>{
  const v = fontSizeSel.value;
  const style = v==="small" ? "font-size:.9em"
              : v==="large" ? "font-size:1.25em"
              : v==="xlarge"? "font-size:1.5em"
              : null;
  if(style) surround("text","", `<span style="${style}">`, `</span>`);
});

/* --------- Image upload (editor) ---------- */
imgFileEl.addEventListener("change", async ()=>{
  const f = imgFileEl.files?.[0];
  if(!f) return;
  const cleanName = `${Date.now()}-${slugify(f.name)}`.replace(/[^a-z0-9\.\-]/g,"");
  const path = `${IMAGES_DIR}/${cleanName}`;
  const b64 = await fileToBase64(f);
  await putFile(path, b64, `Upload ${cleanName}`);
  imgPathEl.value = `/${path}`;
  updatePreview();
  loadAssets();
});

/* --------- Preview ---------- */
function updatePreview(){
  const t = titleEl.value.trim();
  const d = new Date(dateEl.value || Date.now());
  const img = imgPathEl.value.trim();
  let html = `<h1 class="text-2xl font-bold text-white">${t || "Untitled"}</h1>`;
  html += `<p class="text-sm text-dark-muted">${d.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})}</p>`;
  if(img) html += `<img class="mt-4 rounded-xl border border-dark-line" src="${img}" alt="">`;
  html += `<div class="mt-4 text-dark-muted leading-relaxed">${md2html(bodyEl.value)}</div>`;
  previewEl.innerHTML = html;
}
titleEl.addEventListener("input", updatePreview);
dateEl.addEventListener("input", updatePreview);
imgPathEl.addEventListener("input", updatePreview);
bodyEl.addEventListener("input", updatePreview);

/* --------- Assets tab ---------- */
async function loadAssets(){
  assetsGrid.innerHTML = `<div class="text-sm text-dark-muted">Loading…</div>`;
  const items = await getDir(IMAGES_DIR).catch(()=>[]);
  if(!items.length){
    assetsGrid.innerHTML = `<div class="text-sm text-dark-muted">No images found.</div>`;
    return;
  }
  assetsGrid.innerHTML = "";
  for(const it of items.filter(i=>i.type==="file")){
    const url = `/${IMAGES_DIR}/${it.name}`;
    const cell = document.createElement("div");
    cell.className="space-y-2";
    const img = document.createElement("img");
    img.src = url; img.alt = it.name; img.className="image-tile w-full";
    const row = document.createElement("div");
    row.className="flex items-center justify-between text-xs text-dark-muted";
    const name = document.createElement("span");
    name.className="truncate max-w-[10rem]";
    name.textContent = it.name;
    const add = document.createElement("button");
    add.className="btn px-2 py-1";
    add.textContent = "Insert";
    add.addEventListener("click", ()=>{
      // insert markdown link or set image field
      imgPathEl.value = `/${IMAGES_DIR}/${it.name}`;
      updatePreview();
      setActiveTab("posts");
    });
    row.append(name, add);
    cell.append(img, row);
    assetsGrid.appendChild(cell);
  }
}
assetUploadEl.addEventListener("change", async ()=>{
  const f = assetUploadEl.files?.[0];
  if(!f) return;
  const cleanName = `${Date.now()}-${slugify(f.name)}`.replace(/[^a-z0-9\.\-]/g,"");
  const path = `${IMAGES_DIR}/${cleanName}`;
  const b64 = await fileToBase64(f);
  await putFile(path, b64, `Upload ${cleanName}`);
  await loadAssets();
  alert("Uploaded.");
});
refreshAssetsBtn.addEventListener("click", loadAssets);

/* --------- INIT ---------- */
async function init(){
  ensureAuthed();
  // tabs
  tabBtns.forEach(b=> b.addEventListener("click", ()=> setActiveTab(b.dataset.tab)));
  setActiveTab("posts");

  setDateNow();
  updatePreview();

  await listPosts();
  await loadAssets();
}
init().catch(err=> console.error(err));
