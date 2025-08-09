(function () {
  const body = document.body;

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
})();
