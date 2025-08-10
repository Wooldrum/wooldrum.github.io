// main.js — unified About loader + dropdowns + header/rail sync
(function () {
  const $ = (sel) => document.querySelector(sel);

  // 1) ABOUT loader: fetch markdown and render robustly
  async function loadAbout() {
    const box = $("#aboutBody");
    if (!box) return;

    try {
      const url = `/assets/content/about.md?ts=${Date.now()}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const md = await res.text();

      const hasMarked = typeof window.marked?.parse === "function";
      const hasPurify = typeof window.DOMPurify?.sanitize === "function";

      let html = hasMarked ? window.marked.parse(md)
                           : md.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>");

      box.innerHTML = hasPurify ? window.DOMPurify.sanitize(html) : html;
    } catch (err) {
      console.error("About load error:", err);
      box.textContent = "Failed to load About.";
    }
  }

  // 2) Dropdowns: desktop + mobile (single source of truth)
  function setupDropdowns() {
    const desktopBtn  = $("#pfpToggle");
    const desktopMenu = $("#pfpMenu");
    const mobileBtn   = $("#pfpToggleMobile");
    const mobileMenu  = $("#pfpMenuMobile");

    const menus = [desktopMenu, mobileMenu].filter(Boolean);

    const hide = (m) => m && m.classList.add("hidden");
    const showOnly = (m) => menus.forEach(x => x === m ? x.classList.remove("hidden") : hide(x));
    const toggleOnly = (m) => m && (m.classList.contains("hidden") ? showOnly(m) : hide(m));

    if (desktopBtn && desktopMenu) {
      const on = (e)=>{ e.preventDefault(); e.stopPropagation(); toggleOnly(desktopMenu); };
      desktopBtn.addEventListener("click", on);
      desktopBtn.addEventListener("touchend", on, { passive:false });
    }
    if (mobileBtn && mobileMenu) {
      const on = (e)=>{ e.preventDefault(); e.stopPropagation(); toggleOnly(mobileMenu); };
      mobileBtn.addEventListener("click", on);
      mobileBtn.addEventListener("touchend", on, { passive:false });
    }

    // click-away + Esc
    document.addEventListener("click", (e)=>{
      menus.forEach(m => {
        const btn = (m === desktopMenu ? desktopBtn : mobileBtn);
        if (!m || m.classList.contains("hidden")) return;
        const inside = m.contains(e.target) || (btn && btn.contains(e.target));
        if (!inside) hide(m);
      });
    });
    document.addEventListener("keydown", (e)=>{ if (e.key === "Escape") menus.forEach(hide); });
  }

  // 3) Keep header/left-rail border lines perfectly aligned
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
  window.addEventListener("DOMContentLoaded", () => {
    // tiny delay gives CDN globals a tick on first paint
    setTimeout(loadAbout, 0);
    setupDropdowns();
  });
})();
