#!/usr/bin/env bash
# Builds preview.png (the marketplace picture) from the plugin's own rendering.
#   tools/make-preview.sh            needs the running shell, grim and ImageMagick
#
# A 2x2 grid, one card per shipped theme, each with a caption:
#   classic (professional, tense)  |  marine (relaxed)
#   shiba (tense)                  |  boss (angry)
# Each card comes from tools/shoot-card.sh (a synthetic meeting on an opaque veil, so no part of
# the desktop), placed in its quarter of a 1920x1080 canvas of the theme's background color.
# Colors and font are those of the current Omarchy theme and shell.
# Look at the result before committing it.

set -u
cd "$(dirname "$0")/.." || exit 2
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

for tool in magick fc-match; do command -v $tool >/dev/null || { echo "missing: $tool"; exit 1; }; done
font=$(fc-match -f '%{file}' monospace)
# Prints one color ($1, e.g. background) of the current Omarchy theme.
color() { sed -n "s/^$1 *= *\"\(#[0-9a-fA-F]*\)\".*/\1/p" "$HOME/.local/state/omarchy/current/theme/colors.toml" | head -1; }
fg=$(color foreground); fg=${fg:-#c0caf5}
# The veil behind the card is the theme's background at full opacity, so the canvas uses it too.
bg=$(color background); bg=${bg:-#1a1b26}

#######################################
# Makes one quarter of the picture: the card centred on the theme's background, with a caption.
# Globals:
#   TMP, bg, fg, font
# Arguments:
#   The cell's name, the mode, the phase, the playful theme and the caption.
# Outputs:
#   Writes $TMP/<name>-cell.png, 960x540.
# Returns:
#   1 if the card could not be photographed.
#######################################
cell() {
  tools/shoot-card.sh "$4" "$2" "$3" "$TMP/$1.png" >/dev/null || return 1
  magick "$TMP/$1.png" -filter Lanczos -resize 840x400 "$TMP/$1.png"
  magick -size 960x540 "xc:$bg" "$TMP/$1.png" -gravity center -geometry +0-22 -composite \
         -font "$font" -pointsize 26 -fill "$fg" -gravity south -annotate +0+34 "$5" "$TMP/$1-cell.png"
}

cell classic professional tense  marine "classic — professional mode, tense" || exit 1
cell marine  playful      relaxed marine "marine — relaxed" || exit 1
cell shiba   playful      tense   shiba  "shiba — tense" || exit 1
cell boss    playful      angry   boss   "boss — angry" || exit 1
magick \( "$TMP/classic-cell.png" "$TMP/marine-cell.png" +append \) \
       \( "$TMP/shiba-cell.png" "$TMP/boss-cell.png" +append \) -append preview.png
echo "wrote preview.png ($(magick identify -format '%wx%h' preview.png)); look at it before committing"
