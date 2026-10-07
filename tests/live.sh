#!/usr/bin/env bash
# Live checks against the RUNNING Omarchy shell, through the plugin's IPC.
#   tests/live.sh [--restart] [--keys]
#     --restart  run `omarchy restart shell` first (needed after QML edits)
#     --keys     also inject keystrokes with wtype (M toggles the mode); opt-in because
#                it types into whatever has the keyboard if the card is not up yet
# The card flashes on screen and grabs the keyboard several times. Your state file
# and any user theme named marine are restored on exit, and ominous.json is only
# read (its checksum is compared at the end).
# Prints PASS/FAIL per check and a final `live: N passed, M failed` line; exits 1 on any failure.

set -u
RESTART=0; KEYS=0
for a in "$@"; do
  case $a in --restart) RESTART=1 ;; --keys) KEYS=1 ;; *) echo "usage: $0 [--restart] [--keys]" >&2; exit 2 ;; esac
done

CONFIG=$HOME/.config/omarchy/ominous.json
STATE_DIR=$HOME/.local/state/ominous
STATE=$STATE_DIR/state.json
THEME_CHOICE=$STATE_DIR/themes.json
THEMES=$HOME/.config/omarchy/ominous/themes
ID=io.github.tuland.ominous

pass=0; fail=0; failed=()
#######################################
# Runs one check and records the result.
# Globals:
#   pass, fail, failed
# Arguments:
#   The check's description.
#   The command and its arguments; its output is discarded.
# Outputs:
#   PASS or FAIL with the description.
#######################################
check() {
  local name=$1; shift
  if "$@" >/dev/null 2>&1; then echo "PASS $name"; pass=$((pass + 1)); else echo "FAIL $name"; fail=$((fail + 1)); failed+=("$name"); fi
}

# Closes the card.
hide() { omarchy-shell -q shell hide "$ID"; }
# Prints one expression ($1, Python, over the status JSON as `d`).
jsonget() { omarchy-shell ominous status | python3 -c "import json,sys; d=json.load(sys.stdin); print($1)"; }
# Waits for the file watchers to notice a change.
settle() { sleep 1.6; }
# Retries a command ($2...) every 0.2 s, up to $1 times; 1 if it never succeeds.
wait_for() { local n=$1; shift; local i; for ((i = 0; i < n; i++)); do "$@" && return 0; sleep 0.2; done; return 1; }
# Whether the shell answers on the ominous IPC target.
status_ok() { omarchy-shell ominous status >/dev/null 2>&1; }
# Whether the card's layer is on screen.
overlay_open() {
  hyprctl layers -j | python3 -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if any(l["namespace"]=="ominous-alert" for v in d.values() for ls in v["levels"].values() for l in ls) else 1)'
}
# Whether the card's layer is gone.
overlay_closed() { ! overlay_open; }

BK=$(mktemp -d)
[[ -f $STATE ]] && cp -p "$STATE" "$BK/state.json"
[[ -f $THEME_CHOICE ]] && cp -p "$THEME_CHOICE" "$BK/themes.json"
[[ -f $THEMES/marine.json ]] && cp -p "$THEMES/marine.json" "$BK/marine.json"
#######################################
# Puts the user's state files and theme back as they were, and closes the card.
# Globals:
#   STATE, THEME_CHOICE, THEMES, BK
#######################################
cleanup() {
  hide
  rm -f "$THEMES/marine.json" "$STATE" "$THEME_CHOICE"
  [[ -f $BK/state.json ]] && cp -p "$BK/state.json" "$STATE"
  [[ -f $BK/themes.json ]] && cp -p "$BK/themes.json" "$THEME_CHOICE"
  [[ -f $BK/marine.json ]] && cp -p "$BK/marine.json" "$THEMES/marine.json"
  rm -rf "$BK"
}
trap cleanup EXIT

if ((RESTART)); then omarchy restart shell >/dev/null 2>&1; wait_for 75 status_ok; fi
if ! status_ok; then
  echo "FAIL shell answers on the ominous IPC target (is the shell running and the plugin enabled?)"
  echo "live: 0 passed, 1 failed [shell not reachable]"
  exit 1
fi
hide; wait_for 15 overlay_closed
sum_before=$(md5sum "$CONFIG" 2>/dev/null | cut -d' ' -f1)

# ---- status
status_shape() { jsonget "d['mode'] in ('professional','playful') and set(d['themes'])=={'professional','playful'} and 'themeError' in d and 'tenseSeconds' in d['config']" | grep -qx True; }
check "status reports mode, themes, themeError and the config" status_shape

no_title_in_status() {
  [[ $(omarchy-shell ominous preview "relaxed professional SECRET_TITLE_QQ") == ok ]] && wait_for 15 overlay_open || return 1
  local out; out=$(omarchy-shell ominous status)
  hide; wait_for 15 overlay_closed
  [[ $out != *SECRET_TITLE_QQ* ]]
}
check "status never prints a meeting title" no_title_in_status

# ---- saved mode
# Whether the service reports mode $1.
mode_is() { [[ $(jsonget "d['mode']") == "$1" ]]; }
# Prints the mode ominous.json asks for.
cfg_mode() { jsonget "d['config']['mode']"; }
state_playful() { mkdir -p "$STATE_DIR"; echo '{"mode":"playful"}' > "$STATE"; settle; mode_is playful; }
state_garbage() { echo 'garbage' > "$STATE"; settle; mode_is "$(cfg_mode)"; }
state_removed() { rm -f "$STATE"; settle; mode_is "$(cfg_mode)"; }
check "a saved playful mode wins over the config" state_playful
check "a garbage state file falls back to the config mode" state_garbage
check "deleting the state file falls back to the config mode" state_removed

# ---- user themes
# These checks break and fix a user marine.json, so playful must use marine: forget a saved
# theme choice (themes.json is restored on exit).
rm -f "$THEME_CHOICE"; settle
# Prints the service's theme error, empty when none.
theme_err() { jsonget "d['themeError']"; }
mkdir -p "$THEMES"
theme_valid() { echo '{"progress":true}' > "$THEMES/marine.json"; settle; [[ -z $(theme_err) ]]; }
theme_broken() { echo 'not json' > "$THEMES/marine.json"; settle; [[ $(theme_err) == *marine* ]]; }
theme_fixed() { echo '{"progress":true}' > "$THEMES/marine.json"; settle; [[ -z $(theme_err) ]]; }
check "a valid user theme loads without error" theme_valid
check "a broken user theme is reported in themeError" theme_broken
broken_still_opens() {
  echo 'not json' > "$THEMES/marine.json"; settle
  [[ $(omarchy-shell ominous preview "angry playful") == ok ]] && wait_for 15 overlay_open || return 1
  hide; wait_for 15 overlay_closed
}
check "the card still opens with a broken user theme" broken_still_opens
check "fixing the user theme clears the error" theme_fixed
theme_removed() { rm -f "$THEMES/marine.json"; settle; [[ -z $(theme_err) ]]; }
check "removing the user theme falls back to the shipped one" theme_removed

# ---- theme commands
rm -f "$THEME_CHOICE"; settle
# Whether the playful mode uses theme $1.
playful_is() { [[ $(jsonget "d['themes']['playful']") == "$1" ]]; }
lists_shipped() {
  local out; out=$(omarchy-shell ominous themes)
  grep -q '^classic  *shipped' <<<"$out" && grep -q '^marine ' <<<"$out" && grep -q '^shiba  *shipped' <<<"$out"
}
lists_user_override() {
  echo '{"progress":true}' > "$THEMES/marine.json"; settle
  local out; out=$(omarchy-shell ominous themes); rm -f "$THEMES/marine.json"; settle
  grep -q '^marine  *user (overrides shipped)' <<<"$out"
}
theme_to_shiba() {
  [[ $(omarchy-shell ominous theme shiba) == "playful theme: shiba"* ]] || return 1
  playful_is shiba || return 1
  settle; [[ $(python3 -c "import json;print(json.load(open('$THEME_CHOICE'))['playful'])") == shiba ]]
}
unknown_refused() {
  [[ $(omarchy-shell ominous theme poodle) == 'no theme "poodle"'* ]] && playful_is shiba
}
reset_to_config() {
  [[ $(omarchy-shell ominous theme reset) == "themes back to ominous.json" ]] && playful_is "$(jsonget "d['config']['themes']['playful']")"
}
check "themes lists the shipped themes" lists_shipped
check "themes shows a user file overriding a shipped one" lists_user_override
check "theme shiba makes the dog the playful theme, saved in themes.json" theme_to_shiba
check "theme poodle is refused and changes nothing" unknown_refused
check "theme reset goes back to ominous.json" reset_to_config

# ---- preview
usage_on_bad_phase() { [[ $(omarchy-shell ominous preview "bogus") == usage:* ]]; }
check "preview rejects an unknown phase" usage_on_bad_phase

preview_opens() {
  [[ $(omarchy-shell ominous preview "$1") == ok ]] && wait_for 15 overlay_open || return 1
  hide; wait_for 15 overlay_closed
}
for phase in relaxed tense angry; do
  for mode in professional playful; do
    check "preview $phase $mode opens and closes" preview_opens "$phase $mode"
  done
done
check "a very long title still opens" preview_opens "relaxed playful $(printf 'word%.0s ' {1..60})Supercalifragilisticexpialidocious_without_spaces"

# ---- keys (opt-in)
state_mode_is() { [[ $(python3 -c "import json;print(json.load(open('$STATE'))['mode'])" 2>/dev/null) == "$1" ]]; }
if ((KEYS)); then
  if command -v wtype >/dev/null; then
    rm -f "$STATE"; settle
    omarchy-shell ominous preview "relaxed professional" >/dev/null
    # Never type unless the card is up: the keys would go to whatever has focus.
    if wait_for 15 overlay_open; then
      sleep 0.3   # the card asks for keyboard focus a moment after it appears; its guard lasts a full second
      wtype m; sleep 1.4
      check "M inside the first second is ignored" test ! -f "$STATE"
      wtype m; sleep 1
      check "M toggles to playful and saves it" state_mode_is playful
      wtype m; sleep 1
      check "M toggles back to professional and saves it" state_mode_is professional
    else
      check "the card opened for the key checks" false
    fi
    hide; wait_for 15 overlay_closed
  else
    echo "SKIP key checks: wtype not installed"
  fi
fi

# ---- afterwards
check "ominous.json was not modified" test "$sum_before" = "$(md5sum "$CONFIG" 2>/dev/null | cut -d' ' -f1)"
check "no overlay is left open" overlay_closed

names=""; for f in "${failed[@]}"; do [[ -n $f ]] && names+="${names:+; }$f"; done
echo "live: $pass passed, $fail failed${names:+ [$names]}"
((fail == 0))
