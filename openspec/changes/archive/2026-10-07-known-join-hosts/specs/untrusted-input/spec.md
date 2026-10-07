## ADDED Requirements

### Requirement: Trusted join hosts
`ominous.json` SHALL accept `joinHosts`, a list of host names. When the key is missing or is not
a list, the default list SHALL apply: `meet.google.com`, `zoom.us`, `zoom.com`, `zoomgov.com`,
`teams.microsoft.com`, `teams.live.com`, `teams.microsoft.us`, `teams.cloud.microsoft`,
`webex.com`, `meet.jit.si`, `whereby.com`, `gotomeeting.com`, `meet.goto.com`,
`ringcentral.com`, `8x8.vc`, `meet.proton.me`, `facetime.apple.com`. When it is a list, that list
SHALL be the whole set of trusted hosts, an empty list included; entries that are not plain host
names SHALL be dropped. A link SHALL be recognized when its host equals a listed host or ends
with a dot followed by a listed host, ignoring case.

#### Scenario: A subdomain of a listed host
- **WHEN** a meeting link is `https://us02web.zoom.us/j/123` and `joinHosts` is not set
- **THEN** the link is recognized

#### Scenario: A look-alike host
- **WHEN** a meeting link is `https://zoom.us.evil.example/j/1` or `https://evilzoom.us/j/1`
- **THEN** the link is not recognized

#### Scenario: The user's list replaces the default
- **WHEN** `joinHosts` is `["meet.acme.example"]`
- **THEN** `https://meet.acme.example/x` is recognized and `https://meet.google.com/abc` is not

#### Scenario: An empty list
- **WHEN** `joinHosts` is `[]`
- **THEN** no link is recognized

#### Scenario: Invalid entries
- **WHEN** `joinHosts` is `["https://zoom.us/", "Zoom.US", "not a host"]`
- **THEN** only `zoom.us` is trusted

### Requirement: The host shown is the host opened
The host Ominous checks and shows SHALL be the one the browser connects to: the part of the
link after `https://` and before the first `/`, `?` or `#`, without any user information up to
the last `@`, without a port, in lower case.

#### Scenario: User information in front of a trusted name
- **WHEN** a meeting link is `https://meet.google.com@evil.example/abc`
- **THEN** the host is `evil.example`, the link is not recognized, and the button reads "Join on evil.example"

### Requirement: Only a recognized link is the default action
When a meeting has a recognized link, the card SHALL open with Join selected and the button
SHALL read "Join on <service>", as before. When the link is not recognized, the card SHALL open
with Dismiss selected, the button SHALL read "Join on <host>", and a "?" SHALL appear next to
it; Join stays one arrow key or one click away. A host longer than fits SHALL be shortened from
its start with "…", keeping its end. Cards with a recognized link or no link SHALL show nothing
new.

#### Scenario: Unknown link and Enter
- **WHEN** an alert opens for a meeting whose link is `https://evil.example/x` and the user presses Enter after the input guard
- **THEN** the card is dismissed and nothing is opened

#### Scenario: Unknown link chosen on purpose
- **WHEN** the user moves the selection to "Join on evil.example" and presses Enter
- **THEN** the link opens in the browser

#### Scenario: Recognized link
- **WHEN** an alert opens for a meeting whose link is `https://meet.google.com/abc-defg-hij`
- **THEN** Join is selected, the button reads "Join on Meet", and no "?" is shown

### Requirement: Explaining an unrecognized link
For an unrecognized link, a tooltip SHALL show the host and say that it is not recognized and
that adding it to `joinHosts` in `~/.config/omarchy/ominous.json` makes it trusted. It SHALL show
while Join is selected, and while the pointer is over the "?" or after the "?" is clicked, until
clicked again. When the host contains characters outside ASCII, the tooltip SHALL also say so,
since such a host can imitate another. The tooltip text SHALL be plain text.

#### Scenario: Keyboard
- **WHEN** the card shows an unrecognized link and the user moves the selection to Join
- **THEN** the tooltip appears without the mouse, and disappears when the selection goes back to Dismiss

#### Scenario: Mouse
- **WHEN** the user clicks the "?"
- **THEN** the tooltip appears, and a second click hides it
