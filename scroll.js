// Sticky card stack — entrance animations + depth scale/opacity on covered sections
(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cards   = Array.from(document.querySelectorAll('.section-card'));

  // Hero has .hero-content instead of .section-card — track it separately
  // so scroll.js can fade it out as About slides in to cover it.
  const heroContent = document.querySelector('#hero .hero-content');

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

  // Hero is always "entered" immediately (it's the first thing visible)
  const heroSection = document.getElementById('hero');
  if (heroSection) heroSection.classList.add('is-visible');

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
  //
  // Hero fading: Hero has min-height:100vh and is sticky at top:0.
  // Its natural top is 0, so scrolledPast = scrollY exactly.
  // We fade .hero-content over the last FADE px of the hero section height,
  // which aligns with the moment About slides in and covers it.
  if (reduced) return;

  const FADE = 280;

  function applyFade(el, scrolledPast, sectionH, scale) {
    if (scrolledPast <= 0 || scrolledPast >= sectionH) {
      el.style.removeProperty('--cover-scale');
      el.style.removeProperty('--cover-opacity');
      return;
    }
    const fadeStart = Math.max(0, sectionH - FADE);
    const fp = scrolledPast - fadeStart;
    if (fp <= 0) {
      el.style.removeProperty('--cover-scale');
      el.style.removeProperty('--cover-opacity');
    } else {
      const p = Math.min(1, fp / FADE);
      if (scale) el.style.setProperty('--cover-scale', (1 - p * 0.02).toFixed(4));
      el.style.setProperty('--cover-opacity', (1 - p).toFixed(4));
    }
  }

  function update() {
    const scrollY = window.scrollY;

    // Fade hero content out as About approaches
    if (heroContent && heroSection) {
      applyFade(heroContent, scrollY, heroSection.offsetHeight, false);
    }

    // Fade each section card as it gets covered by the next section
    cards.forEach(card => {
      const section     = card.closest('section');
      const naturalTop  = section.offsetTop;
      const sectionH    = section.offsetHeight;
      applyFade(card, scrollY - naturalTop, sectionH, true);
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
})();
