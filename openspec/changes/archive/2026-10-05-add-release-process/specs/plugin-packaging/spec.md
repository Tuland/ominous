## ADDED Requirements

### Requirement: Changelog
The repository root SHALL contain `CHANGELOG.md` with an `Unreleased` section on top for
changes not yet released, then one section per released version, newest first, each headed by
the version and its release date and listing the user-visible changes. The newest released
version SHALL equal the manifest's `version`. A change that a user of the previous version must
act on, such as a new plugin ID, SHALL say what to do.

#### Scenario: Changelog matches the manifest
- **WHEN** the unit tests run
- **THEN** `CHANGELOG.md` has an `Unreleased` section, and its newest released version equals `manifest.json`'s `version`

#### Scenario: Version raised without an entry
- **WHEN** the manifest's `version` is raised and `CHANGELOG.md` has no section for it
- **THEN** the unit tests fail and name the missing version
