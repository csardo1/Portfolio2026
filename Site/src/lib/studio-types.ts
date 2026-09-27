export const ratios = ["Default", "2:1", "16:9", "3:2", "4:3", "5:4", "1:1", "4:5", "3:4", "2:3", "9:16", "1:2"];
export const layouts = ["carousel"];
export const colorFields = ["backgroundColor", "textStrokeColor", "cropMarkColor", "asteriskColor"] as const;
export const colorLabels = ["Background", "Text and rules", "Crop marks", "Asterisk"];

export type MediaDraft = {
  type: "image" | "video";
  src: string;
  alt?: string;
  aspectRatio?: string;
  captionLabel?: string;
  caption?: string;
  captionPosition?: string;
  display?: string;
  poster?: string;
  [key: string]: unknown;
};
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
  customColors: boolean;
  backgroundColor: string;
  textStrokeColor: string;
  cropMarkColor: string;
  asteriskColor: string;
  content: MediaDraft[];
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
