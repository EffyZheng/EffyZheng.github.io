// Topographic contour line background — full-bleed fixed canvas, no libraries
(function () {
  const canvas = document.getElementById('topo-canvas');
  if (!canvas) return;
  canvas.setAttribute('aria-hidden', 'true');

  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch   = window.matchMedia('(hover: none)').matches;

  let W, H;
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    if (reduced) draw(0);
  }
  resize();
  window.addEventListener('resize', resize);

  // 26 contour lines — parameters fixed at startup, only phase drifts at runtime
  const N = 26;
  const lines = Array.from({ length: N }, (_, i) => {
    const t = i / (N - 1); // 0 = topmost, 1 = bottommost
    return {
      t,
      // Three sine terms per line for organic variation
      terms: [
        { freq: 0.65 + Math.random() * 0.55, phase: Math.random() * Math.PI * 2 },
        { freq: 1.55 + Math.random() * 0.70, phase: Math.random() * Math.PI * 2 },
        { freq: 2.90 + Math.random() * 1.20, phase: Math.random() * Math.PI * 2 },
      ],
      // Drift speed: bottom lines drift faster (more "alive")
      drift: 0.018 + t * 0.055,
    };
  });

  let mouseX = 0, mouseY = 0;
  if (!touch) {
    window.addEventListener('mousemove', e => {
      mouseX = e.clientX / window.innerWidth  - 0.5;
      mouseY = e.clientY / window.innerHeight - 0.5;
    });
  }

  function theme() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return dark
      ? { bg: '#12120F', line: '#5DCAA5', opMin: 0.10, opMax: 0.40 }
      : { bg: '#F1EFE8', line: '#0F6E56', opMin: 0.13, opMax: 0.39 };
  }

  let time = 0, lastTs = 0, rafId = null, paused = false;

  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
    if (!paused && !rafId) rafId = requestAnimationFrame(frame);
  });

  // Expose bottom contour Y for cat.js ride positioning
  window.__topoBottomY = function (screenX) {
    const last = lines[N - 1];
    const sp   = window.scrollY * 0.002 * (0.5 + 1 * 0.5);
    const px   = touch ? 0 : mouseX * 1 * 20;
    const py   = touch ? 0 : mouseY * 1 * 10;
    const amps = [H * (0.022 + 0.042), H * (0.011 + 0.026), H * (0.004 + 0.011)];
    const baseY = H * (0.05 + 0.90);
    const xn = Math.max(0, Math.min(1, (screenX - px) / W));
    let y = baseY + py;
    for (let k = 0; k < 3; k++) {
      y += Math.sin(xn * Math.PI * 2 * last.terms[k].freq + last.terms[k].phase + sp + time * last.drift) * amps[k];
    }
    return y;
  };

  function draw(dt) {
    if (!reduced) time += dt;
    const th = theme();
    const scrollPhase = window.scrollY * 0.002;

    ctx.fillStyle = th.bg;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < N; i++) {
      const { t, terms, drift } = lines[i];

      // Amplitudes scale with H so the terrain feels proportional
      const amps = [
        H * (0.022 + t * 0.042),
        H * (0.011 + t * 0.026),
        H * (0.004 + t * 0.011),
      ];

      // Vertical base position: spread lines across 5%–95% of viewport height
      const baseY = H * (0.05 + t * 0.90);

      // Visual weight increases toward bottom (closer / lower elevation)
      const opacity = th.opMin + (th.opMax - th.opMin) * t;
      const lineW   = 0.5 + t * 1.8;

      // Parallax: bottom lines ("closer") move more than top lines
      const px = touch ? 0 : mouseX * t * 20;
      const py = touch ? 0 : mouseY * t * 10;

      // Scroll-driven phase offset: lower lines shift more as you scroll
      const sp = scrollPhase * (0.5 + t * 0.5);

      ctx.beginPath();
      ctx.strokeStyle = th.line;
      ctx.globalAlpha = opacity;
      ctx.lineWidth   = lineW;
      ctx.lineJoin    = 'round';

      const steps = Math.ceil(W / 3);
      for (let s = 0; s <= steps; s++) {
        const xn = s / steps;
        const x  = xn * W + px;
        let   y  = baseY + py;
        for (let k = 0; k < 3; k++) {
          y += Math.sin(xn * Math.PI * 2 * terms[k].freq + terms[k].phase + sp + time * drift) * amps[k];
        }
        s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  function frame(ts) {
    rafId = null;
    if (paused) return;
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    draw(dt);
    rafId = requestAnimationFrame(frame);
  }

  if (reduced) {
    draw(0);
  } else {
    lastTs = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  // Redraw immediately on theme switch (no animation needed, just correct colours)
  new MutationObserver(() => { if (reduced) draw(0); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
