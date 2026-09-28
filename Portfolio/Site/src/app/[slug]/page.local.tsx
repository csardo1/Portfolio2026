import type { Metadata } from "next";
import ProjectPage, { generateMetadata as projectMetadata, generateStaticParams as projectParams } from "@/components/project/ProjectRoute";

type Props = { params: Promise<{ slug: string }> };

// Studio can publish and preview a new slug without restarting localhost.
export const dynamicParams = true;

export async function generateStaticParams() {
  return projectParams();
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  return projectMetadata(props);
}

export default ProjectPage;
