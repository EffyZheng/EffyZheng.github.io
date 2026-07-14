// Mouse-following cat — canvas paths only, no sprites
(function () {
  const canvas = document.getElementById('cat-canvas');
  if (!canvas) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch   = window.matchMedia('(hover: none)').matches;

  // No cursor on touch → hide cat entirely
  if (touch) { canvas.style.display = 'none'; return; }

  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999';

  const ctx = canvas.getContext('2d');
  let W, H;
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Overall scale: total cat height ≈ 22px
  const S = 0.50;
  // Easing and arrival threshold
  const EASE    = 0.07;
  const ARRIVED = 22;

  const cat = {
    x: -80, y: -80,   // current position (centre of body)
    facing: 1,         // 1 = right, −1 = left
    walkPhase:  0,
    tailPhase:  0,
    blinkClock: 0,
    stillFor:   0,
    state: 'walk',     // walk | sit | sleep
    sleepClock: 0,
  };

  let mouseX = 200, mouseY = 200;
  window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

  function colours() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      body: dark ? '#E4E1D6' : '#33312C',
      eye:  dark ? '#12120F' : '#F1EFE8',
      nose: dark ? '#5DCAA5' : '#0F6E56',
    };
  }

  function drawCat(c, walkPhase, tailPhase, eyeOpen, sleeping) {
    const s = S;

    // ── Tail ──────────────────────────────────────────────
    const tailAmp = sleeping
      ? Math.sin(tailPhase * 0.7) * 5 * s
      : Math.sin(tailPhase * 5.5) * 15 * s;

    ctx.beginPath();
    ctx.moveTo(-13 * s, 2 * s);
    ctx.quadraticCurveTo(-26 * s, tailAmp - 5 * s, -20 * s, tailAmp - 19 * s);
    ctx.strokeStyle = c.body;
    ctx.lineWidth   = 5 * s;
    ctx.lineCap     = 'round';
    ctx.stroke();

    // ── Legs (two, alternating) ───────────────────────────
    const legSwing = sleeping ? 0 : Math.sin(walkPhase * Math.PI * 2) * 7 * s;
    [[7 * s, legSwing], [-5 * s, -legSwing]].forEach(([bx, sw]) => {
      ctx.beginPath();
      ctx.moveTo(bx, 5 * s);
      ctx.lineTo(bx + sw * 0.5, 12 * s);
      ctx.strokeStyle = c.body;
      ctx.lineWidth   = 4 * s;
      ctx.lineCap     = 'round';
      ctx.stroke();
    });

    // ── Body (ellipse, slight tilt when walking) ──────────
    const bob  = sleeping ? 0 : Math.sin(walkPhase * Math.PI * 2) * 1.0 * s;
    const tilt = (cat.state === 'walk' && !sleeping) ? 0.10 : 0;

    ctx.save();
    ctx.rotate(tilt);

    ctx.beginPath();
    ctx.ellipse(0, bob, 13 * s, 7.5 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = c.body;
    ctx.fill();

    // ── Head ─────────────────────────────────────────────
    const hx = 17 * s;
    const hy = -4.5 * s + bob * 0.4;

    ctx.beginPath();
    ctx.arc(hx, hy, 7.5 * s, 0, Math.PI * 2);
    ctx.fillStyle = c.body;
    ctx.fill();

    // ── Ears ─────────────────────────────────────────────
    [[-4.5 * s, -1], [4.5 * s, 1]].forEach(([ex, sign]) => {
      ctx.beginPath();
      ctx.moveTo(hx + ex,                  hy - 5.5 * s);
      ctx.lineTo(hx + ex - sign * 3.5 * s, hy - 13.5 * s);
      ctx.lineTo(hx + ex + sign * 3.5 * s, hy - 11.5 * s);
      ctx.closePath();
      ctx.fillStyle = c.body;
      ctx.fill();
    });

    // ── Eyes ─────────────────────────────────────────────
    [-3 * s, 3 * s].forEach(ex => {
      if (eyeOpen < 0.15) {
        // Closed → horizontal line
        ctx.beginPath();
        ctx.moveTo(hx + ex - 2.2 * s, hy - 0.8 * s);
        ctx.lineTo(hx + ex + 2.2 * s, hy - 0.8 * s);
        ctx.strokeStyle = c.eye;
        ctx.lineWidth   = 1.0 * s;
        ctx.lineCap     = 'round';
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(hx + ex, hy - 0.8 * s, 2.3 * s * eyeOpen, 0, Math.PI * 2);
        ctx.fillStyle = c.eye;
        ctx.fill();
      }
    });

    // ── Nose ─────────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(hx + 7 * s, hy, 1.8 * s, 0, Math.PI * 2);
    ctx.fillStyle = c.nose;
    ctx.fill();

    // ── Whiskers ─────────────────────────────────────────
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = c.body;
    ctx.lineWidth   = 0.7 * s;
    ctx.lineCap     = 'round';
    [[-1, -1], [0, 0], [1, 1]].forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(hx + 5.5 * s, hy + b * s);
      ctx.lineTo(hx + 5.5 * s + 11 * s, hy + (b + a) * s);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  function drawZZZ(cx, cy, clock) {
    const c = colours();
    ['z', 'z', 'Z'].forEach((ch, i) => {
      const t = (clock * 0.32 + i * 0.33) % 1;
      const alpha = t < 0.75 ? t / 0.75 : (1 - t) / 0.25;
      if (alpha < 0.03) return;
      const sz  = (7 + i * 2.5 + t * 3.5) * S;
      const fly = Math.sin(clock * 0.7 + i * 1.2) * 1.5;
      ctx.font        = `bold ${sz}px 'JetBrains Mono', monospace`;
      ctx.fillStyle   = c.nose;
      ctx.globalAlpha = alpha * 0.88;
      ctx.fillText(ch, cx + i * 9 * S + t * 5, cy - 20 * S - i * 9 * S - t * 7 + fly);
      ctx.globalAlpha = 1;
    });
  }

  let lastTs = 0, rafId = null, paused = false;

  document.addEventListener('visibilitychange', () => {
    paused = document.hidden;
    if (!paused && !rafId) rafId = requestAnimationFrame(frame);
  });

  function frame(ts) {
    rafId = null;
    if (paused) return;
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    ctx.clearRect(0, 0, W, H);

    // Target position: slightly behind cursor in facing direction
    const tx = mouseX - cat.facing * 14 * S;
    const ty = mouseY + 6 * S;
    const dx = tx - cat.x;
    const dy = ty - cat.y;
    const dist = Math.hypot(dx, dy);

    if (!reduced) {
      if (dist > ARRIVED) {
        cat.x += dx * EASE;
        cat.y += dy * EASE;
        cat.state     = 'walk';
        cat.stillFor  = 0;
        cat.sleepClock = 0;
        cat.walkPhase = (cat.walkPhase + dt * 4.8) % 1;
        cat.tailPhase += dt * 5.5;
      } else {
        cat.stillFor  += dt;
        cat.tailPhase += dt * 0.55;
        cat.state = cat.stillFor > 3 ? 'sleep' : 'sit';
        if (cat.state === 'sleep') cat.sleepClock += dt;
        if (cat.state === 'sit')   cat.blinkClock += dt;
      }
    } else {
      // Reduced motion: instant snap
      cat.x = tx;
      cat.y = ty;
    }

    // ── Facing direction — deadzone fix ───────────────────
    // Only flip if horizontal distance is large enough, preventing jitter
    if (Math.abs(dx) > 14) {
      cat.facing = dx > 0 ? 1 : -1;
    }

    // Clamp to viewport edges
    cat.x = Math.max(30 * S, Math.min(W - 30 * S, cat.x));
    cat.y = Math.max(30 * S, Math.min(H - 20 * S, cat.y));

    // ── Eye openness ──────────────────────────────────────
    let eyeOpen = 1;
    if (cat.state === 'sleep') {
      eyeOpen = 0;
    } else if (cat.state === 'sit' && cat.blinkClock > 0) {
      const cycle = cat.blinkClock % 4.0;
      if (cycle > 3.7) {
        const p = (cycle - 3.7) / 0.15;
        eyeOpen = p < 0.5 ? Math.max(0, 1 - p / 0.5) : Math.min(1, (p - 0.5) / 0.5);
      }
    }

    ctx.save();
    ctx.translate(cat.x, cat.y);
    ctx.scale(cat.facing, 1);
    drawCat(colours(), cat.walkPhase, cat.tailPhase, eyeOpen, cat.state === 'sleep');
    ctx.restore();

    if (cat.state === 'sleep' && cat.sleepClock > 1.2) {
      drawZZZ(cat.x + cat.facing * 16 * S, cat.y - 4, cat.sleepClock);
    }

    rafId = requestAnimationFrame(frame);
  }

  lastTs = performance.now();
  rafId = requestAnimationFrame(frame);
})();
