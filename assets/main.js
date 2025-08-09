// main.js for front page
(function () {
  const $ = (sel) => document.querySelector(sel);

  // 1) PFP dropdown
  const pfpToggle = $("#pfpToggle");
  const pfpMenu   = $("#pfpMenu");

  if (pfpToggle && pfpMenu) {
    pfpToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      pfpMenu.classList.toggle("hidden");
    });
    document.addEventListener("click", (e) => {
      if (!pfpMenu.classList.contains("hidden")) {
        const inside = pfpMenu.contains(e.target) || pfpToggle.contains(e.target);
        if (!inside) pfpMenu.classList.add("hidden");
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") pfpMenu.classList.add("hidden");
    });
  }

  // 2) Keep header/left-rail border lines perfectly aligned
  function syncHeights() {
    const p = $("#leftRail .pfpH");
    const h = $("header.pfpH");
    if (p && h) {
      // share whatever real pixel height the PFP tile ended up with
      const px = Math.round(p.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--pfpH", px + "px");
    }
  }
  window.addEventListener("load", syncHeights);
  window.addEventListener("resize", syncHeights);

  // 3) ABOUT loader: fetch markdown and render
  async function loadAbout() {
    const box = $("#aboutBody");
    if (!box) return;
    try {
      const bust = "{{ site.time | date: '%s' }}";
      const res = await fetch(`/assets/content/about.md?ts=${bust}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const md = await res.text();
      // marked is global from CDN
      const html = DOMPurify.sanitize(marked.parse(md));
      box.innerHTML = html;
    } catch (err) {
      box.textContent = "Failed to load About.";
      console.error("About load error:", err);
    }
  }
  loadAbout();

  // 4) Optional: blog-only view via hash (kept from original)
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
