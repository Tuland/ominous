# Design

## Context

`Service.qml` starts `mkdir -p <stateDir> <userThemesDir>` and, in `onExited`, called
`stateFile.reload()`, `themesFile.reload()`, then `professionalTheme.reloadUserFile()` and
`playfulTheme.reloadUserFile()`. A file can only be watched once its folder exists, hence the
reload. Under Omarchy 4.5.0 the first start failed on the third call: the two `FileView` calls
worked, the typed QML method on the `ThemeSlot` instance was not found. Later starts, and six
`rescanPlugins` in a row, did not repeat it; the exact cause inside the shell's startup (it
reloads plugins and clears the component cache while booting) could not be reproduced.

## Goals / Non-Goals

**Goals:**
- No cross-object method call in the startup path, so the failure cannot recur whatever its
  trigger.
- User and state files load and are watched once their folders exist, as before.

**Non-Goals:**
- Changing the shell (read only) or the way it loads plugins.

## Decisions

- A `dirsReady` property on the service, set to `true` in `onExited`. Bindings replace the
  imperative reloads: `stateFile`, `themesFile`, each slot's user file and the user themes
  folder listing have an empty path until `dirsReady`, then their real one. A `FileView` loads and starts watching when its path
  changes, so no reload call is needed. Alternative kept out: guarding the calls with
  `typeof ... === "function"` would hide the error and leave the slot unloaded.
- The slot's user path is empty while `userDir` is empty; `Logic.pickTheme` already treats the
  user file's `loading` status as pending, and the slot shows plain defaults meanwhile.

## Risks / Trade-offs

- The `theme` command answers "not ready yet, try again" in the few milliseconds before the
  folders exist, instead of saving to a file that has no path yet.
- A failed `mkdir` is logged and still sets `dirsReady`, so the files report themselves missing
  as before. If `mkdir` could not even be started and the process never exited, the state and
  user theme files would not load; `mkdir` is part of coreutils, so this is accepted.

- The mode and theme choice are read a few milliseconds later (after `mkdir`). An alert cannot
  fire before the first agenda poll, which also runs a process, so nothing visible changes.
