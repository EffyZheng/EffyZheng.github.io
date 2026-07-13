// Theme toggle
(function () {
  const btn = document.getElementById('theme-toggle');

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme');
  }

  function syncLabel() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    btn.textContent = '[ ' + next + ' ]';
    btn.setAttribute('aria-label', 'Switch to ' + next + ' mode');
  }

  btn.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    syncLabel();
  });

  syncLabel();
})();

// Typewriter effect for hero tagline
(function () {
  const el = document.getElementById('tagline');
  const full = el.textContent.trim();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced) return;

  el.textContent = '';
  let i = 0;

  function tick() {
    if (i < full.length) {
      el.textContent += full[i++];
      setTimeout(tick, 45);
    }
  }

  setTimeout(tick, 500);
})();

// Email — assembled at runtime so the full address never appears in HTML source
(function () {
  const user = 'effyzhg';
  const host = 'outlook' + '.com';
  const addr = user + '@' + host;
  document.querySelectorAll('[data-email]').forEach(el => {
    el.setAttribute('href', 'mailto:' + addr);
    el.textContent = addr;
  });
})();

// Footer year
document.getElementById('footer-year').textContent = new Date().getFullYear();
