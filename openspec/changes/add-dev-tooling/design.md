# Design

## Context

See `proposal.md` for the motivation. The tests already split into unit checks (`node --test`
and `tools/draw-themes.py --check`, no shell needed) and live checks against the running shell.
Pictures of the card were taken with `grim` on regions of the screen; a wrong region captured
the user's desktop twice. `tools/make-preview.sh` already summoned synthetic cards with
`dim: 1` to keep the desktop out.

## Goals / Non-Goals

**Goals:**
- One way to photograph the card that cannot show anything but the card.
- Knowledge about drawing characters kept in the repository, where an agent finds it.
- The unit checks run on GitHub for every push.

**Non-Goals:**
- Running the live checks on GitHub: they need an Omarchy shell and a Wayland session.
- Golden-image comparisons of the card: colors and fonts change with the Omarchy theme.

## Decisions

### Pictures only from a synthetic card on an opaque veil

`tools/shoot-card.sh <theme> <mode> <phase> <out>` summons a made-up meeting directly into
the overlay with `dim: 1`, captures the focused monitor and trims the solid veil away, leaving
exactly the card. Saved choices are not touched, because the payload carries the theme itself.
`make-preview.sh` and the skill both use it, and `CLAUDE.md` forbids raw captures of the screen.

- *Alternative: crop a normal screenshot around the card.* Rejected: the edges show the desktop,
  and a wrong region shows anything.

### The skill points to scripts

The skill states rules and pitfalls in prose, but every step that touches the system is a
script (`draw-themes.py`, `shoot-card.sh`, `theme-check.sh`, `run.sh`). Scripts behave the same
every time; prose can be followed loosely.

### CI: unit checks only, pinned actions

`.github/workflows/tests.yml` runs `tests/run.sh --unit` on `ubuntu-latest` with Node 24 (LTS),
with read-only permissions. `actions/checkout` and `actions/setup-node` are pinned to full
commit SHAs with the tag in a comment. This is common practice against moved tags, and it keeps
the repository clear of the marketplace scan's "remote code without a pinned commit" finding.

## Risks / Trade-offs

- [Pinned actions do not get fixes on their own] → Bump the SHAs when updating; the tag comment
  says which version each one is.
- [Node 24 on CI, 26 locally] → The tests use only `node:test`, `node:assert`, `node:vm` and
  `node:fs`, which are stable in both; a run in a clean environment passed.
- [The skill goes stale] → It names files and commands that the tests check exist
  (`tests/themes.test.mjs`, `docs/themes.md`); a renamed file shows up as a failing test or a
  missing path.
