import { createHash, randomUUID } from "node:crypto";
import { copyFile, lstat, mkdir, open, readFile, readdir, realpath, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import sharp from "sharp";
import { assetReferenceKey, colorFields, isVideoCover, layouts, placements, projectAssetReferences, ratios } from "./studio-types";
import type { BlockDraft, CaptionDraft, HomeDraft, ProjectDraft, StudioAsset, StudioProject, StudioState } from "./studio-types";

// Release original image files after reading their metadata on Windows.
sharp.cache({ files: 0 });

const root = path.resolve(process.cwd(), "..", "..", "Portfolio", "Content");
const siteRoot = path.resolve(process.cwd(), "..", "..", "Portfolio", "Site");
const projectsRoot = path.join(root, "Projects");
const homeFile = path.join(root, "HomePage", "Structure_HomePage.md");
const backupRoot = path.join(process.cwd(), ".content-backups");
const mimeTypes: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif",
  ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
};
export class StudioError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function allowStudio(headers: Headers, mutation = false) {
  if (process.env.NODE_ENV !== "development") throw new StudioError("Studio is available with npm run dev only.", 404);
  const host = headers.get("host") ?? "";
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) throw new StudioError("Open Studio on localhost.", 403);
  if (headers.get("sec-fetch-site") === "cross-site") throw new StudioError("Cross-site requests are not allowed.", 403);
  if (mutation) {
    const origin = headers.get("origin");
    if (origin !== `http://${host}` && origin !== `https://${host}`) throw new StudioError("Save requests must come from this Studio window.", 403);
  }
}
function inside(parent: string, child: string) {
  const relative = path.relative(parent, child);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}
async function safeExisting(parent: string, child: string) {
  const [realParent, realChild] = await Promise.all([realpath(parent), realpath(child)]);
  if (!inside(realParent, realChild)) throw new StudioError("This path is outside the content folder.");
  return realChild;
}
function validSlug(value: unknown) {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 80 &&
    !/^(studio|api|content|fonts|icons|con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(value);
}
async function directory(id: string) {
  if (!id || /[\\/:]/.test(id) || id === "." || id === "..") throw new StudioError("Invalid project folder.");
  return safeExisting(projectsRoot, path.join(projectsRoot, id));
}
async function structure(id: string) {
  const folder = await directory(id);
  const names = (await readdir(folder)).filter((name) => /^Structure_.+\.md$/i.test(name));
  if (names.length !== 1) throw new StudioError(`${id} needs exactly one Structure_ProjectName.md file.`);
  return safeExisting(folder, path.join(folder, names[0]));
}
function revision(text: string) { return createHash("sha256").update(text).digest("hex"); }
async function document(file: string) {
  const text = await readFile(file, "utf8");
  const parsed = matter(text);
  return { text, body: parsed.content, data: parsed.data, revision: revision(text) };
}
async function assetPath(id: string, src: string) {
  if (!/^\.\/Images\/[^/\\]+$/.test(src)) throw new StudioError("Media must be a file inside the project's Images folder.");
  const folder = await directory(id);
  return safeExisting(folder, path.join(folder, src));
}
function mediaType(name: string): "image" | "video" | undefined {
  const mime = mimeTypes[path.extname(name).toLowerCase()];
  return mime?.startsWith("image/") ? "image" : mime?.startsWith("video/") ? "video" : undefined;
}
async function assets(id: string): Promise<StudioAsset[]> {
  const folder = await directory(id);
  const images = path.join(folder, "Images");
  try { await safeExisting(folder, images); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  return (await readdir(images, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && mediaType(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => ({ src: `./Images/${entry.name}`, name: entry.name, type: mediaType(entry.name)! }));
}
function separateLegacyCaptions(content: BlockDraft[], layout?: string): BlockDraft[] {
  return content.flatMap((block): BlockDraft[] => {
    if (block?.type !== "image" && block?.type !== "video") return [block];
    const { captionLabel, caption, captionPosition, ...media } = block;
    const label = typeof captionLabel === "string" ? captionLabel : undefined;
    const text = typeof caption === "string" ? caption : undefined;
    if (!label?.trim() && !text?.trim()) return [media];
    const captionBlock: CaptionDraft = { type: "caption" };
    if (label !== undefined) captionBlock.label = label;
    if (text !== undefined) captionBlock.text = text;
    return layout === "split-stack" || String(captionPosition).trim().toLowerCase() === "top"
      ? [captionBlock, media]
      : [media, captionBlock];
  });
}
export async function readProject(id: string): Promise<StudioProject> {
  const file = await structure(id);
  const doc = await document(file);
  const data = { ...doc.data, published: doc.data.published !== false, content: doc.data.content ?? [] } as ProjectDraft;
  if (Array.isArray(data.content)) data.content = separateLegacyCaptions(data.content, data.layout);
  return {
    id,
    filename: path.basename(file),
    revision: doc.revision,
    data,
    assets: await assets(id),
  };
}
export async function readStudio(): Promise<StudioState> {
  const folders = (await readdir(projectsRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory());
  const [projects, home] = await Promise.all([Promise.all(folders.map((entry) => readProject(entry.name))), document(homeFile)]);
  projects.sort((a, b) => a.data.homeOrder - b.data.homeOrder || a.data.title.localeCompare(b.data.title));
  return { projects, home: { data: home.data as HomeDraft, revision: home.revision } };
}
function requiredText(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) throw new StudioError(`${label} is required.`);
}
function colors(data: Record<string, unknown>, prefix = "") {
  for (const field of colorFields) {
    const key = prefix ? prefix + field[0].toUpperCase() + field.slice(1) : field;
    if (typeof data[key] !== "string" || !/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(data[key] as string)) throw new StudioError(`${key} needs a hex color, such as #e6e6e6.`);
  }
}
async function checkAsset(id: string, src: unknown, type?: "image" | "video") {
  requiredText(src, "Media source");
  const file = await assetPath(id, src as string);
  if (!(await stat(file)).isFile() || !mediaType(file) || (type && mediaType(file) !== type)) throw new StudioError("Choose a supported media file of the correct type.");
  if (mediaType(file) === "image") {
    const metadata = await sharp(file).metadata();
    if (!metadata.width || !metadata.height) throw new StudioError("The image has no readable dimensions.");
    return metadata;
  }
}
async function validateProject(id: string, data: ProjectDraft, state: StudioState) {
  requiredText(data.title, "Project title");
  if (!validSlug(data.slug)) throw new StudioError("Use a URL with lowercase letters, numbers and hyphens; reserved names are not allowed.");
  if (state.projects.some((p) => p.id !== id && p.data.slug.toLowerCase() === data.slug)) throw new StudioError("Another project already uses this URL.");
  if (!Number.isInteger(data.year) || data.year < 1900 || data.year > 2200) throw new StudioError("Enter a valid year.");
  if (!Number.isInteger(data.homeOrder) || data.homeOrder < 0) throw new StudioError("Homepage order must be a whole number of zero or greater.");
  if (!["L", "M", "S"].includes(data.gridSize)) throw new StudioError("Grid size must be L, M or S.");
  if (!layouts.includes(data.layout ?? "carousel")) throw new StudioError("Choose a supported project layout.");
  if (typeof data.published !== "boolean" || typeof data.customColors !== "boolean") throw new StudioError("Publication and custom colors must be on or off.");
  if (!Array.isArray(data.tags) || data.tags.some((tag) => typeof tag !== "string" || !tag.trim())) throw new StudioError("Tags must be nonempty text.");
  colors(data);
  const existing = state.projects.find((p) => p.id === id);
  if (existing?.data.slug === state.home.data.centerProject && (!data.published || data.slug !== existing.data.slug)) throw new StudioError("Choose another center project in Homepage settings before unpublishing or changing this URL.");
  if (data.published || data.cover) await checkAsset(id, data.cover);
  if (isVideoCover(data.cover)) {
    requiredText(data.coverPoster, "Video cover still");
    const still = await checkAsset(id, data.coverPoster, "image");
    if ((still?.pages ?? 1) > 1) throw new StudioError("The video cover still must be a single frame.");
  }
  if (data.published) requiredText(data.coverAlt, "Cover description");
  if (!Array.isArray(data.content)) throw new StudioError("Project blocks must be a list.");
  const syncGroups = new Map<string, number>();
  const blockIds = new Set<string>();
  for (const [index, item] of data.content.entries()) {
    if (item?.id !== undefined) {
      if (typeof item.id !== "string" || !item.id || blockIds.has(item.id)) throw new StudioError("Project block IDs must be unique text.");
      blockIds.add(item.id);
    }
    if (item?.type === "caption") {
      if ([item.label, item.text].some((value) => value !== undefined && typeof value !== "string")) {
        throw new StudioError(`Caption block ${index + 1} must contain text.`);
      }
      if (!item.label?.trim() && !item.text?.trim()) throw new StudioError(`Enter a label or text for caption block ${index + 1}.`);
      continue;
    }
    if (item?.type !== "image" && item?.type !== "video") throw new StudioError("A project block must be an image, video, or caption.");
    if (item.hidden !== undefined && typeof item.hidden !== "boolean") throw new StudioError("Media visibility must be on or off.");
    if (item.syncGroup !== undefined) {
      if (item.type !== "video") throw new StudioError("Only videos can be paired for synced playback.");
      if (typeof item.syncGroup !== "string" || !item.syncGroup || item.syncGroup !== item.syncGroup.trim()) {
        throw new StudioError("Choose a valid video pair.");
      }
      syncGroups.set(item.syncGroup, (syncGroups.get(item.syncGroup) ?? 0) + 1);
    }
    await checkAsset(id, item.src, item.type);
    if (!ratios.includes(item.aspectRatio ?? "Default")) throw new StudioError("Choose a supported aspect ratio.");
    if (!placements.includes(item.placement ?? "full")) throw new StudioError("Media placement must be full, left, center or right.");
    if (item.display && !["landscape", "portrait", "square", "wide"].includes(item.display)) throw new StudioError("Unsupported video placeholder shape.");
    if (item.alt !== undefined && typeof item.alt !== "string") throw new StudioError("Media description must be text.");
    if (item.poster) await checkAsset(id, item.poster, "image");
  }
  if ([...syncGroups.values()].some((count) => count !== 2)) {
    throw new StudioError("Each synced pair must contain exactly two videos.");
  }
}
async function syncProject(id: string, data: ProjectDraft) {
  const sources = new Set(projectAssetReferences(data, false));
  const publicRoot = path.join(siteRoot, "public", "content", "projects");
  await mkdir(publicRoot, { recursive: true });
  const target = path.join(publicRoot, data.slug);
  await mkdir(target, { recursive: true });
  await safeExisting(publicRoot, target);
  for (const src of sources) {
    const source = await assetPath(id, src);
    const destination = path.join(target, path.basename(source));
    // Replace a generated file via rename so existing symlinks are never followed.
    const temporary = path.join(target, `.${randomUUID()}.tmp`);
    await copyFile(source, temporary);
    await rename(temporary, destination);

    if (src === data.cover && path.extname(source).toLowerCase() === ".gif") {
      const stillDirectory = path.join(target, "_cover");
      await mkdir(stillDirectory, { recursive: true });
      await safeExisting(target, stillDirectory);
      const still = await sharp(source, { page: 0, pages: 1 }).webp({ lossless: true }).toBuffer();
      const temporaryStill = path.join(stillDirectory, `.${randomUUID()}.tmp`);
      await writeFile(temporaryStill, still, { flag: "wx" });
      try {
        await rename(temporaryStill, path.join(stillDirectory, `${path.basename(source)}.webp`));
      } catch (error) {
        await unlink(temporaryStill);
        throw error;
      }
    }
  }
}
async function saveDocument(file: string, expected: string, data: Record<string, unknown>) {
  const current = await document(file);
  if (current.revision !== expected) throw new StudioError("This file changed outside Studio. Reload from disk before saving so those changes are preserved.", 409);
  await mkdir(backupRoot, { recursive: true });
  const backup = `${Date.now()}-${randomUUID()}-${path.basename(file)}`;
  await writeFile(path.join(backupRoot, backup), current.text, { flag: "wx" });
  const temporary = `${file}.${randomUUID()}.tmp`;
  await writeFile(temporary, matter.stringify(current.body, data), { flag: "wx" });
  await rename(temporary, file);
}
// A filesystem lock covers overlapping saves, uploads and multiple dev-server workers.
export async function withStudioWrite<T>(work: () => Promise<T>) {
  const file = path.join(process.cwd(), ".studio-write.lock");
  let lock;
  try { lock = await open(file, "wx"); } catch { throw new StudioError("Another Studio save is in progress. Try again in a moment.", 409); }
  try { return await work(); } finally { await lock.close(); await unlink(file); }
}
export async function saveProject(id: string, expected: string, patch: ProjectDraft) {
  const state = await readStudio();
  const current = state.projects.find((project) => project.id === id);
  if (!current) throw new StudioError("Project not found.", 404);
  if (current.revision !== expected) throw new StudioError("This project changed outside Studio. Reload from disk before saving.", 409);
  const data = { ...current.data, ...patch };
  if (Array.isArray(data.content)) data.content = separateLegacyCaptions(data.content, data.layout);
  if (current.data.cover !== data.cover) data.coverPoster = patch.coverPoster;
  if (!isVideoCover(data.cover)) delete data.coverPoster;
  await validateProject(id, data, state);
  await syncProject(id, data);
  await saveDocument(await structure(id), expected, data);
  return readProject(id);
}
export async function saveHome(expected: string, patch: HomeDraft) {
  const state = await readStudio();
  const data = { ...state.home.data, ...patch };
  for (const field of ["intro", "workLabel", "aboutLabel"]) requiredText(data[field], field);
  if (!["grid", "index"].includes(data.defaultView)) throw new StudioError("Choose Grid or Index.");
  if (!state.projects.some((p) => p.data.published && p.data.slug === data.centerProject)) throw new StudioError("The center project must be published.");
  colors(data); colors(data, "projectPage");
  await saveDocument(homeFile, expected, data);
  return (await readStudio()).home;
}
export async function createProject(title: string, slug: string) {
  requiredText(title, "Title");
  if (!validSlug(slug)) throw new StudioError("Choose a URL using lowercase letters, numbers and hyphens.");
  const state = await readStudio();
  if (state.projects.some((p) => p.data.slug.toLowerCase() === slug || p.id.toLowerCase() === slug)) throw new StudioError("A project already uses that name or URL.");
  const data: ProjectDraft = { title: title.trim(), slug, year: new Date().getFullYear(), layout: "carousel", published: false,
    homeOrder: Math.max(0, ...state.projects.map((p) => p.data.homeOrder)) + 1, gridSize: "M", tags: [], cover: "", coverAlt: "", customColors: false,
    backgroundColor: String(state.home.data.projectPageBackgroundColor), textStrokeColor: String(state.home.data.projectPageTextStrokeColor),
    cropMarkColor: String(state.home.data.projectPageCropMarkColor), asteriskColor: String(state.home.data.projectPageAsteriskColor), content: [] };
  const folder = path.join(projectsRoot, slug);
  await mkdir(folder); // Exclusive creation: never merge with an existing folder.
  await mkdir(path.join(folder, "Images"));
  await writeFile(path.join(folder, `Structure_${slug}.md`), matter.stringify(`\n# ${title.trim()}\n\nProject blocks are ordered in the content list above.\n`, data), { flag: "wx" });
  return readProject(slug);
}
export async function uploadAsset(id: string, file: File, expectedType?: StudioAsset["type"]) {
  if (!file.size || file.size > 100 * 1024 * 1024) throw new StudioError("Each upload must be between 1 byte and 100 MB.");
  const type = mediaType(file.name);
  if (expectedType && type !== expectedType) {
    throw new StudioError(expectedType === "image" ? "Choose a JPG, PNG, WebP, GIF or AVIF image." : "Choose an MP4, WebM or MOV video.");
  }
  if (!type) throw new StudioError("Upload JPG, PNG, WebP, GIF, AVIF, MP4, WebM or MOV files.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (type === "image") {
    const metadata = await sharp(bytes).metadata();
    if (!metadata.width || !metadata.height) throw new StudioError("This image cannot be read.");
  }
  const folder = await directory(id);
  const images = path.join(folder, "Images");
  await mkdir(images, { recursive: true });
  await safeExisting(folder, images);
  const extension = path.extname(file.name).toLowerCase();
  const stem = path.basename(file.name, path.extname(file.name)).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 90) || "media";
  const name = `${stem}-${randomUUID().slice(0, 8)}${extension}`;
  await writeFile(path.join(images, name), bytes, { flag: "wx" });
  return { src: `./Images/${name}`, type, name } satisfies StudioAsset;
}
export async function readAsset(id: string, src: string) {
  const file = await assetPath(id, src);
  const mime = mimeTypes[path.extname(file).toLowerCase()];
  if (!mime) throw new StudioError("Unsupported preview type.");
  // Serve original image and video bytes without resizing or re-encoding.
  return { bytes: new Uint8Array(await readFile(file)), mime };
}

export async function removeLibraryAsset(id: string, src: string) {
  const project = await readProject(id);
  const asset = project.assets.find((entry) => entry.src === src);
  if (!asset) throw new StudioError("That file is no longer in this project's library.", 404);
  const key = assetReferenceKey(path.normalize(asset.src));
  if (projectAssetReferences(project.data).some((reference) => assetReferenceKey(path.normalize(reference)) === key)) {
    throw new StudioError("Remove the file from page blocks, covers, or posters and save before removing it from the library.", 409);
  }

  const folder = await directory(id);
  const images = await safeExisting(folder, path.join(folder, "Images"));
  const original = path.join(images, asset.name);
  if (!(await lstat(original)).isFile()) throw new StudioError("Choose an original media file from this library.");

  const backup = path.join(backupRoot, "media", id, randomUUID());
  await mkdir(backup, { recursive: true });
  await safeExisting(backupRoot, backup);
  await rename(original, path.join(backup, asset.name));
  return { src: asset.src };
}
