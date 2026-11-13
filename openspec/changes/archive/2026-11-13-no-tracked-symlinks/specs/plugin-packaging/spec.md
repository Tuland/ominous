## ADDED Requirements

### Requirement: No symlinks in the repository
The repository SHALL track no symbolic link, because the marketplace refuses a plugin folder
that holds one and the plugin folder is the repository root. The links `openspec update`
makes in `.claude/skills/` SHALL be ignored by git, each by its name.

#### Scenario: A tracked link is caught before the push
- **WHEN** a symlink is added to the git index
- **THEN** the unit tests fail, naming the link
