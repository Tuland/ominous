#!/usr/bin/env bash
# Fetches the development-only third-party tools into folders git ignores. Run it through mise:
#   mise run setup        (the same as tools/setup-dev.sh)
#
# Today one tool: codixel (MIT), a Claude Code skill for pixel art, used only to explore new
# character art in drafts/. Its SKILL.md, core/pixel.js and LICENSE are read straight from git
# objects at one pinned commit, so nothing of the fetched tree is checked out, no hook or filter
# runs on it, and nothing from it is executed. They are written as regular files to
# .claude/skills/codixel/, which the plugin never ships. Moving to a new commit means reading
# its code first (docs/development.md, at the top). If a run is interrupted, run it again.

set -euo pipefail

readonly CODIXEL_URL="https://github.com/mankidev/codixel"
readonly CODIXEL_SHA="604a9dcbcc4e386bc48188b5f7f49099f5d04db7"
readonly CODIXEL_FILES=(SKILL.md core/pixel.js LICENSE)

cd "$(dirname "$0")/.." || exit 2
readonly DEST=".claude/skills/codixel"
# The new copy is staged next to the destination (same file system, so the swap is two renames)
# under names .gitignore also covers.
readonly NEW=".claude/skills/.codixel-new"
readonly OLD=".claude/skills/.codixel-old"
TMP=$(mktemp -d /tmp/ominous-setup.XXXXXX)
readonly TMP
trap 'rm -rf "$TMP" "$NEW"' EXIT

#######################################
# Runs git in the temporary repository only: hooks and submodule recursion off, no credential
# prompt, and none of the caller's repository or config variables (set when run from a git
# hook) passed on.
# Globals:
#   TMP
# Arguments:
#   The git arguments.
# Outputs:
#   What git prints.
# Returns:
#   git's exit status.
#######################################
tgit() {
  env -u GIT_DIR -u GIT_WORK_TREE -u GIT_OBJECT_DIRECTORY -u GIT_INDEX_FILE -u GIT_COMMON_DIR \
    -u GIT_NAMESPACE -u GIT_ALTERNATE_OBJECT_DIRECTORIES -u GIT_CONFIG_COUNT \
    -u GIT_CONFIG_PARAMETERS GIT_TERMINAL_PROMPT=0 \
    git -C "$TMP/repo" -c core.hooksPath=/dev/null -c fetch.recurseSubmodules=false \
    -c submodule.recurse=false "$@"
}

#######################################
# Fails when the destination or one of its parent folders is a symlink.
# Globals:
#   DEST
# Arguments:
#   None
# Outputs:
#   Writes the reason to stderr on a symlink.
# Returns:
#   Exits non-zero, touching nothing, on a symlink.
#######################################
refuse_symlinks() {
  local path
  for path in .claude .claude/skills "$DEST"; do
    if [[ -L $path ]]; then
      echo "codixel: $path is a symlink; replace it with a folder and run again" >&2
      exit 1
    fi
  done
}

#######################################
# Fetches codixel at the pinned commit and writes its three files to the staging folder.
# Globals:
#   TMP, NEW, CODIXEL_URL, CODIXEL_SHA, CODIXEL_FILES
# Arguments:
#   None
# Outputs:
#   Writes the reason to stderr when the commit or a file is not the expected one.
# Returns:
#   Exits non-zero, before touching the destination, on a fetch error or an unexpected object.
#######################################
fetch_codixel() {
  mkdir -p "$TMP/repo"
  tgit init --quiet
  tgit fetch --quiet --depth 1 "$CODIXEL_URL" "$CODIXEL_SHA"
  local head
  head=$(tgit rev-parse FETCH_HEAD)
  if [[ $head != "$CODIXEL_SHA" ]]; then
    echo "codixel: fetched $head, expected $CODIXEL_SHA" >&2
    exit 1
  fi
  rm -rf "$NEW"
  local file mode
  for file in "${CODIXEL_FILES[@]}"; do
    mode=$(tgit ls-tree "$CODIXEL_SHA" -- "$file" | cut -d' ' -f1)
    if [[ $mode != 100644 ]]; then
      echo "codixel: $file is not a regular file at $CODIXEL_SHA (mode '${mode}')" >&2
      exit 1
    fi
    mkdir -p "$NEW/$(dirname "$file")"
    tgit cat-file blob "$CODIXEL_SHA:$file" >"$NEW/$file"
  done
}

#######################################
# Swaps the staged copy in: the old copy is renamed aside, the new one renamed into place, the
# old one put back if that fails and removed only once the new one is in.
# Globals:
#   DEST, NEW, OLD, CODIXEL_SHA
# Arguments:
#   None
# Outputs:
#   The installed commit; on failure, the reason on stderr.
# Returns:
#   Exits non-zero when the swap or the cleanup of the old copy fails.
#######################################
install_codixel() {
  if [[ -e $DEST ]]; then mv -T "$DEST" "$OLD"; fi
  if ! mv -T "$NEW" "$DEST"; then
    if [[ -e $OLD ]]; then mv -T "$OLD" "$DEST"; fi
    echo "codixel: could not install $DEST" >&2
    exit 1
  fi
  echo "codixel ${CODIXEL_SHA:0:7} installed in $DEST"
  if ! rm -rf "$OLD"; then
    echo "codixel: $DEST is the new copy, but the old one is left in $OLD; remove it" >&2
    exit 1
  fi
}

#######################################
# Puts back a copy an interrupted run left aside, so it is never deleted before a new one is in.
# Globals:
#   DEST, OLD
# Arguments:
#   None
# Returns:
#   Exits non-zero when the old copy cannot be renamed or removed.
#######################################
recover_codixel() {
  if [[ -e $OLD && ! -e $DEST ]]; then
    mv -T "$OLD" "$DEST"
  elif [[ -e $OLD ]]; then
    rm -rf "$OLD"
  fi
}

refuse_symlinks
mkdir -p "$(dirname "$DEST")"
recover_codixel
fetch_codixel
install_codixel
