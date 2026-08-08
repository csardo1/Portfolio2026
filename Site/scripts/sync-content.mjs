import { copyFile, mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const siteRoot = process.cwd();
const projectRoot = path.resolve(siteRoot, "..", "Content", "Projects");
const publicRoot = path.join(siteRoot, "public", "content", "projects");

const entries = await readdir(projectRoot, { withFileTypes: true });

await Promise.all(
  entries
    .filter((entry) => entry.isDirectory())
    .map(async (entry) => {
      const projectDirectory = path.join(projectRoot, entry.name);
      const structurePath = path.join(projectDirectory, "Structure.md");
      const { data } = matter(await readFile(structurePath, "utf8"));

      if (!data.published || typeof data.cover !== "string" || typeof data.slug !== "string") {
        return;
      }

      const source = path.resolve(projectDirectory, data.cover);
      if (!source.startsWith(projectDirectory + path.sep)) {
        throw new Error(`Cover for ${entry.name} must stay inside its project folder.`);
      }

      const destinationDirectory = path.join(publicRoot, data.slug);
      await mkdir(destinationDirectory, { recursive: true });
      await copyFile(source, path.join(destinationDirectory, path.basename(source)));
    }),
);

console.log("Homepage cover assets synced from Content.");
