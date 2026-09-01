# GM Spoiler Gate Contract

Arkenfell now uses one GitHub Pages site for both player reference and GM reference.

The site is **public by default**. GM-only information is revealed only after entering GM Mode through the site's login control.

This is deliberately a **spoiler barrier, not a security boundary**. The repository itself is public, so a determined person can inspect source files directly.

## Preferred model: one subject, one article

Most NPCs, monsters, factions, deities, realms, locations, and other subjects should have one normal public article.

Player-safe information remains ordinary Markdown. Secret or GM-facing information is placed inside `:::gm` blocks:

```md
# Example Monster

## Overview

Basic player-facing knowledge.

:::gm

## GM Truth & Secrets

Hidden origin, secret weaknesses, encounter information, or unrevealed canon.

## D&D 5e

GM-facing stat block.

:::
```

Normal site mode removes the GM block before rendering. GM Mode renders it in a clearly marked panel.

## Fully hidden subjects

If revealing that a subject exists would itself be a spoiler, the whole article may be GM-only.

Add the article to `content/index.json` with:

```json
"visibility": "gm"
```

The normal site excludes it from navigation and search. GM Mode includes it.

## Search and navigation behavior

- Normal mode uses only articles without `visibility: "gm"`.
- GM Mode includes all indexed articles.
- `:::gm` sections never render in normal mode.
- A direct hash to a fully GM-only page while logged out falls back to player-visible content.
- GM-only pages receive a visible GM marker in navigation while GM Mode is active.

## Export behavior

`scripts/export-public.mjs` strips every `:::gm` block and excludes articles whose index entry has `visibility: "gm"`.

Run:

```bash
npm run export:public
```

The resulting `exports/player-canon.md` therefore remains player-safe even though source articles may contain gated GM sections.

## Legacy Arkenfell-GM repository

`bloc92/Arkenfell-GM` can remain as a temporary migration backup while older GM companion material is folded into the matching articles in this repository.

Do not add new GM canon there once its matching Arkenfell article has been migrated. New work should use inline GM sections here unless the entire subject is meant to be hidden.

## Canon discipline

GM gating changes presentation, not canon. Facts required for reliable narration must still exist in the relevant Voyage systems such as World Lore, NPCs, Factions, Realms, Regions, Locations, Narrative Events, triggers, Game Modes, or AI Instructions.
