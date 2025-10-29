// main.js for front page — hardened About loader + UI glue
(function () {
  const $ = (sel) => document.querySelector(sel);

  // 1) PFP dropdowns (desktop + mobile)
  const pfpToggle       = $("#pfpToggle");
  const pfpMenu         = $("#pfpMenu");
  const pfpToggleMobile = $("#pfpToggleMobile");
  const pfpMenuMobile   = $("#pfpMenuMobile");

  function bindDropdown(btn, menu, hideMenus = []) {
    if (!btn || !menu) return;
    const on = (e) => {
      e.stopPropagation();
      menu.classList.toggle("hidden");
      hideMenus.forEach((m) => m && m.classList.add("hidden"));
    };
    btn.addEventListener("click", on);
    btn.addEventListener("touchend", on);
  }

  bindDropdown(pfpToggle, pfpMenu, [pfpMenuMobile]);
  bindDropdown(pfpToggleMobile, pfpMenuMobile, [pfpMenu]);

  document.addEventListener("click", (e) => {
    [
      [pfpMenu, pfpToggle],
      [pfpMenuMobile, pfpToggleMobile],
    ].forEach(([menu, toggle]) => {
      if (menu && !menu.classList.contains("hidden")) {
        const inside = menu.contains(e.target) || (toggle && toggle.contains(e.target));
        if (!inside) menu.classList.add("hidden");
      }
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (pfpMenu) pfpMenu.classList.add("hidden");
      if (pfpMenuMobile) pfpMenuMobile.classList.add("hidden");
    }
  });

  // 2) Keep header/left-rail border lines perfectly aligned
  function syncHeights() {
    const p = $("#leftRail .pfpH");
    const h = $("header.pfpH");
    if (p && h) {
      const px = Math.round(p.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--pfpH", px + "px");
    }
  }
  window.addEventListener("load", syncHeights);
  window.addEventListener("resize", syncHeights);

  // 3) ABOUT loader: fetch markdown and render robustly
  async function loadAbout() {
    const box = $("#aboutBody");
    if (!box) return;

    try {
      // Bust caches without Liquid, so Jekyll doesn't have to touch this file
      const url = `/assets/content/about.md?ts=${Date.now()}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const md = await res.text();

      // Check for libs; render gracefully even if they’re not ready
      const hasMarked  = typeof window.marked === "object" && typeof window.marked.parse === "function";
      const hasPurify  = typeof window.DOMPurify === "object" && typeof window.DOMPurify.sanitize === "function";

      let html;
      if (hasMarked) {
        html = window.marked.parse(md);
      } else {
        // Minimal fallback: preserve line breaks
        html = md.replace(/&/g,"&amp;")
                 .replace(/</g,"&lt;")
                 .replace(/>/g,"&gt;")
                 .replace(/\n/g,"<br>");
      }

      if (hasPurify) {
        html = window.DOMPurify.sanitize(html);
      }

      box.innerHTML = html;
    } catch (err) {
      console.error("About load error:", err);
      box.textContent = "Failed to load About.";
    }
  }
  // Delay a tick so CDN scripts have a moment to attach globals on first paint
  window.addEventListener("DOMContentLoaded", () => setTimeout(loadAbout, 0));

  // 4) Optional: blog-only view via hash (kept from earlier)
  const blogLink = document.querySelector('[data-nav="blog"]');
  if (blogLink) {
    blogLink.addEventListener("click", (e) => {
      e.preventDefault();
      document.body.classList.add("blog-mode");
      const blog = document.getElementById("blog");
      if (blog) blog.scrollIntoView({ behavior: "smooth" });
    });
  }
})();
