const directoryPageIds = new Set([
  'realm-directory',
  'place-directory',
  'important-npcs',
  'faction-directory'
]);

function createDirectoryToolbar(groups) {
  const toolbar = document.createElement('div');
  toolbar.className = 'directory-toolbar';
  toolbar.setAttribute('role', 'search');

  const searchLabel = document.createElement('label');
  searchLabel.className = 'directory-search';
  const searchText = document.createElement('span');
  searchText.textContent = 'Search this directory';
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Type a name, realm, role, or keyword…';
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
  groups.forEach((group, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = group.title;
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

function collectDirectoryGroups(content) {
  const headings = Array.from(content.children).filter(element => element.tagName === 'H2');
  const groups = [];

  headings.forEach(heading => {
    if (!heading.isConnected || heading.closest('.gm-only-panel')) return;

    const groupElement = document.createElement('section');
    groupElement.className = 'directory-group';
    heading.before(groupElement);
    groupElement.appendChild(heading);

    while (groupElement.nextElementSibling && groupElement.nextElementSibling.tagName !== 'H2') {
      groupElement.appendChild(groupElement.nextElementSibling);
    }

    const children = Array.from(groupElement.children);
    for (let index = 0; index < children.length;) {
      const child = children[index];
      if (child.tagName !== 'H3') {
        index += 1;
        continue;
      }

      const entry = document.createElement('article');
      entry.className = 'directory-entry';
      child.before(entry);
      entry.appendChild(child);
      index += 1;

      while (index < children.length && children[index].tagName !== 'H3') {
        entry.appendChild(children[index]);
        index += 1;
      }
    }

    const entries = [
      ...groupElement.querySelectorAll(':scope > .directory-entry'),
      ...Array.from(groupElement.querySelectorAll('li')).filter(item => !item.closest('.directory-entry'))
    ];

    entries.forEach(entry => {
      entry.classList.add('directory-search-item');
      entry.dataset.searchText = entry.textContent.trim().toLowerCase();
    });

    if (entries.length) {
      groups.push({
        element: groupElement,
        title: heading.textContent.trim(),
        entries
      });
    }
  });

  return groups;
}

function enhanceDirectoryPage() {
  if (typeof state === 'undefined') return;

  const content = document.getElementById('article-content');
  if (!directoryPageIds.has(state.activeId)) {
    if (content) delete content.dataset.directoryEnhanced;
    return;
  }
  if (!content || content.hidden) return;
  if (content.dataset.directoryEnhanced === state.activeId && content.querySelector('.directory-toolbar')) return;
  content.dataset.directoryEnhanced = state.activeId;

  const groups = collectDirectoryGroups(content);
  if (!groups.length) return;

  const { toolbar, searchInput, groupSelect, status } = createDirectoryToolbar(groups);
  const heading = content.querySelector('h1');
  if (heading) heading.insertAdjacentElement('afterend', toolbar);
  else content.prepend(toolbar);

  const applyFilters = () => {
    const query = searchInput.value.trim().toLowerCase();
    const selectedGroup = groupSelect.value;
    let visibleCount = 0;

    groups.forEach((group, groupIndex) => {
      const groupSelected = !selectedGroup || selectedGroup === String(groupIndex);
      let groupCount = 0;

      group.entries.forEach(entry => {
        const matches = !query || entry.dataset.searchText.includes(query);
        const visible = groupSelected && matches;
        entry.hidden = !visible;
        if (visible) groupCount += 1;
      });

      group.element.hidden = groupCount === 0;
      visibleCount += groupCount;
    });

    status.textContent = visibleCount === 1
      ? '1 entry shown'
      : `${visibleCount} entries shown`;
    content.classList.toggle('directory-has-no-results', visibleCount === 0);
  };

  searchInput.addEventListener('input', applyFilters);
  groupSelect.addEventListener('change', applyFilters);
  applyFilters();
}

const directoryObserver = new MutationObserver(enhanceDirectoryPage);
directoryObserver.observe(document.getElementById('article-content'), {
  childList: true,
  attributes: true,
  attributeFilter: ['hidden']
});
window.addEventListener('hashchange', () => requestAnimationFrame(enhanceDirectoryPage));
requestAnimationFrame(enhanceDirectoryPage);
