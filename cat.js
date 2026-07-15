// Cat — canvas paths only, no sprites
// Modes: idle (sleeps in corner, periodic ride) | follow (tracks cursor)
(function () {
  const canvas = document.getElementById('cat-canvas');
  if (!canvas) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch   = window.matchMedia('(hover: none)').matches;

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

  // ── Scale & constants ─────────────────────────────────────
  const S       = 0.55;   // overall scale — cat body ≈ 24px tall
  const ARRIVED = 10;     // follow mode arrival deadzone
  const CORNER_X = 44;    // idle resting x from left edge
  const CORNER_Y_OFFSET = 28; // idle resting y above bottom edge
  const RIDE_INTERVAL = 25;   // seconds between rides

  // ── Follow state (localStorage) ──────────────────────────
  let following = !touch && localStorage.getItem('catFollow') === 'true';

  const btn = document.getElementById('cat-toggle');

  function syncBtn() {
    if (!btn) return;
    btn.textContent = following ? '[ cat ✦ ]' : '[ cat ]';
  }

  // Single entry point for toggling — both the button and the cat-body click
  // call this, never toggling directly, so they can never cancel each other.
  function setFollow(on) {
    following = on;
    localStorage.setItem('catFollow', following);
    syncBtn();
    if (following) {
      cat.state  = 'walk';
      cat.stillFor   = 0;
      cat.sleepClock = 0;
      rideState = 'none';
    }
  }

  if (btn) {
    btn.addEventListener('click', () => setFollow(!following));
    syncBtn();
  }

  // ── Cat object ────────────────────────────────────────────
  const cat = {
    x: CORNER_X,
    y: H - CORNER_Y_OFFSET,
    facing: 1,
    walkPhase:  0,
    tailPhase:  0,
    blinkClock: 0,
    stillFor:   0,
    state: 'sleep',    // walk | sit | sleep
    sleepClock: 3,     // start already asleep
  };

  let mouseX = W / 2, mouseY = H / 2;
  window.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // ── Click on cat body to toggle follow ───────────────────
  // Separate handler from the button — bail out if the click came from the
  // button so both handlers can't fire on the same click and cancel each other.
  if (!touch) {
    canvas.style.pointerEvents = 'none';
    document.addEventListener('click', e => {
      if (btn && (e.target === btn || btn.contains(e.target))) return;
      const dx = e.clientX - cat.x;
      const dy = e.clientY - cat.y;
      if (Math.hypot(dx, dy) < 22) {
        setFollow(!following);
      }
    });
  }

  // ── Ride state ────────────────────────────────────────────
  // 'none' | 'riding' | 'returning'
  let rideState  = 'none';
  let rideClock  = 0;    // time since ride started
  let rideTimer  = RIDE_INTERVAL + Math.random() * 5;
  let rideStartX = 0;
  let rideDir    = 1;    // 1 = left→right, −1 = right→left
  // Y position on the bottom contour line (sampled from topo.js each frame via getBottomLineY)
  let rideTargetX = 0;

  // topo.js exposes the bottom line Y via window.__topoBottomY(x) — we set it up there
  function getLineY(x) {
    return typeof window.__topoBottomY === 'function'
      ? window.__topoBottomY(x)
      : H - 60;
  }

  // ── Colours ───────────────────────────────────────────────
  function colours() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      body:    dark ? '#E4E1D6' : '#33312C',
      eye:     dark ? '#12120F' : '#F1EFE8',
      nose:    dark ? '#C99B9B' : '#B98080',
      innerEar:dark ? '#C99B9B' : '#B98080',
      zzz:     dark ? '#5DCAA5' : '#0F6E56',
      board:   dark ? '#5DCAA5' : '#0F6E56',
    };
  }

  // ── Draw cat ──────────────────────────────────────────────
  // ctx is already translated to (cat.x, cat.y) and scaled(cat.facing, 1)
  function drawCat(c, walkPhase, tailPhase, eyeOpen, sleeping, riding) {
    const s = S;
    const r = 8.5 * s; // head radius (slightly larger for cuter head:body ratio)

    // ── Tail ──────────────────────────────────────────────
    const tailAmp = sleeping
      ? Math.sin(tailPhase * 0.4) * 3 * s
      : riding
        ? -18 * s  // tail up during ride
        : Math.sin(tailPhase * 5.5) * 14 * s;

    ctx.beginPath();
    ctx.moveTo(-12 * s, 1 * s);
    ctx.quadraticCurveTo(-24 * s, tailAmp - 4 * s, -18 * s, tailAmp - 18 * s);
    ctx.strokeStyle = c.body;
    ctx.lineWidth   = 4.5 * s;
    ctx.lineCap     = 'round';
    ctx.stroke();

    // ── Legs ─────────────────────────────────────────────
    const legSwing = (sleeping || riding) ? 0 : Math.sin(walkPhase * Math.PI * 2) * 7 * s;
    [[6 * s, legSwing], [-4 * s, -legSwing]].forEach(([bx, sw]) => {
      ctx.beginPath();
      ctx.moveTo(bx, 5 * s);
      ctx.lineTo(bx + sw * 0.5, 12 * s);
      ctx.strokeStyle = c.body;
      ctx.lineWidth   = 3.5 * s;
      ctx.lineCap     = 'round';
      ctx.stroke();
    });

    // ── Body ─────────────────────────────────────────────
    const bob  = sleeping ? 0 : Math.sin(walkPhase * Math.PI * 2) * 0.8 * s;
    const tilt = (cat.state === 'walk' && !sleeping && !riding) ? 0.08 : 0;

    ctx.save();
    ctx.rotate(tilt);
    ctx.beginPath();
    ctx.ellipse(0, bob, 12 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = c.body;
    ctx.fill();

    // ── Head ─────────────────────────────────────────────
    const hx = 16 * s;
    const hy = -4 * s + bob * 0.4;

    ctx.beginPath();
    ctx.arc(hx, hy, r, 0, Math.PI * 2);
    ctx.fillStyle = c.body;
    ctx.fill();

    // ── Ears — tip points UP and slightly outward ─────────
    // Each ear: two base points on the head circle, one tip above
    // Left ear (from cat's perspective, drawn at negative x side of head)
    // Right ear (positive x side)
    [
      { sign: -1 },  // left ear
      { sign:  1 },  // right ear
    ].forEach(({ sign }) => {
      // Base points on the head circle arc (top portion)
      const b1x = hx + sign * 0.10 * r;
      const b1y = hy - 0.98 * r;
      const b2x = hx + sign * 0.72 * r;
      const b2y = hy - 0.62 * r;
      // Tip: above the base, offset outward
      const tipX = hx + sign * 0.80 * r;
      const tipY = hy - 1.55 * r;

      // Outer ear
      ctx.beginPath();
      ctx.moveTo(b1x, b1y);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(b2x, b2y);
      ctx.closePath();
      ctx.fillStyle = c.body;
      ctx.fill();

      // Inner ear (smaller, same direction)
      const ib1x = hx + sign * 0.12 * r;
      const ib1y = hy - 0.90 * r;
      const ib2x = hx + sign * 0.58 * r;
      const ib2y = hy - 0.58 * r;
      const itipX = hx + sign * 0.68 * r;
      const itipY = hy - 1.28 * r;

      ctx.beginPath();
      ctx.moveTo(ib1x, ib1y);
      ctx.lineTo(itipX, itipY);
      ctx.lineTo(ib2x, ib2y);
      ctx.closePath();
      ctx.fillStyle = c.innerEar;
      ctx.globalAlpha = 0.80;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // ── Eyes ─────────────────────────────────────────────
    const eyeR = 1.6 * s;
    [-2.8 * s, 2.8 * s].forEach(ex => {
      if (eyeOpen < 0.15) {
        ctx.beginPath();
        ctx.moveTo(hx + ex - 2 * s, hy - 0.5 * s);
        ctx.lineTo(hx + ex + 2 * s, hy - 0.5 * s);
        ctx.strokeStyle = c.eye;
        ctx.lineWidth   = 1.0 * s;
        ctx.lineCap     = 'round';
        ctx.stroke();
      } else {
        // Iris
        ctx.beginPath();
        ctx.arc(hx + ex, hy - 0.5 * s, eyeR * eyeOpen, 0, Math.PI * 2);
        ctx.fillStyle = c.eye;
        ctx.fill();
        // Highlight
        ctx.beginPath();
        ctx.arc(hx + ex - 0.6 * s, hy - 0.5 * s - 0.6 * s, eyeR * eyeOpen * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fill();
      }
    });

    // ── Nose (small downward triangle) ───────────────────
    const nx = hx + 7.5 * s;
    const ny = hy + 1.0 * s;
    ctx.beginPath();
    ctx.moveTo(nx - 1.6 * s, ny - 1.2 * s);
    ctx.lineTo(nx + 1.6 * s, ny - 1.2 * s);
    ctx.lineTo(nx,            ny + 1.0 * s);
    ctx.closePath();
    ctx.fillStyle   = c.nose;
    ctx.globalAlpha = 0.90;
    ctx.fill();
    ctx.globalAlpha = 1;

    // ── Mouth (short stem + w-shape) ──────────────────────
    ctx.beginPath();
    ctx.moveTo(nx, ny + 1.0 * s);
    ctx.lineTo(nx, ny + 2.2 * s);
    ctx.strokeStyle = c.nose;
    ctx.lineWidth   = 0.9 * s;
    ctx.lineCap     = 'round';
    ctx.globalAlpha = 0.70;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(nx - 2.5 * s, ny + 2.2 * s);
    ctx.quadraticCurveTo(nx - 1.2 * s, ny + 3.6 * s, nx, ny + 2.6 * s);
    ctx.quadraticCurveTo(nx + 1.2 * s, ny + 3.6 * s, nx + 2.5 * s, ny + 2.2 * s);
    ctx.strokeStyle = c.nose;
    ctx.lineWidth   = 0.9 * s;
    ctx.lineCap     = 'round';
    ctx.stroke();
    ctx.globalAlpha = 1;

    // ── Whiskers ─────────────────────────────────────────
    ctx.globalAlpha = 0.30;
    ctx.strokeStyle = c.body;
    ctx.lineWidth   = 0.6 * s;
    ctx.lineCap     = 'round';
    [[-1, -0.5], [0, 0], [1, 0.5]].forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(nx - 0.5 * s, ny + b * s);
      ctx.lineTo(nx - 0.5 * s + 11 * s, ny + (b + a * 0.5) * s);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    ctx.restore();

    // ── Board (during ride) ───────────────────────────────
    if (riding) {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      ctx.save();
      ctx.strokeStyle = c.board;
      ctx.lineWidth   = 2.5 * s;
      ctx.lineCap     = 'round';
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.moveTo(-14 * s, 13 * s);
      ctx.lineTo( 16 * s, 13 * s);
      ctx.stroke();
      // Board tip curves
      ctx.beginPath();
      ctx.moveTo(16 * s, 13 * s);
      ctx.quadraticCurveTo(20 * s, 13 * s, 21 * s, 9 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-14 * s, 13 * s);
      ctx.quadraticCurveTo(-18 * s, 13 * s, -19 * s, 9 * s);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  // ── Draw ZZZ ──────────────────────────────────────────────
  function drawZZZ(cx, cy, clock, c) {
    ['z', 'z', 'Z'].forEach((ch, i) => {
      const t     = (clock * 0.32 + i * 0.33) % 1;
      const alpha = t < 0.75 ? t / 0.75 : (1 - t) / 0.25;
      if (alpha < 0.03) return;
      const sz  = (6 + i * 2.5 + t * 3) * S;
      const fly = Math.sin(clock * 0.7 + i * 1.2) * 1.5;
      ctx.font        = `bold ${sz}px 'JetBrains Mono', monospace`;
      ctx.fillStyle   = c.zzz;
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillText(ch, cx + i * 8 * S + t * 4, cy - 18 * S - i * 8 * S - t * 6 + fly);
      ctx.globalAlpha = 1;
    });
  }

  // ── Animation loop ────────────────────────────────────────
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

    const c = colours();

    if (reduced) {
      // Reduced motion: static sleeping cat in corner
      ctx.save();
      ctx.translate(CORNER_X, H - CORNER_Y_OFFSET);
      ctx.scale(1, 1);
      drawCat(c, 0, 0, 0, true, false);
      ctx.restore();
      rafId = requestAnimationFrame(frame);
      return;
    }

    if (following) {
      // ── Follow mode ────────────────────────────────────
      const tx = mouseX - cat.facing * 13 * S;
      const ty = mouseY + 5 * S;
      const dx = tx - cat.x;
      const dy = ty - cat.y;
      const dist = Math.hypot(dx, dy);

      if (dist > ARRIVED) {
        const ease = Math.min(0.22, Math.max(0.10, 0.10 + dist / 1100));
        cat.x += dx * ease;
        cat.y += dy * ease;
        cat.state    = 'walk';
        cat.stillFor = 0;
        cat.sleepClock = 0;
        cat.walkPhase  = (cat.walkPhase + dt * 4.5) % 1;
        cat.tailPhase += dt * 5;
      } else {
        cat.stillFor += dt;
        cat.tailPhase += dt * 0.55;
        cat.state = cat.stillFor > 3 ? 'sleep' : 'sit';
        if (cat.state === 'sleep') cat.sleepClock += dt;
        if (cat.state === 'sit')   cat.blinkClock += dt;
      }

      if (Math.abs(dx) > 14) cat.facing = dx > 0 ? 1 : -1;

      cat.x = Math.max(28 * S, Math.min(W - 28 * S, cat.x));
      cat.y = Math.max(28 * S, Math.min(H - 18 * S, cat.y));

    } else {
      // ── Idle mode ──────────────────────────────────────
      rideTimer -= dt;

      if (rideState === 'none') {
        // Sleeping in corner
        cat.state = 'sleep';
        cat.sleepClock += dt;
        cat.tailPhase  += dt * 0.35;
        cat.x = CORNER_X;
        cat.y = H - CORNER_Y_OFFSET;
        cat.facing = 1;

        if (rideTimer <= 0) {
          // Start ride
          rideState  = 'riding';
          rideClock  = 0;
          rideDir    = 1;
          rideStartX = CORNER_X;
          rideTargetX = W + 40;
          cat.facing = 1;
          cat.state  = 'walk';
          cat.sleepClock = 0;
          cat.stillFor   = 0;
        }

      } else if (rideState === 'riding') {
        rideClock += dt;
        const speed = (W + 80) / 8;  // cross viewport in ~8 seconds
        cat.x = rideStartX + rideDir * rideClock * speed;
        cat.y = getLineY(cat.x) - 14 * S;
        cat.facing = rideDir;
        cat.walkPhase  = (cat.walkPhase + dt * 3.5) % 1;
        cat.tailPhase += dt * 4;
        cat.state = 'walk';

        if (cat.x > W + 50 || cat.x < -50) {
          // Ride done, return to corner from opposite side
          rideState  = 'returning';
          rideStartX = cat.x;
          rideClock  = 0;
          cat.facing = -1;
        }

      } else if (rideState === 'returning') {
        rideClock += dt;
        const returnSpeed = (W + 80) / 6;
        cat.x = rideStartX - rideClock * returnSpeed;
        cat.y = H - CORNER_Y_OFFSET;
        cat.facing = -1;
        cat.walkPhase  = (cat.walkPhase + dt * 4) % 1;
        cat.tailPhase += dt * 4;
        cat.state = 'walk';

        if (cat.x <= CORNER_X) {
          cat.x = CORNER_X;
          cat.facing = 1;
          cat.state  = 'sleep';
          cat.sleepClock = 0;
          rideState  = 'none';
          rideTimer  = RIDE_INTERVAL + Math.random() * 5;
        }
      }
    }

    // ── Eye openness ────────────────────────────────────
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

    const riding = rideState === 'riding';

    ctx.save();
    ctx.translate(cat.x, cat.y);
    ctx.scale(cat.facing, 1);
    drawCat(c, cat.walkPhase, cat.tailPhase, eyeOpen, cat.state === 'sleep', riding);
    ctx.restore();

    if (cat.state === 'sleep' && cat.sleepClock > 1.0) {
      drawZZZ(cat.x + cat.facing * 15 * S, cat.y - 4, cat.sleepClock, c);
    }

    rafId = requestAnimationFrame(frame);
  }

  lastTs = performance.now();
  rafId  = requestAnimationFrame(frame);
})();
