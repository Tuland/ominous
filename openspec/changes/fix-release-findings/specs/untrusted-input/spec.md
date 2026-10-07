## MODIFIED Requirements

### Requirement: A link has a host
A meeting link SHALL be used only when it is an `https://` link of at most 2048 characters,
without white space, backslashes, control characters, `$` or `--private`, and with a host, free
of `%` escapes, after the user information, the port and the dots are removed. Any other link
SHALL be treated as no link at all: no Join button, no default action. The `$` is refused
because the browser is started through systemd, which expands `${VAR}` in its arguments;
`--private` because the Omarchy browser launcher replaces it, inside any argument, with the
browser's private-window flag.

#### Scenario: An empty authority
- **WHEN** a meeting link is `https:///evil.com/x`
- **THEN** the card shows no Join button, because a browser could open `evil.com` while the card has no host to show

#### Scenario: A variable before a known host
- **WHEN** a meeting link is `https://evil.example${HOME}@meet.google.com/abc`
- **THEN** the card shows no Join button, since systemd would turn the link into one whose host is `evil.example`

#### Scenario: An escaped host
- **WHEN** a meeting link is `https://evil%2Eexample/`
- **THEN** the card shows no Join button, since the browser would open `evil.example`

#### Scenario: A host the launcher rewrites
- **WHEN** a meeting link is `https://meet--private.example.com/x`
- **THEN** the card shows no Join button, since the launcher would open `meet--incognito.example.com`

### Requirement: The input guard waits for a pause
Keys and clicks SHALL be ignored for the first second after the card opens. A key pressed while
input is ignored SHALL start that second again, so the card SHALL take input only after a pause
of one second without keys. A key that ends a pause SHALL act as usual. Whether input is
ignored SHALL be decided at the moment of the key or click, not from an earlier clock tick.

#### Scenario: Typing when the card appears
- **WHEN** an alert with Dismiss selected opens while the user presses Space every 300 ms for two seconds
- **THEN** the card stays open

#### Scenario: A key after a pause
- **WHEN** the user stops typing for a second and then presses Space
- **THEN** the selected button is activated
