(function () {
  const body = document.body;

  // --- NAV hash -> show Blog/About
  function setModeFromHash() {
    if (location.hash === '#blog') {
      body.classList.add('blog-mode');
    } else if (location.hash === '#about') {
      body.classList.remove('blog-mode');
    } else {
      body.classList.remove('blog-mode'); // default
    }
  }
  document.querySelectorAll('[data-nav="blog"]').forEach(el => {
    el.addEventListener('click', (e) => {
      // keep default anchor behavior, but ensure mode
      body.classList.add('blog-mode');
    });
  });
  window.addEventListener('hashchange', setModeFromHash);
  window.addEventListener('popstate', setModeFromHash);
  setModeFromHash();

  // --- PFP dropdown (desktop)
  const pfpToggle = document.getElementById('pfpToggle');
  const pfpMenu   = document.getElementById('pfpMenu');
  if (pfpToggle && pfpMenu) {
    pfpToggle.addEventListener('click', (e) => {
      e.preventDefault();
      pfpMenu.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
      if (!pfpMenu.classList.contains('hidden')) {
        const inside = pfpMenu.contains(e.target) || pfpToggle.contains(e.target);
        if (!inside) pfpMenu.classList.add('hidden');
      }
    });
  }

  // --- Align the header’s bottom border with the bottom of the avatar tile (account for borders)
  function syncHeaderHeight() {
    const header = document.getElementById('pageHeader');
    const pfpBox = document.querySelector('.pfp-wrap');
    if (!header || !pfpBox) return;

    // offsetHeight includes borders. We want the header to exactly match that height.
    header.style.height = `${pfpBox.offsetHeight}px`;
  }
  window.addEventListener('load', syncHeaderHeight);
  window.addEventListener('resize', syncHeaderHeight);

  // --- Load About content from assets/content/about.md
  async function loadAbout() {
    const host = location.host.toLowerCase();
    const isGhPages = host.endsWith('github.io');
    const url = isGhPages
      ? '/assets/content/about.md'
      : `${location.origin}/assets/content/about.md`; // fallback

    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const md = await res.text();
      const html = DOMPurify.sanitize(marked.parse(md));
      const out = document.getElementById('aboutContent');
      if (out) out.innerHTML = html;
    } catch (err) {
      const out = document.getElementById('aboutContent');
      if (out) out.innerHTML = `<p class="text-red-300">Failed to load About content.</p>`;
      console.error('about.md load failed:', err);
    }
  }
  loadAbout();

  // --- Mobile: hide the “Cool stuff” label tile and keep image tiles
  function applyMobileTweaks() {
    const labelTile = document.querySelector('nav .tile:first-child'); // the "Cool stuff" tile
    if (!labelTile) return;

    if (window.matchMedia('(max-width: 767px)').matches) {
      // on mobile, hide the label tile entirely
      labelTile.classList.add('hidden');
    } else {
      labelTile.classList.remove('hidden');
    }
  }
  window.addEventListener('load', applyMobileTweaks);
  window.addEventListener('resize', applyMobileTweaks);
})();
