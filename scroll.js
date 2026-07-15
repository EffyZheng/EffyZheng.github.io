// Sticky card stack — entrance animations + depth scale/opacity on covered sections
(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cards   = Array.from(document.querySelectorAll('.section-card'));

  // ── Entrance animation ────────────────────────────────────
  const entryObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.closest('section').classList.add('is-visible');
      entryObs.unobserve(entry.target);
    });
  }, { threshold: 0.06, rootMargin: '0px 0px -40px 0px' });

  cards.forEach(card => {
    if (reduced) {
      card.closest('section').classList.add('is-visible');
    } else {
      entryObs.observe(card);
    }
  });

  // ── Depth scale / opacity ─────────────────────────────────
  // As the next section slides up over a section, that section's card
  // shrinks slightly AND fades to fully transparent — no text bleeds through.
  // We track offsetTop (document position, unaffected by sticky positioning).
  if (reduced) return;

  function update() {
    const scrollY = window.scrollY;
    cards.forEach(card => {
      const section = card.closest('section');
      const naturalTop = section.offsetTop;
      const scrolledPast = scrollY - naturalTop;

      if (scrolledPast > 0 && scrolledPast < section.offsetHeight) {
        const p = Math.min(1, scrolledPast / 220);
        card.style.setProperty('--cover-scale',   (1 - p * 0.02).toFixed(4));
        card.style.setProperty('--cover-opacity', (1 - p).toFixed(4));
      } else {
        card.style.removeProperty('--cover-scale');
        card.style.removeProperty('--cover-opacity');
      }
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
})();
