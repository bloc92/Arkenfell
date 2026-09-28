const directoryPages = {
  'country-directory': {
    source: 'content/data/countries.json',
    searchPlaceholder: 'Search countries, governments, cultures, or themes…'
  },
  'place-directory': {
    source: 'content/data/places.json',
    searchPlaceholder: 'Search regions, settlements, landmarks, or keywords…'
  },
  'important-npcs': {
    source: 'content/data/people.json',
    searchPlaceholder: 'Search people, factions, locations, species, or roles…'
  },
  'faction-directory': {
    source: 'content/data/factions.json',
    searchPlaceholder: 'Search factions, houses, orders, or political powers…'
  }
};

const directoryDataCache = new Map();

function directoryExcerpt(text, limit = 240) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  const shortened = clean.slice(0, limit);
  const boundary = shortened.lastIndexOf(' ');
  return `${shortened.slice(0, boundary > 140 ? boundary : limit)}…`;
}

function createDirectoryToolbar(groups, placeholder) {
  const toolbar = document.createElement('div');
  toolbar.className = 'directory-toolbar';
  toolbar.setAttribute('role', 'search');

  const searchLabel = document.createElement('label');
  searchLabel.className = 'directory-search';
  const searchText = document.createElement('span');
  searchText.textContent = 'Search this directory';
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = placeholder;
  searchInput.autocomplete = 'off';
  searchLabel.append(searchText, searchInput);

  const groupLabel = document.createElement('label');
  groupLabel.className = 'directory-filter';
  const groupText = document.createElement('span');
  groupText.textContent = 'Show group';
  const groupSelect = document.createElement('select');
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'All groups';
  groupSelect.appendChild(allOption);
  groups.forEach(group => {
    const option = document.createElement('option');
    option.value = group;
    option.textContent = group;
    groupSelect.appendChild(option);
  });
  groupLabel.append(groupText, groupSelect);

  const status = document.createElement('p');
  status.className = 'directory-results';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  toolbar.append(searchLabel, groupLabel, status);
  return { toolbar, searchInput, groupSelect, status };
}

function appendDirectoryMetadata(container, entry) {
  const metadata = [entry.kind, entry.location || entry.region || entry.realm].filter(Boolean);
  if (!metadata.length && !entry.spoiler) return;

  const row = document.createElement('div');
  row.className = 'directory-entry-meta';
  metadata.forEach(value => {
    const chip = document.createElement('span');
    chip.textContent = value;
    row.appendChild(chip);
  });
  if (entry.spoiler) {
    const spoiler = document.createElement('span');
    spoiler.className = 'directory-spoiler-badge';
    spoiler.textContent = 'Spoiler';
    row.appendChild(spoiler);
  }
  container.appendChild(row);
}

function createDirectoryEntry(entry) {
  const card = document.createElement('article');
  card.className = 'directory-entry';
  if (entry.spoiler) card.classList.add('directory-entry--spoiler');

  const title = document.createElement('h3');
  if (entry.articleId) {
    const link = document.createElement('a');
    link.href = `#${entry.articleId}`;
    link.textContent = entry.name;
    title.appendChild(link);
  } else {
    title.textContent = entry.name;
  }
  card.appendChild(title);
  appendDirectoryMetadata(card, entry);

  const summary = String(entry.summary || '').trim();
  if (entry.spoiler) {
    const disclosure = document.createElement('details');
    disclosure.className = 'directory-spoiler-disclosure';
    const warning = document.createElement('summary');
    warning.textContent = 'Spoiler warning — reveal description';
    const text = document.createElement('p');
    text.textContent = summary || 'No additional description is available.';
    disclosure.append(warning, text);
    card.appendChild(disclosure);
  } else if (summary) {
    const cleanSummary = summary.replace(/\s+/g, ' ').trim();
    const preview = document.createElement('p');
    preview.className = 'directory-entry-preview';
    preview.textContent = directoryExcerpt(cleanSummary);
    card.appendChild(preview);

    if (preview.textContent !== cleanSummary) {
      const details = document.createElement('details');
      details.className = 'directory-entry-details';
      const label = document.createElement('summary');
      label.textContent = 'Read full description';
      const full = document.createElement('p');
      full.textContent = summary;
      details.append(label, full);
      card.appendChild(details);
    }
  }

  card.dataset.group = entry.group || 'Other';
  card.dataset.searchText = Object.values(entry).join(' ').toLowerCase();
  return card;
}

async function loadDirectoryData(source) {
  if (directoryDataCache.has(source)) return directoryDataCache.get(source);
  const response = await fetch(source, { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const entries = Array.isArray(data.entries) ? data.entries : [];
  directoryDataCache.set(source, entries);
  return entries;
}

async function enhanceDirectoryPage() {
  if (typeof state === 'undefined') return;

  const content = document.getElementById('article-content');
  const pageId = state.activeId;
  const config = directoryPages[pageId];

  if (!config) {
    if (content) delete content.dataset.directoryEnhanced;
    return;
  }
  if (!content || content.hidden) return;
  if (content.dataset.directoryEnhanced === pageId && content.querySelector('.directory-toolbar')) return;
  content.dataset.directoryEnhanced = pageId;

  try {
    const entries = await loadDirectoryData(config.source);
    if (state.activeId !== pageId || content.hidden) return;

    const groups = [...new Set(entries.map(entry => entry.group || 'Other'))];
    const { toolbar, searchInput, groupSelect, status } =
      createDirectoryToolbar(groups, config.searchPlaceholder);

    const directory = document.createElement('div');
    directory.className = 'directory-list';
    const cards = [];
    const groupElements = new Map();

    groups.forEach(groupName => {
      const section = document.createElement('section');
      section.className = 'directory-group';
      section.dataset.group = groupName;

      const heading = document.createElement('h2');
      heading.textContent = groupName;
      const grid = document.createElement('div');
      grid.className = 'directory-grid';

      entries.filter(entry => (entry.group || 'Other') === groupName).forEach(entry => {
        const card = createDirectoryEntry(entry);
        cards.push(card);
        grid.appendChild(card);
      });

      section.append(heading, grid);
      directory.appendChild(section);
      groupElements.set(groupName, section);
    });

    const heading = content.querySelector('h1');
    if (heading) {
      heading.insertAdjacentElement('afterend', toolbar);
      content.appendChild(directory);
    } else {
      content.prepend(toolbar, directory);
    }

    const applyFilters = () => {
      const query = searchInput.value.trim().toLowerCase();
      const selectedGroup = groupSelect.value;
      let visibleCount = 0;

      cards.forEach(card => {
        const matchesText = !query || card.dataset.searchText.includes(query);
        const matchesGroup = !selectedGroup || card.dataset.group === selectedGroup;
        const visible = matchesText && matchesGroup;
        card.hidden = !visible;
        if (visible) visibleCount += 1;
      });

      groupElements.forEach((section, groupName) => {
        const groupVisible = (!selectedGroup || selectedGroup === groupName) &&
          Array.from(section.querySelectorAll('.directory-entry')).some(card => !card.hidden);
        section.hidden = !groupVisible;
      });

      status.textContent = `${visibleCount} of ${cards.length} entries shown`;
      content.classList.toggle('directory-has-no-results', visibleCount === 0);
    };

    searchInput.addEventListener('input', applyFilters);
    groupSelect.addEventListener('change', applyFilters);
    applyFilters();
  } catch (error) {
    const message = document.createElement('p');
    message.className = 'directory-load-error';
    message.textContent = 'This directory could not be loaded. Please try again.';
    content.appendChild(message);
    console.error(error);
  }
}

const directoryObserver = new MutationObserver(enhanceDirectoryPage);
directoryObserver.observe(document.getElementById('article-content'), {
  childList: true,
  attributes: true,
  attributeFilter: ['hidden']
});
window.addEventListener('hashchange', () => requestAnimationFrame(enhanceDirectoryPage));
requestAnimationFrame(enhanceDirectoryPage);
