#!/usr/bin/env bash
#
# Static checks: qmllint on the QML files, shellcheck on the scripts.
#   tools/lint.sh
#
# qmllint resolves `qs.Commons` and `qs.Ui` through a temporary `qs` link to the Omarchy shell,
# and Quickshell's modules from the Qt import path. Three categories come from how the shell
# and Quickshell describe their own types, not from Ominous, so they are printed as info and
# never fail: missing-property, signal-handler-parameters, uncreatable-type. Any other finding
# fails, unused imports included. Where the shell is not installed (the GitHub runner), qmllint
# is skipped with a notice and shellcheck still runs. Exits 1 if anything failed.

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
# Runs shellcheck on every script in tests/ and tools/.
# Outputs:
#   The findings of shellcheck.
# Returns:
#   0 when clean, 1 on any finding or when shellcheck is missing.
#######################################
lint_shell() {
  if ! command -v shellcheck >/dev/null; then
    echo "shellcheck: FAILED (not installed)"
    return 1
  fi
  if shellcheck tests/*.sh tools/*.sh; then echo "shellcheck: clean"; return 0; fi
  echo "shellcheck: FAILED"
  return 1
}

lint_qml || rc=1
lint_shell || rc=1
exit $rc
