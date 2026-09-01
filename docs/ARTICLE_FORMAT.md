# Arkenfell Wiki Article Format

Arkenfell wiki articles live under `content/` and use Markdown with YAML-style frontmatter.

```md
---
id: lantern-synod
title: The Lantern Synod
category: Factions
knowledge: educated
status: canon
---

# The Lantern Synod

Public, player-safe canon goes here.
```

## Required metadata

- `id`: stable machine-readable article key. Never reuse an ID for a different subject.
- `title`: player-facing article title.
- `category`: navigation group such as World, Realms, Politics, Factions, People, Religion, Magic, Geography, History, Bestiary, Character Reference, Progression, or Game Modes.
- `knowledge`: common, regional, educated, specialist, or restricted.
- `status`: normally `canon`; use `draft` while an article is not ready to publish.

Each published article must also be added to `content/index.json`, which controls navigation and search metadata.

## Public information with GM-only sections

Most NPCs, monsters, factions, places, religions, and other subjects should remain normal public articles. Hide the **secret facts**, not the subject itself.

Use a `:::gm` block for material that should appear only after GM login:

```md
# Selira

## Public Biography

Player-safe information goes here.

:::gm

## Private Goals

Hidden motives, contingencies, secrets, encounter information, narrative safeguards, and Voyage implementation notes go here.

:::
```

When the site is in normal mode, the browser removes the contents of `:::gm` blocks before rendering. In GM Mode, the same material appears inside a clearly marked GM-only panel.

The player-canon export also strips these blocks.

## Entirely GM-only subjects

Only use a fully hidden article when the **existence of the subject itself** is meant to be secret. Add the article normally to `content/index.json` but include:

```json
"visibility": "gm"
```

The article will then be absent from normal navigation and search and become available only after GM login.

## Knowledge versus visibility

`knowledge` and GM visibility are separate concepts:

- `knowledge` describes how widely a fact is known **inside Arkenfell**.
- `:::gm` and `visibility: "gm"` control what the **website reader** can see without entering GM Mode.

A Restricted fact may still be player-visible reference material. A Common-looking fact can still be GM-only if revealing it would spoil hidden canon.

## Spoiler barrier, not security

Arkenfell is hosted from a public GitHub repository. GM Mode is intentionally a spoiler barrier, not cryptographic access control. A determined person can inspect the repository source and read material stored there.

Use GM gating to prevent accidental spoilers and to cleanly separate player-facing knowledge from GM reference material in ordinary site use.

## Canon rule

The wiki defines setting canon for human reference. Voyage still requires relevant facts in World Lore, NPCs, Factions, Locations, Narrative Events, triggers, or other appropriate game systems. The wiki does not replace Voyage runtime knowledge.
