# Design

## Context

0.3.0 is not cut yet; everything below changes unreleased code. The findings come from a
`/code-review` run in a separate context and from a second look at the review process. What
the code does today:

- `Logic.linkHost` returns the browser's host, but `joinTarget` and `unknownLinkTip` show it as
  it is: a U+202E in the host reverses the text after it, U+200B is invisible, U+0435 looks like
  `e`. Such hosts are never recognized (the list is ASCII), so the harm is a lying label, not a
  wrong default. `unknownLinkTip` takes the whole host, and the shell's `PanelToolTip` neither
  wraps nor caps its width.
- `parseConfig` turns `""` into `{}` but sends a file of comments, stripped to white space, to
  `JSON.parse`, which throws. `formatConfig` and `Service.loadConfig` join unknown key names
  raw. `normalizeConfig` replaces a bad value by its default without a trace; `hostList` drops
  bad `joinHosts` entries the same way.
- `LinkNotice` clears `pinned` in `onVisibleChanged`, but its `visible` binding does not
  involve `root.opened`; whether hiding the `PanelWindow` changes it is not known.
- `DEFAULT_JOIN_HOSTS` and `SERVICE_NAMES` repeat the same hosts. The index at the top of
  `Logic.js` misses `hostIn` and `inlineJson`; `LinkNotice` is missing from the component lists.
- `tests/style.test.mjs` checks `textFormat` only on `Text`. Qt Quick Controls `Label` (a
  `Text`, `AutoText` by default), `TextEdit` and `TextArea` can render rich text; Qt's `ToolTip`
  shows its text through a default `AutoText` item. `TextInput` and `TextField` are plain only.
- The Review rule does not say who reviews; the release skill's audit is about security only;
  the pre-push hook runs on the working tree and says nothing when it differs from the push.

## Goals / Non-Goals

**Goals:**
- No text from a calendar can be rendered as markup or make the shown host lie.
- A mistake in `ominous.json` is always visible somewhere (`status`, log, `config`), never on the
  card.
- The user reads, in the config and the docs, exactly what a recognized host means.
- The review setup has an independent reviewer at each level and its reasons written down in a
  form another project can take.

**Non-Goals:**
- Judging meeting services: Ominous cannot know which subdomain or page of a service is safe.
- Converting hosts to punycode (no IDN support in QML's JavaScript); escapes do the job.
- Reporting problems in the IPC payload or theme files through `ignoredValues`: the payload is
  re-normalized silently by design, theme files have `themeError`.
- Testing the pushed commit instead of the working tree in the hook (stash or worktree).

## Decisions

### Escape, then shorten, the host that is shown

`displayHost(host)` replaces every UTF-16 unit outside `!`..`~` with `\uXXXX` (lower-case hex).
`joinTarget`'s label and `unknownLinkTip` both use it, then `shortHost(text, max)` with
`max` 32 for the button and 64 for the tooltip. The comparison with `joinHosts` still uses the
raw host, so escapes never make a host match. The tooltip's "non-Latin characters" sentence
stays and is triggered by any escape.

- *Alternative: refuse such links.* Rejected: they are already not the default, and a user who
  chooses Join on purpose should see exactly where it goes.

### One vocabulary: recognized

The config comment, the tooltip, the docs and the specs say "recognized"; the tooltip ends with
"to make Join the default for it"; `joinTarget` returns `recognized` instead of `trusted`. The
key keeps its name: `joinHosts` already says only "the hosts for Join". The docs gain the limit,
as one paragraph: a recognized host means the link opens that service, not that the meeting or
its sender is genuine; services let customers create subdomains (Zoom vanity URLs were used in
phishing in 2020) and users publish pages; to be stricter, list only your own hosts.

### The default: the narrowest host that covers a service's meeting links

Applied to each service, only RingCentral changes: its links are
`https://v.ringcentral.com/join/<id>`, while `ringcentral.com` also covers the community and
support sites. `meetings.ringcentral.com`, the older product, becomes optional. Zoom, Webex and
Whereby keep the bare domain because meeting links use customer subdomains; GoTo keeps
`gotomeeting.com` because its links use several of its subdomains. When unsure, the narrow
choice fails safe: Dismiss selected and the "?", nothing blocked. The table lives once:
`JOIN_SERVICES` (host, name), with `DEFAULT_JOIN_HOSTS` derived from it.

### Ignored values are recorded where they are decided

`normalizeConfig` keeps its signature for its callers; a new `checkConfig(raw)` does the work
and returns `{ config, ignored }`, and each branch that falls back to a default appends
`<key>: <value>` (for `themes`, `themes.<mode>`; for list entries, one per entry). A value that
is normalized (rounded, lower-cased, trimmed) is not ignored. `parseConfig` returns `ignored`;
`Service.qml` keeps it as `ignoredValues`, logs it, puts it in `status`, and `formatConfig`
lists it in its header after the unknown keys.

- *Alternative: compare the raw and the normalized config.* Rejected: normalization changes
  valid values too (case, rounding), so it would report them.

### One escaping function for comments and the log

`quoted(value)` = `JSON.stringify`, then every unit outside printable ASCII escaped, then cut at
40 characters with "…". JSON.stringify alone leaves U+2028 and bidi controls raw. Used for
unknown keys and ignored values in `formatConfig` and in the log line.

### A file of comments is an empty file

`parseConfig` parses `{}` when `stripJsonc(text)` is only white space. One line; the scenarios
in the configuration spec pin it.

### The pinned "?" is reset by the card, not by Qt's visibility

Whether hiding the `PanelWindow` changes the `visible` of the items inside is a Qt detail, and
nothing on this machine can click (no `ydotool`, `wlrctl` or `dotool`; `wtype` only types), so
the check cannot be automated. The fix does not depend on it: `LinkNotice` gets an `active`
property, bound to `root.opened` by `Alert.qml`, and clears `pinned` when it turns false. The
user checks it by hand in the session first (click the "?", dismiss, summon another unknown
link): if it already resets, the change still makes it explicit.

### Review: a separate context at every level

`rules.tasks` says the Review group is done by a reviewer that did not write the change: in
Claude Code `/code-review` and `/security-review`, elsewhere a separate reviewer agent; its
findings are fixed or taken to the user. The release skill's step 2.5 becomes "Review and audit":
a code review of `git diff <last tag>..HEAD` in a separate context, then the security audit, then
the marketplace's `security-baseline.mjs` stays after the push: read on its source, it fetches the
repository through the GitHub API at a full commit SHA and has no local-folder mode, so the
skill states that and keeps the audit at least as strict as its checks.

### The hook warns, it does not stash

When `git status --porcelain` is not empty, the hook still runs the checks and prints that the
working tree differs from what is pushed. Common practice for pre-push hooks is a quick signal
with the CI as the real gate; stashing would touch the user's work, and a worktree needs extra
setup (mise trusts config files per path).

### docs/review-gates.md is portable

It names no Ominous file except as an example: the three levels, each decision with the
alternatives turned down and a source, how to copy the setup (hook, rule, a project map), and the
evidence that led to a separate-context review. `docs/development.md`'s Security section keeps
the project's map and its list of APIs, and points to it for the reasons.

### Lists that drift get a test

A test reads the `function` names of `Logic.js` and checks each is in the index at the top;
another checks every `components/*.qml` is named in `docs/development.md` and `CLAUDE.md`. The
plain-text test treats `Label`, `TextEdit` and `TextArea` like `Text`; `ToolTip` (as a word, so
`PanelToolTip` passes) joins the forbidden APIs and their list in the docs.

## Risks / Trade-offs

- [RingCentral users with links outside `v.ringcentral.com`] -> Dismiss selected and the "?",
  which names the host and the fix; noted in the changelog.
- [The pinned "?" can only be checked by hand] -> One manual check by the user, before and
  after the fix; the logic itself is one property and one handler.
- [`ignoredValues` could list many entries for a long list] -> Each entry is short and capped;
  the card never shows them.
- [Escapes make a hostile host long] -> Escaping happens before shortening, so the caps hold.
