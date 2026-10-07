#!/usr/bin/env bash
#
# Static checks: qmllint on the QML files, shellcheck on the scripts, tsc on the JSDoc types
# of Logic.js, mypy on the Python script.
#   tools/lint.sh
#
# qmllint resolves `qs.Commons` and `qs.Ui` through a temporary `qs` link to the Omarchy shell,
# and Quickshell's modules from the Qt import path. Three categories come from how the shell
# and Quickshell describe their own types, not from Ominous, so they are printed as info and
# never fail: missing-property, signal-handler-parameters, uncreatable-type. Any other finding
# fails, unused imports included. Where the shell is not installed (the GitHub runner), qmllint
# is skipped with a notice and the rest still runs. shellcheck, tsc and mypy come from
# mise.toml: a missing one fails, with a hint to run `mise install`. Exits 1 if anything failed.

set -u
cd "$(dirname "$0")/.." || exit 2

SHELL_DIR=/usr/share/omarchy/shell
QMLLINT=/usr/lib/qt6/bin/qmllint
rc=0

#######################################
# Runs qmllint on every QML file of the plugin.
# Globals:
#   SHELL_DIR, QMLLINT
# Outputs:
#   The findings of qmllint, or why it was skipped.
# Returns:
#   0 when clean or skipped, 1 on any finding of ours.
#######################################
lint_qml() {
  if [[ ! -d $SHELL_DIR || ! -x $QMLLINT ]]; then
    echo "qmllint: skipped (no Omarchy shell at $SHELL_DIR or no $QMLLINT)"
    return 0
  fi
  local imports status
  imports=$(mktemp -d)
  ln -s "$SHELL_DIR" "$imports/qs"
  "$QMLLINT" -I "$imports" -I /usr/lib/qt6/qml -I . \
    --missing-property info --signal-handler-parameters info --uncreatable-type info \
    --unused-imports warning --max-warnings 0 \
    Alert.qml Service.qml components/*.qml
  status=$?
  rm -rf "$imports"
  ((status == 0)) && echo "qmllint: clean" || echo "qmllint: FAILED"
  return $((status != 0))
}

#######################################
# Runs shellcheck on every script in tests/, tools/ and .githooks/.
# Outputs:
#   The findings of shellcheck.
# Returns:
#   0 when clean, 1 on any finding or when shellcheck is missing.
#######################################
lint_shell() {
  if ! command -v shellcheck >/dev/null; then
    echo "shellcheck: FAILED (not installed; run mise install)"
    return 1
  fi
  if shellcheck tests/*.sh tools/*.sh .githooks/*; then echo "shellcheck: clean"; return 0; fi
  echo "shellcheck: FAILED"
  return 1
}

#######################################
# Checks the JSDoc types of Logic.js with TypeScript, strict. tsc reads a copy without the
# first line: `.pragma library` is a QML directive, not JavaScript.
# Outputs:
#   The findings of tsc.
# Returns:
#   0 when clean, 1 on any finding or when tsc is missing.
#######################################
lint_js_types() {
  if ! command -v tsc >/dev/null; then
    echo "tsc: FAILED (not installed; run mise install)"
    return 1
  fi
  local dir status
  dir=$(mktemp -d)
  sed '1{/^\.pragma library$/d}' Logic.js > "$dir/Logic.js"
  (cd "$dir" && tsc --noEmit --allowJs --checkJs --strict --target es2017 --lib es2017 Logic.js)
  status=$?
  rm -rf "$dir"
  ((status == 0)) && echo "tsc: clean" || echo "tsc: FAILED"
  return $((status != 0))
}

#######################################
# Checks the type hints of the Python tools with mypy, strict.
# Outputs:
#   The findings of mypy.
# Returns:
#   0 when clean, 1 on any finding or when mypy is missing.
#######################################
lint_py_types() {
  if ! command -v mypy >/dev/null; then
    echo "mypy: FAILED (not installed; run mise install)"
    return 1
  fi
  if mypy --strict --no-error-summary tools/*.py; then echo "mypy: clean"; return 0; fi
  echo "mypy: FAILED"
  return 1
}

lint_qml || rc=1
lint_shell || rc=1
lint_js_types || rc=1
lint_py_types || rc=1
exit $rc
