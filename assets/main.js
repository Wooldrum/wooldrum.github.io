(function () {
  const body = document.body;
  const pfpToggle = document.getElementById('pfpToggle');
  const pfpMenu = document.getElementById('pfpMenu');

  function enterBlog() {
    body.classList.add('blog-mode');
    if (location.hash !== '#blog') history.pushState({ view: 'blog' }, '', '#blog');
  }
  function enterAbout() {
    body.classList.remove('blog-mode');
    if (location.hash !== '#about') history.pushState({ view: 'about' }, '', '#about');
  }
  function setModeFromHash() {
    if (location.hash === '#blog') enterBlog();
    else if (location.hash === '#about') enterAbout();
    else body.classList.remove('blog-mode');
  }

  // Hash nav buttons
  document.querySelectorAll('[data-nav="blog"]').forEach(el => {
    el.addEventListener('click', (e) => { e.preventDefault(); enterBlog(); });
  });
  document.querySelectorAll('[data-nav="about"]').forEach(el => {
    el.addEventListener('click', (e) => { e.preventDefault(); enterAbout(); });
  });

  // PFP dropdown
  function closeMenu() { pfpMenu?.classList.add('hidden'); }
  pfpToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    pfpMenu?.classList.toggle('hidden');
  });
  document.addEventListener('click', (e) => {
    if (!pfpMenu || pfpMenu.classList.contains('hidden')) return;
    if (!pfpMenu.contains(e.target) && e.target !== pfpToggle) closeMenu();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  window.addEventListener('hashchange', setModeFromHash);
  window.addEventListener('popstate', setModeFromHash);
  setModeFromHash(); // init on load
})();
