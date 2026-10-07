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
# The pictures come from tools/shoot-card.sh: a synthetic card on an opaque veil, the theme
# carried in the payload, so no desktop shows and no user theme file is touched.

set -u
OUT=${1:-$(mktemp -d)}; mkdir -p "$OUT"
CUR=$HOME/.local/state/omarchy/current
ID=io.github.tuland.ominous
LIGHT="Catppuccin Latte"; DARK="Gruvbox"
SNAP=$(mktemp -d)

SHOOT=$(dirname "$0")/../tools/shoot-card.sh
# Closes the card.
hide() { omarchy-shell -q shell hide "$ID"; }

#######################################
# Describes everything a theme change could touch, as stable text.
# Globals:
#   CUR, HOME
# Outputs:
#   One line per file hash, link target or gsettings value.
#######################################
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

#######################################
# Hands the current theme's palette to the running shell, as omarchy-theme-set does.
# Globals:
#   CUR
#######################################
apply_palette() {
  local c="" s=""
  [[ -f $CUR/theme/colors.toml ]] && c=$(base64 -w 0 "$CUR/theme/colors.toml")
  [[ -f $CUR/theme/shell.toml ]] && s=$(base64 -w 0 "$CUR/theme/shell.toml")
  timeout 5 omarchy-shell shell applyTheme "$c" "$s" >/dev/null 2>&1
}

[[ -d $CUR/theme ]] || { echo "FAIL no current Omarchy theme at $CUR/theme"; exit 1; }
omarchy-shell ominous status >/dev/null 2>&1 || { echo "FAIL the ominous plugin does not answer"; exit 1; }
manifest > "$SNAP/before.txt"
# Without a full copy the restore trap would delete the theme it cannot put back: stop here.
if ! cp -a "$CUR/theme" "$SNAP/theme" || ! cp -a "$CUR/theme.name" "$SNAP/theme.name"; then
  echo "FAIL could not copy the current theme to $SNAP; nothing was changed"; exit 1
fi
ORIGINAL=$(omarchy-theme-current)
echo "saved: $ORIGINAL ($(wc -l < "$SNAP/before.txt") manifest lines) -> $SNAP"

restored=0
#######################################
# Puts the saved theme back, re-applies its palette and compares the manifest. Runs once, on
# exit.
# Globals:
#   SNAP, CUR, ORIGINAL, restored
# Outputs:
#   PASS, or FAIL with the differences.
# Returns:
#   Exits 1 when anything differs.
#######################################
restore() {
  ((restored)) && return; restored=1
  hide
  rm -rf "$CUR/theme"; cp -a "$SNAP/theme" "$CUR/theme"; cp -a "$SNAP/theme.name" "$CUR/theme.name"
  apply_palette
  sleep 1
  manifest > "$SNAP/after.txt"
  if diff -u "$SNAP/before.txt" "$SNAP/after.txt" > "$SNAP/diff.txt"; then
    echo "PASS everything is back as it was: $ORIGINAL, same background, $(wc -l < "$SNAP/after.txt") manifest lines identical"
    rm -rf "$SNAP"
  else
    echo "FAIL the state differs from before; see $SNAP/diff.txt"; head -30 "$SNAP/diff.txt"
    exit 1
  fi
}
trap 'restore' EXIT
trap 'exit 130' INT TERM

#######################################
# Photographs one card through tools/shoot-card.sh.
# Globals:
#   SHOOT, OUT
# Arguments:
#   The picture's name, without .png.
#   The playful theme, the mode and the phase.
#######################################
shoot() {
  "$SHOOT" "$2" "$3" "$4" "$OUT/$1.png" "Weekly sync" >/dev/null && echo "shot $1.png" || echo "FAIL shot $1"
}

hide
for theme in "$LIGHT" "$DARK"; do
  OMARCHY_THEME_HEADLESS=1 OMARCHY_THEME_SKIP_BACKGROUND=1 omarchy-theme-set "$theme" >/dev/null || { echo "FAIL omarchy-theme-set '$theme'"; exit 1; }
  apply_palette; sleep 1.5
  slug=${theme// /-}
  for art in marine shiba boss; do
    for phase in relaxed tense angry; do shoot "$art-$slug-$phase" "$art" playful "$phase"; done
  done
  shoot "classic-$slug-angry" marine professional angry
done
echo "screenshots: $OUT"
