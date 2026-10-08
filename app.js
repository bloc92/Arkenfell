const state = {
  articles: [],
  activeId: null,
  gmMode: false,
  openNavCategories: new Set()
};
const THEME_STORAGE_KEY = 'arkenfell-theme';
const GM_SESSION_KEY = 'arkenfell-gm-access';
const GM_CREDENTIAL_HASH = 'f2c8095c9f0a274bbbed9c5e9c2fab9d6f83cb2d9aa8b0526cc52f0dfdce9330';
const GM_CREDENTIAL_SALT = 'arkenfell-wiki-v2:';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function hashGMCredentials(username, password) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Secure browser hashing is unavailable.');
  }
  const input = `${GM_CREDENTIAL_SALT}${username}\0${password}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
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

  document.getElementById('gm-login-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const username = document.getElementById('gm-username')?.value.trim() || '';
    const password = document.getElementById('gm-password')?.value || '';
    const error = document.getElementById('gm-login-error');

    let credentialsMatch = false;
    try {
      credentialsMatch = await hashGMCredentials(username, password) === GM_CREDENTIAL_HASH;
    } catch (hashError) {
      console.warn('GM credential verification is unavailable.', hashError);
    }

    if (credentialsMatch) {
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


const generatedArticleDataCache = new Map();

  function markdownEscape(value) {
    return String(value ?? '')
      .replaceAll('\\', '\\\\')
      .replace(/([`*_{}\[\]()#+\-.!>|])/g, '\\$1');
  }

  function markdownInline(value) {
    return markdownEscape(String(value ?? '').replace(/\s+/g, ' ').trim());
  }

  function markdownParagraphs(value) {
    return String(value || '')
      .trim()
      .split(/\n\s*\n/)
      .filter(Boolean)
      .map(paragraph => markdownEscape(paragraph.replace(/\s*\n\s*/g, ' ')))
      .join('\n\n');
  }

  function articleSlug(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function normalizeLocationAreas(value) {
    if (Array.isArray(value)) {
      return value.map((area, index) => {
        if (typeof area === 'string') return { name: area };
        return { ...area, name: area?.name || `Area ${index + 1}` };
      });
    }

    if (value && typeof value === 'object') {
      return Object.entries(value).map(([name, area]) => {
        if (typeof area === 'string') return { name, summary: area };
        return { ...area, name: area?.name || name };
      });
    }

    return [];
  }

  function appendFactSection(lines, heading, facts) {
    const usableFacts = Array.isArray(facts)
      ? facts.filter(fact => fact?.label && fact.value !== undefined && fact.value !== null && String(fact.value).trim())
      : [];
    if (!usableFacts.length) return;

    lines.push('', `## ${heading}`, '');
    usableFacts.forEach(fact => {
      const value = Array.isArray(fact.value) ? fact.value.join(', ') : fact.value;
      lines.push(`- **${markdownInline(fact.label)}:** ${markdownInline(value)}`);
    });
  }

  function relatedArticleId(item) {
    const prefixes = {
      'skill-directory': 'skill',
      'ability-directory': 'ability',
      'trait-catalog': 'trait',
      'arcana-catalog': 'arcana',
      'important-npcs': 'person'
    };
    const prefix = prefixes[item?.page];
    if (!prefix || !item?.target) return item?.page || '';
    return `${prefix}-${articleSlug(item.target)}`;
  }

  function appendRelatedLinks(lines, entry) {
    const links = Array.isArray(entry.links)
      ? entry.links.filter(item => item?.label && item?.page && item?.target)
      : [];
    if (!links.length) return;

    lines.push('', `## ${markdownInline(entry.linksLabel || 'Related entries')}`, '');
    links.forEach(item => {
      const destination = relatedArticleId(item);
      const description = String(item.description || '').trim();
      lines.push(`- [${markdownInline(item.label)}](#${destination})${description ? ` — ${markdownInline(description)}` : ''}`);
    });
  }

  function buildLocationArticle(entry) {
    const lines = [
      `# ${markdownEscape(entry.name)}`,
      '',
      markdownParagraphs(entry.summary || 'No public overview is currently recorded.'),
      '',
      '## At a glance',
      '',
      `- **Region:** ${markdownInline(entry.region || entry.group || 'Unassigned')}`,
      '- **Type:** Location',
      `- **Source:** ${markdownInline(entry.sourceWorld || 'Arkenfell')}`
    ];

    const areas = normalizeLocationAreas(entry.areas);
    lines.push('', '## Areas', '');

    if (areas.length) {
      areas.forEach(area => {
        const publicText =
          area.summary ||
          area.basicInfo ||
          area.description ||
          area.publicInfo ||
          `A named area within ${entry.name}.`;

        lines.push(`### ${markdownEscape(area.name)}`, '', markdownParagraphs(publicText), '');

        const hiddenText = area.hiddenInfo || area.gmInfo;
        if (hiddenText) {
          lines.push(':::gm', '', '#### GM information', '', markdownParagraphs(hiddenText), '', ':::', '');
        }
      });
    } else {
      lines.push('No separately named areas are currently recorded for this location.', '');
    }

    if (entry.hiddenInfo) {
      lines.push(':::gm', '', '## GM information', '', markdownParagraphs(entry.hiddenInfo), '', ':::', '');
    }

    lines.push(
      '## Continue browsing',
      '',
      `[Return to the Places Directory](#place-directory) to browse other locations in ${markdownInline(entry.region || entry.group || 'Arkenfell')}.`
    );
    return lines;
  }

  function buildPersonArticle(entry) {
    const lines = [`# ${markdownEscape(entry.name)}`, ''];

    if (entry.image) {
      const imagePath = encodeURI(entry.image).replaceAll('(', '%28').replaceAll(')', '%29');
      lines.push(`![Portrait of ${markdownInline(entry.name)}](${imagePath})`, '');
    }

    lines.push(
      markdownParagraphs(entry.summary || 'No public overview is currently recorded.'),
      '',
      '## At a glance',
      '',
      `- **Affiliation:** ${markdownInline(entry.group || 'Unassigned')}`,
      `- **Ancestry:** ${markdownInline(entry.kind || 'Not recorded')}`,
      `- **Location:** ${markdownInline(entry.location || 'Not recorded')}`,
      `- **Source:** ${markdownInline(entry.sourceWorld || 'Arkenfell')}`
    );

    appendFactSection(lines, 'Known details', entry.facts);

    if (entry.hiddenInfo) {
      lines.push(':::gm', '', '## GM information', '', markdownParagraphs(entry.hiddenInfo), '', ':::', '');
    }

    lines.push('', '## Continue browsing', '', '[Return to the People Directory](#important-npcs) to browse the full NPC roster.');
    return lines;
  }

  function buildArcanaArticle(entry) {
    const lines = [
      `# ${markdownEscape(entry.name)}`,
      '',
      markdownParagraphs(entry.summary || 'No overview is currently recorded.')
    ];
    appendFactSection(lines, 'Arcana profile', entry.facts);
    appendRelatedLinks(lines, entry);
    lines.push(
      '',
      '## Understanding Arcana',
      '',
      'An Arcana represents magical affinity and access, not automatic mastery. Its tier describes rarity and accessibility; practical control is represented by the corresponding skill and its developed level.',
      '',
      '[Return to the Arcana Catalog](#arcana-catalog) to compare every affinity.'
    );
    return lines;
  }

  function buildOptionArticle(entry, type) {
    const config = {
      skill: {
        heading: 'Skill profile',
        directory: 'skill-directory',
        directoryLabel: 'Skill Directory',
        fallback: 'No skill overview is currently recorded.'
      },
      ability: {
        heading: 'Requirements and use',
        directory: 'ability-directory',
        directoryLabel: 'Ability Directory',
        fallback: 'No ability overview is currently recorded.'
      },
      trait: {
        heading: 'Mechanical effects',
        directory: 'trait-catalog',
        directoryLabel: 'Trait Directory',
        fallback: 'No trait overview is currently recorded.'
      }
    }[type];

    const lines = [
      `# ${markdownEscape(entry.name)}`,
      '',
      markdownParagraphs(entry.summary || config.fallback),
      '',
      '## Classification',
      '',
      `- **Group:** ${markdownInline(entry.group || 'Other')}`,
      `- **Type:** ${markdownInline(entry.kind || type)}`
    ];
    appendFactSection(lines, config.heading, entry.facts);
    appendRelatedLinks(lines, entry);
    lines.push('', '## Continue browsing', '', `[Return to the ${config.directoryLabel}](#${config.directory}) to compare other options.`);
    return lines;
  }

  async function loadGeneratedArticleMarkdown(article) {
    const supportedTypes = new Set(['location', 'person', 'arcana', 'skill', 'ability', 'trait']);
    if (!supportedTypes.has(article.generatedType) || !article.dataSource || !article.recordName) {
      throw new Error(`Unsupported generated article: ${article.id}`);
    }

    let dataset = generatedArticleDataCache.get(article.dataSource);
    if (!dataset) {
      const response = await fetch(article.dataSource, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      dataset = await response.json();
      generatedArticleDataCache.set(article.dataSource, dataset);
    }

    const expectedSource = article.sourceWorld || dataset.sourceWorld || 'Arkenfell';
    const entry = (dataset.entries || []).find(item =>
      item.name === article.recordName &&
      (item.sourceWorld || dataset.sourceWorld || 'Arkenfell') === expectedSource
    );
    if (!entry) throw new Error(`${article.generatedType} record not found: ${article.recordName}`);

    let lines;
    if (article.generatedType === 'location') lines = buildLocationArticle(entry);
    else if (article.generatedType === 'person') lines = buildPersonArticle(entry);
    else if (article.generatedType === 'arcana') lines = buildArcanaArticle(entry);
    else lines = buildOptionArticle(entry, article.generatedType);

    return {
      markdown: lines.join('\n'),
      spoiler: Boolean(entry.spoiler)
    };
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
    let markdown;
    let generatedArticle = null;
    if (article.generatedType) {
      generatedArticle = await loadGeneratedArticleMarkdown(article);
      markdown = generatedArticle.markdown;
    } else {
      const response = await fetch(article.path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      markdown = stripFrontMatter(await response.text());
    }

    if (generatedArticle?.spoiler) {
      const bodyMarkdown = markdown.replace(/^# .+\n+/, '');
      content.innerHTML = `${renderMeta(article)}<h1>${escapeHtml(article.title)}</h1><details class="directory-spoiler-disclosure generated-article-spoiler"><summary>Spoiler warning — reveal article</summary><div class="generated-article-spoiler-body">${renderArticleMarkdown(bodyMarkdown)}</div></details>`;
    } else {
      content.innerHTML = `${renderMeta(article)}${renderArticleMarkdown(markdown)}`;
    }
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

  const matches = articles.filter(article => {
    if (needle.length < 2 && article.navigation === false) return false;
    const gmTags = state.gmMode ? (article.gmTags || []) : [];
    const haystack = [article.title, article.category, article.summary, ...(article.tags || []), ...gmTags].join(' ').toLowerCase();
    return haystack.includes(needle);
  });

  const regular = matches.filter(article => article.navigation !== false);
  const generated = matches.filter(article => article.navigation === false).slice(0, 300);
  return [...regular, ...generated];
}

async function init() {
  initTheme();
  initGMAccess();
  const status = document.getElementById('article-status');

  try {
    const response = await fetch('content/index.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    let generatedArticles = [];
    try {
      const generatedResponse = await fetch('content/generated-index.json', { cache: 'no-store' });
      if (generatedResponse.ok) {
        const generatedData = await generatedResponse.json();
        generatedArticles = Array.isArray(generatedData.articles) ? generatedData.articles : [];
      } else if (generatedResponse.status !== 404) {
        console.warn(`Generated article index returned HTTP ${generatedResponse.status}.`);
      }
    } catch (generatedError) {
      console.warn('Generated article index could not be loaded.', generatedError);
    }

    state.articles = [...data.articles, ...generatedArticles];

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
