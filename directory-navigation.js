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
  },
  'pantheon-directory': {
    source: 'content/data/faith.json',
    searchPlaceholder: 'Search deities, domains, cultures, symbols, or standings…'
  },
  'creature-directory': {
    source: [
      'content/data/creatures-a-e.json',
      'content/data/creatures-f-j.json',
      'content/data/creatures-k-m.json',
      'content/data/creatures-n-o.json',
      'content/data/creatures-p-t.json',
      'content/data/creatures-u-z.json'
    ],
    searchPlaceholder: 'Search creatures, traits, roles, resistances, or vulnerabilities…'
  },
  'item-directory': {
    source: 'content/data/items.json',
    searchPlaceholder: 'Search items, categories, slots, descriptions, or bonuses…'
  },
  'skill-directory': {
    source: 'content/data/skills.json',
    searchPlaceholder: 'Search skills, attributes, types, equipment, or descriptions…'
  },
  'ability-directory': {
    source: [
      'content/data/abilities-a-c.json',
      'content/data/abilities-d-h.json',
      'content/data/abilities-i-m.json',
      'content/data/abilities-n-r.json',
      'content/data/abilities-s-t.json',
      'content/data/abilities-u-z.json'
    ],
    searchPlaceholder: 'Search abilities, requirements, bonuses, cooldowns, or descriptions…'
  },
  'trait-catalog': {
    source: [
      'content/data/traits-a-b.json',
      'content/data/traits-c-d.json',
      'content/data/traits-e-g.json',
      'content/data/traits-h-l.json',
      'content/data/traits-m-p.json',
      'content/data/traits-q-r.json',
      'content/data/traits-s.json',
      'content/data/traits-t-z.json'
    ],
    searchPlaceholder: 'Search traits, categories, modifiers, abilities, items, or story effects…'
  },
  'story-start-directory': {
    source: 'content/data/story-starts.json',
    searchPlaceholder: 'Search Story Starts, premises, locations, characters, or quests…'
  },
  'game-mode-directory': {
    source: 'content/data/game-modes.json',
    searchPlaceholder: 'Search Game Modes, difficulty, tone, pacing, or instructions…'
  }
};

const directoryDataCache = new Map();
let pendingDirectoryTarget = null;

function directorySlug(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

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
  if (!metadata.length && !entry.spoiler && !entry.spoilerDetails) return;

  const row = document.createElement('div');
  row.className = 'directory-entry-meta';
  metadata.forEach(value => {
    const chip = document.createElement('span');
    chip.textContent = value;
    row.appendChild(chip);
  });
  if (entry.spoiler || entry.spoilerDetails) {
    const spoiler = document.createElement('span');
    spoiler.className = 'directory-spoiler-badge';
    spoiler.textContent = 'Spoiler';
    row.appendChild(spoiler);
  }
  container.appendChild(row);
}

function formatDirectoryBonus(bonus) {
  if (!bonus || typeof bonus !== 'object') return String(bonus);
  const value = Number(bonus.value);
  const signedValue = Number.isFinite(value) && value > 0 ? `+${value}` : String(bonus.value ?? '');
  return [bonus.variable || bonus.type, signedValue].filter(Boolean).join(' ');
}

function appendDirectoryFacts(container, entry) {
  const configuredFacts = Array.isArray(entry.facts)
    ? entry.facts.map(fact => [fact.label, Array.isArray(fact.value) ? fact.value : [fact.value]])
    : [];
  const facts = [
    ...configuredFacts,
    ['Resistances', entry.resistances],
    ['Immunities', entry.immunities],
    ['Vulnerabilities', entry.vulnerabilities],
    ['Bonuses', Array.isArray(entry.bonuses) ? entry.bonuses.map(formatDirectoryBonus) : []]
  ].filter(([, values]) =>
    Array.isArray(values) &&
    values.some(value => value !== undefined && value !== null && String(value).trim())
  );

  if (!facts.length) return;
  const list = document.createElement('dl');
  list.className = 'directory-entry-facts';
  facts.forEach(([label, values]) => {
    const term = document.createElement('dt');
    term.textContent = label;
    const detail = document.createElement('dd');
    detail.textContent = values.filter(value => value !== undefined && value !== null).join(', ');
    list.append(term, detail);
  });
  container.appendChild(list);
}

function appendDirectoryDetails(container, entry) {
  const disclosures = [
    {
      text: entry.details,
      label: entry.detailsLabel || 'Read full details',
      className: 'directory-entry-details'
    },
    {
      text: entry.spoilerDetails,
      label: 'Spoiler warning — reveal full setup',
      className: 'directory-spoiler-disclosure'
    }
  ].filter(disclosure => String(disclosure.text || '').trim());

  disclosures.forEach(disclosure => {
    const details = document.createElement('details');
    details.className = disclosure.className;
    const summary = document.createElement('summary');
    summary.textContent = disclosure.label;
    const text = document.createElement('p');
    text.className = 'directory-long-details';
    text.textContent = disclosure.text;
    details.append(summary, text);
    container.appendChild(details);
  });
}

function appendDirectoryLinks(container, entry) {
  if (!Array.isArray(entry.links) || !entry.links.length) return;

  const block = document.createElement('nav');
  block.className = 'directory-entry-links';
  block.setAttribute('aria-label', entry.linksLabel || 'Related entries');

  const heading = document.createElement('p');
  heading.className = 'directory-entry-links-label';
  heading.textContent = entry.linksLabel || 'Related entries';

  const list = document.createElement('ul');
  entry.links.forEach(item => {
    if (!item || !item.label || !item.page || !item.target) return;
    const listItem = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${item.page}`;
    link.textContent = item.label;
    link.addEventListener('click', () => {
      pendingDirectoryTarget = { page: item.page, target: item.target };
    });
    listItem.appendChild(link);
    list.appendChild(listItem);
  });

  if (list.childElementCount) {
    block.append(heading, list);
    container.appendChild(block);
  }
}

function createDirectoryEntry(entry) {
  const card = document.createElement('article');
  card.className = 'directory-entry';
  card.id = `directory-entry-${directorySlug(entry.name)}`;
  card.dataset.entryName = entry.name || '';
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
  appendDirectoryFacts(card, entry);

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

  appendDirectoryLinks(card, entry);
  appendDirectoryDetails(card, entry);

  card.dataset.group = entry.group || 'Other';
  card.dataset.searchText = JSON.stringify(entry).toLowerCase();
  return card;
}

async function loadDirectoryData(source) {
  const sources = Array.isArray(source) ? source : [source];
  const cacheKey = sources.join('|');
  if (directoryDataCache.has(cacheKey)) return directoryDataCache.get(cacheKey);

  const datasets = await Promise.all(sources.map(async path => {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }));
  const entries = datasets.flatMap(data => Array.isArray(data.entries) ? data.entries : []);
  directoryDataCache.set(cacheKey, entries);
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

    if (pendingDirectoryTarget && pendingDirectoryTarget.page === pageId) {
      const target = pendingDirectoryTarget.target;
      pendingDirectoryTarget = null;
      searchInput.value = target;
      groupSelect.value = '';
      applyFilters();

      const targetCard = cards.find(card => card.dataset.entryName === target);
      if (targetCard) {
        targetCard.classList.add('directory-entry--target');
        requestAnimationFrame(() => targetCard.scrollIntoView({ block: 'center', behavior: 'smooth' }));
        window.setTimeout(() => targetCard.classList.remove('directory-entry--target'), 2600);
      }
    }
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
