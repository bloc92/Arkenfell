# Private GM Repository Contract

The public `bloc92/Arkenfell` repository must remain free of GM secrets. Its private companion is `bloc92/Arkenfell-GM`, which holds material that is unsafe to expose publicly.

## Matching article IDs

GM additions should mirror the public article ID and path where practical.

Public:

```text
content/factions/lantern-synod.md
id: lantern-synod
```

Private GM companion:

```text
content/factions/lantern-synod.md
id: lantern-synod
```

The identical ID is the canonical join key.

## Suggested GM article format

```md
---
id: lantern-synod
title: The Lantern Synod
visibility: gm
---

# GM Additions — The Lantern Synod

## Truth

Facts that differ from, complicate, or explain the public account.

## Secrets

Information players should not know merely by reading the wiki.

## Narrative Notes

Hooks, unresolved possibilities, planned reveals, safeguards, or scenario guidance.

## Voyage Implementation

Where this concept is represented in Voyage: World Lore, Factions, NPCs, Narrative Events, triggers, or other systems.
```

## Full-canon export

The private `Arkenfell-GM` repository contains the full-canon exporter. It reads the public `content/index.json`, loads each public article, then appends the matching GM article when one exists. Missing GM companions are valid. GM-only articles with no public counterpart are also supported and are placed in a separate GM-only section.

With both repositories cloned side by side, run from `Arkenfell-GM`:

```bash
npm run export:full
```

The generated `exports/full-canon.md` clearly marks private sections.

## Security rule

Never solve GM visibility with CSS, JavaScript, hidden HTML, unpublished navigation links, or files committed to the public repository. If the bytes are in a public GitHub repository, they are public.

Do not publish `Arkenfell-GM` through an unauthenticated static host. Repository privacy protects the source; a separately deployed site requires its own authentication layer.
