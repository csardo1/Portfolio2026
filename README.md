# Portfolio Rebuild

The repository is split into two source areas:

- `Content/` contains homepage settings, project Markdown, and the supplied original project media.
- `Site/` contains the Next.js, React, and Tailwind CSS application.

## Run locally

```bash
cd Site
npm install
npm run dev
```

`npm run dev` and `npm run build` copy referenced covers, images, videos and posters into the generated `Site/public/content/` directory.

## Portfolio Studio

With the development server running, open **http://localhost:3000/studio**.
Studio is a local content editor that saves directly to the existing Markdown
files. No account, database, or separate app installation is needed.

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

Each save backs up the previous Markdown file in `Site/.content-backups/`.
To restore one, copy the desired backup over the corresponding structure file,
then use **Reload from disk**. Studio preserves the Markdown body and extra
metadata, but normalizes YAML formatting and removes YAML comments on save.
If a file changed in another editor since loading, Studio blocks the save;
reload from disk to avoid overwriting those external edits.

Studio and its write API only work in development through localhost; production
builds return 404 for the editor. It is a local tool, not a remotely hosted CMS.
The development command binds to `127.0.0.1` so the editor stays on this computer.

To run the integration checks with the dev server on port 3000:

```bash
cd Site
node scripts/test-studio.mjs
```

The checks create and remove their own disposable test project.

## Edit the homepage

- Update the introduction and default view in `Content/HomePage/Structure_HomePage.md`.
- Update project titles, tags, covers, `homeOrder`, and `gridSize` in each `Content/Projects/*/Structure_ProjectName.md` file.
- Set `gridSize` to `L`, `M`, or `S` for the large, medium, or small Grid tile.
- Set `centerProject` in `Content/HomePage/Structure_HomePage.md` to the slug that should occupy the central Grid position.
- The ordered `content` list in each project file controls media and captions on project pages.

## Spacing tokens

Homepage spacing must use the custom properties defined in `Site/src/app/globals.css`:

- `--spacing-xs`: 6px
- `--spacing-sm`: 12px
- `--spacing-m`: 18px
- `--spacing-l`: 24px
- `--spacing-xl`: 36px
- `--spacing-xxl`: 48px
