# configuration Specification

## Purpose
Defines how Ominous reads `ominous.json` (comments, unknown keys, unreadable files) and how the
user sees the complete effective configuration, with the example file and the JSON Schema that go
with it, without Ominous ever writing the user's file.

## Requirements

### Requirement: Comments and trailing commas in the config file
`~/.config/omarchy/ominous.json` SHALL be read as JSON that may also contain `//` line comments
and a trailing comma before a closing `]` or `}`. Text inside a string, including `//`, SHALL be
read as part of the string. A UTF-8 byte order mark at the start of the file SHALL be ignored.
A file without comments, trailing commas or a byte order mark SHALL read exactly as before.

#### Scenario: A commented-out option
- **WHEN** `ominous.json` holds `{ "leadSeconds": 120, // "dim": 0.5` on one line and `}` on the next
- **THEN** the lead time is 120 seconds and `dim` keeps its default

#### Scenario: A link inside a string
- **WHEN** a string value in `ominous.json` contains `https://example.com/a//b`
- **THEN** the value is read whole, `//` included

#### Scenario: A byte order mark
- **WHEN** `ominous.json` starts with the UTF-8 byte order mark and is otherwise valid
- **THEN** it is read as if the mark were absent

#### Scenario: A trailing comma
- **WHEN** the last element of a list or object in `ominous.json` is followed by a comma
- **THEN** the file is read as if the comma were absent

### Requirement: Unknown and unreadable config reported
Keys in `ominous.json` that Ominous does not use SHALL be ignored and reported, except
`$schema`, which editors use and Ominous ignores silently: the `status`
command SHALL list them in `unknownKeys`, and the shell log SHALL name them each time the file
is read. A file that cannot be read SHALL give the defaults for every key, and `status` SHALL
report why in `configError`. Neither SHALL show anything on the alert card.

#### Scenario: A misspelt key
- **WHEN** `ominous.json` holds `{ "leadsecond": 30 }`
- **THEN** the lead time keeps its default, `status` lists `leadsecond` in `unknownKeys`, and the shell log names it

#### Scenario: Broken JSON
- **WHEN** `ominous.json` is not valid even with comments and trailing commas allowed
- **THEN** every key has its default and `status` reports a non-empty `configError`

#### Scenario: A clean file
- **WHEN** `ominous.json` holds only known keys
- **THEN** `unknownKeys` is empty and `configError` is empty

### Requirement: Printing the complete config
The `config` IPC command SHALL print a complete config file in the format above: every key
Ominous reads, in a fixed order, each with a one-line comment saying what it does, set to the
user's value when `ominous.json` sets it and to the default otherwise. When the file has unknown
keys, a comment at the top SHALL list them. The command SHALL NOT write or change any file. Its
output SHALL read back to the same configuration.

#### Scenario: Seeing a key added by an update
- **WHEN** the user's `ominous.json` sets only `leadSeconds` and they run `omarchy-shell ominous config`
- **THEN** the output shows `leadSeconds` with their value and every other key with its default, each with its comment

#### Scenario: Round trip
- **WHEN** the output of `config` is saved as `ominous.json`
- **THEN** the effective configuration is the same as before

#### Scenario: Nothing is written
- **WHEN** the user runs `config`
- **THEN** `ominous.json` and every other file are unchanged

### Requirement: Example config file
The repository SHALL contain `docs/ominous.example.jsonc`, equal to the output of `config` for
an absent `ominous.json`: every key at its default, with its comment.

#### Scenario: The example falls behind
- **WHEN** a key, a default or a comment changes in the code and the example file is not regenerated
- **THEN** the unit tests fail and say how to regenerate it

### Requirement: JSON Schema for editors
The repository SHALL contain `docs/ominous.schema.json`, a JSON Schema describing every key
Ominous reads: its type, its allowed values or range, its default and a one-line description.
The output of `config` and the example file SHALL start with a `"$schema"` key pointing to it.
The schema, the defaults Ominous applies and the comments of `config` SHALL come from one
declaration per key, so they cannot disagree.

#### Scenario: Editor help
- **WHEN** the user opens a config that starts with the `"$schema"` key in an editor with JSON Schema support
- **THEN** the editor completes the key names and flags a value of the wrong type or out of range

#### Scenario: The schema falls behind
- **WHEN** a key, a default, a range or a description changes in the code and the schema file is not regenerated
- **THEN** the unit tests fail and say how to regenerate it

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
