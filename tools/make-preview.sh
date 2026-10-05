#!/usr/bin/env bash
# Builds preview.png (the marketplace picture) from the plugin's own rendering.
#   tools/make-preview.sh            needs the running shell, grim and ImageMagick
#
# A 2x2 grid, one card per shipped theme, each with a caption:
#   classic (professional, tense)  |  marine (relaxed)
#   shiba (tense)                  |  boss (angry)
# Each card is a synthetic meeting summoned with `dim: 1`: the veil behind it is then opaque,
# so a capture of the focused monitor holds the card on a solid color and nothing of the
# desktop. The capture is trimmed to the card and placed in its quarter of a 1920x1080 canvas
# of that color. Colors and font are those of the current Omarchy theme and shell.
# Look at the result before committing it.

set -u
cd "$(dirname "$0")/.." || exit 2
ID=$(python3 -c 'import json; print(json.load(open("manifest.json"))["id"])')
TMP=$(mktemp -d); trap 'omarchy-shell -q shell hide "$ID"; rm -rf "$TMP"' EXIT

for tool in grim magick python3 fc-match; do command -v $tool >/dev/null || { echo "missing: $tool"; exit 1; }; done
omarchy-shell ominous status >/dev/null 2>&1 || { echo "the shell does not answer; is the plugin enabled?"; exit 1; }
output=$(hyprctl monitors -j | python3 -c 'import json,sys; print(next(m["name"] for m in json.load(sys.stdin) if m["focused"]))')
font=$(fc-match -f '%{file}' monospace)
fg=$(sed -n 's/^foreground *= *"\(#[0-9a-fA-F]*\)".*/\1/p' "$HOME/.local/state/omarchy/current/theme/colors.toml" | head -1)
fg=${fg:-#c0caf5}

# mode, phase, playful theme -> the JSON payload of a made-up meeting
payload() {
  python3 - "$1" "$2" "$3" <<'EOF'
import json, sys, time
mode, phase, playful = sys.argv[1:4]
now = time.time() * 1000
themes = {"professional": json.load(open("themes/classic.json")),
          "playful": json.load(open("themes/%s.json" % playful))}
print(json.dumps({
    "title": "Quarterly planning", "location": "Room 4", "calendar": "work",
    "url": "https://meet.google.com/",
    "startMs": now - 95_000 if phase == "angry" else now + 9 * 60_000 + 30_000,
    "endMs": now + 25 * 60_000,
    "leadSeconds": 900,
    # Holds the phase: tense covers the ten minutes, relaxed never reaches its threshold.
    "tenseSeconds": 3600 if phase == "tense" else 15,
    "dim": 1, "mode": mode, "themes": themes}))
EOF
}

# name, mode, phase, playful theme, caption -> $TMP/<name>-cell.png, a 960x540 quarter
cell() {
  omarchy-shell shell summon "$ID" "$(payload "$2" "$3" "$4")" >/dev/null
  sleep 1.6
  grim -o "$output" "$TMP/$1-full.png" || return 1
  omarchy-shell -q shell hide "$ID"; sleep 0.5
  [[ -n ${bg:-} ]] || bg=$(magick "$TMP/$1-full.png" -format "%[pixel:p{4,4}]" info:)
  # The veil is a single color, so trimming it leaves exactly the card.
  magick "$TMP/$1-full.png" -fuzz 3% -trim +repage -filter Lanczos -resize 840x400 "$TMP/$1.png"
  magick -size 960x540 "xc:$bg" "$TMP/$1.png" -gravity center -geometry +0-22 -composite \
         -font "$font" -pointsize 26 -fill "$fg" -gravity south -annotate +0+34 "$5" "$TMP/$1-cell.png"
}

bg=""
cell classic professional tense  marine "classic — professional mode, tense" || exit 1
cell marine  playful      relaxed marine "marine — relaxed" || exit 1
cell shiba   playful      tense   shiba  "shiba — tense" || exit 1
cell boss    playful      angry   boss   "boss — angry" || exit 1
magick \( "$TMP/classic-cell.png" "$TMP/marine-cell.png" +append \) \
       \( "$TMP/shiba-cell.png" "$TMP/boss-cell.png" +append \) -append preview.png
echo "wrote preview.png ($(magick identify -format '%wx%h' preview.png)); look at it before committing"
