# Portfolio Rebuild

The repository has one shared content folder and two local applications:

```text
Portfolio Rebuild/
├── Portfolio/
│   ├── Launch Portfolio.cmd  # Double-click to test just the site
│   ├── Stop Portfolio.cmd    # Stop the local site server
│   ├── Content/   # Homepage/project Markdown and original media
│   ├── Site/      # Public portfolio and static GitHub Pages build
│   └── Assets/    # Supplied reference/source assets
└── Studio/
    ├── Launch Studio.cmd  # Double-click to launch the local editor
    ├── Stop Studio.cmd    # Stop Studio and its preview
    ├── README.md          # Short guide to this folder
    └── app/               # Studio code, dependencies, and backups
```

## Run locally

Install Node.js 24 LTS. On Windows, double-click `Studio/Launch Studio.cmd`.
The launcher installs missing project dependencies, starts Studio at
**http://localhost:3001/** and the portfolio preview at
**http://localhost:3000/**, and opens Studio in your browser. Keep its terminal
window open while editing; press Ctrl+C to stop both servers.
You can also double-click `Studio/Stop Studio.cmd` to stop both.

To test only the portfolio, double-click `Portfolio/Launch Portfolio.cmd`.
It opens the site at **http://localhost:3000/** without starting Studio. Keep
its terminal window open; press Ctrl+C to stop it. If Studio is already running,
the site is already available at **http://localhost:3000/**; close Studio before
using the site-only launcher on port 3000.
Double-click `Portfolio/Stop Portfolio.cmd` to stop the portfolio. If Studio's
launcher started both apps, either stop command stops both together.

Alternatively, run `npm ci` in both `Studio/app/` and `Portfolio/Site/`, then run
`npm run dev` in `Studio/app/` and `npm run dev` in the Site folder.

The Site's `npm run dev` and `npm run build` copy referenced covers, images,
videos and posters into generated `Portfolio/Site/public/content/` files.
`npm run build` in `Portfolio/Site/` creates a fully static public site in
`Portfolio/Site/out/`. Studio is a separate local app and is never in that export.
Each published project is generated from Markdown at build time.
The build refreshes generated media copies, so removed or unpublished projects
are not accidentally included in the exported site.

## Publish with GitHub Pages

The repository includes a **manual** GitHub Actions workflow at
`.github/workflows/pages.yml`. It will not publish just because you push a
commit. When ready, select **GitHub Actions** as the Pages source in the
repository's **Settings → Pages**, then run **Publish portfolio to GitHub Pages**
from the Actions tab. The workflow builds `Portfolio/Site/out/` and uses the Pages base
path automatically, so the repository URL works before a custom domain is set.

Studio saves to local files only. Review, commit, and push the `Portfolio/Content/` edits
and media before running the workflow. On another computer, pull the latest
commit before editing. `Portfolio/Site/public/content/` and `Portfolio/Site/out/` are generated and
should not be committed.

The existing Framer site and `csardo.com` DNS are unchanged by this workflow.
Set a custom domain in GitHub Pages and update DNS separately only when ready
to switch the live website; a new build will then use the domain's root path.

## Portfolio Studio

Studio is a local content editor that saves directly to the existing Markdown
files in `Portfolio/Content/`. It is separate from the public site. No account,
database, or system-wide Studio installation is needed.

- **Projects:** browse or search your projects, then select one to edit.
- **New project:** enter a title and URL to create a draft folder and
  `Structure_ProjectName.md` file. Upload a cover, write its description, add
  media, then enable Published and save.
- **Project details:** edit title, URL, year, tags, homepage order, L/M/S grid
  size, layout, and publication status. Changing a URL does not rename the folder.
- **Project media:** upload images/videos or choose files already in the Images
  folder. Use up/down arrows to set the sequence. Each item has an aspect ratio,
  description, caption label, caption text and position; videos can also use a poster.
- **Homepage:** edit introduction, navigation labels, default view, featured
  project, homepage colors, and global project colors.
- **Project colors:** enable custom colors to override the homepage defaults.

Click **Save changes**, then refresh the portfolio tab to see the result.
Saves synchronize referenced assets automatically. Drafts are hidden from the
public portfolio; preview links open saved, published pages. The featured
project cannot be unpublished or have its URL changed until you choose another
featured project in Homepage settings.

Uploads are saved immediately to the project's `Images` folder, even before
Save changes. Uploads receive unique filenames to avoid overwriting originals.
Supported formats: JPG, PNG, WebP, GIF, AVIF, MP4, WebM and MOV, up to 100 MB per
file. Browser video playback still depends on the codec. Removing an item from
the sequence leaves its original media file in place.

Each save backs up the previous Markdown file in `Studio/app/.content-backups/`.
To restore one, copy the desired backup over the corresponding structure file,
then use **Reload from disk**. Studio preserves the Markdown body and extra
metadata, but normalizes YAML formatting and removes YAML comments on save.
If a file changed in another editor since loading, Studio blocks the save;
reload from disk to avoid overwriting those external edits.

Studio and its write API only work in development through localhost. It is a
local tool, not a remotely hosted CMS. Its server binds to `127.0.0.1` so the
editor stays on this computer.

To run the integration checks with Studio on port 3001 and the preview on 3000:

```bash
cd Studio/app
npm run test:integration
```

The checks create and remove their own disposable test project.

## Edit the homepage

- Update the introduction and default view in `Portfolio/Content/HomePage/Structure_HomePage.md`.
- Update project titles, tags, covers, `homeOrder`, and `gridSize` in each `Portfolio/Content/Projects/*/Structure_ProjectName.md` file.
- Set `gridSize` to `L`, `M`, or `S` for the large, medium, or small Grid tile.
- Set `centerProject` in `Portfolio/Content/HomePage/Structure_HomePage.md` to the slug that should occupy the central Grid position.
- The ordered `content` list in each project file controls media and captions on project pages.

## Spacing tokens

Homepage spacing must use the custom properties defined in `Portfolio/Site/src/app/globals.css`:

- `--spacing-xs`: 6px
- `--spacing-sm`: 12px
- `--spacing-m`: 18px
- `--spacing-l`: 24px
- `--spacing-xl`: 36px
- `--spacing-xxl`: 48px
