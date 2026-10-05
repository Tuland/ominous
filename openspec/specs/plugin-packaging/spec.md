# plugin-packaging Specification

## Purpose
Defines how Ominous is identified, installed, removed and presented, so it meets the Omarchy
plugin marketplace's submission rules when the repository goes public.

## Requirements

### Requirement: Permanent plugin ID
The plugin ID SHALL be `io.github.tuland.ominous`. Every place that names the plugin SHALL use
that same ID: the manifest, the code's fallbacks, the test scripts and the documentation. The
IPC target SHALL remain `ominous`.

#### Scenario: One ID everywhere
- **WHEN** the unit tests run
- **THEN** every plugin ID written in the code, the scripts and the documentation equals the manifest's `id`

#### Scenario: Commands unchanged
- **WHEN** the plugin is enabled under the new ID
- **THEN** `omarchy-shell ominous status` answers as before

### Requirement: Install and removal instructions
The README SHALL show how to install with `omarchy plugin add` and the repository URL, and how
to remove with `omarchy plugin remove` and the plugin ID. It SHALL name every file and folder
Ominous creates outside the plugin folder, and how to delete them. Ominous SHALL never overwrite
a configuration file it did not create.

#### Scenario: Removing leaves nothing unexplained
- **WHEN** a user follows the README's removal steps
- **THEN** the plugin is removed, and the README has named each leftover: `~/.config/omarchy/ominous.json`, `~/.config/omarchy/ominous/` and `~/.local/state/ominous/`

### Requirement: Declared dependencies
The README SHALL list what Ominous needs to run: an Omarchy shell with plugin support, and OmaCal
with the `omacal` command on the PATH and at least one synced calendar. The tools used only for
development and tests SHALL be listed in the development documentation.

#### Scenario: OmaCal is a stated requirement
- **WHEN** a user reads the README before installing
- **THEN** the README says that Ominous needs OmaCal, and links to it

### Requirement: Preview image
The repository root SHALL contain `preview.png`, at least 1600x900 pixels, showing the alert
card. The image SHALL be built from the plugin's own rendering on a generated background, and
SHALL NOT contain any part of a real desktop, real calendar data or personal data.

#### Scenario: Preview present
- **WHEN** the unit tests run
- **THEN** `preview.png` exists in the repository root and is at least 1600x900

#### Scenario: Preview regenerated
- **WHEN** a developer runs `tools/make-preview.sh` with the shell running
- **THEN** a new `preview.png` is composed from crops of the synthetic preview card only
