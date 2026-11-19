import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import sharp from "sharp";
import { publicAssetPath } from "./asset-path";

const contentRoot = path.resolve(process.cwd(), "..", "Content");
const projectStructurePattern = /^Structure_.+\.md$/i;

export type HomeView = "grid" | "index";
export type GridSize = "L" | "M" | "S";
export type ProjectLayout = "carousel" | "split-stack";
export type ProjectMediaType = "image" | "video";
export type ProjectMediaPlacement = "full" | "left" | "center" | "right";
export type ProjectMediaDisplay =
  | "landscape"
  | "portrait"
  | "square"
  | "wide";
export type ProjectMediaAspectRatio =
  | "2:1"
  | "16:9"
  | "3:2"
  | "4:3"
  | "5:4"
  | "1:1"
  | "4:5"
  | "3:4"
  | "2:3"
  | "9:16"
  | "1:2";
export type ProjectMediaAspectRatioSetting =
  | "Default"
  | ProjectMediaAspectRatio;
export type ProjectMediaOrientation = "landscape" | "portrait" | "square";

type StandardAspectRatio = {
  cssValue: string;
  label: ProjectMediaAspectRatio;
  orientation: ProjectMediaOrientation;
  value: number;
};

const standardAspectRatios: readonly StandardAspectRatio[] = [
  { cssValue: "2 / 1", label: "2:1", orientation: "landscape", value: 2 },
  {
    cssValue: "16 / 9",
    label: "16:9",
    orientation: "landscape",
    value: 16 / 9,
  },
  {
    cssValue: "3 / 2",
    label: "3:2",
    orientation: "landscape",
    value: 3 / 2,
  },
  {
    cssValue: "4 / 3",
    label: "4:3",
    orientation: "landscape",
    value: 4 / 3,
  },
  {
    cssValue: "5 / 4",
    label: "5:4",
    orientation: "landscape",
    value: 5 / 4,
  },
  { cssValue: "1 / 1", label: "1:1", orientation: "square", value: 1 },
  {
    cssValue: "4 / 5",
    label: "4:5",
    orientation: "portrait",
    value: 4 / 5,
  },
  {
    cssValue: "3 / 4",
    label: "3:4",
    orientation: "portrait",
    value: 3 / 4,
  },
  {
    cssValue: "2 / 3",
    label: "2:3",
    orientation: "portrait",
    value: 2 / 3,
  },
  {
    cssValue: "9 / 16",
    label: "9:16",
    orientation: "portrait",
    value: 9 / 16,
  },
  {
    cssValue: "1 / 2",
    label: "1:2",
    orientation: "portrait",
    value: 1 / 2,
  },
];

export type HomeContent = {
  workLabel: string;
  aboutLabel: string;
  intro: string;
  backgroundColor: string;
  textStrokeColor: string;
  cropMarkColor: string;
  asteriskColor: string;
  projectPageBackgroundColor: string;
  projectPageTextStrokeColor: string;
  projectPageCropMarkColor: string;
  projectPageAsteriskColor: string;
  defaultView: HomeView;
  centerProject: string;
};

export type ProjectMedia = {
  type: ProjectMediaType;
  src: string;
  alt: string;
  placement: ProjectMediaPlacement;
  aspectRatio: string;
  aspectRatioLabel: ProjectMediaAspectRatioSetting;
  orientation: ProjectMediaOrientation;
  display: ProjectMediaDisplay;
  poster?: string;
  syncGroup?: string;
};

export type ProjectCaption = { type: "caption"; label?: string; text?: string };
export type ProjectBlock = ProjectMedia | ProjectCaption;

export type Project = {
  title: string;
  slug: string;
  year: number;
  layout: ProjectLayout;
  backgroundColor: string;
  textStrokeColor: string;
  cropMarkColor: string;
  asteriskColor: string;
  customColors: boolean;
  tags: string[];
  homeOrder: number;
  gridSize: GridSize;
  coverUrl: string;
  coverAlt: string;
  coverMotion?: { type: "gif" | "video"; url: string };
  content: ProjectBlock[];
};

function requiredString(value: unknown, field: string, file: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} is required in ${file}.`);
  }

  return value.trim();
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

function requiredNumber(value: unknown, field: string, file: string) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${field} must be a number in ${file}.`);
  }

  return number;
}

function requiredBoolean(value: unknown, field: string, file: string) {
  if (typeof value !== "boolean") {
    throw new Error(`${field} must be true or false in ${file}.`);
  }

  return value;
}

function requiredColor(value: unknown, field: string, file: string) {
  const color = requiredString(value, field, file);

  if (!/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(color)) {
    throw new Error(
      `${field} must be a 3, 4, 6, or 8 digit hex color in ${file}.`,
    );
  }

  return color;
}

function requiredGridSize(value: unknown, file: string): GridSize {
  const gridSize = requiredString(value, "gridSize", file).toUpperCase();
  if (gridSize !== "L" && gridSize !== "M" && gridSize !== "S") {
    throw new Error(`gridSize must be L, M, or S in ${file}.`);
  }

  return gridSize;
}

function optionalProjectLayout(value: unknown, file: string): ProjectLayout {
  if (value === undefined || value === null || value === "") return "carousel";

  const layout = requiredString(value, "layout", file).toLowerCase();
  if (layout !== "carousel" && layout !== "split-stack") {
    throw new Error(`layout must be carousel or split-stack in ${file}.`);
  }

  return layout;
}

function optionalMediaPlacement(
  value: unknown,
  field: string,
  file: string,
): ProjectMediaPlacement {
  if (value === undefined || value === null || value === "") return "full";

  const placement = requiredString(value, field, file).toLowerCase();
  if (
    placement !== "full" &&
    placement !== "left" &&
    placement !== "center" &&
    placement !== "right"
  ) {
    throw new Error(`${field} must be full, left, center, or right in ${file}.`);
  }

  return placement;
}

function requiredMediaType(
  value: unknown,
  field: string,
  file: string,
): ProjectMediaType {
  if (value !== "image" && value !== "video") {
    throw new Error(`${field} must be image or video in ${file}.`);
  }

  return value;
}

function optionalMediaDisplay(
  value: unknown,
  type: ProjectMediaType,
  field: string,
  file: string,
): ProjectMediaDisplay {
  if (value === undefined || value === null || value === "") {
    return type === "video" ? "wide" : "landscape";
  }

  if (
    value !== "landscape" &&
    value !== "portrait" &&
    value !== "square" &&
    value !== "wide"
  ) {
    throw new Error(
      `${field} must be landscape, portrait, square, or wide in ${file}.`,
    );
  }

  return value;
}

function optionalMediaAspectRatio(
  value: unknown,
  field: string,
  file: string,
): ProjectMediaAspectRatioSetting {
  if (value === undefined || value === null || value === "") {
    return "Default";
  }

  const aspectRatio = requiredString(value, field, file).replace("/", ":");
  if (aspectRatio.toLowerCase() === "default") return "Default";

  const standardAspectRatio = standardAspectRatios.find(
    (candidate) => candidate.label === aspectRatio,
  );

  if (!standardAspectRatio) {
    throw new Error(
      `${field} must be Default, 2:1, 16:9, 3:2, 4:3, 5:4, 1:1, 4:5, 3:4, 2:3, 9:16, or 1:2 in ${file}.`,
    );
  }

  return standardAspectRatio.label;
}

function projectAssetUrl(slug: string, value: unknown, field: string, file: string) {
  const source = requiredString(value, field, file);
  const normalizedSource = source.replaceAll("\\", "/");

  if (!normalizedSource.startsWith("./Images/")) {
    throw new Error(`${field} must point to ./Images/ in ${file}.`);
  }

  return publicAssetPath(`/content/projects/${slug}/${path.basename(normalizedSource)}`);
}

function projectCover(slug: string, cover: unknown, poster: unknown, file: string): Pick<Project, "coverUrl" | "coverMotion"> {
  const url = projectAssetUrl(slug, cover, "cover", file);
  const extension = path.extname(url).toLowerCase();
  if (extension === ".gif") {
    return {
      coverUrl: publicAssetPath(`/content/projects/${slug}/_cover/${path.basename(url)}.webp`),
      coverMotion: { type: "gif", url },
    };
  }
  if ([".mp4", ".webm", ".mov"].includes(extension)) {
    return {
      coverUrl: projectAssetUrl(slug, poster, "coverPoster", file),
      coverMotion: { type: "video", url },
    };
  }
  return { coverUrl: url };
}

function projectAssetPath(
  projectDirectory: string,
  value: unknown,
  field: string,
  file: string,
) {
  const source = requiredString(value, field, file);
  const normalizedSource = source.replaceAll("\\", "/");

  if (!normalizedSource.startsWith("./Images/")) {
    throw new Error(`${field} must point to ./Images/ in ${file}.`);
  }

  const imagesDirectory = path.resolve(projectDirectory, "Images");
  const resolvedSource = path.resolve(projectDirectory, normalizedSource);

  if (!resolvedSource.startsWith(imagesDirectory + path.sep)) {
    throw new Error(`${field} must stay inside ./Images/ in ${file}.`);
  }

  return resolvedSource;
}

function mediaOrientation(aspectRatio: number): ProjectMediaOrientation {
  if (aspectRatio >= 0.95 && aspectRatio <= 1.05) return "square";
  return aspectRatio > 1 ? "landscape" : "portrait";
}

function fallbackAspectRatio(display: ProjectMediaDisplay) {
  const fallbackLabel: ProjectMediaAspectRatio =
    display === "wide"
      ? "16:9"
      : display === "portrait"
        ? "3:4"
        : display === "square"
          ? "1:1"
          : "4:3";

  return standardAspectRatios.find(
    (aspectRatio) => aspectRatio.label === fallbackLabel,
  )!;
}

function resolveVideoAspectRatio(
  setting: ProjectMediaAspectRatioSetting,
  display: ProjectMediaDisplay,
) {
  if (setting === "Default") {
    return {
      ...fallbackAspectRatio(display),
      label: "Default" as const,
    };
  }

  return standardAspectRatios.find(
    (aspectRatio) => aspectRatio.label === setting,
  )!;
}

async function intrinsicImageAspectRatio(
  sourcePath: string,
  field: string,
  file: string,
) {
  try {
    const metadata = await sharp(sourcePath).metadata();
    const shouldSwapDimensions =
      metadata.orientation !== undefined &&
      [5, 6, 7, 8].includes(metadata.orientation);
    const width = shouldSwapDimensions ? metadata.height : metadata.width;
    const height = shouldSwapDimensions ? metadata.width : metadata.height;

    if (!width || !height) {
      throw new Error("width or height is missing");
    }

    return {
      cssValue: `${width} / ${height}`,
      label: "Default" as const,
      orientation: mediaOrientation(width / height),
      value: width / height,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read ${field} dimensions in ${file}: ${reason}`);
  }
}

async function resolveImageAspectRatio(
  setting: ProjectMediaAspectRatioSetting,
  sourcePath: string,
  field: string,
  file: string,
) {
  if (setting === "Default") {
    return intrinsicImageAspectRatio(sourcePath, field, file);
  }

  return standardAspectRatios.find(
    (aspectRatio) => aspectRatio.label === setting,
  )!;
}

async function findProjectStructure(projectDirectory: string) {
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

async function parseProjectBlocks(
  value: unknown,
  slug: string,
  title: string,
  file: string,
  projectDirectory: string,
  layout: ProjectLayout,
): Promise<ProjectBlock[]> {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error(`content must be an ordered list in ${file}.`);
  }

  const blocks = await Promise.all(
    value.map(async (item, index): Promise<ProjectBlock[]> => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw new Error(`content[${index}] must be an object in ${file}.`);
      }

      const entry = item as Record<string, unknown>;
      const field = `content[${index}]`;
      if (entry.type === "caption") {
        const label = optionalString(entry.label);
        const text = optionalString(entry.text);
        if (!label && !text) throw new Error(`${field} must have a caption label or text in ${file}.`);
        return [{ type: "caption", label, text }];
      }

      const type = requiredMediaType(entry.type, `${field}.type`, file);
      const label = optionalString(entry.captionLabel);
      const text = optionalString(entry.caption);
      const caption: ProjectCaption | undefined = label || text ? { type: "caption", label, text } : undefined;
      if (entry.hidden === true) return caption ? [caption] : [];
      const display = optionalMediaDisplay(
        entry.display,
        type,
        `${field}.display`,
        file,
      );
      const aspectRatioSetting = optionalMediaAspectRatio(
        entry.aspectRatio,
        `${field}.aspectRatio`,
        file,
      );
      const aspectRatio =
        type === "image"
          ? await resolveImageAspectRatio(
              aspectRatioSetting,
              projectAssetPath(
                projectDirectory,
                entry.src,
                `${field}.src`,
                file,
              ),
              `${field}.src`,
              file,
            )
          : resolveVideoAspectRatio(aspectRatioSetting, display);
      const poster = entry.poster
        ? projectAssetUrl(slug, entry.poster, `${field}.poster`, file)
        : undefined;

      const media: ProjectMedia = {
        type,
        src: projectAssetUrl(slug, entry.src, `${field}.src`, file),
        alt:
          optionalString(entry.alt) ??
          `${title} project ${type === "image" ? "image" : "video"} ${index + 1}`,
        placement: optionalMediaPlacement(
          entry.placement,
          `${field}.placement`,
          file,
        ),
        aspectRatio: aspectRatio.cssValue,
        aspectRatioLabel: aspectRatio.label,
        orientation: aspectRatio.orientation,
        display,
        poster,
        syncGroup: type === "video" ? optionalString(entry.syncGroup) : undefined,
      };
      if (!caption) return [media];

      const beforeMedia = layout === "split-stack" || optionalString(entry.captionPosition)?.toLowerCase() === "top";
      return beforeMedia ? [caption, media] : [media, caption];
    }),
  );
  const visible = blocks.flat();
  const visibleSyncCounts = new Map<string, number>();
  for (const block of visible) {
    if (block.type === "video" && block.syncGroup) {
      visibleSyncCounts.set(block.syncGroup, (visibleSyncCounts.get(block.syncGroup) ?? 0) + 1);
    }
  }
  for (const block of visible) {
    if (block.type === "video" && block.syncGroup && visibleSyncCounts.get(block.syncGroup) === 1) delete block.syncGroup;
  }
  return visible;
}

export async function getHomeContent(): Promise<HomeContent> {
  const file = path.join(contentRoot, "HomePage", "Structure_HomePage.md");
  const { data } = matter(await readFile(file, "utf8"));
  const defaultView = data.defaultView === "index" ? "index" : "grid";

  return {
    workLabel: requiredString(data.workLabel, "workLabel", file),
    aboutLabel: requiredString(data.aboutLabel, "aboutLabel", file),
    intro: requiredString(data.intro, "intro", file),
    backgroundColor: requiredColor(
      data.backgroundColor,
      "backgroundColor",
      file,
    ),
    textStrokeColor: requiredColor(
      data.textStrokeColor,
      "textStrokeColor",
      file,
    ),
    cropMarkColor: requiredColor(
      data.cropMarkColor,
      "cropMarkColor",
      file,
    ),
    asteriskColor: requiredColor(
      data.asteriskColor,
      "asteriskColor",
      file,
    ),
    projectPageBackgroundColor: requiredColor(
      data.projectPageBackgroundColor,
      "projectPageBackgroundColor",
      file,
    ),
    projectPageTextStrokeColor: requiredColor(
      data.projectPageTextStrokeColor,
      "projectPageTextStrokeColor",
      file,
    ),
    projectPageCropMarkColor: requiredColor(
      data.projectPageCropMarkColor,
      "projectPageCropMarkColor",
      file,
    ),
    projectPageAsteriskColor: requiredColor(
      data.projectPageAsteriskColor,
      "projectPageAsteriskColor",
      file,
    ),
    defaultView,
    centerProject: requiredString(data.centerProject, "centerProject", file),
  };
}

export async function getProjects(): Promise<Project[]> {
  const projectsRoot = path.join(contentRoot, "Projects");
  const directories = (await readdir(projectsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((first, second) => first.name.localeCompare(second.name));

  const projects = await Promise.all(
    directories.map(async (entry) => {
      const projectDirectory = path.join(projectsRoot, entry.name);
      const file = await findProjectStructure(projectDirectory);
      const { data } = matter(await readFile(file, "utf8"));

      if (data.published === false) return null;

      const title = requiredString(data.title, "title", file);
      const slug = requiredString(data.slug, "slug", file);
      const layout = optionalProjectLayout(data.layout, file);
      const tags = Array.isArray(data.tags)
        ? data.tags.map((tag) => requiredString(tag, "tags[]", file))
        : [];

      return {
        title,
        slug,
        year: requiredNumber(data.year, "year", file),
        layout,
        backgroundColor: requiredColor(
          data.backgroundColor,
          "backgroundColor",
          file,
        ),
        textStrokeColor: requiredColor(
          data.textStrokeColor,
          "textStrokeColor",
          file,
        ),
        cropMarkColor: requiredColor(
          data.cropMarkColor,
          "cropMarkColor",
          file,
        ),
        asteriskColor: requiredColor(
          data.asteriskColor,
          "asteriskColor",
          file,
        ),
        customColors: requiredBoolean(
          data.customColors,
          "customColors",
          file,
        ),
        tags,
        homeOrder: requiredNumber(data.homeOrder, "homeOrder", file),
        gridSize: requiredGridSize(data.gridSize, file),
        ...projectCover(slug, data.cover, data.coverPoster, file),
        coverAlt: requiredString(data.coverAlt, "coverAlt", file),
        content: await parseProjectBlocks(
          data.content,
          slug,
          title,
          file,
          projectDirectory,
          layout,
        ),
      } satisfies Project;
    }),
  );

  return projects
    .filter((project): project is Project => project !== null)
    .sort(
      (first, second) =>
        first.homeOrder - second.homeOrder ||
        first.slug.localeCompare(second.slug),
    );
}
