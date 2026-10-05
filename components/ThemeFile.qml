import QtQuick
import Quickshell.Io
import "../Logic.js" as Logic

/**
 * One theme file, watched: its normalized content, or why there is none. "missing" is a
 * normal answer for the user's folder, which usually has no files.
 *
 * In: `path`.
 * Out: `status` ("loading", "ok", "missing" or "invalid") and `theme` (normalized, or null).
 */
Item {
  id: tf

  property string path: ""
  property string status: "loading"
  property var theme: null

  /** Reads the file again, e.g. after its folder was created. */
  function reload(): void { fileView.reload() }

  FileView {
    id: fileView
    path: tf.path
    watchChanges: true
    printErrors: false
    onFileChanged: reload()
    onLoaded: {
      var t = null
      try { t = Logic.normalizeTheme(JSON.parse(text())) } catch (e) { t = null }
      tf.theme = t
      tf.status = t ? "ok" : "invalid"
    }
    onLoadFailed: function(error) {
      tf.theme = null
      tf.status = error === FileViewError.FileNotFound ? "missing" : "invalid"
    }
  }
}
