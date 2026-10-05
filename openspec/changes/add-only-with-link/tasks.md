# Tasks

## 1. The rule

- [x] 1.1 Add `onlyWithLink` to `Logic.DEFAULTS` and `normalizeConfig` (only `true` is true) and apply it in `isAlertable` with `safeUrl(ev.conference)`. Verify unit tests cover the default, `true`, values that are not `true`, no link, an `http://` link, an `https://` link, a link only in the location, and the `statusSnapshot` count; then break the rule on purpose and see a test fail

## 2. Documentation

- [x] 2.1 Add the key to `docs/configuration.md` and the rule to "Which meetings alert" in `docs/usage.md`. Verify `tests/docs.test.mjs` passes (it checks every config key is documented)
