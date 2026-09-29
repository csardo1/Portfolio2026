# Portfolio Studio — start here

To edit your portfolio on Windows, **double-click `Launch Studio.cmd`**. On a
Mac, **double-click `Launch Studio.command`**. Keep the terminal window open
while you work. Studio opens at <http://localhost:3001/>. Press Ctrl+C in the
terminal to stop Studio, or double-click the matching `Stop Studio` file.

The portfolio preview is separate. Launch it with `../Portfolio/Launch
Portfolio.cmd` on Windows or `../Portfolio/Launch Portfolio.command` on macOS.
It runs at <http://localhost:3000/> and can run alongside Studio.

Your actual portfolio content is in [`../Portfolio/Content/`](../Portfolio/Content/),
**not** in the Studio folder. Studio edits those Markdown and media files for you.

| Item | What it is | Do you need to touch it? |
| --- | --- | --- |
| `Launch Studio.cmd` | Double-click launcher | **Yes, to start Studio** |
| `Launch Studio.command` | macOS double-click launcher | **Yes, on a Mac** |
| `Stop Studio.cmd` | Double-click to stop Studio | **Yes, to stop Studio** |
| `Stop Studio.command` | macOS double-click stop command | **Yes, on a Mac** |
| `README.md` | This short guide | Read as needed |
| `app/` | Studio code, configuration, dependencies, and backups | Usually no |

Inside `app/`, `.content-backups/` contains earlier versions of Markdown saved
by Studio. Keep those files in case you need to restore an edit. `node_modules/`,
`.next/`, and `tsconfig.tsbuildinfo` are generated and can be recreated.

The technical files are grouped in `app/`, which is Studio's working
directory. For the full setup, publishing steps, and content instructions, see
[`../README.md`](../README.md).
