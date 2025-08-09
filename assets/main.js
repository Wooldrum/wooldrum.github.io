// assets/main.js
(function () {
  const body = document.body;

  // --- Routing between About and Blog (unchanged on desktop, works on mobile too)
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

  // --- Dropdowns: supports multiple avatar buttons (desktop + mobile)
  function wireMenus() {
    const toggles = document.querySelectorAll('.pfpToggle');
    function closeAll() {
      document.querySelectorAll('#pfpMenuDesktop, #pfpMenuMobile').forEach(m => m.classList.add('hidden'));
    }
    toggles.forEach(btn => {
      const menuSel = btn.getAttribute('data-menu');
      const menu = document.querySelector(menuSel);
      if (!menu) return;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !menu.classList.contains('hidden');
        closeAll();
        if (!isOpen) menu.classList.remove('hidden');
      });
    });

    // Click-away + Escape to close
    document.addEventListener('click', closeAll);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
  }
  wireMenus();
})();
