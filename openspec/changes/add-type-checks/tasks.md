# Tasks

## 1. Tools

- [x] 1.1 Pin `npm:typescript` 7.0.2, `uv` 0.12.23 and `pipx:mypy` 2.4.0 (installed with uv) in `mise.toml`; `mise install`. Verify `mise exec -- tsc --version` and `mise exec -- mypy --version` inside the checkout, and that mypy was installed by `uv tool install`
- [x] 1.2 `tools/lint.sh`: `tsc` strict on a copy of `Logic.js` without the pragma, `mypy --strict` on `tools/draw-themes.py`; a missing checker fails with a hint. Verify it reports the 39 and 113 errors and fails

## 2. Types

- [x] 2.1 Make the JSDoc in `Logic.js` precise until `tsc` passes, without suppressions. Verify the code without comments is identical and the unit tests pass
- [x] 2.2 Type hints in `tools/draw-themes.py` until `mypy --strict` passes. Verify `tools/draw-themes.py --check` passes (themes unchanged)
- [x] 2.3 Verify each checker catches a wrong type: a `@param {string}` given a number in a call inside `Logic.js`, and a `str` hint returned an `int` in the script

## 3. Notes and checks

- [x] 3.1 `docs/development.md` (code style, tools, checks) and `CLAUDE.md`: the type checks. Verify the docs tests pass
- [ ] 3.2 `mise exec -- tests/run.sh --unit` passes; after the push, the CI is green
