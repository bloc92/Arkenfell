# Arkenfell Wiki

Public, player-facing canon and GitHub Pages frontend for the Arkenfell Voyage world.

## Architecture

- `content/` — public Markdown canon.
- `content/index.json` — navigation/search manifest.
- `Images/` — existing Voyage image assets.
- `index.html`, `app.js`, `styles.css` — lightweight GitHub Pages wiki frontend.
- `exports/player-canon.md` — combined public Markdown export.
- `scripts/export-public.mjs` — regenerates the public export.
- `docs/ARTICLE_FORMAT.md` — article and metadata contract.
- `docs/GM_REPOSITORY.md` — contract for the private GM companion repository.

## Export public canon

Requires a current Node.js installation.

```bash
npm run export:public
```

The command rebuilds `exports/player-canon.md` from the articles listed in `content/index.json`.

## Public and GM separation

This repository is public and must contain player-safe material only. GM secrets, hidden motives, true-history reveals, narrative notes, and private Voyage implementation guidance belong in a separate private repository, recommended as `bloc92/Arkenfell-GM`.

Public and GM articles use the same stable article `id`, allowing tooling to combine them into a full-canon Markdown export without duplicating the player-facing source.

## Voyage relationship

The wiki is the human-readable canon reference. It does **not** replace Voyage World Lore or other Voyage data structures. Facts required by the narrator must still be represented in the appropriate Voyage systems.
