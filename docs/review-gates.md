# Review gates

A small setup that puts a review at three points of a development cycle, each where it is cheap
and still finds things, with the reason for every choice and the alternatives turned down. It
is written to be copied to another project: nothing here depends on what the project does.

## The three levels

```
every push            end of every change             before every release
-------------------   -----------------------------   ------------------------------------
quick automated       code review + security review   code review of the whole release diff
checks (tests, lint)  of the change's own diff,       + security audit of the whole code,
                      in a separate context           in a separate context
```

| Level | Finds | Where it is triggered |
|---|---|---|
| Every push | A broken build, a lint failure | A `pre-push` git hook, and the CI |
| End of every change | A defect in the lines just written, against what the change set out to do | The last group of the change's task list, "Review" |
| Before every release | A line that became unsafe in a new context; what a per-change review cannot see | A step of the release procedure; a finding stops the release |

Why three and not one at the end: a review of a small change, while it is fresh and against its
stated intent, finds far more than a review of many changes at once; but it only sees the lines
that changed. A bug such as old code that becomes dangerous when new code feeds it untrusted
input shows only to a pass over everything that handles that input. Each level covers what the
other cannot.

## Decisions, and why

### Quick checks run on `pre-push`, not `pre-commit`
A commit is not yet shared, and a check that takes seconds on every commit trains people to skip
it. A push is the point where something reaches other people. The hook is advice made automatic;
the CI stays the real gate. Skipping it on purpose (`git push --no-verify`) is allowed.

### The hook tests the working tree and warns when it is not clean
The hook runs on the files on disk, not on the commits being pushed, so with uncommitted changes
or untracked files, or when the pushed ref is not the commit checked out (`git push origin
other-branch`), its result can differ from what is pushed. Three ways to handle that were
looked at:

- **Test the working tree, and warn when it is not clean or a pushed ref is not the checked-out
  commit (chosen).** This is the usual practice
  for pre-push hooks: a fast signal for the person pushing, with the CI as the guarantee.
- **Stash the changes while the checks run.** Common for `pre-commit` hooks, where the framework
  hides unstaged changes so only the staged content is tested. At push time it would touch the
  work in progress, and a failed `stash pop` is worse than a blocked push. A hook should not
  rewrite your files.
- **Test the pushed commit in a temporary `git worktree`.** Exact, but it needs setup per tool
  (a toolchain manager can refuse an untrusted config in a new folder) and costs a checkout.

A push that only deletes refs (an all-zero local sha on the hook's standard input) is skipped:
there is nothing to check, and a failing test would otherwise stop a branch from being deleted.
Every other push is checked, whatever the branch or tag: with one developer, a filter on the main
branch saves nothing, and a broken branch should not reach the remote either.

### No hook manager
A tool such as `pre-commit` or `lefthook` is a dependency for one short script. Git does not
version hooks, so the script lives in a tracked folder (`.githooks/`) and each checkout enables
it once with `git config core.hooksPath .githooks`. The cost is that a fresh clone has the hook
off until someone runs that command, which the development docs say; the CI catches what the
hook would.

### The review of a change is a task, set by a rule
Left to memory, the review is the first step dropped under pressure. In a spec-driven workflow
the change's task list is where work is tracked, so a rule on how task lists are written ("the
last group is Review") makes every change carry it, and a change cannot be finished without
ticking it. The rule says what to review (the change's diff, against its proposal and specs and
against the project's security notes) and not which tool to use, because agents and editors
differ.

### The review is done in a context separate from the one that wrote the code
The author of a change reads what they meant to write. In one project, the review run by the
agent that had just written the code reported no finding on a change; a review of the same
history in a separate context, with only the diff and the specs, found nine problems, mostly in
changes already reviewed "clean". Whatever carries the author's context (the same conversation,
the same agent session) will read the code the way the author did. So the rule asks for a
separate context: a review command that starts fresh, a reviewer agent that was not part of the
work, or a person. A pass by the author is still worth doing as a first sweep; it is not the
review.

### The release gets its own review and audit
Two checks, again in a separate context. A **code review of the whole release diff** (since the
last tag), because defects can sit between changes. A **security audit of the whole code**, not
the diff. Check what a review command actually covers: many review the pending changes or the
current diff only, so the release range or "the whole code" has to be given to it explicitly, or
the audit handed to a separate reviewer agent with the map. The audit should also follow the
data out of the project, into the commands it starts: in one project the browser launcher passed
the link through a service manager that expands `${VAR}` in arguments, so a `$` in a calendar
link could change the host the browser opened. Then follow each place where untrusted data
enters to each place it is used, using a written map of both (see below). Findings that are not
fixed stop the release.

### A written map of untrusted data
A table of sources of untrusted data, where each is used, the rule that keeps that use safe and
the test that holds the rule. It turns "think about security" into something that can be walked
and updated, and it is what the per-change and per-release reviews read against. A short list of
APIs the project does not use, because they run or load something from a string, is kept next to
it and enforced by a test: a new use has to be argued in the map first.

### Lists written by hand get a test
Indexes and component lists in docs go stale in silence, and the review then has to rediscover
the same drift every time. A tiny test that compares the list to the code costs less than the
review time it saves.

### No rules inside the coding agents for pushes
An instruction given to one agent applies to that agent only; the hook applies to everyone who
pushes from that checkout (a person, any agent, an editor). Keep agents for what only they can
do, the review in a separate context, and use the hook for the push.

## Taking it to another project

1. Copy `.githooks/pre-push`. Change the command it runs (`tests/run.sh --unit` here) to the
   project's quick checks, keep the deletion filter and the warning, and enable it with
   `git config core.hooksPath .githooks`. Say so in the development docs.
2. Add the rule for task lists. In OpenSpec it is `rules.tasks` in `openspec/config.yaml`; in
   another tracker, whatever sets the template of a change's tasks. Keep the three points: last
   group, the change's own diff against its intent and the security notes, a separate context.
3. Write the map: sources of untrusted data, uses, rules, tests; and the list of APIs not allowed
   with a test that enforces it. Start with the entry points (files, network, IPC, user config).
4. Add to the release procedure a step with a code review of the whole release diff and the
   security audit, both in a separate context, and the rule that an unfixed finding stops the
   release.
5. Add tests for the hand-written lists the project keeps, if any.

## Sources

- [Tips for using a git pre-commit hook](https://codeinthehole.com/tips/tips-for-using-a-git-pre-commit-hook/):
  test the staged content, not the working directory; stash what is not staged; keep checks fast.
- [Git hooks, by Flavio Copes](https://flaviocopes.com/git-hooks/): what a pre-push hook is for,
  and why a long test suite does not belong in it.
- [pre-commit: various ways to run hooks](https://adamj.eu/tech/2022/10/20/pre-commit-various-ways-to-run-hooks/):
  the `pre-commit` framework stashes unstaged changes for its hooks, and supports a pre-push
  stage.
- [Git documentation: githooks](https://git-scm.com/docs/githooks): the pre-push hook's input
  (one line per ref, `<local ref> <local sha> <remote ref> <remote sha>`) and `core.hooksPath`.
