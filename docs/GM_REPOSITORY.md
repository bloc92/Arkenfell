# Private GM Repository Contract

The public `bloc92/Arkenfell` repository must remain free of GM secrets. The private companion repository should hold only material that is unsafe to expose publicly.

Recommended repository name: `Arkenfell-GM`.

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

A full-canon exporter should read the public `content/index.json`, load each public article, then append the matching GM article when one exists. Missing GM companions are valid and should not fail the export.

The resulting GM export should clearly mark private sections, for example:

```md
> [!GM]
> GM-only canon follows.
```

## Security rule

Never solve GM visibility with CSS, JavaScript, hidden HTML, unpublished navigation links, or files committed to the public repository. If the bytes are in a public GitHub repository, they are public.
