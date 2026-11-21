// Plays the YouTube video in a dialog on the page instead of leaving it.
// The player (youtube-nocookie) is only loaded on click and removed on close,
// which also stops playback. Without JS the links still go to YouTube.
(function () {
  const dialog = document.querySelector('.video-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const frame = dialog.querySelector('.video-frame');

  document.querySelectorAll('[data-video]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = link.dataset.video;
      // Desktop browsers let the click start playback with sound. iOS only
      // autoplays embedded video muted, so touch devices start muted and
      // YouTube offers the unmute button.
      const mute = matchMedia('(hover: none)').matches ? '&mute=1' : '';
      frame.innerHTML =
        `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1${mute}&rel=0&playsinline=1" ` +
        'title="Launching Digital Real Estate at Bitcoin Las Vegas 2026" ' +
        'allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
      dialog.showModal();
    });
  });

  dialog.querySelector('.video-close').addEventListener('click', () => dialog.close());
  // A click on the backdrop lands on the dialog element itself.
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { frame.innerHTML = ''; });
})();
