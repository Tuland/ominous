import QtQuick
import "../Logic.js" as Logic

// The theme one mode uses: the user's `<name>.json`, else the plugin's, else the
// mode's default (see Logic.pickTheme). All three files stay watched, so adding
// or fixing a theme takes effect without a restart.
Item {
  id: slot

  property string mode: ""
  property string name: ""
  property string userDir: ""
  property string shippedDir: ""

  readonly property string fallbackName: Logic.DEFAULTS.themes[slot.mode] || ""
  readonly property var picked: Logic.pickTheme(slot.name,
    { status: userFile.status, theme: userFile.theme },
    { status: shippedFile.status, theme: shippedFile.theme },
    { status: defaultFile.status, theme: defaultFile.theme })
  // While nothing has loaded yet, plain defaults rather than nothing.
  readonly property var theme: slot.picked.theme || Logic.normalizeTheme({})

  // The user's folder may only exist after the service has created it.
  function reloadUserFile() { userFile.reload() }

  ThemeFile { id: userFile; path: slot.userDir + "/" + slot.name + ".json" }
  ThemeFile { id: shippedFile; path: slot.shippedDir + "/" + slot.name + ".json" }
  ThemeFile { id: defaultFile; path: slot.shippedDir + "/" + slot.fallbackName + ".json" }
}
