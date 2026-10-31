// Builds the Windows installer (.exe, NSIS) on Linux without Wine.
// electron-builder runs the NSIS installer once to get the uninstaller. On Linux that needs Wine;
// on macOS it reads the uninstaller straight out of the installer with its own JavaScript reader.
// This script turns on that reader for Linux, then runs the normal Windows build.
import macosVersion from 'app-builder-lib/out/util/macosVersion.js'
import builder from 'electron-builder'

if (process.platform !== 'win32') macosVersion.isMacOsCatalina = () => true

builder
  .build({ targets: builder.Platform.WINDOWS.createTarget('nsis', builder.Arch.x64) })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
