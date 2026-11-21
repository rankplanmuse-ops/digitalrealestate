// Underlines the nav item of the section in view and hides the header CTA on
// the book section, which carries its own large CTA.
(function () {
  const sections = [...document.querySelectorAll('.panel')];
  const links = [...document.querySelectorAll('[data-nav]')];

  const setActive = (id) => {
    document.body.dataset.active = id;
    links.forEach((a) => a.toggleAttribute('aria-current', a.dataset.nav === id));
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) setActive(e.target.id);
      });
    },
    { rootMargin: '-45% 0px -45% 0px' }
  );
  sections.forEach((s) => observer.observe(s));

  // Temporary: compare the page with and without the orange frame.
  if (new URLSearchParams(location.search).get('frame') === '0') {
    document.body.classList.add('no-frame');
  }

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();

// Appendix version dropdown: the caret button toggles the version menu
// (hover and keyboard focus also open it, via CSS); closes on an outside
// click or Escape.
(function () {
  const drop = document.querySelector('.nav-drop');
  if (!drop) return;
  const btn = drop.querySelector('.nav-drop-btn');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = drop.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (e) => {
    if (!drop.contains(e.target)) {
      drop.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      drop.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
})();
