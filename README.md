# Arkenfell Wiki

GitHub Pages frontend and canon reference for the Arkenfell Voyage world.

The site is player-safe by default and can be switched into a gated **GM Mode** that reveals inline secret sections and any fully GM-only articles.

## Architecture

- `content/` — Markdown canon for the unified wiki.
- `content/index.json` — navigation/search manifest.
- `Images/` — existing Voyage image assets.
- `index.html`, `app.js`, `styles.css` — lightweight GitHub Pages wiki frontend.
- `exports/player-canon.md` — combined player-safe Markdown export.
- `scripts/export-public.mjs` — regenerates the player-safe export while stripping GM-only material.
- `docs/ARTICLE_FORMAT.md` — article, metadata, and inline GM-section contract.
- `docs/GM_REPOSITORY.md` — unified GM spoiler-gate contract and legacy migration notes.

## Public and GM modes

Most subjects are public articles. NPCs, monsters, factions, locations, deities, and other setting material should normally expose their basic player-facing information without requiring login.

Secret information inside an otherwise public article is wrapped in:

```md
:::gm

## GM-only heading

Hidden motives, secrets, stat blocks, encounter information, narrative notes, or Voyage implementation details.

:::
```

The website removes these blocks in normal mode and displays them in clearly marked panels after GM login.

If the existence of an entire subject is itself secret, its `content/index.json` entry may use:

```json
"visibility": "gm"
```

Such pages are absent from normal navigation and search and become visible only in GM Mode.

## Spoiler barrier, not security

The Arkenfell repository is public because GitHub Pages serves the wiki from it. GM Mode is intentionally a spoiler barrier rather than a secure authentication system.

A determined person can inspect the public repository source and read GM material directly. The login exists to prevent accidental spoilers and to provide a clean player/GM reading experience on the website.

## Export player canon

Requires a current Node.js installation.

```bash
npm run export:public
```

The command rebuilds `exports/player-canon.md` from the articles listed in `content/index.json`. It excludes fully GM-only articles and removes all `:::gm` sections.

## Legacy GM repository

`bloc92/Arkenfell-GM` can remain temporarily as a migration backup. Existing GM companions should be folded into the matching Arkenfell articles as gated sections, after which new canon should be maintained in this repository.

## Voyage relationship

The wiki is the human-readable canon reference. It does **not** replace Voyage World Lore or other Voyage data structures. Facts required by the narrator must still be represented in the appropriate Voyage systems.
