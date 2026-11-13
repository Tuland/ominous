# Design

## Context

`nextDue` read `fired[eventKey(ev)]` before `isDueNow(ev)`; `claimDue` read `other.startMs`
before `isAlertable(other)`. `isAlertable` already returns false for anything that is not an
object; only `null` made the old order throw.

## Goals / Non-Goals

**Goals:**
- Close every finding of the 0.3.1 review and audit before the release.

**Non-Goals:**
- A spec scenario for a failed `mkdir`: it is logged and the files report themselves missing,
  as before 0.3.1.

## Decisions

- Reorder the checks in the two functions, rather than filtering the agenda in `Service.qml`:
  the decision stays in `Logic.js`, under a unit test, and every caller is covered.
- `theme` also waits while either folder model is `Loading`. A folder that does not exist ends
  `Ready` too (checked with a `FolderListModel` on a missing folder under Qt 6.12), so a failed
  `mkdir` does not block it.
