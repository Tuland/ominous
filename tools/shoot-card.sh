#!/usr/bin/env bash
# Photographs the card for one theme and phase, and nothing else.
#   tools/shoot-card.sh <playful-theme> <professional|playful> <relaxed|tense|angry> <out.png> [title] [link] [notice]
# e.g. tools/shoot-card.sh shiba playful angry /tmp/shiba-angry.png
# The link defaults to a Meet one; give another to photograph how an unrecognized link looks.
# The notice (changed, moved, removed or declined) adds the note a calendar change shows; none
# by default, so tools/make-preview.sh is unaffected.
#
# It summons a synthetic meeting straight into the overlay, with the theme files read from
# themes/ (or a path to any theme JSON) and `dim: 1`: the veil behind the card is then opaque,
# so a capture of the focused monitor holds the card on a solid color and no part of the
# desktop. Real alerts are held while it runs (`omarchy-shell ominous hold`), so none can
# replace the synthetic card or be hidden by it: the script holds them for 60 s, renews before
# each try, and on exit hides its card and ends the hold, printing a line on stderr at both ends.
# A caller that sets OMINOUS_HOLD_OWNER holds and ends the hold itself (tools/make-preview.sh,
# tests/theme-check.sh); this script then only renews it. A card already on screen when it starts
# (a real alert, a test) stops it, and is left as it is. The
# capture is taken only when the card's layer is on the captured monitor, trimmed to the card,
# and refused when anything else shows on the veil (a notification above the overlay) or when
# the card reaches an edge of the monitor (a veil not yet opaque leaves the whole screen): the
# card must be the centred, only thing on it.
# Saved choices (state.json, themes.json) are not touched. Needs the running shell, grim and
# ImageMagick. OMINOUS_SHOOT_WAIT sets the seconds between summoning the card and the capture
# (1.6 by default), to catch another frame of an animation; too short a wait is refused while
# the veil is still fading in.

set -u
cd "$(dirname "$0")/.." || exit 2
[[ $# -ge 4 ]] || { sed -n '2,3p' "$0"; exit 2; }
theme=$1 mode=$2 phase=$3 out=$4 title=${5:-Quarterly planning} link=${6:-https://meet.google.com/} notice=${7:-}
case $mode in professional|playful) ;; *) echo "mode must be professional or playful"; exit 2 ;; esac
case $phase in relaxed|tense|angry) ;; *) echo "phase must be relaxed, tense or angry"; exit 2 ;; esac
case $notice in ''|changed|moved|removed|declined) ;; *) echo "notice must be changed, moved, removed or declined"; exit 2 ;; esac
[[ -f $theme ]] && theme_file=$theme || theme_file=themes/$theme.json
[[ -f $theme_file ]] || { echo "no theme file: $theme_file"; exit 1; }
for tool in grim magick python3; do command -v $tool >/dev/null || { echo "missing: $tool"; exit 1; }; done

ID=$(python3 -c 'import json; print(json.load(open("manifest.json"))["id"])')
omarchy-shell ominous status >/dev/null 2>&1 || { echo "the shell does not answer; is the plugin enabled?"; exit 1; }
output=$(hyprctl monitors -j | python3 -c 'import json,sys; print(next(m["name"] for m in json.load(sys.stdin) if m["focused"]))')
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

#######################################
# Whether a card of this plugin is on any monitor.
# Returns:
#   0 when the `ominous-alert` layer is on screen, or when Hyprland cannot say (so a doubt
#   never counts as a clear screen); 1 otherwise.
#######################################
card_shown() {
  local layers
  layers=$(hyprctl layers -j 2>/dev/null) || return 0
  python3 -c '
import json, sys
try:
    d = json.loads(sys.argv[1])
    sys.exit(1 if not any(l["namespace"] == "ominous-alert" for v in d.values() for ls in v["levels"].values() for l in ls) else 0)
except Exception:
    sys.exit(0)' "$layers"
}

#######################################
# Holds real alerts for 60 s more, or stops the run when the plugin cannot.
# Outputs:
#   Why the run stopped, on stderr.
#######################################
hold_alerts() {
  [[ $(omarchy-shell ominous hold 60 2>/dev/null) == ok ]] && return 0
  echo "the running plugin cannot hold alerts: restart the shell" >&2
  exit 1
}

# Hold first, then look: a real alert can no longer open after the screen is found clear.
if [[ -z ${OMINOUS_HOLD_OWNER:-} ]]; then
  trap 'omarchy-shell -q ominous hold 0 2>/dev/null; echo "real alerts released" >&2; rm -rf "$TMP"' EXIT
  hold_alerts
  echo "real alerts held while the card is photographed" >&2
else
  hold_alerts
fi
# A card still on screen after 5 s (one a previous call is closing has gone by then) is not ours:
# stop, and leave it.
for _ in $(seq 25); do card_shown || break; sleep 0.2; done
if card_shown; then echo "a card is on screen: close it and run again" >&2; exit 1; fi
# From here on any card is this run's, so it is hidden on exit (before the hold ends).
if [[ -z ${OMINOUS_HOLD_OWNER:-} ]]; then
  trap 'omarchy-shell -q shell hide "$ID"; omarchy-shell -q ominous hold 0 2>/dev/null; echo "real alerts released" >&2; rm -rf "$TMP"' EXIT
else
  trap 'omarchy-shell -q shell hide "$ID"; rm -rf "$TMP"' EXIT
fi

payload=$(python3 - "$mode" "$phase" "$theme_file" "$title" "$link" "$notice" <<'EOF'
import json, sys, time
mode, phase, theme_file, title, link, notice = sys.argv[1:7]
now = time.time() * 1000
# A countdown long enough for the capture; a move three hours on.
notes = {"changed": {"kind": "changed", "fields": ["title", "link"]},
         "moved": {"kind": "moved", "movedToMs": now + 3 * 3600_000, "closeInSeconds": 60},
         "removed": {"kind": "removed", "closeInSeconds": 60},
         "declined": {"kind": "declined", "closeInSeconds": 60}}
print(json.dumps({"notice": notes.get(notice),
    # A closing card has no link, as the service sends it.
    "title": title, "location": "Room 4", "calendar": "work",
    "url": "" if notice in ("moved", "removed", "declined") else link,
    "startMs": now - 95_000 if phase == "angry" else now + 9 * 60_000 + 30_000,
    "endMs": now + 25 * 60_000,
    "leadSeconds": 900,
    # Holds the phase: tense covers the ten minutes, relaxed never reaches its threshold.
    "tenseSeconds": 3600 if phase == "tense" else 15,
    "dim": 1, "mode": mode,
    "themes": {"professional": json.load(open("themes/classic.json")), "playful": json.load(open(theme_file))}}))
EOF
) || exit 1

#######################################
# Whether the only thing on the veil is the card. The card is centred on the monitor, so the
# box that trimming the veil would keep must be centred too; anything else on screen, such as
# a notification above the overlay, moves or grows it. The card never reaches the monitor's
# edges, so a box that does is not the card: a veil that is not opaque yet leaves the whole
# screen, a box that is centred too.
# Arguments:
#   The full capture.
# Returns:
#   0 when the trimmed box is centred within 6 px and 8 px clear of every edge, 1 otherwise.
#######################################
only_card() {
  magick "$1" -fuzz 3% -format '%w %h %@' info: | python3 -c '
import re, sys
w, h, box = sys.stdin.read().split()
bw, bh, bx, by = map(int, re.match(r"(\d+)x(\d+)\+(\d+)\+(\d+)", box).groups())
w, h = int(w), int(h)
centred = abs(bx + bw / 2 - w / 2) <= 6 and abs(by + bh / 2 - h / 2) <= 6
clear = bx >= 8 and by >= 8 and bx + bw <= w - 8 and by + bh <= h - 8
sys.exit(0 if centred and clear else 1)'
}

#######################################
# Whether the card's layer is on the monitor that is about to be captured. Without it, a
# failed summon or a focus change would leave the desktop in the capture.
# Globals:
#   output
# Returns:
#   0 when the `ominous-alert` layer is on that monitor, 1 otherwise.
#######################################
card_on_output() {
  hyprctl layers -j | python3 -c '
import json, sys
levels = json.load(sys.stdin).get(sys.argv[1], {}).get("levels", {})
sys.exit(0 if any(l["namespace"] == "ominous-alert" for ls in levels.values() for l in ls) else 1)' "$output" 2>/dev/null
}

# Up to three tries, 3 s apart: a notification on screen usually leaves within that time.
for try in 1 2 3; do
  hold_alerts
  # Every try hides its own card before the next; wait until it is gone, so it cannot pass the
  # layer check for this one.
  for _ in $(seq 25); do card_on_output || break; sleep 0.2; done
  if card_on_output; then echo "a card already on $output does not close" >&2; exit 1; fi
  omarchy-shell shell summon "$ID" "$payload" >/dev/null
  sleep "${OMINOUS_SHOOT_WAIT:-1.6}"
  if ! card_on_output; then
    omarchy-shell -q shell hide "$ID"
    echo "the card is not on $output (try $try of 3)" >&2
    ((try < 3)) && sleep 3
    continue
  fi
  grim -o "$output" "$TMP/full.png" || exit 1
  omarchy-shell -q shell hide "$ID"; sleep 0.4
  if only_card "$TMP/full.png"; then
    # The veil is a single color, so trimming it leaves exactly the card.
    magick "$TMP/full.png" -fuzz 3% -trim +repage "$out" && echo "$out"
    exit
  fi
  rm -f "$TMP/full.png"
  echo "something besides the card is on screen (try $try of 3)" >&2
  ((try < 3)) && sleep 3
done
echo "no picture: the card never showed alone on $output" >&2
exit 1
