// Hero 3D terrain — hand-written perspective projection, no libraries
(function () {
  const canvas = document.getElementById('terrain-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const COLS = 44;
  const ROWS = 34;
  const FOCAL = 420;
  const CELL = 1.0;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = window.matchMedia('(hover: none)').matches;

  // Camera
  const cam = { x: 0, y: 8, z: 0, tx: 0, ty: 0 };
  let camOffX = 0, camOffY = 0;
  let targetOffX = 0, targetOffY = 0;

  // Mouse parallax (desktop only)
  if (!touch) {
    document.addEventListener('mousemove', e => {
      const hero = document.getElementById('hero');
      const rect = hero.getBoundingClientRect();
      if (e.clientY > rect.bottom + 60) return;
      targetOffX = ((e.clientX / window.innerWidth) - 0.5) * 1.6;
      targetOffY = ((e.clientY / window.innerHeight) - 0.5) * 0.8;
    });
  }

  // Height field
  function height(cx, cz) {
    const x = cx * 0.28, z = cz * 0.22;
    return (
      Math.sin(x * 1.1 + 0.3) * Math.cos(z * 0.9 + 0.1) * 2.4 +
      Math.sin(x * 2.3 - 0.7) * Math.cos(z * 1.7 + 0.5) * 1.1 +
      Math.sin(x * 0.5 + z * 0.6 + 1.2) * 0.9 +
      Math.cos(x * 3.1 - z * 2.2 + 0.8) * 0.35 +
      Math.sin(x * 4.5 + z * 3.8 - 1.1) * 0.15
    );
  }

  // Theme colours
  function theme() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (dark) return {
      skyTop: '#0B0B18', skyBot: '#1A1535',
      fogCol: '#1A1535',
      rockLow: [38, 34, 52], rockHigh: [210, 210, 230],
      sunCol: null,
      stars: true,
      accent: '#5DCAA5'
    };
    return {
      skyTop: '#C8DCF0', skyBot: '#E8F0F8',
      fogCol: '#E8F0F8',
      rockLow: [110, 100, 90], rockHigh: [245, 245, 250],
      sunCol: '#FFF0C0',
      stars: false,
      accent: '#0F6E56'
    };
  }

  // Stars (dark mode)
  const stars = Array.from({ length: 120 }, () => ({
    x: Math.random(), y: Math.random() * 0.65,
    r: Math.random() * 1.1 + 0.3,
    phase: Math.random() * Math.PI * 2,
    speed: Math.random() * 0.8 + 0.4
  }));

  let W, H;
  function resize() {
    const hero = document.getElementById('hero');
    W = canvas.width = hero.offsetWidth;
    H = canvas.height = hero.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Perspective project world→screen
  function project(wx, wy, wz) {
    const dx = wx - cam.x - camOffX;
    const dy = wy - cam.y - camOffY;
    const dz = wz - cam.z;
    if (dz <= 0.01) return null;
    return {
      sx: W / 2 + (dx / dz) * FOCAL,
      sy: H * 0.55 - (dy / dz) * FOCAL,
      d: dz
    };
  }

  // Lerp colour between two RGB triples by t ∈ [0,1]
  function lerpRGB(a, b, t) {
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t
    ];
  }

  function fogLerpRGB(c, fogHex, t) {
    const fr = parseInt(fogHex.slice(1, 3), 16);
    const fg = parseInt(fogHex.slice(3, 5), 16);
    const fb = parseInt(fogHex.slice(5, 7), 16);
    return [
      c[0] + (fr - c[0]) * t,
      c[1] + (fg - c[1]) * t,
      c[2] + (fb - c[2]) * t
    ];
  }

  function rgb(c) {
    return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
  }

  let scroll = 0;
  let lastTime = 0;
  let rafId = null;
  let paused = false;

  // Pause when tab hidden
  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
    if (!paused && !rafId) rafId = requestAnimationFrame(frame);
  });

  // Pause when hero scrolled out of view
  const hero = document.getElementById('hero');
  const observer = new IntersectionObserver(entries => {
    paused = !entries[0].isIntersecting;
    if (!paused && !rafId) rafId = requestAnimationFrame(frame);
  }, { threshold: 0 });
  observer.observe(hero);

  function frame(ts) {
    rafId = null;
    if (paused) return;

    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;

    if (!reduced) {
      scroll += dt * 1.8;
      camOffX += (targetOffX - camOffX) * 0.04;
      camOffY += (targetOffY - camOffY) * 0.04;
    }

    draw();
    rafId = requestAnimationFrame(frame);
  }

  function draw() {
    const th = theme();
    ctx.clearRect(0, 0, W, H);

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.65);
    sky.addColorStop(0, th.skyTop);
    sky.addColorStop(1, th.skyBot);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Sun (light mode)
    if (th.sunCol) {
      const sx = W * 0.72, sy = H * 0.18;
      const sg = ctx.createRadialGradient(sx, sy, 2, sx, sy, 55);
      sg.addColorStop(0, th.sunCol);
      sg.addColorStop(0.4, th.sunCol + 'CC');
      sg.addColorStop(1, th.sunCol + '00');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(sx, sy, 55, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stars (dark mode)
    if (th.stars) {
      const t = lastTime / 1000;
      stars.forEach(s => {
        const alpha = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
        ctx.fillStyle = `rgba(220,225,255,${alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Build heightfield quads
    const quads = [];
    const BASE_Z = 2.5;
    const DEPTH = ROWS * CELL;

    for (let r = 0; r < ROWS - 1; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        // World positions of the four corners
        const wz0 = BASE_Z + r * CELL + (scroll % CELL) + (scroll | 0) % ROWS * CELL;
        // Wrap so terrain loops
        const rr = r, cc = c;
        const sz = scroll;

        function getWY(row, col) {
          const wz = BASE_Z + row * CELL + sz;
          const looped_row = ((row + (sz | 0)) % (ROWS + 4) + ROWS + 4) % (ROWS + 4);
          return height(col - COLS / 2, looped_row) * 2.2;
        }

        const wx0 = (cc - COLS / 2) * CELL;
        const wx1 = (cc + 1 - COLS / 2) * CELL;
        const wy00 = getWY(rr,   cc);
        const wy10 = getWY(rr,   cc + 1);
        const wy01 = getWY(rr+1, cc);
        const wy11 = getWY(rr+1, cc + 1);

        const wz_near = BASE_Z + rr * CELL + (sz % (ROWS * CELL));
        const wz_far  = wz_near + CELL;
        const wz_mid  = (wz_near + wz_far) / 2;
        const wy_mid  = (wy00 + wy10 + wy01 + wy11) / 4;

        const p00 = project(wx0, wy00, wz_near);
        const p10 = project(wx1, wy10, wz_near);
        const p01 = project(wx0, wy01, wz_far);
        const p11 = project(wx1, wy11, wz_far);
        if (!p00 || !p10 || !p01 || !p11) continue;

        // Normal (for lighting) — two edge vectors of the quad
        const ex = wx1 - wx0, ey = wy10 - wy00, ez = 0;
        const fx = 0, fy = wy01 - wy00, fz = wz_far - wz_near;
        const nx = ey * fz - ez * fy;
        const ny = ez * fx - ex * fz;
        const nz = ex * fy - ey * fx;
        const nl = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
        // Light direction (from upper-right)
        const lx = 0.4, ly = 0.8, lz = -0.45;
        const diff = Math.max(0, (nx/nl)*lx + (ny/nl)*ly + (nz/nl)*lz);
        const light = 0.35 + diff * 0.65;

        // Elevation colour
        const t = Math.max(0, Math.min(1, (wy_mid + 1.5) / 5.5));
        let col = lerpRGB(th.rockLow, th.rockHigh, t);
        col = col.map(v => v * light);

        // Fog by depth
        const fogT = Math.min(1, (wz_mid - BASE_Z) / (DEPTH * 0.85));
        col = fogLerpRGB(col, th.fogCol, fogT * fogT);

        quads.push({ p00, p10, p01, p11, col, depth: wz_mid });
      }
    }

    // Painter's algorithm: far → near
    quads.sort((a, b) => b.depth - a.depth);

    quads.forEach(({ p00, p10, p01, p11, col }) => {
      ctx.beginPath();
      ctx.moveTo(p00.sx, p00.sy);
      ctx.lineTo(p10.sx, p10.sy);
      ctx.lineTo(p11.sx, p11.sy);
      ctx.lineTo(p01.sx, p01.sy);
      ctx.closePath();
      ctx.fillStyle = rgb(col);
      ctx.fill();
      // Subtle edge lines to show grid
      ctx.strokeStyle = rgb(col.map(v => v * 0.7));
      ctx.lineWidth = 0.4;
      ctx.stroke();
    });

    // Overlay gradient: bottom of hero fades to --bg
    const fade = ctx.createLinearGradient(0, H * 0.7, 0, H);
    const bgCol = getComputedStyle(document.documentElement)
      .getPropertyValue('--bg').trim();
    fade.addColorStop(0, bgCol + '00');
    fade.addColorStop(1, bgCol);
    ctx.fillStyle = fade;
    ctx.fillRect(0, H * 0.7, W, H * 0.3);

    // Left-to-right readability mask
    const mask = ctx.createLinearGradient(0, 0, W, 0);
    mask.addColorStop(0,   'rgba(0,0,0,0.45)');
    mask.addColorStop(0.5, 'rgba(0,0,0,0.15)');
    mask.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = mask;
    ctx.fillRect(0, 0, W, H);
  }

  // Init
  if (reduced) {
    draw();
  } else {
    lastTime = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  // Re-draw on theme change
  const themeObserver = new MutationObserver(() => {
    if (reduced) draw();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
