#!/usr/bin/env python3
"""Draws the playful themes' pixel art and writes themes/marine.json, shiba.json and boss.json.

The marine and the shiba come from text grids in tools/art/<theme>/ (read by read_grids,
exported from approved drafts); the boss is still code, so each expression is built from the
same face and changes stay small. Edit a grid or a function below, then run

    tools/draw-themes.py            write the three theme files
    tools/draw-themes.py --show     write them and print every frame as text, to review
    tools/draw-themes.py --check    write nothing; exit 1 if a theme file differs from this script

tests/run.sh runs --check, so a hand edit to one of these JSON files has to be made here too.
All characters are original (no third-party art; see docs/themes.md).
Palette letters: "." is transparent, roles (accent, urgent, muted, ...) follow the Omarchy theme.
"""
import json
import os
import sys
from typing import Any

Grid = list[list[str]]  # N rows of N palette characters
Frame = list[str]  # the grid as text rows, as a theme file stores it
Theme = dict[str, Any]  # a theme file's JSON object

N = 16  # the boss, still drawn as coordinates
THEMES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "themes")
ART_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "art")
PHASES = ("relaxed", "tense", "angry")
MAX_CELLS = 40  # the card's sprite limit (Logic.MAX_SPRITE)
MAX_FRAMES = 64  # per phase (Logic.MAX_FRAMES)


def blank() -> Grid:
    """Returns an empty N x N grid, every cell transparent (".")."""
    return [["."] * N for _ in range(N)]


def put(g: Grid, pts: list[tuple[int, int]], c: str) -> None:
    """Paints single pixels, skipping any outside the grid.

    Args:
        g: The grid, changed in place.
        pts: (x, y) pairs.
        c: The palette character to paint.
    """
    for x, y in pts:
        if 0 <= x < N and 0 <= y < N:
            g[y][x] = c


def rect(g: Grid, x0: int, y0: int, x1: int, y1: int, c: str) -> None:
    """Fills a rectangle, corners included.

    Args:
        g: The grid, changed in place.
        x0: Left column.
        y0: Top row.
        x1: Right column.
        y1: Bottom row.
        c: The palette character to paint.
    """
    put(g, [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)], c)


def rows(g: Grid) -> Frame:
    """Returns the grid as text rows, the form a theme file stores."""
    return ["".join(r) for r in g]


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
def boss(mood: str, variant: int = 0) -> Frame:
    """Draws the boss: an executive in suit and tie.

    Args:
        mood: "relaxed", "tense" or "angry".
        variant: The animation frame of that mood.

    Returns:
        The frame as text rows.
    """
    g = blank()
    angry = mood == "angry"
    skin, shade = ("z", "Z") if angry else ("s", "S")
    # head with slicked hair, outlined automatically
    spans = {1: (5, 10), 2: (3, 12), 3: (2, 13), 4: (2, 13), 5: (2, 13), 6: (2, 13), 7: (2, 13),
             8: (2, 13), 9: (2, 13), 10: (3, 12), 11: (4, 11)}
    shape = {(x, y) for y, (a, b) in spans.items() for x in range(a, b + 1)}
    shape |= {(1, 6), (1, 7), (14, 6), (14, 7)}  # ears
    for (x, y) in shape:
        g[y][x] = skin
    for (x, y) in list(shape):
        if any((x + dx, y + dy) not in shape for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            g[y][x] = "k"
    for y in (2, 3):
        for x in range(spans[y][0] + 1, spans[y][1]):
            g[y][x] = "H"
    put(g, [(3, 4), (12, 4), (3, 5), (12, 5)], "H")  # sideburns
    put(g, [(4, 2), (5, 2), (6, 2), (4, 3)], "h")     # side part shine
    for y in range(7, 10):
        put(g, [(3, y), (12, y)], shade)
    put(g, [(7, 8), (8, 8)], shade)  # nose
    # neck, collar, tie, jacket
    rect(g, 6, 12, 9, 12, shade); put(g, [(5, 12), (10, 12)], "k")
    tie = "N" if angry else "n"
    rect(g, 2, 13, 13, 13, "j"); put(g, [(5, 13), (6, 13), (9, 13), (10, 13)], "w"); rect(g, 7, 13, 8, 13, tie)
    rect(g, 0, 14, 15, 15, "j"); put(g, [(5, 14), (10, 14), (4, 15), (11, 15)], "J")
    rect(g, 6, 14, 9, 15, "w"); rect(g, 7, 14, 8, 15, tie)
    put(g, [(0, 13), (1, 13), (14, 13), (15, 13)], ".")

    if mood == "relaxed":
        rect(g, 4, 5, 6, 5, "k"); rect(g, 9, 5, 11, 5, "k")          # level brows
        put(g, [(5, 7), (6, 7), (9, 7), (10, 7)], "k")               # half-closed, pleased with himself
        put(g, [(5, 6), (6, 6), (9, 6), (10, 6)], shade)             # heavy lids
        put(g, [(6, 10), (7, 10), (8, 10), (9, 9)], "m")             # smirk
    elif mood == "tense":
        put(g, [(4, 4), (5, 4), (6, 4), (9, 4), (10, 4), (11, 4)], "k")  # brows up
        rect(g, 4, 6, 6, 7, "w"); rect(g, 9, 6, 11, 7, "w")
        px = 4 if variant == 0 else 6
        put(g, [(px, 6), (px, 7), (px + 5, 6), (px + 5, 7)], "k")      # eyes darting
        rect(g, 6, 10, 9, 10, "m")                                     # tight line
        dy = 0 if variant == 0 else 1
        put(g, [(12, 4 + dy), (12, 5 + dy)], "b")                      # sweat
    else:
        put(g, [(4, 5), (5, 5), (6, 6), (11, 5), (10, 5), (9, 6)], "k")  # slanted brows
        rect(g, 4, 7, 6, 7, "w"); rect(g, 9, 7, 11, 7, "w"); put(g, [(5, 7), (10, 7)], "r")
        # lips in the mouth color, not the outline's, or the scowl reads as a moustache
        if variant == 1:  # yelling: a round open mouth, dark inside, tongue at the bottom, no teeth
            rect(g, 6, 9, 9, 9, "m"); put(g, [(5, 10), (10, 10)], "m")
            rect(g, 6, 10, 9, 10, "k"); rect(g, 7, 10, 8, 10, "r")
        else:  # scowl: lips pressed, corners pulled down
            rect(g, 6, 9, 9, 9, "m"); put(g, [(5, 10), (10, 10)], "m")
        if variant == 0:  # steam out of the ears, rising
            put(g, [(0, 5), (0, 4), (15, 5), (15, 4)], "f")
        elif variant == 2:
            put(g, [(1, 3), (0, 2), (14, 3), (15, 2)], "f")
    return rows(g)


BOSS: Theme = {
    "progress": False,
    "palette": {
        ".": "transparent", "k": "#1b1511", "H": "#2e2622", "h": "#5a4d44", "s": "#e6b98f", "S": "#c9976c",
        "z": "#e07a5a", "Z": "#c25a40", "w": "#f4f1ea", "T": "#f4f1ea", "m": "#7a3a30", "r": "urgent",
        "b": "accent", "n": "accent", "N": "urgent", "j": "#56606e", "J": "#3f4651", "f": "muted",
    },
    "phases": {
        "relaxed": {"color": "accent", "caption": "Let's circle back.", "frames": [boss("relaxed")]},
        "tense": {"caption": "Can you see my screen?", "frameMs": 900, "frames": [boss("tense", 0), boss("tense", 1)]},
        "angry": {"color": "urgent", "caption": "Per my last email.", "frameMs": 250, "shake": True,
                  "frames": [boss("angry", 0), boss("angry", 1), boss("angry", 2)]},
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
