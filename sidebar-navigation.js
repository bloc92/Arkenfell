const CATEGORY_LANDING_ARTICLES = Object.freeze({
  World: 'arkenfell',
  Realms: 'kingdom-of-valenreach',
  Geography: 'highcourt-armathen',
  Factions: 'faction-directory',
  People: 'important-npcs',
  Religion: 'pantheon-directory',
  Magic: 'arcana',
  'Character Reference': 'attributes',
  Progression: 'milestone-titles',
  'Game Modes': 'game-modes'
});

window.renderNavigation = function renderNavigation(articles) {
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
    const group = document.createElement('section');
    group.className = 'nav-group';
    group.dataset.category = category;

    const containsActiveArticle = items.some(article => article.id === state.activeId);
    const isOpen = searchActive || containsActiveArticle || state.openNavCategories.has(category);
    const groupId = `nav-section-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
    const preferredLandingId = CATEGORY_LANDING_ARTICLES[category];
    const landingArticle = items.find(article => article.id === preferredLandingId) || items[0];

    const header = document.createElement('div');
    header.className = 'nav-group-header';

    const sectionLink = document.createElement('a');
    sectionLink.className = 'nav-group-link';
    sectionLink.href = `#${landingArticle.id}`;
    sectionLink.textContent = category;
    if (containsActiveArticle) {
      sectionLink.classList.add('active');
      sectionLink.setAttribute('aria-current', 'page');
    }
    header.appendChild(sectionLink);

    const toggle = document.createElement('button');
    toggle.className = 'nav-group-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-controls', groupId);
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', `${isOpen ? 'Collapse' : 'Expand'} ${category} section`);

    const chevron = document.createElement('span');
    chevron.className = 'nav-group-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.textContent = '⌄';
    toggle.appendChild(chevron);
    header.appendChild(toggle);
    group.appendChild(header);

    const links = document.createElement('div');
    links.className = 'nav-group-links';
    links.id = groupId;
    links.hidden = !isOpen;

    items.forEach(article => {
      const link = document.createElement('a');
      link.className = 'nav-link';
      if (article.visibility === 'gm') link.classList.add('gm-only-link');
      link.href = `#${article.id}`;
      link.dataset.articleId = article.id;
      link.textContent = article.title;
      if (article.id === state.activeId) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
      links.appendChild(link);
    });

    toggle.addEventListener('click', () => {
      const nextOpen = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(nextOpen));
      toggle.setAttribute('aria-label', `${nextOpen ? 'Collapse' : 'Expand'} ${category} section`);
      links.hidden = !nextOpen;

      if (!searchActive) {
        if (nextOpen) state.openNavCategories.add(category);
        else state.openNavCategories.delete(category);
      }
    });

    group.appendChild(links);
    nav.appendChild(group);
  });
};
