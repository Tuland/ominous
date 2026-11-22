# Design

## Context

Both scripts run against the user's live shell. `live.sh` changes `state.json`, `themes.json`
and a user theme named `marine`, and its `cleanup` trap restores them; `shoot-card.sh` summons
a synthetic card on an opaque veil and photographs the focused monitor with `grim`.

## Goals / Non-Goals

**Goals:**
- `live.sh` never loses a user file: not when the backup fails, not when the restore fails.
- `shoot-card.sh` never writes a capture taken without the card on that monitor.

**Non-Goals:**
- The two low findings of the same review (a link that changes under an open card, the
  unbounded agenda read): plugin behavior, for a change of their own.

## Decisions

- A failed backup exits before the `cleanup` trap is installed, so nothing is changed and
  nothing is restored. The trap is already set only after the backups; the fix is that a
  failed copy no longer lets the run continue.
- The restore found in this change's review: the old cleanup removed the originals, copied the
  backups back unchecked, then deleted the backup folder anyway. Now each backup is copied
  over the file (its folder recreated first), a file with no backup is removed as before, and
  any failed copy keeps the backup folder and prints where it is.
- A symlink among the three files stops the run, like a failed copy: the checks write those
  paths, and through a link they would change the target, which the restore would not undo.
- The three files and their backup names are two arrays walked by both functions, so the
  backup and the restore cannot drift apart.
- The card check reads `hyprctl layers -j` under the captured monitor's name, the same layer
  namespace `live.sh`'s `overlay_open` uses. Checking the monitor, not only the layer, also
  catches a focus change between the start of the script and the capture.
- `hyprctl` failing or printing nothing makes the check fail quietly (stderr of the Python
  check discarded): a failed try, not a traceback.
- The check sees the layer mapped, not finished fading in; `only_card` still refuses a capture
  where the desktop shows through. No extra wait for that.
- A try without the card hides it and waits like a try with a notification on screen, inside
  the same three tries.
