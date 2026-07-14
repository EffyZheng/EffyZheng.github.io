// Following-mouse cat — pure canvas paths, no sprites
(function () {
  const canvas = document.getElementById('cat-canvas');
  if (!canvas) return;
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  canvas.setAttribute('aria-hidden', 'true');

  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = window.matchMedia('(hover: none)').matches;

  let W, H;
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Cat state
  const cat = {
    x: -120, y: -120,   // current position (centre of body)
    tx: 200, ty: 200,   // target (mouse)
    vx: 0, vy: 0,
    facing: 1,           // 1 = right, -1 = left
    phase: 0,            // walk cycle
    tailPhase: 0,
    blinkT: 0,
    sleepT: 0,
    state: 'walk',       // walk | sit | blink | sleep
    stillFor: 0,
    zzz: 0,
    speed: 0,
  };

  let mouseX = 200, mouseY = 200;
  let mouseStill = 0;
  let lastMX = 200, lastMY = 200;

  if (!touch) {
    window.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
  }

  // Touch: cat wanders on its own
  let wanderAngle = 0;
  function wander(dt) {
    wanderAngle += (Math.random() - 0.5) * 1.2 * dt;
    const speed = 45;
    mouseX = Math.max(60, Math.min(W - 60, mouseX + Math.cos(wanderAngle) * speed * dt));
    mouseY = Math.max(H * 0.75, Math.min(H - 60, mouseY + Math.sin(wanderAngle) * speed * dt * 0.3));
  }

  // Theme colours
  function colours() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return dark
      ? { body: '#D3D1C7', ear: '#B8B5AA', belly: '#E8E6DE', nose: '#5DCAA5', eye: '#2C2C2A', pupil: '#12120F', outline: '#888780' }
      : { body: '#3A3835', ear: '#2C2A28', belly: '#5F5E5A', nose: '#0F6E56', eye: '#F1EFE8', pupil: '#E8E6DE', outline: '#2C2C2A' };
  }

  // Draw cat at (0,0), facing right, scale ~1
  function drawCat(c, phase, tailP, blinkFrac, sleeping) {
    const s = 1;

    // Tail
    const tailSwing = sleeping ? Math.sin(tailP * 0.3) * 4 : Math.sin(tailP * 6) * 18;
    ctx.beginPath();
    ctx.moveTo(s * -18, s * -4);
    ctx.quadraticCurveTo(s * -36, s * (tailSwing - 10), s * -28, s * (tailSwing - 28));
    ctx.strokeStyle = c.body;
    ctx.lineWidth = s * 7;
    ctx.lineCap = 'round';
    ctx.stroke();
    // Tail tip
    ctx.beginPath();
    ctx.arc(s * -28, s * (tailSwing - 28), s * 5, 0, Math.PI * 2);
    ctx.fillStyle = c.body;
    ctx.fill();

    // Legs (4 legs, alternating walk)
    const legSwing = sleeping ? 0 : Math.sin(phase * Math.PI * 2) * 10;
    const legPairs = [
      { bx: 10, front: true },
      { bx: -10, front: false }
    ];
    legPairs.forEach(({ bx, front }) => {
      const swing = front ? legSwing : -legSwing;
      // Back leg
      ctx.beginPath();
      ctx.moveTo(s * bx, s * 8);
      ctx.lineTo(s * (bx + swing * 0.6), s * 22);
      ctx.strokeStyle = c.body;
      ctx.lineWidth = s * 6;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * (bx + swing * 0.6), s * 22, s * 4, 0, Math.PI * 2);
      ctx.fillStyle = c.body;
      ctx.fill();
    });

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 22, s * 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = c.body;
    ctx.fill();
    // Belly highlight
    ctx.beginPath();
    ctx.ellipse(s * 2, s * 3, s * 12, s * 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = c.belly;
    ctx.globalAlpha = 0.35;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Head
    const headBob = sleeping ? 4 : Math.sin(phase * Math.PI * 2) * 1.5;
    const hx = s * 24, hy = s * (-8 + headBob);
    ctx.beginPath();
    ctx.arc(hx, hy, s * 14, 0, Math.PI * 2);
    ctx.fillStyle = c.body;
    ctx.fill();

    // Ears
    [[-8, -1], [8, 1]].forEach(([ex, sign]) => {
      ctx.beginPath();
      ctx.moveTo(hx + s * ex, hy - s * 10);
      ctx.lineTo(hx + s * (ex - sign * 5), hy - s * 22);
      ctx.lineTo(hx + s * (ex + sign * 5), hy - s * 19);
      ctx.closePath();
      ctx.fillStyle = c.ear;
      ctx.fill();
      // Inner ear
      ctx.beginPath();
      ctx.moveTo(hx + s * ex, hy - s * 12);
      ctx.lineTo(hx + s * (ex - sign * 3), hy - s * 20);
      ctx.lineTo(hx + s * (ex + sign * 3), hy - s * 17);
      ctx.closePath();
      ctx.fillStyle = c.nose;
      ctx.globalAlpha = 0.4;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Eyes
    const eyeOpenFrac = sleeping ? 0 : Math.max(0, 1 - blinkFrac * 2.5);
    [-5, 5].forEach(ex => {
      ctx.beginPath();
      ctx.ellipse(hx + s * ex, hy - s * 2, s * 3.5, s * 3.5 * eyeOpenFrac, 0, 0, Math.PI * 2);
      ctx.fillStyle = c.eye;
      ctx.fill();
      if (eyeOpenFrac > 0.1) {
        ctx.beginPath();
        ctx.ellipse(hx + s * ex, hy - s * 2, s * 1.8, s * 1.8 * eyeOpenFrac, 0, 0, Math.PI * 2);
        ctx.fillStyle = c.pupil;
        ctx.fill();
      }
      // Closed eye line
      if (eyeOpenFrac < 0.2) {
        ctx.beginPath();
        ctx.arc(hx + s * ex, hy - s * 2, s * 3.5, 0, Math.PI);
        ctx.strokeStyle = c.outline;
        ctx.lineWidth = s * 1.5;
        ctx.stroke();
      }
    });

    // Nose
    ctx.beginPath();
    ctx.arc(hx + s * 12, hy + s * 1, s * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = c.nose;
    ctx.fill();

    // Whiskers
    [[-1, 0], [0, 0], [1, 1]].forEach(([i, yoff]) => {
      const wy = hy + s * (1 + yoff);
      ctx.beginPath();
      ctx.moveTo(hx + s * 10, wy);
      ctx.lineTo(hx + s * 10 + s * (18 + i * 2), wy + s * i * 2);
      ctx.strokeStyle = c.outline;
      ctx.lineWidth = s * 0.8;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
  }

  // ZZZ bubbles
  function drawZZZ(x, y, zzz) {
    const c = colours();
    ['z', 'z', 'Z'].forEach((ch, i) => {
      const t = (zzz * 0.4 + i * 0.33) % 1;
      const alpha = t < 0.8 ? t / 0.8 : (1 - t) / 0.2;
      if (alpha <= 0) return;
      const sz = 10 + i * 4 + t * 6;
      ctx.font = `bold ${sz}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = c.nose;
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillText(ch, x + i * 14 + t * 8, y - 30 - i * 16 - t * 12);
      ctx.globalAlpha = 1;
    });
  }

  let lastTs = 0;
  let rafId = null;
  let paused = false;

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

    if (touch) wander(dt);

    // Check if mouse is still
    const mouseMoved = Math.hypot(mouseX - lastMX, mouseY - lastMY) > 2;
    if (mouseMoved) { mouseStill = 0; lastMX = mouseX; lastMY = mouseY; }
    else mouseStill += dt;

    // Target: hover a little behind the cursor
    cat.tx = mouseX - cat.facing * 20;
    cat.ty = mouseY + 10;

    const dx = cat.tx - cat.x;
    const dy = cat.ty - cat.y;
    const dist = Math.hypot(dx, dy);

    if (!reduced) {
      // Easing — cat lags behind
      const ease = Math.min(1, dt * (dist > 80 ? 5 : 3));
      cat.vx = dx * ease;
      cat.vy = dy * ease;
      cat.x += cat.vx;
      cat.y += cat.vy;
      cat.speed = Math.hypot(cat.vx, cat.vy) / dt;
    } else {
      cat.x = cat.tx;
      cat.y = cat.ty;
      cat.speed = 0;
    }

    // Facing direction
    if (Math.abs(cat.vx) > 0.5) cat.facing = cat.vx > 0 ? 1 : -1;

    // Walk phase
    if (!reduced && cat.speed > 8) {
      cat.phase = (cat.phase + dt * (cat.speed / 40)) % 1;
      cat.tailPhase += dt * 4;
      cat.state = 'walk';
      cat.stillFor = 0;
      cat.sleepT = 0;
      cat.zzz = 0;
    } else {
      cat.stillFor += dt;
      cat.tailPhase += dt * 0.5;
      if (cat.stillFor > 6) {
        cat.state = 'sleep';
        cat.sleepT += dt;
        cat.zzz += dt;
      } else if (cat.stillFor > 1.5) {
        cat.state = 'sit';
        // Blink every 3-5s
        cat.blinkT += dt;
        if (cat.blinkT > 3.5) {
          if (cat.blinkT > 4.0) cat.blinkT = 0;
        }
      }
    }

    const blinkFrac = cat.state === 'sit' && cat.blinkT > 3.5
      ? Math.min(1, (cat.blinkT - 3.5) / 0.25)
      : 0;

    // Clamp to viewport
    cat.x = Math.max(50, Math.min(W - 50, cat.x));
    cat.y = Math.max(50, Math.min(H - 30, cat.y));

    // Body bob
    const bob = cat.state === 'walk' ? Math.sin(cat.phase * Math.PI * 2) * 2 : 0;

    ctx.save();
    ctx.translate(cat.x, cat.y + bob);
    ctx.scale(cat.facing, 1);
    drawCat(colours(), cat.phase, cat.tailPhase, blinkFrac, cat.state === 'sleep');
    ctx.restore();

    if (cat.state === 'sleep' && cat.sleepT > 1.5) {
      drawZZZ(cat.x + cat.facing * 30, cat.y - 20, cat.zzz);
    }

    rafId = requestAnimationFrame(frame);
  }

  lastTs = performance.now();
  rafId = requestAnimationFrame(frame);
})();
