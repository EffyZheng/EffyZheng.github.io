// Sticky card stack — entrance animations + depth scale/opacity on covered sections
(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cards   = Array.from(document.querySelectorAll('.section-card'));

  // ── Entrance animation ────────────────────────────────────
  // Each section's card children fade in + slide up 12px in staggered order
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
  // When the NEXT section's panel slides up and covers a section,
  // that section's card slightly shrinks and fades ("retreating" effect).
  // We track how far each section has been "scrolled into" via offsetTop,
  // which gives the natural document position regardless of sticky.
  if (reduced) return;

  function update() {
    const scrollY = window.scrollY;
    cards.forEach(card => {
      const section = card.closest('section');
      const naturalTop = section.offsetTop;
      const scrolledPast = scrollY - naturalTop;

      if (scrolledPast > 0 && scrolledPast < section.offsetHeight) {
        const p = Math.min(1, scrolledPast / 200);
        card.style.setProperty('--cover-scale',   (1 - p * 0.02).toFixed(4));
        card.style.setProperty('--cover-opacity', (1 - p * 0.16).toFixed(4));
      } else {
        card.style.removeProperty('--cover-scale');
        card.style.removeProperty('--cover-opacity');
      }
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
})();
