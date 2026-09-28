import type { Metadata } from "next";
import ProjectPage, { generateMetadata as projectMetadata, generateStaticParams as projectParams } from "@/components/project/ProjectRoute";

type Props = { params: Promise<{ slug: string }> };

// GitHub Pages can serve only slugs generated from published Markdown.
export const dynamicParams = false;

export async function generateStaticParams() {
  return projectParams();
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  return projectMetadata(props);
}

export default ProjectPage;
