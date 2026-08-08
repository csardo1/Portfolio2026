import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const contentRoot = path.resolve(process.cwd(), "..", "Content");

export type HomeView = "grid" | "index";
export type GridSize = "L" | "M" | "S";

export type HomeContent = {
  workLabel: string;
  aboutLabel: string;
  intro: string;
  defaultView: HomeView;
  centerProject: string;
};

export type Project = {
  title: string;
  slug: string;
  year: number;
  tags: string[];
  homeOrder: number;
  gridSize: GridSize;
  coverUrl: string;
  coverAlt: string;
};

function requiredString(value: unknown, field: string, file: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} is required in ${file}.`);
  }

  return value.trim();
}

function requiredNumber(value: unknown, field: string, file: string) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${field} must be a number in ${file}.`);
  }

  return number;
}

function requiredGridSize(value: unknown, file: string): GridSize {
  const gridSize = requiredString(value, "gridSize", file).toUpperCase();
  if (gridSize !== "L" && gridSize !== "M" && gridSize !== "S") {
    throw new Error(`gridSize must be L, M, or S in ${file}.`);
  }

  return gridSize;
}

export async function getHomeContent(): Promise<HomeContent> {
  const file = path.join(contentRoot, "HomePage", "Structure_HomePage.md");
  const { data } = matter(await readFile(file, "utf8"));
  const defaultView = data.defaultView === "index" ? "index" : "grid";

  return {
    workLabel: requiredString(data.workLabel, "workLabel", file),
    aboutLabel: requiredString(data.aboutLabel, "aboutLabel", file),
    intro: requiredString(data.intro, "intro", file),
    defaultView,
    centerProject: requiredString(data.centerProject, "centerProject", file),
  };
}

export async function getProjects(): Promise<Project[]> {
  const projectsRoot = path.join(contentRoot, "Projects");
  const directories = await readdir(projectsRoot, { withFileTypes: true });

  const projects = await Promise.all(
    directories
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const file = path.join(projectsRoot, entry.name, "Structure.md");
        const { data } = matter(await readFile(file, "utf8"));

        if (data.published === false) return null;

        const slug = requiredString(data.slug, "slug", file);
        const cover = requiredString(data.cover, "cover", file);
        const tags = Array.isArray(data.tags)
          ? data.tags.map((tag) => requiredString(tag, "tags[]", file))
          : [];

        return {
          title: requiredString(data.title, "title", file),
          slug,
          year: requiredNumber(data.year, "year", file),
          tags,
          homeOrder: requiredNumber(data.homeOrder, "homeOrder", file),
          gridSize: requiredGridSize(data.gridSize, file),
          coverUrl: `/content/projects/${slug}/${path.basename(cover)}`,
          coverAlt: requiredString(data.coverAlt, "coverAlt", file),
        } satisfies Project;
      }),
  );

  return projects
    .filter((project): project is Project => project !== null)
    .sort((a, b) => a.homeOrder - b.homeOrder);
}
