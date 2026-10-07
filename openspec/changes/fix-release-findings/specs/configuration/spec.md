## MODIFIED Requirements

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
