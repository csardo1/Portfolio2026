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

`npm run dev` and `npm run build` copy only the cover selected by each project Markdown file into the generated `Site/public/content/` directory.

## Edit the homepage

- Update the introduction and default view in `Content/HomePage/Structure_HomePage.md`.
- Update project titles, tags, covers, `homeOrder`, and `gridSize` in each `Content/Projects/*/Structure.md` file.
- Set `gridSize` to `L`, `M`, or `S` for the large, medium, or small Grid tile.
- Set `centerProject` in `Content/HomePage/Structure_HomePage.md` to the slug that should occupy the central Grid position.
- The ordered `content` list in each project file is ready to drive future project pages.

## Spacing tokens

Homepage spacing must use the custom properties defined in `Site/src/app/globals.css`:

- `--spacing-xs`: 6px
- `--spacing-sm`: 12px
- `--spacing-m`: 18px
- `--spacing-l`: 24px
- `--spacing-xl`: 36px
- `--spacing-xxl`: 48px
