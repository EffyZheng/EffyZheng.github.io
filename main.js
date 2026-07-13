// Theme toggle
(function () {
  const btn = document.getElementById('theme-toggle');

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme');
  }

  function syncLabel() {
    btn.textContent = currentTheme() === 'dark' ? '☀' : '☾';
  }

  btn.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    syncLabel();
  });

  syncLabel();
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
