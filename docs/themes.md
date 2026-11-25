# Themes

Ominous has two modes, **professional** and **playful**, and each uses one theme. Flip the mode
with `M` or the switch on the card; choose each mode's theme from a terminal.

## Shipped themes

| Theme | Mode by default | Look |
|---|---|---|
| `classic` | professional | No art. The phase color on the countdown and a thin progress bar along the bottom edge. |
| `marine` | playful | A helmeted soldier in olive gear, drawn as a 40x40 bust: calm → a standoff, eyes darting, a sweat drop and one close-up on his stare → his eyes catch fire, flames and sparks rise around him, and he alternates a short burst of laughter with a longer furious burn. "All clear." / "Incoming." / "YOU ARE LATE." |
| `shiba` | | A shiba, content → worried → snarling, with doge-style captions. |
| `boss` | | An executive in a suit, smug → sweating → red-faced with steam from the ears. "Let's circle back." / "Can you see my screen?" / "Per my last email." The tie takes the theme's accent color. |

In the playful themes the character stands still while relaxed, fidgets when tense and animates
faster once angry, with a jolt when it gets angry (or, for a character with an angry intro, when
the intro gives way to its loop). The phase color of the countdown follows the Omarchy theme,
and so do the cells `shiba` and `boss` draw in a role color, such as the boss's tie; skin,
fur and gear keep fixed colors, and the `marine` uses only fixed colors, fire included.

The characters are original pixel art drawn for this plugin, a nod to 90s FPS status-bar faces
and to the doge meme; they use no third-party artwork.

Redrawn characters keep that rule. A redraw starts from reference images that are CC0, public
domain or the author's own, photos or images the author generated (never CC BY or CC BY-SA). A
third-party reference is a guide only: its pixelation is never a shipped frame. An image the
author made may be pixelated into the shipped frames, reduced to the theme's palette, outlined
and fixed by hand. Either way the shipped art never resembles a recognizable person, character
or mascot, and effects such as fire are drawn in code, not taken from a picture.

### References

The source of every reference image behind shipped art.

- `marine`: two images the author generated for this plugin, not published: a sheet of one
  soldier in four moods (the bust, the calm, tense, furious and laughing faces) and the same
  sheet with the eyes turned (the darting eyes of the standoff). The fire is drawn in code.

## Choosing a theme

```bash
omarchy-shell ominous themes                         # every theme, where it comes from, which mode uses it
omarchy-shell ominous theme shiba                    # the playful mode gets the dog
omarchy-shell ominous theme "marine professional"    # name a mode to set the other one
omarchy-shell ominous theme reset                    # back to ominous.json ("reset playful" for one mode)
omarchy-shell ominous preview "angry playful"        # see it now
```

The choice applies from the next alert and is saved to `~/.local/state/ominous/themes.json`,
which wins over `themes` in [`ominous.json`](configuration.md). An unknown name is refused, with
the list of available themes.

To draw your own, see [making a theme](custom-themes.md).
