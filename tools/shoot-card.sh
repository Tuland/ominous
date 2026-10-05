#!/usr/bin/env bash
# Photographs the card for one theme and phase, and nothing else.
#   tools/shoot-card.sh <playful-theme> <professional|playful> <relaxed|tense|angry> <out.png> [title]
# e.g. tools/shoot-card.sh shiba playful angry /tmp/shiba-angry.png
#
# It summons a synthetic meeting straight into the overlay, with the theme files read from
# themes/ (or a path to any theme JSON) and `dim: 1`: the veil behind the card is then opaque,
# so a capture of the focused monitor holds the card on a solid color and no part of the
# desktop. The capture is trimmed to the card, and refused when anything else shows on the
# veil (a notification above the overlay): the card must be the centred, only thing on it.
# Saved choices (state.json, themes.json) are not touched. Needs the running shell, grim and
# ImageMagick.

set -u
cd "$(dirname "$0")/.." || exit 2
[[ $# -ge 4 ]] || { sed -n '2,3p' "$0"; exit 2; }
theme=$1 mode=$2 phase=$3 out=$4 title=${5:-Quarterly planning}
case $mode in professional|playful) ;; *) echo "mode must be professional or playful"; exit 2 ;; esac
case $phase in relaxed|tense|angry) ;; *) echo "phase must be relaxed, tense or angry"; exit 2 ;; esac
[[ -f $theme ]] && theme_file=$theme || theme_file=themes/$theme.json
[[ -f $theme_file ]] || { echo "no theme file: $theme_file"; exit 1; }
for tool in grim magick python3; do command -v $tool >/dev/null || { echo "missing: $tool"; exit 1; }; done

ID=$(python3 -c 'import json; print(json.load(open("manifest.json"))["id"])')
omarchy-shell ominous status >/dev/null 2>&1 || { echo "the shell does not answer; is the plugin enabled?"; exit 1; }
output=$(hyprctl monitors -j | python3 -c 'import json,sys; print(next(m["name"] for m in json.load(sys.stdin) if m["focused"]))')
TMP=$(mktemp -d); trap 'omarchy-shell -q shell hide "$ID"; rm -rf "$TMP"' EXIT

payload=$(python3 - "$mode" "$phase" "$theme_file" "$title" <<'EOF'
import json, sys, time
mode, phase, theme_file, title = sys.argv[1:5]
now = time.time() * 1000
print(json.dumps({
    "title": title, "location": "Room 4", "calendar": "work", "url": "https://meet.google.com/",
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
# a notification above the overlay, moves or grows it.
# Arguments:
#   The full capture.
# Returns:
#   0 when the trimmed box is centred within 6 px, 1 otherwise.
#######################################
only_card() {
  magick "$1" -fuzz 3% -format '%w %h %@' info: | python3 -c '
import re, sys
w, h, box = sys.stdin.read().split()
bw, bh, bx, by = map(int, re.match(r"(\d+)x(\d+)\+(\d+)\+(\d+)", box).groups())
sys.exit(0 if abs(bx + bw / 2 - int(w) / 2) <= 6 and abs(by + bh / 2 - int(h) / 2) <= 6 else 1)'
}

# Up to three tries, 3 s apart: a notification on screen usually leaves within that time.
for try in 1 2 3; do
  omarchy-shell shell summon "$ID" "$payload" >/dev/null
  sleep 1.6
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
echo "no picture: something besides the card stayed on screen" >&2
exit 1
