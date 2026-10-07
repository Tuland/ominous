## ADDED Requirements

### Requirement: Optional values in the printed config
A key with optional values SHALL show them in the output of `config` and in the example file as
commented-out lines inside its list, after the active values, so that removing `//` enables one.
Values already active SHALL NOT be repeated as comments. Reading the output back SHALL give the
same configuration as before.

#### Scenario: Optional join hosts
- **WHEN** the user runs `omarchy-shell ominous config` with `joinHosts` not set
- **THEN** the `joinHosts` list holds the default hosts and, below them, the optional hosts each on a line starting with `//`

#### Scenario: Enabling one
- **WHEN** the user copies the output to `ominous.json` and removes `//` in front of one optional host
- **THEN** that host is trusted in addition to the default ones
