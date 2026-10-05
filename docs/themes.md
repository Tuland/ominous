# Themes

Ominous has two modes, **professional** and **playful**, and each uses one theme. Flip the mode
with `M` or the switch on the card; choose each mode's theme from a terminal.

## Shipped themes

| Theme | Mode by default | Look |
|---|---|---|
| `classic` | professional | No art. The phase color on the countdown and a thin progress bar along the bottom edge. |
| `marine` | playful | A helmeted soldier, calm → wide-eyed and sweating → red and baring teeth. "All clear." / "Incoming." / "YOU ARE LATE." |
| `shiba` | | A shiba, content → worried → snarling, with doge-style captions. |
| `boss` | | An executive in a suit, smug → sweating → red-faced with steam from the ears. "Let's circle back." / "Can you see my screen?" / "Per my last email." The tie takes the theme's accent color. |

In the playful themes the character stands still while relaxed, fidgets when tense and jolts and
animates faster once angry. Their colors follow the Omarchy theme.

The characters are original pixel art drawn for this plugin, a nod to 90s FPS status-bar faces
and to the doge meme; they use no third-party artwork.

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
