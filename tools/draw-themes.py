#!/usr/bin/env python3
"""Draws the playful themes' pixel art and writes themes/marine.json, shiba.json and boss.json.

Every playful character comes from text grids in tools/art/<theme>/ (read by read_grids,
exported from approved drafts); this script owns their palettes, captions and timing. Edit a
grid or a value below, then run

    tools/draw-themes.py            write the three theme files
    tools/draw-themes.py --show     write them and print every frame as text, to review
    tools/draw-themes.py --check    write nothing; exit 1 if a theme file differs from this script

tests/run.sh runs --check, so a hand edit to one of these JSON files has to be made here too.
All characters are original (no third-party art; see docs/themes.md).
Palette letters: "." is transparent, the others fixed colors (#rrggbb, or #rrggbbaa over the card).
"""
import json
import os
import sys
from typing import Any

Frame = list[str]  # the grid as text rows, as a theme file stores it
Theme = dict[str, Any]  # a theme file's JSON object

THEMES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "themes")
ART_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "art")
PHASES = ("relaxed", "tense", "angry")
MAX_CELLS = 40  # the card's sprite limit (Logic.MAX_SPRITE)
MAX_FRAMES = 64  # per phase (Logic.MAX_FRAMES)


# ---------------------------------------------------------------- marine
# The marine is drawn from text grids (tools/art/marine/<phase>.txt), exported from approved
# drafts; this script owns its palette, captions and timing. The grid letters below are the
# exporter's: tones of the bust and the close-up (dark to light), the four fire tones (deep red,
# orange, yellow, pale yellow core) and the sweat drop.
# skin and brown tones (hue 45 or below, lightness 0.12 or above, saturation below 0.45) at
# saturation x1.3, sheet 013 of drafts/shiba (shiba-storm)
MARINE_PALETTE: dict[str, str] = {
        ".": "transparent",
        "a": "#080605", "b": "#090706", "c": "#1c1411", "d": "#1b1511", "e": "#1f1714", "f": "#321d17",
        "g": "#3c2820", "h": "#3f2c24", "i": "#4f392d", "j": "#8e1f12", "k": "#4f3a2f", "l": "#4b4d2f",
        "m": "#5d4739", "n": "#624439", "o": "#704a3d", "p": "#705044", "q": "#63574b", "r": "#5c5f39",
        "s": "#7e5647", "t": "#66693f", "u": "#825a4d", "v": "#696c42", "w": "#766256", "x": "#986251",
        "y": "#7f6d66", "z": "#757848", "A": "#db4f16", "B": "#996453", "C": "#84726b", "D": "#7b7e4e",
        "E": "#a77262", "F": "#868954", "G": "#ac735f", "H": "#918079", "I": "#90945b", "J": "#b87d6b",
        "K": "#979a5f", "L": "#bf8471", "M": "#9d9896", "N": "#9ea268", "O": "#a2a56d", "P": "#ca8f7d",
        "Q": "#b8a598", "R": "#f59e22", "S": "#afb281", "T": "#daa294", "U": "#8ec6e8", "V": "#deb4a4",
        "W": "#c4e6f6", "X": "#fde084", "Y": "#eef9ff",
}


class GridError(Exception):
    """A grid file outside the contract; the message names the file and the line."""


def read_grids(theme: str, palette: dict[str, str]) -> dict[str, list[Frame]]:
    """Reads a redrawn character's frames from tools/art/<theme>/<phase>.txt.

    Each file holds the phase's frames in order: blocks of equal rows, one palette letter per
    cell, separated by exactly one empty line, ending with a newline.

    Args:
        theme: The character's folder name under tools/art/.
        palette: Its palette; every letter in a grid must be a key.

    Returns:
        Each phase's frames.

    Raises:
        GridError: A missing file, a file that is not UTF-8, no final newline, a stray blank
            line, trailing spaces, an unknown letter, unequal rows or frame sizes (within a
            phase or across phases), more than MAX_CELLS cells a side or more than MAX_FRAMES
            frames in a phase.
    """
    phases: dict[str, list[Frame]] = {}
    size: tuple[int, int] | None = None
    for phase in PHASES:
        path = os.path.join(ART_DIR, theme, phase + ".txt")
        where = os.path.relpath(path, os.path.join(ART_DIR, "..", ".."))
        if not os.path.isfile(path):
            raise GridError(f"{where}: missing")
        with open(path, "rb") as f:
            raw = f.read()
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError as e:
            raise GridError(f"{where}: not UTF-8 at byte {e.start}") from None
        if not text.endswith("\n"):
            raise GridError(f"{where}: no final newline")
        frames: list[Frame] = [[]]
        for n, line in enumerate(text[:-1].split("\n"), 1):
            if line == "":
                if not frames[-1]:
                    raise GridError(f"{where}:{n}: blank line other than one separator")
                frames.append([])
                continue
            if line != line.rstrip():
                raise GridError(f"{where}:{n}: trailing spaces")
            bad = sorted(set(line) - set(palette))
            if bad:
                raise GridError(f"{where}:{n}: letter {bad[0]!r} not in the palette")
            if len(line) > MAX_CELLS:
                raise GridError(f"{where}:{n}: {len(line)} cells wide, at most {MAX_CELLS}")
            if frames[-1] and len(line) != len(frames[-1][0]):
                raise GridError(f"{where}:{n}: row of {len(line)} cells, the frame's are {len(frames[-1][0])}")
            frames[-1].append(line)
            if len(frames[-1]) > MAX_CELLS:
                raise GridError(f"{where}:{n}: frame taller than {MAX_CELLS} rows")
        if not frames[-1]:
            raise GridError(f"{where}: ends with a blank line")
        if len(frames) > MAX_FRAMES:
            raise GridError(f"{where}: {len(frames)} frames, at most {MAX_FRAMES}")
        for i, frame in enumerate(frames):
            here = (len(frame[0]), len(frame))
            if size is None:
                size = here
            elif here != size:
                raise GridError(f"{where}: frame {i} is {here[0]}x{here[1]}, the others {size[0]}x{size[1]}")
        phases[phase] = frames
    return phases


try:
    MARINE_FRAMES = read_grids("marine", MARINE_PALETTE)
except GridError as e:
    sys.exit(f"draw-themes: {e}")

MARINE: Theme = {
    "progress": False,
    "palette": MARINE_PALETTE,
    "phases": {
        "relaxed": {"color": "accent", "caption": "All clear.", "frames": MARINE_FRAMES["relaxed"]},
        # a standoff: the bust, one held close-up on entering the phase, then the bust in a loop
        "tense": {"caption": "Incoming.", "frameMs": 900, "loopFrom": 8, "frames": MARINE_FRAMES["tense"]},
        # ignition once, then a loop: a burst of laughter (the jolt lands on it), then the furious face burning
        "angry": {"color": "urgent", "caption": "YOU ARE LATE.", "frameMs": 120, "shake": True, "loopFrom": 10,
                  "frames": MARINE_FRAMES["angry"]},
    },
}


# ---------------------------------------------------------------- shiba
# From drafts/shiba/work/export.js (sheet 056): 90 colors, one ASCII letter each; the mist's
# steps carry alpha (#rrggbbaa), drawn over the card.
SHIBA_PALETTE: dict[str, str] = {
        ".": "transparent", "!": "#1b1511", "#": "#5e4538", "$": "#1c1c3180", "%": "#3f3535", "&": "#cd7c35",
        "'": "#1c1c3138", "(": "#1c1c31cc", ")": "#1c1c31", "*": "#ae6d36", "+": "#504544", ",": "#a28063",
        "-": "#453d3e", "/": "#372c2d", "0": "#503c34", "1": "#907154", "2": "#5c504d", "3": "#71513b",
        "4": "#d08a4d", "5": "#8e5e38", "6": "#af977e", "7": "#6c5b53", "8": "#7c6658", "9": "#cbaf93",
        ":": "#755f4e", ";": "#775133", "<": "#d39b66", "=": "#0f0e15", ">": "#2a2a5180", "?": "#2a2a5138",
        "@": "#261f25", "A": "#8e5e39", "B": "#2a2a51cc", "C": "#d9c2ac", "D": "#573924", "E": "#957862",
        "F": "#58443d", "G": "#a58b7a", "H": "#0c0c1338", "I": "#0c0c1380", "J": "#d8a582", "K": "#090606",
        "L": "#1b1515", "M": "#2a2a51", "N": "#b09b8e", "O": "#0c0c13cc", "P": "#392d2c", "Q": "#7f4a23",
        "R": "#a96b38", "S": "#bea599", "T": "#a08e8e", "U": "#c3b2ac", "V": "#33221c", "W": "#806668",
        "X": "#897678", "Y": "#dab69d", "Z": "#c27a3c", "[": "#c88d5a", "]": "#d6c1b9", "^": "#c4987c",
        "_": "#8ec6e8", "`": "#6c67a6", "a": "#7d76b8", "b": "#3d456b80", "c": "#decdc9", "d": "#3d456b",
        "e": "#f6f3ff", "f": "#cfc8ff", "g": "#5b9bd0", "h": "#3d456bcc", "i": "#53638380", "j": "#793a43",
        "k": "#7b6258", "l": "#d4ec72", "m": "#977d69", "n": "#3d456b38", "o": "#9c8587", "p": "#594947",
        "q": "#4a4778", "r": "#c0af9e", "s": "#ad5f74", "t": "#eef9ff", "u": "#8c4d61", "v": "#c4e6f6",
        "w": "#536383cc", "x": "#b49c88", "y": "#536383", "z": "#553b31", "{": "#e1d2c3", "|": "#9f6f4a",
        "}": "#d6c3b0",
}

try:
    SHIBA_FRAMES = read_grids("shiba", SHIBA_PALETTE)
except GridError as e:
    sys.exit(f"draw-themes: {e}")

SHIBA: Theme = {
    "progress": False,
    "palette": SHIBA_PALETTE,
    "phases": {
        "relaxed": {"color": "accent", "caption": "such calm. very agenda.", "frames": SHIBA_FRAMES["relaxed"]},
        # eyes darting and a sweat drop: the bust, one held close-up on entering the phase, then the bust in a loop
        "tense": {"caption": "much soon. wow.", "frameMs": 900, "loopFrom": 8, "frames": SHIBA_FRAMES["tense"]},
        # night falls and the eyes light up, then a storm loop: barks, then a snarl (the jolt lands on the first strike)
        "angry": {"color": "urgent", "caption": "very late. so meeting.", "frameMs": 120, "shake": True, "loopFrom": 10,
                  "frames": SHIBA_FRAMES["angry"]},
    },
}


# ---------------------------------------------------------------- boss
# From drafts/boss/work/export.js (sheet 036): 91 colors, one ASCII letter each; the smoke's
# steps carry alpha (#rrggbbaa), drawn over the card. Fixed colors only, the tie included.
BOSS_PALETTE: dict[str, str] = {
        ".": "transparent", "!": "#293551", "#": "#1b1511", "$": "#26324e", "%": "#d58a6d", "&": "#e9a080",
        "'": "#bd7a60", "(": "#edbca5", ")": "#c7493a", "*": "#c0c4cb99", "+": "#c0c4cb75", ",": "#868c9675",
        "-": "#a86b57", "/": "#868c9699", "0": "#a44b42", "1": "#868c9652", "2": "#835547", "3": "#c0c4cb52",
        "4": "#1f2d4a", "5": "#e05342", "6": "#5f6371", "7": "#c0c4cb33", "8": "#c0c4cb1a", "9": "#6f342d",
        ":": "#7c7881", ";": "#868c961a", "<": "#868c9633", "=": "#8c6259", ">": "#864e49", "?": "#7f3e37",
        "@": "#e56f60", "A": "#868c96bf", "B": "#ea8c80", "C": "#d3d2d6", "D": "#e6e6e9", "E": "#a4a9b299",
        "F": "#c2bdc2", "G": "#72483b", "H": "#a4a9b252", "I": "#968a8e", "J": "#ff2d2d", "K": "#c1644d",
        "L": "#aea7ab", "M": "#a4a9b275", "N": "#713d32", "O": "#c0c4cbbf", "P": "#a4a9b233", "Q": "#db7057",
        "R": "#5b211b", "S": "#c55240", "T": "#81473d", "U": "#a65b4c", "V": "#a4a9b21a", "W": "#e8896f",
        "X": "#51111f", "Y": "#e05c47", "Z": "#c35b47", "[": "#eda591", "]": "#89574f", "^": "#a55145",
        "_": "#c7948c", "`": "#a4a9b2bf", "a": "#661625", "b": "#e67865", "c": "#de664f", "d": "#a65648",
        "e": "#eb9585", "f": "#5c291f", "g": "#e7806a", "h": "#8a0014", "i": "#ec9d8b", "j": "#3b0c17",
        "k": "#d81a2e", "l": "#5c3326", "m": "#801b2c", "n": "#340b11", "o": "#c86f69", "p": "#46424f",
        "q": "#8ec6e8", "r": "#d66d6e", "s": "#a85656", "t": "#ff9a92", "u": "#b0081c", "v": "#c7837b",
        "w": "#c8766f", "x": "#c77c75", "y": "#5b9bd0", "z": "#491316", "{": "#192132", "|": "#d9795e",
        "}": "#eef9ff", "~": "#c4e6f6",
}

try:
    BOSS_FRAMES = read_grids("boss", BOSS_PALETTE)
except GridError as e:
    sys.exit(f"draw-themes: {e}")

BOSS: Theme = {
    "progress": False,
    "palette": BOSS_PALETTE,
    "phases": {
        "relaxed": {"color": "accent", "caption": "Let's circle back.", "frames": BOSS_FRAMES["relaxed"]},
        # holding his temper, eyes darting and a sweat drop: one held close-up on entering the phase, then the bust in a loop
        "tense": {"caption": "Can you see my screen?", "frameMs": 900, "loopFrom": 8, "frames": BOSS_FRAMES["tense"]},
        # red climbs his skin as smoke gathers, then a loop: a held yell (the jolt lands on it), then the scowl
        "angry": {"color": "urgent", "caption": "Again? The whole team is waiting.", "frameMs": 120, "shake": True,
                  "loopFrom": 10, "frames": BOSS_FRAMES["angry"]},
    },
}

THEMES: dict[str, Theme] = {"marine": MARINE, "shiba": SHIBA, "boss": BOSS}


def render(theme: Theme) -> str:
    """Serializes a theme as its file's text.

    One frame row per line keeps the art readable and the diffs small.

    Args:
        theme: The theme as a dict.

    Returns:
        The JSON text, with a final newline.
    """
    return json.dumps(theme, indent=2).replace('",\n          "', '", "') + "\n"


def main(args: list[str]) -> int:
    """Writes, shows or checks the themes.

    Args:
        args: [] to write the files, ["--show"] to also print every frame, ["--check"] to
            only compare the files with the drawing.

    Returns:
        The exit status: 0, 1 when --check finds a difference, 2 on bad arguments.
    """
    if args not in ([], ["--show"], ["--check"]):
        print(__doc__)
        return 2
    stale = []
    for name, theme in THEMES.items():
        path = os.path.join(THEMES_DIR, name + ".json")
        text = render(theme)
        if args == ["--check"]:
            with open(path) as f:
                if f.read() != text:
                    stale.append(name)
            continue
        with open(path, "w") as f:
            f.write(text)
        if args == ["--show"]:
            print("==", name)
            for phase, spec in theme["phases"].items():
                for i, frame in enumerate(spec["frames"]):
                    print(phase, i)
                    print("\n".join(frame))
    if stale:
        print("themes out of date with tools/draw-themes.py: " + ", ".join(stale) + " (run tools/draw-themes.py)")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
