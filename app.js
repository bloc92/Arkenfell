const state = { articles: [], activeId: null };
const THEME_STORAGE_KEY = 'arkenfell-theme';

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

function stripFrontMatter(markdown) {
  if (!markdown.startsWith('---\n')) return markdown;
  const end = markdown.indexOf('\n---\n', 4);
  return end === -1 ? markdown : markdown.slice(end + 5);
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
  const groups = groupByCategory(articles);

  Object.entries(groups).forEach(([category, items]) => {
    const section = document.createElement('section');
    section.className = 'nav-group';

    const heading = document.createElement('h2');
    heading.className = 'nav-group-title';
    heading.textContent = category;
    section.appendChild(heading);

    items.forEach(article => {
      const link = document.createElement('a');
      link.className = 'nav-link';
      link.href = `#${article.id}`;
      link.dataset.articleId = article.id;
      link.textContent = article.title;
      if (article.id === state.activeId) link.classList.add('active');
      section.appendChild(link);
    });

    nav.appendChild(section);
  });
}

function renderMeta(article) {
  const tags = article.tags || [];
  if (!tags.length) return '';
  return `<div class="article-meta">${tags.map(tag => `<span class="meta-chip">${tag}</span>`).join('')}</div>`;
}

async function loadArticle(id) {
  const article = state.articles.find(item => item.id === id) || state.articles[0];
  if (!article) return;

  state.activeId = article.id;
  renderNavigation(filterArticles(document.getElementById('search').value));

  const status = document.getElementById('article-status');
  const content = document.getElementById('article-content');
  status.hidden = false;
  status.textContent = 'Loading article...';
  content.hidden = true;

  try {
    const response = await fetch(article.path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const markdown = stripFrontMatter(await response.text());
    const html = window.marked ? marked.parse(markdown) : `<pre>${markdown}</pre>`;
    content.innerHTML = `${renderMeta(article)}${html}`;
    status.hidden = true;
    content.hidden = false;
    document.title = `${article.title} - Arkenfell Wiki`;
    document.querySelector('.article').focus({ preventScroll: true });
  } catch (error) {
    status.hidden = false;
    status.textContent = 'This article could not be loaded. Please try again or report the broken page.';
    content.hidden = true;
    console.error(error);
  }
}

function filterArticles(query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return state.articles;
  return state.articles.filter(article => {
    const haystack = [article.title, article.category, article.summary, ...(article.tags || [])].join(' ').toLowerCase();
    return haystack.includes(needle);
  });
}

async function init() {
  initTheme();
  const status = document.getElementById('article-status');
  try {
    const response = await fetch('content/index.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.articles = data.articles;

    const search = document.getElementById('search');
    search.addEventListener('input', () => renderNavigation(filterArticles(search.value)));

    window.addEventListener('hashchange', () => loadArticle(location.hash.slice(1)));
    const initialId = location.hash.slice(1) || state.articles[0]?.id;
    renderNavigation(state.articles);
    await loadArticle(initialId);
  } catch (error) {
    status.textContent = 'The wiki index could not be loaded.';
    console.error(error);
  }
}

init();
