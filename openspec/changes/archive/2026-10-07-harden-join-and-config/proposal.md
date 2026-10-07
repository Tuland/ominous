# Proposal

## Why

A `/code-review` of everything since v0.2.0, run in a separate context before cutting 0.3.0,
found nine problems in `known-join-hosts`, `commented-config` and their docs, and a second look
at our security and review decisions found five more. Two of the five are in the review process
itself: the per-change review was done by the same agent that wrote the code (it reported no
finding where the separate review found nine), and the pre-push hook tests the working tree
rather than what is pushed, without saying so. The goal is that 0.3.0 does not earn another
marketplace issue, least of all one like #10156 (untrusted text interpreted instead of shown),
and that the user is told plainly what a recognized join link does and does not guarantee.
None of this is released yet, so names and texts can still change for free.

## What Changes

Join link and card:
- The host on the Join button and in the tooltip shows every character outside printable ASCII
  as `\uXXXX`, so right-to-left overrides, invisible characters and look-alike letters cannot
  make it read as another host.
- The tooltip shortens a long host to its last 64 characters after "…" (the button already
  keeps 32), so a link from a calendar cannot push the explanation off the screen.
- A "?" clicked open does not stay open into the next card.
- The first-second input guard waits for a pause: a key pressed while guarded starts it again,
  so a space or `Enter` typed just after the first second cannot join or dismiss the card.
- One vocabulary: a join host is "recognized", never "trusted". The tooltip, the config comment
  and the docs say what recognition does (Join is selected first) and what it does not (vouch
  for the meeting or its sender); services let customers create subdomains and users publish
  pages, and Ominous cannot judge those.
- **The default lists `v.ringcentral.com` instead of `ringcentral.com`**, the narrowest host that
  covers RingCentral's meeting links; `meetings.ringcentral.com` moves to the optional hosts.

Config:
- A file holding only comments or white space reads like an empty file: defaults, no error.
- **New `status` field `ignoredValues`**: every value in `ominous.json` that Ominous ignores
  (wrong type, out of range, an invalid list entry such as `"https://zoom.us/"` in `joinHosts`)
  is listed there, named in the shell log, and shown as a comment at the top of `config`'s
  output, as unknown keys already are. Before, such a value silently fell back to its default,
  and a `joinHosts` with only bad entries silently became empty.
- Key names and values printed in comments and in the log are escaped, so a key with a newline
  cannot break the printed config or forge a log line.

Review process and tooling:
- The per-change Review group is done in a context separate from the one that wrote the code
  (`/code-review`, `/security-review`, a reviewer agent); the release skill adds a code review
  of the whole diff since the last tag to its audit step; the marketplace's own security scanner
  reads a pushed commit through the GitHub API and cannot run on a local checkout, so it stays
  after the push and the skill says so.
- The pre-push hook still tests the working tree, as is common for pre-push hooks, and warns
  when the tree has changes or untracked files, since the result may then differ from what is
  pushed.
- `docs/review-gates.md`: the review setup with the reasons for each choice, the alternatives
  turned down and their sources, written without anything specific to Ominous so it can be
  copied to another project.
- Tests: the plain-text check covers `Label`, `TextEdit` and `TextArea` as well as `Text`;
  Qt's raw `ToolTip` joins the APIs not allowed (`PanelToolTip` is plain text); every function
  of `Logic.js` is in its index; every component is named in `docs/development.md` and
  `CLAUDE.md`.
- Clean-up: one table of meeting services instead of two parallel lists; a wrong comment in
  `Alert.qml`.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `untrusted-input`: card text rule extended to every text element; "Trusted join hosts" becomes
  "Recognized join hosts" (RingCentral narrowed, invalid entries reported, the limit of
  recognition stated); the shown host is escaped; the tooltip's host is capped and its wording
  changed; a pinned "?" does not outlive its card; the input guard waits for a pause.
- `configuration`: comment-only files; ignored values reported; names and values escaped in the
  printed config and the log.

## Impact

Code: `Logic.js`, `Service.qml`, `Alert.qml`, `components/LinkNotice.qml`, `.githooks/pre-push`. Tests: `tests/hosts.test.mjs`,
`tests/config.test.mjs`, `tests/style.test.mjs`, `tests/docs.test.mjs`, `tests/live.sh`.
Docs: `docs/configuration.md`, `docs/usage.md`, `docs/development.md`, new
`docs/review-gates.md`, regenerated `docs/ominous.example.jsonc` and `docs/ominous.schema.json`,
`CLAUDE.md`, `CHANGELOG.md` (the Unreleased entries are amended, since none of this shipped).
Process: `openspec/config.yaml` (`rules.tasks`), `.claude/skills/ominous-release/SKILL.md`.
Users of RingCentral links outside `v.ringcentral.com` see Dismiss selected until they add the
host.
