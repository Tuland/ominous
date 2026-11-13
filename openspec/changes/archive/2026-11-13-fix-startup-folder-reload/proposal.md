# Proposal

## Why

On the first start after the update to Omarchy 4.5.0 (Quickshell 0.3.2, Qt 6.12), the service
logged `TypeError: Property 'reloadUserFile' of object ThemeSlot_QMLTYPE_812 is not a function`
from the handler that runs once `mkdir` has created the state and user themes folders. The
handler stopped there, so neither theme slot re-read its user file, and on a machine where the
themes folder had just been created a user theme added later was not watched until a restart.
The error did not come back on later starts or plugin reloads, so it depends on startup timing:
the handler called a method on another object of the service from a process signal.

## What Changes

- The service no longer calls methods on its theme slots, or on its state files, when the
  folders are ready. It sets one property, `dirsReady`, and the files that live in those folders
  take their paths from it, as does the folder listing used by `themes`: until the folders
  exist their path is empty, then it is set, and each one loads and watches itself.
- `ThemeSlot.reloadUserFile()` and `ThemeFile.reload()` are removed: nothing calls them.
- `tools/lint.sh` passes again under Qt 6.12: four `var` declared inside a block in
  `Service.qml` become `let`/`const` (qmllint 6.12 counts them as warnings).
- No change to themes, modes, commands or configuration.

## Capabilities

### New Capabilities

### Modified Capabilities

- `alert-themes`: the "Theme files" requirement gains a scenario for a first start without the
  user themes folder.

## Impact

`Service.qml`, `components/ThemeSlot.qml`, `components/ThemeFile.qml`. No API, config or
packaging change. Checked against the Omarchy 4.5.0 shell: the `qs.Commons` tokens, the plugin
shell API (`summon`, `hide`) and the service loader used by Ominous are unchanged, and no
migration touches the plugin.
