# Page Overrides

Each file in this folder overrides specific rules from `../MASTER.md` for one page or route group.

## Convention

- Filename: lowercase kebab-case matching the route or feature (e.g. `timeline.md`, `storybook.md`, `share.md`).
- Structure: only document **what differs** from MASTER and **why**. Do not restate the full system.
- Header: one-line summary of the deviation's intent.

## Template

```markdown
# <Page Name> — Override

> Overrides: `docs/design-system/MASTER.md`
> Intent: <one-line reason this page needs to deviate>

## Deviations

### <Section name in MASTER>
- **MASTER says:** <quoted rule>
- **This page:** <new rule>
- **Why:** <reason>

## Inherits
Everything in MASTER not listed above.
```

## When building a page

1. Check whether `pages/<page>.md` exists.
2. If yes → that file's rules win where they conflict with MASTER.
3. If no → MASTER is authoritative.
