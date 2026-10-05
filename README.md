# Ominous

*The ominous meeting.* An [Omarchy](https://omarchy.org) shell plugin that puts a big card in
the middle of the focused monitor shortly before a meeting starts, over a dimmed screen. It
stays until you dismiss it or the meeting ends — a corner toast is exactly what gets missed.
It can be professional, or it can get angry at you.

Calendar data comes from [OmaCal](https://omacal.app): the plugin reads `omacal agenda --json`
(OmaCal's offline database) once a minute. No Google login, no token of its own.

## Requirements

- Omarchy with shell plugins (the `omarchy plugin` command).
- [OmaCal](https://omacal.app), with the `omacal` command on your `PATH` and at least one
  calendar synced: Ominous reads OmaCal's offline agenda and has no calendar access of its own.

## Install

```bash
omarchy plugin add https://github.com/Tuland/ominous.git --enable
```

## Try it

```bash
omarchy-shell ominous test                      # a meeting one minute away: relaxed, tense, angry
omarchy-shell ominous preview "angry playful"   # straight to the angry phase, playful mode
```

Press `Esc` to close the card, `M` to flip between the professional and the playful mode.

## Uninstall

```bash
omarchy plugin remove io.github.tuland.ominous
```

Ominous never writes your configuration, but it leaves what you or it created outside the plugin
folder. Delete these too if you are done with it:

```bash
rm -f  ~/.config/omarchy/ominous.json   # your config, if you wrote one
rm -rf ~/.config/omarchy/ominous        # your own themes (Ominous creates the folder, empty)
rm -rf ~/.local/state/ominous           # the remembered mode and theme choice
```

## Documentation

- [Using Ominous](docs/usage.md) — the phases, the keys, the commands, the limits
- [Themes](docs/themes.md) — the shipped themes and how to choose one
- [Configuration](docs/configuration.md) — `ominous.json` and where your choices are saved
- [Making a theme](docs/custom-themes.md) — the theme file format
- [Development](docs/development.md) — layout, tests, drawing the characters

## Credits

The overlay approach and the first-second input guard were inspired by
[OMeetingBar](https://github.com/disy-mk/OMeetingBar) (MIT). No code was copied.

## License

MIT — see [`LICENSE`](LICENSE).
