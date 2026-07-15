// Sticky card stack — entrance animations + depth scale/opacity on covered sections
(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cards   = Array.from(document.querySelectorAll('.section-card'));

  // ── Entrance animation ────────────────────────────────────
  // Observes each section-card; adds .is-visible to its section on entry.
  // For the (static, tall) projects section this fires as soon as the card
  // top enters the viewport — all five project articles are direct children
  // of that one card and all get the stagger animation together.
  const entryObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.closest('section').classList.add('is-visible');
      entryObs.unobserve(entry.target);
    });
  }, { threshold: 0.02, rootMargin: '0px 0px -20px 0px' });

  cards.forEach(card => {
    if (reduced) {
      card.closest('section').classList.add('is-visible');
    } else {
      entryObs.observe(card);
    }
  });

  // ── Depth scale / opacity ─────────────────────────────────
  // As the next section slides up and covers the current one, the current
  // card shrinks slightly and fades to 0.
  //
  // Fade window: always counted from the BOTTOM of the section, not the top.
  // This ensures tall sections (like projects) remain fully visible while
  // the user is still scrolling through their content; only the last ~280px
  // of scroll distance triggers the fade-out.
  //
  // For short sticky sections the formula naturally starts the fade early
  // (sectionH ≈ 400px → fadeStart ≈ 120px) which looks the same as before.
  if (reduced) return;

  const FADE = 280;

  function update() {
    const scrollY = window.scrollY;
    cards.forEach(card => {
      const section     = card.closest('section');
      const naturalTop  = section.offsetTop;
      const sectionH    = section.offsetHeight;
      const scrolledPast = scrollY - naturalTop;

      if (scrolledPast <= 0 || scrolledPast >= sectionH) {
        card.style.removeProperty('--cover-scale');
        card.style.removeProperty('--cover-opacity');
        return;
      }

      // Fade starts in the last FADE px of scrolling through this section
      const fadeStart = Math.max(0, sectionH - FADE);
      const fp = scrolledPast - fadeStart;

      if (fp <= 0) {
        card.style.removeProperty('--cover-scale');
        card.style.removeProperty('--cover-opacity');
      } else {
        const p = Math.min(1, fp / FADE);
        card.style.setProperty('--cover-scale',   (1 - p * 0.02).toFixed(4));
        card.style.setProperty('--cover-opacity', (1 - p).toFixed(4));
      }
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
})();
