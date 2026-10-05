#!/usr/bin/env bash
# Looks at the card under other Omarchy themes (one light, one dark), saves a screenshot of each
# state, then puts everything back and proves it.
#   tests/theme-check.sh [outdir]      screenshots go to outdir (default: a new temp dir, printed)
#
# Only the shell's palette changes. `omarchy-theme-set` runs headless (no terminal, browser, GNOME,
# VS Code or keyboard retint, no wallpaper change) and the palette is handed to the shell by hand,
# the same IPC call the full command makes. Before touching anything it copies
# ~/.local/state/omarchy/current byte for byte and writes a manifest (hashes of the theme files,
# the background link, the config of the apps a full theme change would restart, gsettings).
# On exit, success or not, it puts the copy back, re-applies the original palette and diffs the
# manifest: any difference is reported and the exit status is 1.
# The captures are crops around the card, but a sliver of the desktop can show at the edges:
# keep them out of the repo.

set -u
OUT=${1:-$(mktemp -d)}; mkdir -p "$OUT"
CUR=$HOME/.local/state/omarchy/current
THEMES=$HOME/.config/omarchy/ominous/themes
ID=io.github.tuland.ominous
LIGHT="Catppuccin Latte"; DARK="Gruvbox"
SNAP=$(mktemp -d)

hide() { omarchy-shell -q shell hide "$ID"; }
wait_for() { local n=$1; shift; local i; for ((i = 0; i < n; i++)); do "$@" && return 0; sleep 0.2; done; return 1; }
overlay_open() {
  hyprctl layers -j | python3 -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if any(l["namespace"]=="ominous-alert" for v in d.values() for ls in v["levels"].values() for l in ls) else 1)'
}
overlay_closed() { ! overlay_open; }

# Everything a theme change could touch, as stable text.
manifest() {
  echo "theme.name: $(cat "$CUR/theme.name" 2>/dev/null)"
  echo "current: $(omarchy-theme-current 2>/dev/null)"
  echo "background: $(readlink "$CUR/background")"
  echo "next-theme staging: $([[ -e $CUR/next-theme ]] && echo present || echo absent)"
  ( cd "$CUR/theme" 2>/dev/null && find . \( -type f -o -type l \) | LC_ALL=C sort | while read -r f; do
      if [[ -L $f ]]; then echo "link $f -> $(readlink "$f")"; else echo "file $f $(sha256sum < "$f" | cut -c1-16)"; fi
    done )
  local d
  for d in hypr alacritty kitty ghostty btop gtk-3.0 gtk-4.0; do
    [[ -d $HOME/.config/$d ]] && ( cd "$HOME/.config/$d" && find . -maxdepth 3 -type f | LC_ALL=C sort | while read -r f; do echo "config $d/$f $(sha256sum < "$f" | cut -c1-16)"; done )
  done
  ( cd "$HOME/.config/omarchy" && find . -maxdepth 1 -type f | LC_ALL=C sort | while read -r f; do echo "omarchy $f $(sha256sum < "$f" | cut -c1-16)"; done )
  for k in color-scheme gtk-theme icon-theme; do echo "gsettings $k $(gsettings get org.gnome.desktop.interface $k 2>/dev/null)"; done
}

apply_palette() {   # what omarchy-theme-set sends the running shell
  local c="" s=""
  [[ -f $CUR/theme/colors.toml ]] && c=$(base64 -w 0 "$CUR/theme/colors.toml")
  [[ -f $CUR/theme/shell.toml ]] && s=$(base64 -w 0 "$CUR/theme/shell.toml")
  timeout 5 omarchy-shell shell applyTheme "$c" "$s" >/dev/null 2>&1
}

[[ -d $CUR/theme ]] || { echo "FAIL no current Omarchy theme at $CUR/theme"; exit 1; }
omarchy-shell ominous status >/dev/null 2>&1 || { echo "FAIL the ominous plugin does not answer"; exit 1; }
manifest > "$SNAP/before.txt"
cp -a "$CUR/theme" "$SNAP/theme"; cp -a "$CUR/theme.name" "$SNAP/theme.name"
[[ -f $THEMES/marine.json ]] && cp -p "$THEMES/marine.json" "$SNAP/marine.json"
ORIGINAL=$(omarchy-theme-current)
echo "saved: $ORIGINAL ($(wc -l < "$SNAP/before.txt") manifest lines) -> $SNAP"

restored=0
restore() {
  ((restored)) && return; restored=1
  hide
  rm -rf "$CUR/theme"; cp -a "$SNAP/theme" "$CUR/theme"; cp -a "$SNAP/theme.name" "$CUR/theme.name"
  rm -f "$THEMES/marine.json"; [[ -f $SNAP/marine.json ]] && cp -p "$SNAP/marine.json" "$THEMES/marine.json"
  apply_palette
  sleep 1
  manifest > "$SNAP/after.txt"
  if diff -u "$SNAP/before.txt" "$SNAP/after.txt" > "$SNAP/diff.txt"; then
    echo "PASS everything is back as it was: $ORIGINAL, same background, $(wc -l < "$SNAP/after.txt") manifest lines identical"
    rm -rf "$SNAP"
  else
    echo "FAIL the state differs from before; see $SNAP/diff.txt"; cat "$SNAP/diff.txt" | head -30
    exit 1
  fi
}
trap 'restore' EXIT
trap 'exit 130' INT TERM

# The focused monitor's centre, in layout coordinates, for a crop around the card.
crop=$(hyprctl monitors -j | python3 -c '
import json,sys
m=next(m for m in json.load(sys.stdin) if m["focused"])
w,h=m["width"]/m["scale"],m["height"]/m["scale"]
print("%d,%d 700x420" % (m["x"]+w/2-350, m["y"]+h/2-210))')

shoot() {   # label, spec
  omarchy-shell ominous preview "$2 Weekly sync" >/dev/null
  wait_for 15 overlay_open || { echo "FAIL the card did not open for '$2'"; return 1; }
  sleep 1.3
  grim -g "$crop" "$OUT/$1.png" && echo "shot $1.png"
  hide; wait_for 15 overlay_closed
}

hide; wait_for 15 overlay_closed
for art in marine shiba; do
  rm -f "$THEMES/marine.json"
  [[ $art == shiba ]] && cp "$(dirname "$0")/../themes/shiba.json" "$THEMES/marine.json"   # a user "marine" overrides the shipped one
  sleep 1.6
  for theme in "$LIGHT" "$DARK"; do
    OMARCHY_THEME_HEADLESS=1 OMARCHY_THEME_SKIP_BACKGROUND=1 omarchy-theme-set "$theme" >/dev/null || { echo "FAIL omarchy-theme-set '$theme'"; exit 1; }
    apply_palette; sleep 1.5
    slug=${theme// /-}
    for phase in relaxed tense angry; do shoot "$art-$slug-$phase" "$phase playful"; done
    [[ $art == marine ]] && shoot "classic-$slug-angry" "angry professional"
  done
done
echo "screenshots: $OUT"
