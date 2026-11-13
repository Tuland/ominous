## ADDED Requirements

### Requirement: A malformed agenda entry is skipped
An entry of OmaCal's agenda that is not an object SHALL be skipped when choosing the next
alert; the other entries SHALL still alert as usual.

#### Scenario: A null entry in the agenda
- **WHEN** the agenda holds `null` and a meeting due now
- **THEN** the card opens for the meeting, once
