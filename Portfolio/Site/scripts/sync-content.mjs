import { copyFile, lstat, mkdir, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const siteRoot = path.resolve(import.meta.dirname, "..");
const projectRoot = path.resolve(siteRoot, "..", "Content", "Projects");
const publicRoot = path.join(siteRoot, "public", "content", "projects");
const projectStructurePattern = /^Structure_.+\.md$/i;

async function findProjectStructure(projectDirectory) {
  const entries = await readdir(projectDirectory, { withFileTypes: true });
  const structures = entries
    .filter(
      (entry) => entry.isFile() && projectStructurePattern.test(entry.name),
    )
    .map((entry) => entry.name)
    .sort();

  if (structures.length !== 1) {
    throw new Error(
      `${projectDirectory} must contain exactly one Structure_ProjectName.md file.`,
    );
  }

  return path.join(projectDirectory, structures[0]);
}

function collectAssetPaths(data) {
  const assets = [data.cover];

  if (Array.isArray(data.content)) {
    for (const entry of data.content) {
      if (entry && typeof entry === "object") {
        assets.push(entry.src, entry.poster);
      }
    }
  }

  return [...new Set(assets.filter((asset) => typeof asset === "string"))];
}

const entries = await readdir(projectRoot, { withFileTypes: true });

// This ignored directory contains generated copies only. Recreate it so
// unpublished or removed projects cannot leak into a later static export.
try {
  if ((await lstat(publicRoot)).isSymbolicLink()) {
    throw new Error(`Refusing to replace symlinked generated assets at ${publicRoot}.`);
  }
  await rm(publicRoot, { recursive: true });
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await mkdir(publicRoot, { recursive: true });

await Promise.all(
  entries
    .filter((entry) => entry.isDirectory())
    .map(async (entry) => {
      const projectDirectory = path.join(projectRoot, entry.name);
      const structurePath = await findProjectStructure(projectDirectory);
      const { data } = matter(await readFile(structurePath, "utf8"));

      if (!data.published || typeof data.slug !== "string") return;

      const destinationDirectory = path.join(publicRoot, data.slug);
      await mkdir(destinationDirectory, { recursive: true });

      await Promise.all(
        collectAssetPaths(data).map(async (asset) => {
          const source = path.resolve(projectDirectory, asset);
          if (!source.startsWith(projectDirectory + path.sep)) {
            throw new Error(
              `Asset for ${entry.name} must stay inside its project folder.`,
            );
          }

          await copyFile(
            source,
            path.join(destinationDirectory, path.basename(source)),
          );
        }),
      );
    }),
);

console.log("Project assets synced from Content.");
