#!/usr/bin/env python3
"""Draws the playful themes' pixel art and writes themes/marine.json, shiba.json and boss.json.

The art is code so that each expression is built from the same face and changes stay small:
edit a function below, then run

    tools/draw-themes.py            write the three theme files
    tools/draw-themes.py --show     write them and print every frame as text, to review
    tools/draw-themes.py --check    write nothing; exit 1 if a theme file differs from this script

tests/run.sh runs --check, so a hand edit to one of these JSON files has to be made here too.
All characters are original and drawn from scratch; see docs/themes.md.
Palette letters: "." is transparent, roles (accent, urgent, muted, ...) follow the Omarchy theme.
"""
import json
import os
import sys

N = 16
THEMES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "themes")


def blank():
    return [["."] * N for _ in range(N)]


def put(g, pts, c):
    for x, y in pts:
        if 0 <= x < N and 0 <= y < N:
            g[y][x] = c


def rect(g, x0, y0, x1, y1, c):
    put(g, [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)], c)


def rows(g):
    return ["".join(r) for r in g]


# ---------------------------------------------------------------- marine
def marine(mood, variant=0):
    """mood: relaxed | tense | angry. variant picks the animation frame."""
    g = blank()
    angry = mood == "angry"
    skin, shade = ("z", "Z") if angry else ("s", "S")
    # helmet
    put(g, [(x, 1) for x in range(4, 12)], "k")
    put(g, [(3, 2), (12, 2)], "k"); rect(g, 4, 2, 11, 2, "h")
    put(g, [(2, 3), (13, 3), (2, 4), (13, 4)], "k"); rect(g, 3, 3, 12, 4, "h")
    rect(g, 5, 2, 8, 2, "H"); rect(g, 4, 3, 6, 3, "H")
    put(g, [(2, 5), (13, 5)], "k"); rect(g, 3, 5, 12, 5, "g")
    # face
    for y in range(6, 13):
        put(g, [(2, y), (13, y)], "k"); rect(g, 3, y, 12, y, skin)
    put(g, [(3, 13), (12, 13)], "k"); rect(g, 4, 13, 11, 13, skin)
    rect(g, 4, 14, 11, 14, "k")
    for y in range(8, 13):
        put(g, [(3, y), (12, y)], shade)
    put(g, [(7, 10), (8, 10)], shade)  # nose

    if mood == "relaxed":
        rect(g, 4, 6, 6, 6, "k"); rect(g, 9, 6, 11, 6, "k")  # flat brows
        rect(g, 4, 7, 6, 8, "w"); rect(g, 9, 7, 11, 8, "w")
        put(g, [(5, 7), (5, 8), (10, 7), (10, 8)], "k")
        put(g, [(5, 11), (10, 11)], "m"); rect(g, 6, 12, 9, 12, "m")  # smile
    elif mood == "tense":
        put(g, [(4, 5), (5, 5), (6, 5), (9, 5), (10, 5), (11, 5)], "k")  # raised brows
        rect(g, 4, 6, 6, 8, "w"); rect(g, 9, 6, 11, 8, "w")
        px = 4 if variant == 0 else 6
        px2 = px + 5
        put(g, [(px, 7), (px, 8), (px2, 7), (px2, 8)], "k")
        rect(g, 6, 12, 9, 12, "m")  # flat mouth
        dy = 0 if variant == 0 else 1  # the sweat drop slides down
        put(g, [(14, 5 + dy), (14, 6 + dy), (14, 7 + dy), (15, 7 + dy)], "b")
    else:
        put(g, [(4, 6), (5, 6), (6, 7), (11, 6), (10, 6), (9, 7)], "k")  # slanted brows
        rect(g, 4, 8, 6, 8, "w"); rect(g, 9, 8, 11, 8, "w")
        put(g, [(5, 8), (10, 8)], "r")  # glowing pupils
        if variant == 1:  # shouting: two fangs hang from the top lip, tongue below
            rect(g, 5, 10, 10, 13, "k")
            put(g, [(6, 11), (9, 11)], "t"); rect(g, 7, 11, 8, 11, "m")
            rect(g, 6, 12, 9, 12, "m"); rect(g, 7, 12, 8, 12, "r")
        else:  # grimace: gritted teeth, each one set apart by a dark gap
            rect(g, 5, 11, 10, 11, "k")
            put(g, [(5, 12), (7, 12), (8, 12), (10, 12)], "t"); put(g, [(6, 12), (9, 12)], "k")
            rect(g, 5, 13, 10, 13, "k")
        if variant != 2:  # anger mark, pulsing
            put(g, [(13, 0), (15, 0), (14, 1), (13, 2), (15, 2)], "r")
    return rows(g)


MARINE = {
    "progress": False,
    "palette": {
        ".": "transparent", "k": "#1b1511", "h": "#55703c", "H": "#7c9a58", "g": "#3c5230",
        "s": "#d9a273", "S": "#b98456", "z": "#d9694a", "Z": "#b4503a", "w": "#f4efe6",
        "t": "#f4efe6", "m": "#8a3b34", "r": "urgent", "b": "accent",
    },
    "phases": {
        "relaxed": {"color": "accent", "caption": "All clear.", "frames": [marine("relaxed")]},
        "tense": {"caption": "Incoming.", "frameMs": 900, "frames": [marine("tense", 0), marine("tense", 1)]},
        "angry": {"color": "urgent", "caption": "YOU ARE LATE.", "frameMs": 250, "shake": True,
                  "frames": [marine("angry", 0), marine("angry", 1), marine("angry", 2)]},
    },
}


# ---------------------------------------------------------------- shiba
def shiba(mood, variant=0):
    g = blank()
    angry = mood == "angry"
    fur = "q" if angry else "o"
    spans = {4: (3, 12), 5: (2, 13), 6: (1, 14), 7: (1, 14), 8: (1, 14), 9: (1, 14),
             10: (1, 14), 11: (1, 14), 12: (2, 13), 13: (3, 12), 14: (5, 10)}
    shape = set()
    for y, (a, b) in spans.items():
        for x in range(a, b + 1):
            shape.add((x, y))
    # ears: upright, or flattened sideways when angry
    ear = ([(1, 2), (1, 3), (2, 3), (3, 3), (2, 4), (3, 4), (4, 4)] if angry
           else [(2, 1), (2, 2), (3, 2), (2, 3), (3, 3), (4, 3), (3, 4), (4, 4), (5, 4)])
    for x, y in ear:
        shape.add((x, y)); shape.add((15 - x, y))
    inner = [(2, 3)] if angry else [(3, 3)]
    for (x, y) in shape:
        g[y][x] = fur
    # outline: any shape pixel touching empty space
    for (x, y) in list(shape):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if (x + dx, y + dy) not in shape:
                g[y][x] = "k"
    for (x, y) in inner:
        put(g, [(x, y), (15 - x, y)], "i")
    # cream muzzle and cheeks
    for y, (a, b) in {9: (5, 10), 10: (4, 11), 11: (4, 11), 12: (4, 11), 13: (5, 10)}.items():
        for x in range(a, b + 1):
            if g[y][x] != "k":
                g[y][x] = "c"
    put(g, [(4, 5), (11, 5)], "c")  # the pale dots above a shiba's eyes
    put(g, [(7, 9), (8, 9)], "k")  # nose

    if mood == "relaxed":
        put(g, [(4, 8), (5, 7), (6, 8), (9, 8), (10, 7), (11, 8)], "k")  # happy closed eyes
        put(g, [(6, 10), (9, 10), (7, 11), (8, 11)], "k")  # smile
    elif mood == "tense":
        rect(g, 4, 6, 6, 8, "w"); rect(g, 9, 6, 11, 8, "w")
        px = 4 if variant == 0 else 6
        put(g, [(px, 7), (px + 5, 7)], "k")
        put(g, [(6, 11), (9, 11), (7, 12), (8, 12)], "k")  # worried mouth
        dy = 0 if variant == 0 else 1
        put(g, [(8, 4 + dy), (8, 5 + dy)], "b")  # sweat
    else:
        put(g, [(3, 6), (4, 6), (5, 7), (6, 7), (12, 6), (11, 6), (10, 7), (9, 7)], "k")  # furrowed brows
        put(g, [(4, 8), (6, 8), (9, 8), (11, 8)], "k"); put(g, [(5, 8), (10, 8)], "r")
        if variant == 1:  # barking
            rect(g, 5, 10, 10, 13, "k"); rect(g, 6, 11, 9, 12, "m"); put(g, [(6, 10), (9, 10)], "w")
            put(g, [(7, 12), (8, 12)], "r")
        else:  # snarl
            rect(g, 5, 10, 10, 10, "k"); put(g, [(5, 11), (10, 11)], "k")
            put(g, [(6, 11), (9, 11), (6, 12), (9, 12)], "w"); put(g, [(7, 11), (8, 11)], "m")
        if variant == 2:  # fur standing up
            put(g, [(0, 7), (0, 9), (15, 7), (15, 9)], "k")
    return rows(g)


SHIBA = {
    "progress": False,
    "palette": {
        ".": "transparent", "k": "#241713", "o": "#e08a3c", "q": "#e2552f", "c": "#f6e7c8",
        "i": "#e9959a", "w": "#ffffff", "m": "#6e2a2a", "r": "urgent", "b": "accent",
    },
    "phases": {
        "relaxed": {"color": "accent", "caption": "such calm. very agenda.", "frames": [shiba("relaxed")]},
        "tense": {"caption": "much soon. wow.", "frameMs": 900, "frames": [shiba("tense", 0), shiba("tense", 1)]},
        "angry": {"color": "urgent", "caption": "very late. so meeting.", "frameMs": 250, "shake": True,
                  "frames": [shiba("angry", 0), shiba("angry", 1), shiba("angry", 2)]},
    },
}


# ---------------------------------------------------------------- boss
def boss(mood, variant=0):
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


BOSS = {
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

THEMES = {"marine": MARINE, "shiba": SHIBA, "boss": BOSS}


def render(theme):
    # one frame row per line keeps the art readable and the diffs small
    return json.dumps(theme, indent=2).replace('",\n          "', '", "') + "\n"


def main(args):
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
