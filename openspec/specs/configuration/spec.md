# configuration Specification

## Purpose
Defines how Ominous reads `ominous.json` (comments, unknown keys, refused values, unreadable files) and how the
user sees the complete effective configuration, with the example file and the JSON Schema that go
with it, without Ominous ever writing the user's file.

## Requirements

### Requirement: Comments and trailing commas in the config file
`~/.config/omarchy/ominous.json` SHALL be read as JSON that may also contain `//` line comments
and a trailing comma before a closing `]` or `}`. Text inside a string, including `//`, SHALL be
read as part of the string. A UTF-8 byte order mark at the start of the file SHALL be ignored.
A file without comments, trailing commas or a byte order mark SHALL read exactly as before. A
file that holds nothing but comments and white space SHALL read as an empty file.

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

#### Scenario: Only comments
- **WHEN** `ominous.json` holds only `// nothing yet`, or only blank lines
- **THEN** every key has its default and `configError` is empty

### Requirement: Unknown and unreadable config reported
Keys in `ominous.json` that Ominous does not use SHALL be ignored and reported, except
`$schema`, which editors use and Ominous ignores silently: the `status`
command SHALL list them in `unknownKeys`, and the shell log SHALL name them each time the file
is read. A value of a known key that Ominous ignores (wrong type, out of range, an invalid list
entry) SHALL be reported the same way in `ignoredValues`, naming the key and the value. A file
that cannot be read SHALL give the defaults for every key, and `status` SHALL report why in
`configError`. None of these SHALL show anything on the alert card. Names and values SHALL be
printed escaped, each on one line, a key nested under `themes` included. A file that is absent
SHALL give the defaults without a `configError`; a file that exists but cannot be read SHALL set
it.

#### Scenario: A misspelt key
- **WHEN** `ominous.json` holds `{ "leadsecond": 30 }`
- **THEN** the lead time keeps its default, `status` lists `leadsecond` in `unknownKeys`, and the shell log names it

#### Scenario: A value out of range
- **WHEN** `ominous.json` holds `{ "leadSeconds": 9999 }`
- **THEN** the lead time keeps its default, and `ignoredValues` in `status` and the shell log name `leadSeconds` and `9999`

#### Scenario: A value that is normalized, not ignored
- **WHEN** `ominous.json` holds `{ "leadSeconds": 90.4, "calendars": ["Work@Example.com"] }`
- **THEN** the lead time is 90, the calendar is matched without regard to case, and `ignoredValues` is empty

#### Scenario: A calendar entry that is not text
- **WHEN** `ominous.json` holds `{ "calendars": [{ "toString": null }, "Work"] }`
- **THEN** the file is read, `work` is the only calendar, and `ignoredValues` names the other entry

#### Scenario: A key with a line break
- **WHEN** `ominous.json` has an unknown key whose name contains an escaped line break
- **THEN** the shell log names it on a single line, with the line break escaped

#### Scenario: A file that is not an object
- **WHEN** `ominous.json` holds `[]`, `5`, `null` or `{ "themes": [] }`
- **THEN** every key has its default, and `ignoredValues` in `status` names the file or `themes` and the value

#### Scenario: A misspelt mode inside themes
- **WHEN** `ominous.json` holds `{ "themes": { "Playful": "boss" } }`
- **THEN** the playful theme keeps its default and `ignoredValues` names `themes.Playful`

#### Scenario: A line break in a key under themes
- **WHEN** `ominous.json` holds `{ "themes": { "a\nb": "x" }, "leadSeconds": 30 }`, the key written with an escaped line break
- **THEN** `ignoredValues` and the shell log name it on one line, and the output of `config` reads back with `leadSeconds` 30

#### Scenario: A file that cannot be read
- **WHEN** `ominous.json` exists but the user cannot read it
- **THEN** every key has its default and `status` reports a non-empty `configError`

#### Scenario: Broken JSON
- **WHEN** `ominous.json` is not valid even with comments and trailing commas allowed
- **THEN** every key has its default and `status` reports a non-empty `configError`

#### Scenario: A clean file
- **WHEN** `ominous.json` holds only known keys with valid values
- **THEN** `unknownKeys`, `ignoredValues` and `configError` are all empty

### Requirement: Printing the complete config
The `config` IPC command SHALL print a complete config file in the format above: every key
Ominous reads, in a fixed order, each with a one-line comment saying what it does, set to the
user's value when `ominous.json` sets it and to the default otherwise. When the file has unknown
keys or ignored values, comments at the top SHALL list them, escaped so that each stays on its
comment line. The command SHALL NOT write or change any file. Its output SHALL read back to the
same configuration.

#### Scenario: Seeing a key added by an update
- **WHEN** the user's `ominous.json` sets only `leadSeconds` and they run `omarchy-shell ominous config`
- **THEN** the output shows `leadSeconds` with their value and every other key with its default, each with its comment

#### Scenario: Round trip
- **WHEN** the output of `config` is saved as `ominous.json`
- **THEN** the effective configuration is the same as before

#### Scenario: Nothing is written
- **WHEN** the user runs `config`
- **THEN** `ominous.json` and every other file are unchanged

#### Scenario: Ignored values at the top
- **WHEN** `ominous.json` holds `{ "leadSeconds": 9999 }` and the user runs `config`
- **THEN** a comment at the top names `leadSeconds` and `9999`, and the key below shows the default 60

#### Scenario: An unknown key with a line break
- **WHEN** `ominous.json` has an unknown key whose name contains an escaped line break and the user runs `config`
- **THEN** the output still reads back to the same configuration, with no error

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
- **THEN** that host is recognized in addition to the default ones
