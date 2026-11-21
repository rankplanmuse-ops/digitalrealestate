// The 3D book turns slowly on its own (one turn per 24s). It can still be
// turned by hand: drag horizontally (mouse or finger), it coasts after
// release and eases back into the slow turn. A plain click still follows the
// cover's link; a drag does not.
(function () {
  const link = document.querySelector('.book-cover');
  const book = link && link.querySelector('.book');
  if (!book) return;

  const REST = -28;             // start angle, deg
  const DEG_PER_PX = 0.45;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const AUTO = reduceMotion ? 0 : -360 / 24000;  // deg per ms
  const EASE = 0.94;            // per frame, how fast a flick settles back to AUTO

  let angle = REST;
  let velocity = AUTO;
  let dragging = false;
  let moved = false;
  let lastX = 0;
  let lastT = 0;
  let visible = true;
  let running = false;
  let prev = 0;

  function render() {
    book.style.transform = `perspective(420cqw) rotateY(${angle}deg)`;
  }

  function tick(t) {
    const dt = prev ? Math.min(50, t - prev) : 16;
    prev = t;
    if (!dragging) {
      angle += velocity * dt;
      velocity = AUTO + (velocity - AUTO) * EASE;
      render();
    }
    if (!dragging && !visible) { running = false; prev = 0; return; }
    if (!dragging && reduceMotion && Math.abs(velocity) < 0.001) { running = false; prev = 0; return; }
    requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    running = true;
    requestAnimationFrame(tick);
  }

  link.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    moved = false;
    lastX = e.clientX;
    lastT = e.timeStamp;
  });

  link.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    if (!moved && Math.abs(dx) < 4) return;
    if (!moved) {
      moved = true;
      link.classList.add('is-dragging');
      link.setPointerCapture(e.pointerId);
    }
    const dt = Math.max(1, e.timeStamp - lastT);
    angle += dx * DEG_PER_PX;
    velocity = (dx * DEG_PER_PX) / dt;
    lastX = e.clientX;
    lastT = e.timeStamp;
    render();
  });

  const end = () => {
    if (!dragging) return;
    dragging = false;
    link.classList.remove('is-dragging');
    if (!moved) velocity = AUTO;
    start();
  };
  link.addEventListener('pointerup', end);
  link.addEventListener('pointercancel', end);

  // Desktop browsers start a native link drag on mouse drag, which cancels
  // the pointer stream. Turn it off.
  link.addEventListener('dragstart', (e) => e.preventDefault());

  // A drag must not open the link.
  link.addEventListener('click', (e) => {
    if (moved) { e.preventDefault(); moved = false; }
  });

  // No work while the book is off screen.
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
  }).observe(link);

  render();
  start();
})();
