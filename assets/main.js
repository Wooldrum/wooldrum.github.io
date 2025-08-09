(function () {
  const body = document.body;

  // --- Modes by hash (kept)
  function setModeFromHash() {
    if (location.hash === '#blog') {
      body.classList.add('blog-mode');
    } else {
      body.classList.remove('blog-mode');
    }
  }
  window.addEventListener('hashchange', setModeFromHash);
  setModeFromHash();

  // --- PFP dropdown
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

  // --- EXACT header alignment with avatar tile (including borders)
  function syncHeaderHeight() {
    const header = document.getElementById('pageHeader');
    const pfpBox = document.querySelector('.pfp-wrap');
    if (!header || !pfpBox) return;

    // Use bounding rect for “painted” size (padding + border).
    const h = Math.round(pfpBox.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--pfp-h', `${h}px`);
  }
  window.addEventListener('load', syncHeaderHeight);
  window.addEventListener('resize', syncHeaderHeight);

  // --- About content (relative path = GH Pages safe)
  async function loadAbout() {
    const out = document.getElementById('aboutContent');
    if (!out) return;
    try {
      const res = await fetch('assets/content/about.md', { cache: 'no-store' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const md = await res.text();
      out.innerHTML = DOMPurify.sanitize(marked.parse(md));
    } catch (err) {
      out.innerHTML = `<p class="text-red-300">Failed to load About content.</p>`;
      console.error('about.md load failed:', err);
    }
  }
  loadAbout();

  // --- Mobile: hide the "Cool stuff" label tile
  function mobileCoolStuff() {
    const labelTile = document.querySelector('nav .tile:first-child');
    if (!labelTile) return;
    if (window.matchMedia('(max-width: 767px)').matches) {
      labelTile.classList.add('hidden');
    } else {
      labelTile.classList.remove('hidden');
    }
  }
  window.addEventListener('load', mobileCoolStuff);
  window.addEventListener('resize', mobileCoolStuff);
})();
