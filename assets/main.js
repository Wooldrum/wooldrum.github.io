(function () {
  const body = document.body;

  // ----- View toggles (index page) -----
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

  document.querySelectorAll('[data-nav="blog"]').forEach(el => {
    el.addEventListener('click', (e) => { e.preventDefault(); enterBlog(); });
  });
  document.querySelectorAll('[data-nav="about"]').forEach(el => {
    el.addEventListener('click', (e) => { e.preventDefault(); enterAbout(); });
  });

  window.addEventListener('hashchange', setModeFromHash);
  window.addEventListener('popstate', setModeFromHash);
  setModeFromHash();

  // ----- Profile dropdown (works on home + post pages) -----
  const pfpToggle = document.getElementById('pfpToggle');
  const pfpMenu   = document.getElementById('pfpMenu');

  if (pfpToggle && pfpMenu) {
    const closeMenu = () => pfpMenu.classList.add('hidden');
    const toggle    = () => pfpMenu.classList.toggle('hidden');

    pfpToggle.addEventListener('click', (e) => {
      e.preventDefault();
      toggle();
    });

    // Click outside closes
    document.addEventListener('click', (e) => {
      const within = pfpMenu.contains(e.target) || pfpToggle.contains(e.target);
      if (!within) closeMenu();
    });

    // ESC closes
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }
})();
