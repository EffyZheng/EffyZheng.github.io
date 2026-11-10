// Theme toggle
(function () {
  const btn = document.getElementById('theme-toggle');

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme');
  }

  function syncLabel() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    btn.textContent = '[ ' + next + ' ]';
    btn.setAttribute('aria-label', document.documentElement.lang === 'zh-CN'
      ? `切换到${next === 'dark' ? '深色' : '浅色'}模式`
      : 'Switch to ' + next + ' mode');
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

// Language switch
(function () {
  const btn = document.getElementById('language-toggle');
  const saved = localStorage.getItem('site-language');

  function setLanguage(language) {
    const lang = language === 'zh' ? 'zh' : 'en';
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.body.classList.toggle('language-zh', lang === 'zh');
    document.querySelectorAll('[data-en][data-zh]').forEach((el) => {
      el.textContent = el.dataset[lang];
    });
    btn.textContent = lang === 'zh' ? 'English' : '中文';
    btn.setAttribute('aria-label', lang === 'zh' ? 'Switch to English' : '切换到中文');
    document.title = lang === 'zh' ? '郑婉妍 | 计算机科学' : 'Effy Zheng';
    const socialTitle = document.querySelector('meta[property="og:title"]');
    if (socialTitle) socialTitle.content = document.title;
    const description = document.querySelector('meta[name="description"]');
    const socialDescription = document.querySelector('meta[property="og:description"]');
    const descriptionText = lang === 'zh'
      ? '郑婉妍，莫纳什大学马来西亚校区计算机科学本科生。可从 2026 年 11 月 26 日起实习至少三个月。'
      : 'Effy Zheng — Computer Science student building and testing AI-enabled software. Available from 26 November 2026 for at least three months.';
    const socialText = lang === 'zh'
      ? '莫纳什大学马来西亚校区计算机科学本科生，关注 AI 应用与软件开发。可从 2026 年 11 月 26 日起实习至少三个月。'
      : 'Computer Science student building and testing AI-enabled software. Available from 26 November 2026 for at least three months.';
    if (description) description.content = descriptionText;
    if (socialDescription) socialDescription.content = socialText;
    const socialLinks = document.querySelector('.social-links');
    if (socialLinks) socialLinks.setAttribute('aria-label', lang === 'zh' ? '联系方式与社交链接' : 'Contact and social links');
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      themeToggle.setAttribute('aria-label', lang === 'zh' ? `切换到${next === 'dark' ? '深色' : '浅色'}模式` : `Switch to ${next} mode`);
    }
    const catToggle = document.getElementById('cat-toggle');
    if (catToggle) catToggle.setAttribute('aria-label', lang === 'zh' ? '切换猫咪跟随模式' : 'Toggle cat follow mode');
    localStorage.setItem('site-language', lang);
  }

  btn.addEventListener('click', () => {
    setLanguage(document.documentElement.lang === 'zh-CN' ? 'en' : 'zh');
  });
  setLanguage(saved || 'en');
})();
