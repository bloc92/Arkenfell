import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'content', 'index.json');
const index = JSON.parse(await readFile(indexPath, 'utf8'));

function stripFrontMatter(markdown) {
  if (!markdown.startsWith('---\n')) return markdown;
  const end = markdown.indexOf('\n---\n', 4);
  return end === -1 ? markdown : markdown.slice(end + 5);
}

function stripGMSections(markdown) {
  const output = [];
  let gm = false;

  for (const line of markdown.split('\n')) {
    const marker = line.trim();
    if (!gm && marker === ':::gm') {
      gm = true;
      continue;
    }
    if (gm && marker === ':::') {
      gm = false;
      continue;
    }
    if (!gm) output.push(line);
  }

  return output.join('\n');
}

const sections = [];
let exportedCount = 0;

for (const article of index.articles) {
  if (article.visibility === 'gm') continue;

  const articlePath = path.join(root, article.path);
  const markdown = await readFile(articlePath, 'utf8');
  const publicBody = stripGMSections(stripFrontMatter(markdown)).trim();
  if (!publicBody) continue;

  sections.push(publicBody);
  exportedCount += 1;
}

const header = [
  '# Arkenfell — Player Canon Export',
  '',
  '> Generated from the Arkenfell wiki source. This export intentionally excludes `:::gm` sections, fully GM-only articles, and campaign-specific state.',
  ''
].join('\n');

const output = `${header}${sections.join('\n\n---\n\n')}\n`;
const exportDir = path.join(root, 'exports');
await mkdir(exportDir, { recursive: true });
await writeFile(path.join(exportDir, 'player-canon.md'), output, 'utf8');
console.log(`Exported ${exportedCount} player-visible article(s).`);
