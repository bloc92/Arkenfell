let sidebarSections = [];

fetch('content/sections.json', { cache: 'no-store' })
  .then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then(data => {
    sidebarSections = Array.isArray(data.sections) ? data.sections : [];
    if (state.articles.length) {
      const search = document.getElementById('search');
      renderNavigation(filterArticles(search?.value || ''));
    }
  })
  .catch(error => {
    console.warn('The sidebar section manifest could not be loaded; using article categories.', error);
  });

function getNavigationGroups(articles, searchActive) {
  if (!sidebarSections.length) {
    return Object.entries(groupByCategory(articles)).map(([title, items]) => ({
      id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      title,
      landing: items[0],
      items: items.slice(1)
    }));
  }

  const visibleArticles = getVisibleArticles();
  const visibleById = new Map(visibleArticles.map(article => [article.id, article]));
  const filteredIds = new Set(articles.map(article => article.id));
  const assignedIds = new Set();
  const groups = [];

  sidebarSections.forEach(section => {
    const landing = visibleById.get(section.landing);
    const configuredItems = (section.articles || [])
      .map(id => visibleById.get(id))
      .filter(Boolean);

    if (landing) assignedIds.add(landing.id);
    configuredItems.forEach(article => assignedIds.add(article.id));

    const items = searchActive
      ? configuredItems.filter(article => filteredIds.has(article.id))
      : configuredItems;
    const landingMatches = landing && filteredIds.has(landing.id);

    if (!landing || (searchActive && !landingMatches && !items.length)) return;

    groups.push({
      id: section.id,
      title: section.title,
      landing,
      items
    });
  });

  const unassigned = articles.filter(article => !assignedIds.has(article.id));
  Object.entries(groupByCategory(unassigned)).forEach(([title, items]) => {
    groups.push({
      id: `other-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
      title,
      landing: items[0],
      items: items.slice(1)
    });
  });

  return groups;
}

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
  const groups = getNavigationGroups(articles, searchActive);

  if (!groups.length) {
    const empty = document.createElement('p');
    empty.className = 'nav-empty';
    empty.textContent = 'No articles match this search.';
    nav.appendChild(empty);
    return;
  }

  groups.forEach(section => {
    const group = document.createElement('section');
    group.className = 'nav-group';
    group.dataset.section = section.id;

    const containsActiveArticle =
      section.landing.id === state.activeId ||
      section.items.some(article => article.id === state.activeId);
    const isOpen =
      searchActive ||
      containsActiveArticle ||
      state.openNavCategories.has(section.id);
    const groupId = `nav-section-${section.id}`;

    const header = document.createElement('div');
    header.className = 'nav-group-header';
    if (!section.items.length) header.classList.add('nav-group-header--single');

    const sectionLink = document.createElement('a');
    sectionLink.className = 'nav-group-link';
    sectionLink.href = `#${section.landing.id}`;
    sectionLink.textContent = section.title;
    if (containsActiveArticle) {
      sectionLink.classList.add('active');
      sectionLink.setAttribute('aria-current', 'page');
    }
    header.appendChild(sectionLink);

    const links = document.createElement('div');
    links.className = 'nav-group-links';
    links.id = groupId;
    links.hidden = !isOpen;

    section.items.forEach(article => {
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

    if (section.items.length) {
      const toggle = document.createElement('button');
      toggle.className = 'nav-group-toggle';
      toggle.type = 'button';
      toggle.setAttribute('aria-controls', groupId);
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', `${isOpen ? 'Collapse' : 'Expand'} ${section.title} section`);

      const chevron = document.createElement('span');
      chevron.className = 'nav-group-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      chevron.textContent = '⌄';
      toggle.appendChild(chevron);

      toggle.addEventListener('click', () => {
        const nextOpen = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(nextOpen));
        toggle.setAttribute('aria-label', `${nextOpen ? 'Collapse' : 'Expand'} ${section.title} section`);
        links.hidden = !nextOpen;

        if (!searchActive) {
          if (nextOpen) state.openNavCategories.add(section.id);
          else state.openNavCategories.delete(section.id);
        }
      });

      header.appendChild(toggle);
    }

    group.appendChild(header);
    if (section.items.length) group.appendChild(links);
    nav.appendChild(group);
  });
};
