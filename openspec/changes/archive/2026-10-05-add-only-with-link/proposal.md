# Proposal

## Why

Some calendars mix meetings you join online with entries that only block time: focus slots,
in-person sessions, reminders. An alert that takes over the screen is worth it when there is a
call to join, and noise otherwise. Some users want the card only for meetings they can join with
one click.

## What Changes

- New `ominous.json` key `onlyWithLink` (boolean, default `false`). When `true`, an event alerts
  only if it has a join link the card would open: OmaCal's `conference` field holding an
  `https://` URL (the same rule as the Join button, `Logic.safeUrl`). A link written only in the
  event's location does not count. A value that is not `true` reads as `false`.
- The `status` counts follow the same rule, since they use the same filter.
- `docs/configuration.md` and `docs/usage.md` document the key.

## Capabilities

### New Capabilities
- `meeting-selection`: which calendar events raise an alert. This change adds the join-link
  rule; the existing rules (calendars, all-day, declined, grace period) are not restated here.

### Modified Capabilities
None.

## Impact

`Logic.js` (`normalizeConfig`, `isAlertable`), unit tests, `docs/configuration.md`,
`docs/usage.md`. No QML change.
