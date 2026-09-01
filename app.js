const state = {
  articles: [],
  activeId: null,
  gmMode: false,
  openNavCategories: new Set()
};
const THEME_STORAGE_KEY = 'arkenfell-theme';
const GM_SESSION_KEY = 'arkenfell-gm-access';
const GM_CREDENTIALS = Object.freeze({
  username: 'Ushnark',
  password: 'kerryblue1'
});

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setTheme(theme) {
  const normalized = theme === 'dark' ? 'dark' : 'light';
  if (normalized === 'dark') {
    document.documentElement.dataset.theme = 'dark';
  } else {
    delete document.documentElement.dataset.theme;
  }

  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  const isDark = normalized === 'dark';
  toggle.setAttribute('aria-pressed', String(isDark));
  toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  toggle.querySelector('.theme-toggle-icon').textContent = isDark ? '☀' : '☾';
  toggle.querySelector('.theme-toggle-label').textContent = isDark ? 'Light' : 'Dark';
}

function initTheme() {
  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  } catch (error) {
    console.warn('Theme preference could not be read.', error);
  }

  setTheme(savedTheme === 'dark' ? 'dark' : 'light');

  const toggle = document.getElementById('theme-toggle');
  toggle?.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (error) {
      console.warn('Theme preference could not be saved.', error);
    }
  });
}

function syncGMAccessUI() {
  const accessButton = document.getElementById('gm-access-button');
  const accessLabel = document.getElementById('gm-access-label');
  const banner = document.getElementById('gm-mode-banner');
  const modeTitle = document.getElementById('reference-mode-title');
  const modeText = document.getElementById('reference-mode-text');
  const footerMode = document.getElementById('footer-mode');

  if (state.gmMode) {
    document.documentElement.dataset.access = 'gm';
    accessButton?.setAttribute('aria-pressed', 'true');
    if (accessLabel) accessLabel.textContent = 'Exit GM';
    if (banner) banner.hidden = false;
    if (modeTitle) modeTitle.textContent = 'GM reference';
    if (modeText) modeText.textContent = 'Public canon and GM-only information are both visible.';
    if (footerMode) footerMode.textContent = 'Arkenfell public + GM canon';
  } else {
    delete document.documentElement.dataset.access;
    accessButton?.setAttribute('aria-pressed', 'false');
    if (accessLabel) accessLabel.textContent = 'GM Login';
    if (banner) banner.hidden = true;
    if (modeTitle) modeTitle.textContent = 'Player reference';
    if (modeText) modeText.textContent = 'Only player-safe canon is currently shown.';
    if (footerMode) footerMode.textContent = 'Arkenfell public canon';
  }
}

function setGMMode(enabled, { rerender = true } = {}) {
  state.gmMode = Boolean(enabled);
  try {
    if (state.gmMode) {
      sessionStorage.setItem(GM_SESSION_KEY, 'granted');
    } else {
      sessionStorage.removeItem(GM_SESSION_KEY);
    }
  } catch (error) {
    console.warn('GM access state could not be stored.', error);
  }

  syncGMAccessUI();

  if (!rerender || !state.articles.length) return;
  const search = document.getElementById('search');
  renderNavigation(filterArticles(search?.value || ''));
  loadArticle(state.activeId || location.hash.slice(1));
}

function openGMLogin() {
  const dialog = document.getElementById('gm-login-dialog');
  const username = document.getElementById('gm-username');
  const password = document.getElementById('gm-password');
  const error = document.getElementById('gm-login-error');

  if (!dialog) return;
  if (username) username.value = '';
  if (password) password.value = '';
  if (error) error.hidden = true;

  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
  window.setTimeout(() => username?.focus(), 0);
}

function closeGMLogin() {
  const dialog = document.getElementById('gm-login-dialog');
  const password = document.getElementById('gm-password');
  if (password) password.value = '';
  if (!dialog) return;
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

function initGMAccess() {
  let restored = false;
  try {
    restored = sessionStorage.getItem(GM_SESSION_KEY) === 'granted';
  } catch (error) {
    console.warn('GM access state could not be restored.', error);
  }

  state.gmMode = restored;
  syncGMAccessUI();

  document.getElementById('gm-access-button')?.addEventListener('click', () => {
    if (state.gmMode) {
      setGMMode(false);
    } else {
      openGMLogin();
    }
  });

  document.getElementById('gm-login-close')?.addEventListener('click', closeGMLogin);
  document.getElementById('gm-login-cancel')?.addEventListener('click', closeGMLogin);

  document.getElementById('gm-login-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const username = document.getElementById('gm-username')?.value.trim() || '';
    const password = document.getElementById('gm-password')?.value || '';
    const error = document.getElementById('gm-login-error');

    if (username === GM_CREDENTIALS.username && password === GM_CREDENTIALS.password) {
      if (error) error.hidden = true;
      closeGMLogin();
      setGMMode(true);
      return;
    }

    if (error) error.hidden = false;
    document.getElementById('gm-password')?.select();
  });
}

function stripFrontMatter(markdown) {
  if (!markdown.startsWith('---\n')) return markdown;
  const end = markdown.indexOf('\n---\n', 4);
  return end === -1 ? markdown : markdown.slice(end + 5);
}

function splitGMSections(markdown) {
  const segments = [];
  const lines = markdown.split('\n');
  let gm = false;
  let buffer = [];

  const flush = () => {
    if (!buffer.length) return;
    segments.push({ gm, text: buffer.join('\n') });
    buffer = [];
  };

  for (const line of lines) {
    const marker = line.trim();
    if (!gm && marker === ':::gm') {
      flush();
      gm = true;
      continue;
    }
    if (gm && marker === ':::') {
      flush();
      gm = false;
      continue;
    }
    buffer.push(line);
  }

  flush();
  return segments;
}

function parseMarkdown(markdown) {
  return window.marked ? marked.parse(markdown) : `<pre>${escapeHtml(markdown)}</pre>`;
}

function renderArticleMarkdown(markdown) {
  return splitGMSections(markdown).map(segment => {
    if (segment.gm && !state.gmMode) return '';
    const html = parseMarkdown(segment.text);
    if (!segment.gm) return html;
    return `<section class="gm-only-panel" aria-label="GM-only information"><span class="gm-only-label">GM only</span>${html}</section>`;
  }).join('');
}

function isArticleVisible(article) {
  return state.gmMode || article.visibility !== 'gm';
}

function getVisibleArticles() {
  return state.articles.filter(isArticleVisible);
}

function groupByCategory(articles) {
  return articles.reduce((groups, article) => {
    (groups[article.category] ||= []).push(article);
    return groups;
  }, {});
}

function renderNavigation(articles) {
  const nav = document.getElementById('navigation');
  nav.innerHTML = '';

  if (!articles.length) {
    const empty = document.createElement('p');
    empty.className = 'nav-empty';
    empty.textContent = 'No articles match this search.';
    nav.appendChild(empty);
    return;
  }

  const searchActive = Boolean(document.getElementById('search')?.value.trim());
  const groups = groupByCategory(articles);

  Object.entries(groups).forEach(([category, items]) => {
    const section = document.createElement('details');
    section.className = 'nav-group';
    section.dataset.category = category;

    const containsActiveArticle = items.some(article => article.id === state.activeId);
    section.open = searchActive || containsActiveArticle || state.openNavCategories.has(category);

    const heading = document.createElement('summary');
    heading.className = 'nav-group-title';
    heading.textContent = category;
    heading.style.cursor = 'pointer';
    heading.setAttribute('aria-label', `${category}: expand or collapse section`);
    section.appendChild(heading);

    const links = document.createElement('div');
    links.className = 'nav-group-links';

    items.forEach(article => {
      const link = document.createElement('a');
      link.className = 'nav-link';
      if (article.visibility === 'gm') link.classList.add('gm-only-link');
      link.href = `#${article.id}`;
      link.dataset.articleId = article.id;
      link.textContent = article.title;
      if (article.id === state.activeId) link.classList.add('active');
      links.appendChild(link);
    });

    section.appendChild(links);
    section.addEventListener('toggle', () => {
      if (searchActive) return;
      if (section.open) state.openNavCategories.add(category);
      else state.openNavCategories.delete(category);
    });

    nav.appendChild(section);
  });
}

function renderMeta(article) {
  const tags = article.tags || [];
  const chips = tags.map(tag => `<span class="meta-chip">${escapeHtml(tag)}</span>`);
  if (state.gmMode && article.visibility === 'gm') {
    chips.unshift('<span class="meta-chip gm-chip">GM only</span>');
  }
  return chips.length ? `<div class="article-meta">${chips.join('')}</div>` : '';
}

async function loadArticle(id) {
  const requested = state.articles.find(item => item.id === id);
  const visibleArticles = getVisibleArticles();
  const article = requested && isArticleVisible(requested) ? requested : visibleArticles[0];
  if (!article) return;

  if (requested && !isArticleVisible(requested)) {
    history.replaceState(null, '', `#${article.id}`);
  }

  state.activeId = article.id;
  renderNavigation(filterArticles(document.getElementById('search')?.value || ''));

  const status = document.getElementById('article-status');
  const content = document.getElementById('article-content');
  status.hidden = false;
  status.textContent = 'Loading article...';
  content.hidden = true;

  try {
    const response = await fetch(article.path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const markdown = stripFrontMatter(await response.text());
    content.innerHTML = `${renderMeta(article)}${renderArticleMarkdown(markdown)}`;
    status.hidden = true;
    content.hidden = false;
    document.title = `${article.title}${state.gmMode ? ' — GM Mode' : ''} - Arkenfell Wiki`;
    document.querySelector('.article').focus({ preventScroll: true });
  } catch (error) {
    status.hidden = false;
    status.textContent = 'This article could not be loaded. Please try again or report the broken page.';
    content.hidden = true;
    console.error(error);
  }
}

function filterArticles(query) {
  const articles = getVisibleArticles();
  const needle = query.trim().toLowerCase();
  if (!needle) return articles;
  return articles.filter(article => {
    const gmTags = state.gmMode ? (article.gmTags || []) : [];
    const haystack = [article.title, article.category, article.summary, ...(article.tags || []), ...gmTags].join(' ').toLowerCase();
    return haystack.includes(needle);
  });
}

async function init() {
  initTheme();
  initGMAccess();
  const status = document.getElementById('article-status');

  try {
    const response = await fetch('content/index.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.articles = data.articles;

    const search = document.getElementById('search');
    search.addEventListener('input', () => renderNavigation(filterArticles(search.value)));

    window.addEventListener('hashchange', () => loadArticle(location.hash.slice(1)));
    const initialId = location.hash.slice(1) || getVisibleArticles()[0]?.id;
    renderNavigation(filterArticles(search.value));
    await loadArticle(initialId);
  } catch (error) {
    status.textContent = 'The wiki index could not be loaded.';
    console.error(error);
  }
}

init();
