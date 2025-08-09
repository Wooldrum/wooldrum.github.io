// admin/login.js — OAuth "middleman"
const OAUTH_HOST = "https://wooldrum-decap-oauth.vercel.app";
const SITE_ID = "wooldrum.github.io";

// Where to go after login; honor ?next= if present.
const next = new URLSearchParams(location.search).get("next") || "/admin/index.html";

const loginBtn = document.getElementById("loginBtn");
const continueBtn = document.getElementById("continueBtn");
const logoutBtn = document.getElementById("logoutBtn");
const alreadyBox = document.getElementById("already");

function storeAndGo(t) {
  sessionStorage.setItem("gh_token", t);
  location.replace(next);
}

// Handle return from OAuth (#token=...)
if (location.hash.startsWith("#token=")) {
  storeAndGo(location.hash.slice(7));
}

// If token already present, show Continue + Logout
const existing = sessionStorage.getItem("gh_token");
if (existing) {
  alreadyBox.classList.remove("hidden");
  continueBtn.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
}

loginBtn.addEventListener("click", () => {
  const ret = `${location.origin}/admin/login.html?next=${encodeURIComponent(next)}`;
  const url = new URL(`${OAUTH_HOST}/api/auth`);
  url.searchParams.set("provider", "github");
  url.searchParams.set("site_id", SITE_ID);
  url.searchParams.set("scope", "repo,user");
  url.searchParams.set("returnTo", ret);
  location.href = url.toString();
});

continueBtn.addEventListener("click", () => location.replace(next));

logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem("gh_token");
  location.reload();
});
