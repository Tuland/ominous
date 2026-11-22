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

# The user files the checks change, and their names inside the backup folder.
USER_FILES=("$STATE" "$THEME_CHOICE" "$THEMES/marine.json")
BACKUP_NAMES=(state.json themes.json marine.json)
BK=$(mktemp -d) || exit 1
#######################################
# Copies one user file into the backup folder, if it exists. A failed copy, or a symlink
# (the checks would write through it into its target), stops the run before anything is
# changed: cleanup() must never run without a usable backup. A file with other hard links stops
# it too: the checks would write through every name, and only this one is put back.
# Globals:
#   BK
# Arguments:
#   The user file.
#   Its name inside the backup folder.
# Outputs:
#   Why the run stopped.
#######################################
backup() {
  [[ -L $1 ]] && { echo "$1 is a symlink: nothing was changed" >&2; rm -rf "$BK"; exit 1; }
  [[ -f $1 ]] || return 0
  (($(stat -c %h "$1") == 1)) || { echo "$1 has other hard links: nothing was changed" >&2; rm -rf "$BK"; exit 1; }
  cp -p "$1" "$BK/$2" && return 0
  echo "cannot back up $1: nothing was changed" >&2
  rm -rf "$BK"
  exit 1
}
for i in "${!USER_FILES[@]}"; do backup "${USER_FILES[i]}" "${BACKUP_NAMES[i]}"; done
#######################################
# Puts the user's state files and theme back as they were, closes the card and ends any hold. A backed-up
# file is copied to a new temporary file beside its place and renamed over it (`mv -T`), so a symlink put there during
# the run is replaced, never written through; a file that had no backup is removed. When a
# file cannot be put back or removed, the backup folder is kept and its path printed, so
# nothing is lost, and the run exits with an error.
# Known limits, kept on purpose: the checks write these same files, so at the end this
# function cannot tell a file the user created or edited during the run from one the checks
# left. It removes the first and puts the second back to its backup: keeping an unknown file
# could leave a check's marine.json that hides the shipped theme. And a symlink put at one of
# these paths after the backup is followed by the checks' own writes (plain redirections), so
# its target keeps what they wrote. Do not edit these files while the live checks run.
# Globals:
#   USER_FILES, BACKUP_NAMES, BK
# Outputs:
#   The backup folder's path, when a file could not be put back or removed.
#######################################
cleanup() {
  hide
  omarchy-shell -q ominous hold 0 2>/dev/null
  local i file saved tmp lost=0
  for i in "${!USER_FILES[@]}"; do
    file=${USER_FILES[i]} saved=$BK/${BACKUP_NAMES[i]}
    if [[ -f $saved ]]; then
      # A new, unique file beside the target (mktemp), so no existing file or link is reused.
      mkdir -p "${file%/*}" && tmp=$(mktemp "${file%/*}/.restore.XXXXXX") && cp -p "$saved" "$tmp" \
        && mv -Tf "$tmp" "$file" || lost=1
    else
      rm -f "$file" || lost=1
    fi
  done
  ((lost)) && { echo "could not put every file back: the backups are in $BK" >&2; exit 1; }
  rm -rf "$BK"
}
trap cleanup EXIT

# Prints the seconds left in the hold.
hold_left() { jsonget "d['holdSeconds']"; }
# Whether the hold has $1 to $2 seconds left.
hold_between() { local s; s=$(hold_left) && ((s >= $1 && s <= $2)); }
# A hold set before the restart must be gone right after it (reported below). Skipped when the
# running plugin is older than `hold`.
restart_hold="skip"
if ((RESTART)); then
  [[ $(omarchy-shell ominous hold 60 2>/dev/null) == ok ]] && hold_between 50 60 && restart_hold="set"
  omarchy restart shell >/dev/null 2>&1; wait_for 75 status_ok
  if [[ $restart_hold == set ]]; then hold_between 0 0 && restart_hold="ended" || restart_hold="kept"; fi
fi
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

config_report_shape() { jsonget "isinstance(d['unknownKeys'], list) and isinstance(d['ignoredValues'], list) and isinstance(d['configError'], str)" | grep -qx True; }
check "status reports unknownKeys, ignoredValues and configError" config_report_shape

# What `config` prints, read back by Logic.js (comments and all), must be the config `status`
# shows. node is a development tool of this repository, like the unit tests'.
config_round_trip() {
  omarchy-shell ominous config > "$BK/config.out" && omarchy-shell ominous status > "$BK/status.out" || return 1
  node -e '
    const fs = require("fs"), vm = require("vm"), L = {}
    vm.runInNewContext(fs.readFileSync(process.argv[1], "utf8").replace(".pragma library", ""), L)
    const r = L.parseConfig(fs.readFileSync(process.argv[2], "utf8"))
    const shown = JSON.parse(fs.readFileSync(process.argv[3], "utf8")).config
    const same = JSON.stringify(JSON.parse(JSON.stringify(r.config))) === JSON.stringify(shown)
    process.exit(r.error === "" && r.unknownKeys.length === 0 && r.ignored.length === 0 && same ? 0 : 1)
  ' "$(dirname "$0")/../Logic.js" "$BK/config.out" "$BK/status.out"
}
check "config prints a complete config that reads back to the one status shows" config_round_trip

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

# ---- an unrecognized link
UNKNOWN_LINK=https://evil.example/ominous-live-check
# Summons a card for a meeting whose link is not in the join hosts.
summon_unknown_link() {
  local payload
  payload=$(python3 -c 'import json, sys, time; n = time.time() * 1000; print(json.dumps({"title": "Live check", "startMs": n + 600000, "endMs": n + 1800000, "leadSeconds": 900, "url": sys.argv[1]}))' "$UNKNOWN_LINK")
  omarchy-shell shell summon "$ID" "$payload" >/dev/null
}
unknown_link_opens() {
  summon_unknown_link && wait_for 15 overlay_open || return 1
  hide; wait_for 15 overlay_closed
}
check "a card with an unrecognized link opens and closes" unknown_link_opens

# ---- a note about a calendar change
# Summons a card with a "removed" note that closes by itself after $1 seconds.
summon_closing() {
  local payload
  payload=$(python3 -c 'import json, sys, time; n = time.time() * 1000; print(json.dumps({"title": "Live check", "startMs": n + 600000, "endMs": n + 1800000, "leadSeconds": 900, "notice": {"kind": "removed", "closeInSeconds": int(sys.argv[1])}}))' "$1")
  omarchy-shell shell summon "$ID" "$payload" >/dev/null
}
closes_after_countdown() {
  summon_closing 2 && wait_for 15 overlay_open || return 1
  wait_for 20 overlay_closed
}
check "a card with a closing note closes at the end of its countdown" closes_after_countdown

# Prints when the service last read the agenda.
last_fetch() { jsonget "d['lastFetch']"; }
# Whether the agenda was read again since FETCH_BEFORE.
fetched_since() { [[ $(last_fetch) != "$FETCH_BEFORE" ]]; }
# Opens a card with IPC command $1 (and argument $2), waits for the next agenda refresh (once a
# minute), and checks the card is still there: the follow-up only touches agenda cards.
stays_across_refresh() {
  [[ $(omarchy-shell ominous "$@") == ok ]] && wait_for 15 overlay_open || return 1
  # Read once the card is up, so the refresh waited for comes after it opened.
  FETCH_BEFORE=$(last_fetch)
  wait_for 450 fetched_since || { echo "no agenda refresh within 90 s" >&2; hide; return 1; }
  sleep 1
  overlay_open; local open=$?
  hide; wait_for 15 overlay_closed
  return $open
}
check "a test card stays open across an agenda refresh" stays_across_refresh test
check "a preview card stays open across an agenda refresh" stays_across_refresh preview "relaxed professional"

# ---- holding real alerts
case $restart_hold in
  ended|kept) check "a shell restart ends a hold" test "$restart_hold" = ended ;;
  *) ((RESTART)) && echo "SKIP a shell restart ends a hold (the plugin before the restart had no hold)" ;;
esac
holds_and_ends() {
  [[ $(omarchy-shell ominous hold 5) == ok ]] && hold_between 1 5 || return 1
  [[ $(omarchy-shell ominous hold 0) == "hold ended" ]] && hold_between 0 0
}
check "hold 5 holds, hold 0 ends it" holds_and_ends
refuses_bad() {
  omarchy-shell ominous hold 30 >/dev/null; local a b
  a=$(omarchy-shell ominous hold 61) b=$(omarchy-shell ominous hold abc)
  [[ $a == *"0 to 60"* && $b == *"0 to 60"* ]] && hold_between 28 30; local r=$?
  omarchy-shell ominous hold 0 >/dev/null; return $r
}
check "hold refuses 61 and abc and keeps the running hold" refuses_bad
renews() {
  omarchy-shell ominous hold 10 >/dev/null; sleep 2; omarchy-shell ominous hold 60 >/dev/null
  hold_between 58 60; local r=$?
  omarchy-shell ominous hold 0 >/dev/null; return $r
}
check "a new hold replaces the time left" renews
test_during_hold() {
  omarchy-shell ominous hold 30 >/dev/null
  [[ $(omarchy-shell ominous test) == ok ]] && wait_for 15 overlay_open && hold_between 1 30; local r=$?
  hide; wait_for 15 overlay_closed; omarchy-shell ominous hold 0 >/dev/null; return $r
}
check "test opens a card during a hold and the hold stays" test_during_hold
ends_by_itself() { omarchy-shell ominous hold 2 >/dev/null && sleep 3 && hold_between 0 0; }
check "a hold ends by itself" ends_by_itself

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
    # Someone still typing when the card appears stays guarded: a space every 300 ms for two
    # seconds does nothing, and the first space after a one-second pause dismisses the card.
    typing_keeps_guard() {
      summon_unknown_link && wait_for 15 overlay_open || return 1
      sleep 0.3
      for _ in 1 2 3 4 5 6 7; do wtype -k space; sleep 0.3; done
      overlay_open || return 1
      sleep 1.4
      wtype -k space
      wait_for 15 overlay_closed
    }
    check "typing keeps the card guarded until a one-second pause" typing_keeps_guard
    hide; wait_for 15 overlay_closed
    # Enter on an unrecognized link dismisses the card and opens nothing: the link would show
    # in the command line of the browser launcher.
    enter_dismisses_unknown_link() {
      summon_unknown_link && wait_for 15 overlay_open || return 1
      sleep 1.4   # past the input guard
      wtype -k Return
      wait_for 15 overlay_closed || return 1
      sleep 1; ! pgrep -f 'omarchy-launch-browser.*ominous-live-check' >/dev/null
    }
    check "Enter on an unrecognized link dismisses it and opens nothing" enter_dismisses_unknown_link
    hide; wait_for 15 overlay_closed
    # Esc closes a card counting down at once, long before its countdown ends.
    esc_closes_countdown() {
      summon_closing 20 && wait_for 15 overlay_open || return 1
      sleep 1.4   # past the input guard
      wtype -k Escape
      wait_for 10 overlay_closed
    }
    check "Esc closes a card counting down at once" esc_closes_countdown
    hide
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
