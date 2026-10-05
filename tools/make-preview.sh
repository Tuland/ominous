#!/usr/bin/env bash
# Builds preview.png (the marketplace picture) from the plugin's own rendering.
#   tools/make-preview.sh            needs the running shell, grim and ImageMagick
#
# It summons two synthetic cards, classic (tense) and marine (angry), with `dim: 1`: the veil
# behind the card is then opaque, so a capture of the focused monitor holds the card on a solid
# color and nothing of the desktop. Each capture is trimmed to the card, and both are set side by
# side on a 1920x1080 canvas of that color. The colors are those of the current Omarchy theme.
# Look at the result before committing it.

set -u
cd "$(dirname "$0")/.." || exit 2
ID=$(python3 -c 'import json; print(json.load(open("manifest.json"))["id"])')
TMP=$(mktemp -d); trap 'omarchy-shell -q shell hide "$ID"; rm -rf "$TMP"' EXIT

for tool in grim magick python3; do command -v $tool >/dev/null || { echo "missing: $tool"; exit 1; }; done
omarchy-shell ominous status >/dev/null 2>&1 || { echo "the shell does not answer; is the plugin enabled?"; exit 1; }
output=$(hyprctl monitors -j | python3 -c 'import json,sys; print(next(m["name"] for m in json.load(sys.stdin) if m["focused"]))')

# mode, phase -> the JSON payload of a made-up meeting
payload() {
  python3 - "$1" "$2" <<'EOF'
import json, sys, time
mode, phase = sys.argv[1], sys.argv[2]
now = time.time() * 1000
themes = {m: json.load(open("themes/%s.json" % n)) for m, n in (("professional", "classic"), ("playful", "marine"))}
print(json.dumps({
    "title": "Quarterly planning", "location": "Room 4", "calendar": "work",
    "url": "https://meet.google.com/",
    "startMs": now - 95_000 if phase == "angry" else now + 9 * 60_000 + 30_000,
    "endMs": now + 25 * 60_000,
    "leadSeconds": 900, "tenseSeconds": 3600 if phase == "tense" else 15,
    "dim": 1, "mode": mode, "themes": themes}))
EOF
}

shoot() {   # name, mode, phase
  omarchy-shell shell summon "$ID" "$(payload "$2" "$3")" >/dev/null
  sleep 1.6
  grim -o "$output" "$TMP/$1-full.png" || return 1
  omarchy-shell -q shell hide "$ID"; sleep 0.5
  # The veil is a single color, so trimming it leaves exactly the card.
  magick "$TMP/$1-full.png" -fuzz 3% -trim +repage "$TMP/$1.png"
}

shoot pro professional tense || exit 1
shoot play playful angry || exit 1
bg=$(magick "$TMP/pro-full.png" -format "%[pixel:p{4,4}]" info:)
magick "$TMP/pro.png" "$TMP/play.png" -background "$bg" -gravity center +smush 96 "$TMP/pair.png"
# Scaled up to most of the width: the marketplace also shows it as a 720x405 thumbnail.
magick "$TMP/pair.png" -filter Lanczos -resize 1760x -background "$bg" -gravity center -extent 1920x1080 preview.png
echo "wrote preview.png ($(magick identify -format '%wx%h' preview.png)); look at it before committing"
