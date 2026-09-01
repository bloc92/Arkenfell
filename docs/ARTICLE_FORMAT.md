# Arkenfell Wiki Article Format

Public wiki articles live under `content/` and use Markdown with YAML-style frontmatter.

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
- `category`: navigation group such as World, Realms, Politics, Factions, People, Religion, Magic, Geography, History, or Bestiary.
- `knowledge`: common, regional, educated, specialist, or restricted.
- `status`: normally `canon`; use `draft` while an article is not ready to publish.

Each published article must also be added to `content/index.json`, which controls navigation and search metadata.

## Public vs GM canon

This repository is public. Do not commit secrets, hidden motives, true-history reveals, adventure solutions, unrevealed bloodlines, or campaign spoilers here.

GM material belongs in the private companion repository and should use the same `id` as the public article it supplements. That shared ID is the join key used by full-canon exports.

## Canon rule

The wiki defines setting canon for human reference. Voyage still requires relevant facts in World Lore, NPCs, Factions, Locations, Narrative Events, triggers, or other appropriate game systems. The wiki does not replace Voyage runtime knowledge.
