# Design

## Context

The marketplace's `inspectListedPluginSource` (scripts/build-catalog.mjs) refuses a plugin
folder holding any symlink; for Ominous that folder is the repository root. Run locally on
`d48d604` it returned `CatalogCheckError manifest-invalid: manifest.json: symlinks are not
allowed in plugin folders`.

## Goals / Non-Goals

**Goals:**
- A commit the marketplace accepts, and a check that keeps it so.

**Non-Goals:**
- A new version: the plugin's files are those of 0.3.1, so the manifest stays at 0.3.1 and the
  marketplace verifies the new HEAD.

## Decisions

- Untrack and ignore the links (the user's choice) rather than replace them with copies: one
  copy of each skill, and `openspec update` keeps working as it is.
- The test reads `git ls-files -s` and fails on mode `120000`, the way the `.gitignore` test
  already uses git.
