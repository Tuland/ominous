# Tasks

## 1. Tools

- [x] 1.1 `tests/live.sh`: a `backup` function; a failed copy prints why and exits 1 before the `cleanup` trap is set
- [x] 1.2 `tools/shoot-card.sh`: `card_on_output` checks the `ominous-alert` layer on `$output` before `grim`; a try without it hides the card and fails; the final message says the card never showed alone

## 2. Checks

- [x] 2.1 `mise exec -- tests/run.sh --unit` passes (unit, art, lint)
- [x] 2.2 `live.sh` with a `HOME` whose `state.json` cannot be read exits 1 at the backup and leaves the file in place
- [x] 2.3 `shoot-card.sh` with `shell summon` stubbed out reports the card missing three times, exits 1 and writes no picture; a real run writes the card alone

- [x] 2.4 Review findings: `cleanup` copies each backup over the file (folder recreated), removes a file that had none, and keeps the backup folder with its path printed when a copy fails; `backup` refuses a symlink; the layer check discards Python's stderr; the header of `shoot-card.sh` names the new check. Checked with the two functions run alone under a scratch `HOME`: a removed state folder is restored, a read-only home keeps the backup and prints its path, a symlink stops the run with its target untouched; `tests/run.sh --unit` passes

## 3. Review

- [x] 3.1 Code review and security review of this change's diff, run in a separate context (`/code-review`, `/security-review` or a reviewer agent that did not write the change), against the proposal, the design and the Security section; fix the findings or take them to the user
