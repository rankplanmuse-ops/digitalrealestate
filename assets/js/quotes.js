// Endorsements: random start on each load (never the previous one), then
// dots or a horizontal swipe step through them. No auto-rotation.
(function () {
  const root = document.querySelector('[data-quotes]');
  if (!root) return;
  const quotes = [...root.querySelectorAll('.quote')];
  if (quotes.length < 2) return;

  const KEY = 'dre-last-quote';
  let last = -1;
  try { last = Number(localStorage.getItem(KEY) ?? -1); } catch (e) {}
  let index = Math.floor(Math.random() * (quotes.length - (last >= 0 ? 1 : 0)));
  if (last >= 0 && index >= last) index += 1;
  try { localStorage.setItem(KEY, String(index)); } catch (e) {}

  const nav = document.createElement('div');
  nav.className = 'quote-nav';
  const dots = quotes.map((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'quote-dot';
    b.setAttribute('aria-label', `Quote ${i + 1} of ${quotes.length}`);
    b.addEventListener('click', () => show(i));
    nav.appendChild(b);
    return b;
  });
  root.appendChild(nav);

  function show(i) {
    index = (i + quotes.length) % quotes.length;
    quotes.forEach((q, n) => q.classList.toggle('is-active', n === index));
    dots.forEach((d, n) => d.toggleAttribute('aria-current', n === index));
  }

  // Swipe: a mostly horizontal drag of 40px or more.
  let x0 = null, y0 = null;
  root.addEventListener('touchstart', (e) => {
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, { passive: true });
  root.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
  });

  show(index);
})();
