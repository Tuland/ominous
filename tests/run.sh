#!/usr/bin/env bash
# Every check in one command, with a history line per run in tests/results.log.
#   tests/run.sh                  unit (node --test, themes vs tools/draw-themes.py, tools/lint.sh) + live (needs the running shell)
#   tests/run.sh --unit           unit only; needs no shell
#   tests/run.sh --live           live only
#   tests/run.sh --restart --keys  passed on to tests/live.sh (see its header)
cd "$(dirname "$0")/.." || exit 2

UNIT=1; LIVE=1; LIVE_ARGS=()
for a in "$@"; do
  case $a in
    --unit) LIVE=0 ;;
    --live) UNIT=0 ;;
    --restart|--keys) LIVE_ARGS+=("$a") ;;
    *) echo "usage: $0 [--unit|--live] [--restart] [--keys]" >&2; exit 2 ;;
  esac
done

out=$(mktemp); trap 'rm -f "$out"' EXIT
unit_res="-"; live_res="-"; problems=""; rc=0

if ((UNIT)); then
  echo "== unit"
  # A glob, not a folder: Node before 26 reads a folder argument as a file. The spec reporter
  # gives the summary lines parsed below on every Node version, terminal or not.
  node --test --test-reporter=spec 'tests/*.test.mjs' 2>&1 | tee "$out"
  p=$(sed -n 's/^ℹ pass \([0-9]*\).*/\1/p' "$out"); f=$(sed -n 's/^ℹ fail \([0-9]*\).*/\1/p' "$out")
  unit_res="${p:-0}/$(( ${p:-0} + ${f:-1} ))"
  if [[ ${f:-1} != 0 ]]; then rc=1; problems+="unit: $(grep -E '^\s*✖' "$out" | sed 's/([0-9.]*ms)//; s/^\s*✖ //' | head -5 | paste -sd';') "; fi
fi

if ((UNIT)); then
  echo "== art"
  # The playful themes are drawn by tools/draw-themes.py; their JSON must match it.
  if ! tools/draw-themes.py --check; then rc=1; problems+="art: themes differ from tools/draw-themes.py "; fi
  echo "== lint"
  if ! tools/lint.sh; then rc=1; problems+="lint: tools/lint.sh found problems "; fi
fi

if ((LIVE)); then
  echo "== live"
  tests/live.sh "${LIVE_ARGS[@]}" 2>&1 | tee "$out"
  line=$(grep '^live: ' "$out" | tail -1)
  p=$(sed -n 's/^live: \([0-9]*\) passed.*/\1/p' <<<"$line"); f=$(sed -n 's/^live: [0-9]* passed, \([0-9]*\) failed.*/\1/p' <<<"$line")
  live_res="${p:-0}/$(( ${p:-0} + ${f:-1} ))"
  if [[ ${f:-1} != 0 ]]; then rc=1; problems+="live: $(sed -n 's/^live: .*failed \[\(.*\)\]$/\1/p' <<<"$line") "; fi
fi

# One line per run: when, which commit (+ -dirty if uncommitted changes), results, what failed.
commit=$(git rev-parse --short HEAD 2>/dev/null || echo none)
[[ -n $(git status --porcelain 2>/dev/null) ]] && commit+="-dirty"
printf '%s\t%s\tunit %s\tlive %s\t%s\n' "$(date -Is)" "$commit" "$unit_res" "$live_res" "${problems:-ok}" >> tests/results.log

echo
echo "unit $unit_res | live $live_res | $([[ $rc == 0 ]] && echo OK || echo FAILED)   (history: tests/results.log)"
exit $rc
