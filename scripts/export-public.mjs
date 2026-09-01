import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'content', 'index.json');
const index = JSON.parse(await readFile(indexPath, 'utf8'));

const sections = [];
for (const article of index.articles) {
  const articlePath = path.join(root, article.path);
  const markdown = await readFile(articlePath, 'utf8');
  const body = markdown.startsWith('---\n')
    ? markdown.slice(markdown.indexOf('\n---\n', 4) + 5)
    : markdown;

  sections.push(body.trim());
}

const header = [
  '# Arkenfell — Player Canon Export',
  '',
  '> Generated from the public Arkenfell wiki source. This export intentionally excludes GM-only canon and campaign-specific state.',
  ''
].join('\n');

const output = `${header}${sections.join('\n\n---\n\n')}\n`;
const exportDir = path.join(root, 'exports');
await mkdir(exportDir, { recursive: true });
await writeFile(path.join(exportDir, 'player-canon.md'), output, 'utf8');
console.log(`Exported ${index.articles.length} public article(s).`);
