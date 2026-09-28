# Portfolio Studio — start here

To edit your portfolio on Windows, **double-click `Launch Studio.cmd`**. Keep
the terminal window open while you work. Studio opens at
<http://localhost:3001/>; the portfolio preview runs at
<http://localhost:3000/>. Press Ctrl+C in the terminal to stop both.
You can also double-click `Stop Studio.cmd` to stop both at once.

Your actual portfolio content is in [`../Portfolio/Content/`](../Portfolio/Content/),
**not** in the Studio folder. Studio edits those Markdown and media files for you.

| Item | What it is | Do you need to touch it? |
| --- | --- | --- |
| `Launch Studio.cmd` | Double-click launcher | **Yes, to start Studio** |
| `Stop Studio.cmd` | Double-click to stop Studio and its preview | **Yes, to stop Studio** |
| `README.md` | This short guide | Read as needed |
| `app/` | Studio code, configuration, dependencies, and backups | Usually no |

Inside `app/`, `.content-backups/` contains earlier versions of Markdown saved
by Studio. Keep those files in case you need to restore an edit. `node_modules/`,
`.next/`, and `tsconfig.tsbuildinfo` are generated and can be recreated.

The technical files are grouped in `app/`, which is Studio's working
directory. For the full setup, publishing steps, and content instructions, see
[`../README.md`](../README.md).
