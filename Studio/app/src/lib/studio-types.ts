export const ratios = ["Default", "2:1", "16:9", "3:2", "4:3", "5:4", "1:1", "4:5", "3:4", "2:3", "9:16", "1:2"];
export const layouts = ["carousel", "split-stack"];
export const placements = ["full", "left", "center", "right"];
export const colorFields = ["backgroundColor", "textStrokeColor", "cropMarkColor", "asteriskColor"] as const;
export const colorLabels = ["Background", "Text and rules", "Crop marks", "Asterisk"];

export type MediaDraft = {
  type: "image" | "video";
  id?: string;
  src: string;
  alt?: string;
  hidden?: boolean;
  aspectRatio?: string;
  placement?: string;
  display?: string;
  poster?: string;
  syncGroup?: string;
  [key: string]: unknown;
};
export type CaptionDraft = { type: "caption"; id?: string; label?: string; text?: string; [key: string]: unknown };
export type BlockDraft = MediaDraft | CaptionDraft;
export type ProjectDraft = {
  title: string;
  slug: string;
  year: number;
  layout?: string;
  published: boolean;
  homeOrder: number;
  gridSize: string;
  tags: string[];
  cover: string;
  coverAlt: string;
  coverPoster?: string;
  customColors: boolean;
  backgroundColor: string;
  textStrokeColor: string;
  cropMarkColor: string;
  asteriskColor: string;
  content: BlockDraft[];
  [key: string]: unknown;
};
export type HomeDraft = {
  intro: string;
  workLabel: string;
  aboutLabel: string;
  defaultView: string;
  centerProject: string;
  [key: string]: unknown;
};
export type StudioAsset = { src: string; type: "image" | "video"; name: string };
export type StudioProject = { id: string; filename: string; revision: string; data: ProjectDraft; assets: StudioAsset[] };
export type StudioState = {
  projects: StudioProject[];
  home: { revision: string; data: HomeDraft };
};
export function assetUrl(id: string, src: string) {
  return `/api/studio?project=${encodeURIComponent(id)}&asset=${encodeURIComponent(src)}`;
}

export function isVideoCover(src: string) {
  return /\.(mp4|webm|mov)$/i.test(src);
}

export function projectAssetReferences(data: ProjectDraft, includeHidden = true) {
  return [data.cover, data.coverPoster, ...data.content.flatMap((block) =>
    block.type === "caption" || (!includeHidden && block.hidden) ? [] : [block.src, block.poster],
  )].filter((src): src is string => Boolean(src));
}

export function assetReferenceKey(src: string) {
  return src.replaceAll("\\", "/").toLowerCase();
}
