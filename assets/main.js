(function () {
  const body = document.body;

  // --- Mode by #hash (kept)
  function setModeFromHash() {
    if (location.hash === '#blog') body.classList.add('blog-mode');
    else body.classList.remove('blog-mode');
  }
  window.addEventListener('hashchange', setModeFromHash);
  setModeFromHash();

  // --- PFP dropdown (robust)
  const pfpToggle = document.getElementById('pfpToggle');
  const pfpMenu   = document.getElementById('pfpMenu');
  if (pfpToggle && pfpMenu) {
    const toggleMenu = (e) => {
      e?.preventDefault?.();
      pfpMenu.classList.toggle('hidden');
    };
    pfpToggle.addEventListener('click', toggleMenu);
    pfpToggle.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') toggleMenu(e); });

    document.addEventListener('click', (e) => {
      if (pfpMenu.classList.contains('hidden')) return;
      const inside = pfpMenu.contains(e.target) || pfpToggle.contains(e.target);
      if (!inside) pfpMenu.classList.add('hidden');
    });
  }

  // --- EXACT header alignment with avatar tile (including borders)
  function syncHeaderHeight() {
    const header = document.getElementById('pageHeader');
    const pfpBox = document.getElementById('pfpBox');
    if (!header || !pfpBox) return;
    // Use painted size (padding + borders)
    const h = Math.round(pfpBox.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--pfp-h', `${h}px`);
    header.style.height = `${h}px`;
  }
  window.addEventListener('load', syncHeaderHeight);
  window.addEventListener('resize', syncHeaderHeight);

  // --- About content (path provided by data-attr so Jekyll resolves correctly)
  async function loadAbout() {
    const out = document.getElementById('aboutContent');
    if (!out) return;
    const src = out.getAttribute('data-src') || 'assets/content/about.md';
    try {
      const res = await fetch(src, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const md = await res.text();
      out.innerHTML = DOMPurify.sanitize(marked.parse(md));
    } catch (err) {
      console.error('about.md load failed:', err);
      out.innerHTML = `<p class="text-red-300">Failed to load About content.</p>`;
    }
  }
  window.addEventListener('load', loadAbout);

  // --- Mobile: hide the "Cool stuff" label tile (icons remain)
  function mobileCoolStuff() {
    const label = document.querySelector('.tile-label');
    if (!label) return;
    if (window.matchMedia('(max-width: 767px)').matches) label.classList.add('hidden');
    else label.classList.remove('hidden');
  }
  window.addEventListener('load', mobileCoolStuff);
  window.addEventListener('resize', mobileCoolStuff);
})();
