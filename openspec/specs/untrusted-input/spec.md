# untrusted-input Specification

## Purpose
Defines how Ominous treats data it does not control (calendar fields, payloads, theme files)
when it shows or uses it, so that a calendar's owner cannot make the card load anything, open
anything or run anything on the user's behalf.

## Requirements

### Requirement: Card text is plain text
Every text the card shows SHALL be rendered as plain text, never interpreted as rich text or
markup, whatever it contains. This covers the calendar name, the meeting title and location,
the theme captions, the tooltip, and the plugin's own labels, whatever element shows them.

#### Scenario: Markup in a calendar name
- **WHEN** an alert opens for a meeting whose calendar name is `<img src="https://example.com/x.png">Team`
- **THEN** the card shows those characters literally and makes no network request for the image

#### Scenario: A new text on the card
- **WHEN** a `Text`, `Label`, `TextEdit` or `TextArea` element without `textFormat: Text.PlainText` is added to the plugin's QML
- **THEN** the unit tests fail and name the file and line

#### Scenario: A tooltip that would read markup
- **WHEN** a Qt Quick Controls `ToolTip` element is added to the plugin's QML
- **THEN** the unit tests fail and point to the shell's plain-text tooltip instead

### Requirement: Recognized join hosts
`ominous.json` SHALL accept `joinHosts`, a list of host names. When the key is missing or is not
a list, the default list SHALL apply: `meet.google.com`, `zoom.us`, `zoom.com`, `zoomgov.com`,
`teams.microsoft.com`, `teams.live.com`, `teams.microsoft.us`, `teams.cloud.microsoft`,
`webex.com`, `meet.jit.si`, `whereby.com`, `gotomeeting.com`, `meet.goto.com`,
`v.ringcentral.com`, `8x8.vc`, `meet.proton.me`, `facetime.apple.com`. When it is a list, that
list SHALL be the whole set of recognized hosts, an empty list included; entries that are not
plain host names SHALL be dropped and reported as ignored values. A link SHALL be recognized
when its host equals a listed host or ends with a dot followed by a listed host, ignoring case.
Recognition SHALL mean only that the link goes to that meeting service; the documentation SHALL
say that it does not vouch for the meeting or its sender.

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
- **THEN** only `zoom.us` is recognized, and `status` lists the other two entries as ignored values

#### Scenario: RingCentral
- **WHEN** `joinHosts` is not set and meeting links are `https://v.ringcentral.com/join/123` and `https://community.ringcentral.com/x`
- **THEN** the first is recognized and the second is not

#### Scenario: A host with characters a host name cannot have
- **WHEN** a meeting link is `https://evil.com:80.meet.google.com/` or its host holds a `%` escape or an invisible character before a listed host
- **THEN** the link is not recognized, however its host ends

### Requirement: The host shown is the host opened
The host Ominous checks and shows SHALL be the one the browser connects to: the part of the
link after `https://` and before the first `/`, `?` or `#`, without any user information up to
the last `@`, without a port, in lower case. Wherever the host is shown, each character outside
printable ASCII SHALL appear as its `\uXXXX` escape, so that no character can hide, reorder or
imitate the others.

#### Scenario: User information in front of a trusted name
- **WHEN** a meeting link is `https://meet.google.com@evil.example/abc`
- **THEN** the host is `evil.example`, the link is not recognized, and the button reads "Join on evil.example"

#### Scenario: A right-to-left override in the host
- **WHEN** a meeting link's host starts with U+202E followed by `elpmaxe.live`
- **THEN** the button reads "Join on \u202eelpmaxe.live" (the escape written out, six ASCII characters), and the text is not shown reversed

#### Scenario: A look-alike letter
- **WHEN** a meeting link's host is `meet.google.com` with its first `e` written as the Cyrillic U+0435
- **THEN** the link is not recognized and the host is shown as `m\u0435et.google.com`

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
For an unrecognized link, a tooltip SHALL show the host, shortened to its last 64 characters
after "…" when longer, and say that it is not recognized and that adding it to `joinHosts` in
`~/.config/omarchy/ominous.json` makes Join the default for it. It SHALL show while Join is
selected, and while the pointer is over the "?" or after the "?" is clicked, until clicked again
or until the card closes. When the host contains characters outside ASCII, the tooltip SHALL
also say so, since such a host can imitate another. The tooltip text SHALL be plain text, in
lines of at most 65 characters so that it stays inside the card.

#### Scenario: Keyboard
- **WHEN** the card shows an unrecognized link and the user moves the selection to Join
- **THEN** the tooltip appears without the mouse, and disappears when the selection goes back to Dismiss

#### Scenario: Mouse
- **WHEN** the user clicks the "?"
- **THEN** the tooltip appears, and a second click hides it

#### Scenario: The next card
- **WHEN** the user clicks the "?", dismisses the card, and a new card opens for another unrecognized link
- **THEN** the new card opens without the tooltip

#### Scenario: A very long host
- **WHEN** a meeting link's host is 2000 characters long
- **THEN** the tooltip shows "…" and the host's last 64 characters on a line of their own, and no line of the tooltip is wider than the card

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

### Requirement: Calendar text is one bounded line
The meeting title, place and calendar name SHALL reach the card as single lines of limited
length: line breaks, other control characters, text-direction marks and overrides and zero-width
spaces SHALL become spaces (zero-width joiners stay, since emoji sequences need them),
runs of white space SHALL collapse, and the title and place SHALL be cut at 200 characters and
the calendar name at 80. A title that is empty after that SHALL read "Meeting". Each of the
card's lines of calendar text SHALL show at most the lines the layout allows for it, and SHALL
be drawn within them.

#### Scenario: Hundreds of line breaks in a place
- **WHEN** a meeting's place is 300 lines of text
- **THEN** the card keeps its size and the Join and Dismiss buttons stay on screen

#### Scenario: Stacked combining marks
- **WHEN** a meeting's title is made of letters each carrying dozens of combining marks
- **THEN** the marks are drawn only within the title's lines and do not cover the buttons

#### Scenario: A direction override in a title
- **WHEN** a meeting's title contains U+202E
- **THEN** the title is shown in reading order, with a space where the override was

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

### Requirement: A malformed agenda entry is skipped
An entry of OmaCal's agenda that is not an object SHALL be skipped when choosing the next
alert; the other entries SHALL still alert as usual.

#### Scenario: A null entry in the agenda
- **WHEN** the agenda holds `null` and a meeting due now
- **THEN** the card opens for the meeting, once

### Requirement: A bounded agenda read
Each agenda refresh SHALL accept at most 1 MiB (1048576 bytes) of OmaCal's output and SHALL stop
reading after one more byte, so the shell never holds more than 1048577 bytes of it. A larger
output SHALL be refused as an error, named in the log and in `status` (`lastError`), and the
events read before SHALL stay in use until a refresh succeeds.

#### Scenario: An output over the limit
- **WHEN** OmaCal prints more than 1 MiB
- **THEN** `status` shows `lastError` "agenda too large", and a meeting from the previous refresh still alerts when it is due while the error lasts

#### Scenario: Back under the limit
- **WHEN** a refresh after an oversize one reads a valid agenda
- **THEN** `lastError` is empty again and the new agenda is used

#### Scenario: An output at the limit
- **WHEN** OmaCal prints exactly 1048576 bytes of valid agenda JSON
- **THEN** the agenda is read and used as usual

#### Scenario: Text outside ASCII near the limit
- **WHEN** OmaCal prints more than 1048576 bytes whose text, counted in characters, is under 1048576
- **THEN** the output is refused as too large, not read as a broken agenda

### Requirement: An open card follows the calendar
While a card opened by an agenda alert is on screen, each refresh SHALL compare its meeting with
the agenda and, when the meeting changed, update the card as the following requirements say. A
card the user dismissed SHALL NOT reopen, a card opened by `test` or `preview` SHALL NOT be
changed or closed by a refresh, and a card counting down to close SHALL NOT be followed any more.
A change of the user's own config SHALL NOT count as a calendar change.

#### Scenario: Nothing changes
- **WHEN** a card is open and a refresh brings its meeting unchanged, including right after the card was updated
- **THEN** the card stays as it is: the selection and the input guard are not reset

#### Scenario: The user dismissed the card
- **WHEN** the user dismisses a card and a refresh then brings its meeting with a changed link
- **THEN** no card opens until another alert is due

#### Scenario: The config changes while a card is open
- **WHEN** a card is open and the user removes its calendar from `calendars` before the next refresh
- **THEN** the card stays as it is

#### Scenario: A test or preview card
- **WHEN** the card on screen was opened by `test` or `preview` and a refresh brings changes to the meeting of an earlier agenda card
- **THEN** the refresh does not change or close the test or preview card on that account; an alert that falls due replaces it, as before

### Requirement: A changed meeting updates the card with a note
When the title, end, place, calendar or link the card would show changed and the meeting still
alerts, the card SHALL show the
new values and the line "Changed in your calendar: " followed by the names of the changed fields
(`title`, `end`, `place`, `calendar`, `link`). The selection SHALL follow the usual rule for the
new link, and the input guard SHALL restart. The note SHALL hold no text from the calendar.

#### Scenario: The link changes
- **WHEN** a card is open for a meeting and a refresh brings it with its link changed from `https://meet.google.com/abc` to `https://evil.example/x`
- **THEN** the card shows "Changed in your calendar: link" and "Join on evil.example" with Dismiss selected, and Join opens the new link, never the old one

#### Scenario: The link changes to another recognized link
- **WHEN** the link changes from `https://meet.google.com/abc` to `https://meet.google.com/xyz`
- **THEN** the card shows "Changed in your calendar: link", Join is selected, and Join opens the new link

#### Scenario: Two fields change
- **WHEN** a refresh brings the meeting with another title and another place
- **THEN** the card shows them and "Changed in your calendar: title, place"

### Requirement: A removed or declined meeting counts down and closes
When the card's meeting is no longer in the agenda or no longer alerts, and has not moved, the card SHALL keep the
meeting's last values, hide Join, select Dismiss, and show "Declined in your calendar" when the
user declined it, else "Removed from your calendar", followed by " - closing in N s", counting
down from 15. At zero, or at the meeting's end if sooner, the card SHALL close; Esc and Dismiss
SHALL close it at once.

#### Scenario: Cancelled
- **WHEN** a card is open and a refresh no longer holds its meeting
- **THEN** the card shows "Removed from your calendar - closing in 15 s", counts down, and closes 15 seconds later

#### Scenario: Declined
- **WHEN** a card is open and a refresh holds its meeting declined
- **THEN** the card shows "Declined in your calendar - closing in 15 s" without a Join button

#### Scenario: Closed early
- **WHEN** the countdown shows and the user presses Esc after the input guard
- **THEN** the card closes at once

### Requirement: A moved meeting counts down and closes
When the card's meeting moved to another start (the same meeting, not part of a recurring series)
and still alerts, the card SHALL keep its last values, hide Join, select Dismiss, and show
"Moved to HH:MM" (with the weekday when not today) followed by " - closing in N s", counting down
from 15; at zero, or at the meeting's end if sooner, it SHALL close. The meeting SHALL alert again
for its new start, if that start is still ahead.

#### Scenario: Moved later
- **WHEN** a card is open at 9:59:30 for a 10:00 meeting with `leadSeconds` 60 and a refresh moves it to 15:00
- **THEN** the card shows "Moved to 15:00 - closing in 15 s" with the old title and time and no Join button, closes 15 seconds later, and a new card opens at 14:59

#### Scenario: Moved by one minute
- **WHEN** a card is open at 9:59:30 for a 10:00 meeting with `leadSeconds` 60 and a refresh moves it to 10:01
- **THEN** the card shows "Moved to 10:01 - closing in 15 s", and a card for 10:01 opens at 10:00

#### Scenario: Moved to another day
- **WHEN** a refresh moves the meeting to tomorrow at 9:00
- **THEN** the note reads "Moved to <weekday> 09:00 - closing in 15 s"

#### Scenario: Moved and declined
- **WHEN** a refresh moves the meeting and it is declined
- **THEN** the card shows "Declined in your calendar - closing in 15 s"

#### Scenario: A recurring meeting
- **WHEN** a card is open for a meeting of a recurring series and a refresh no longer holds that occurrence at its start
- **THEN** the card shows "Removed from your calendar - closing in 15 s", never "Moved"

### Requirement: New alerts wait for a closing card
While a card counts down to close, a new alert SHALL wait until the countdown ends or the card
closes, so the note can be read; nothing SHALL be marked as alerted while it waits.

#### Scenario: Moved into the alert window
- **WHEN** a card is open for a 10:00 meeting with `leadSeconds` 900 and at 9:50 a refresh moves it to 10:05
- **THEN** the card shows "Moved to 10:05 - closing in 15 s" for its whole countdown, and the card for 10:05 opens within 5 seconds of the countdown ending, or of the user closing the note

#### Scenario: Another meeting falls due during the countdown
- **WHEN** a card counts down to close and another meeting falls due
- **THEN** the countdown runs to its end (or until the user closes the card), then the other meeting's card opens within 5 seconds

### Requirement: A card that cannot follow closes
When an open card cannot be updated (the overlay refuses the update), or the shell cannot tell
whether the card is still open, a change to its meeting SHALL close the card rather than leave the
old meeting on screen.

#### Scenario: The update is refused
- **WHEN** a refresh changes the meeting of an open card and the overlay refuses the update
- **THEN** the card closes

#### Scenario: No way to know if the card is open
- **WHEN** the shell offers no way to ask whether the card is open and a refresh changes the meeting of the card it opened
- **THEN** the card is hidden, and no card is opened for the change
