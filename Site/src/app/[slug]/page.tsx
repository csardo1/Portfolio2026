import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectPageView } from "@/components/project/ProjectPageView";
import { getHomeContent, getProjects } from "@/lib/content";

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

// Studio can publish a new project while the development server is running.
// Unknown or unpublished slugs still return notFound() below.
export const dynamicParams = true;

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const projects = await getProjects();
  const project = projects.find((candidate) => candidate.slug === slug);

  if (!project) return {};

  return {
    title: `${project.title} — Christopher Sardo`,
    description: `${project.title}: ${project.tags.join(", ")}.`,
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const [home, projects] = await Promise.all([
    getHomeContent(),
    getProjects(),
  ]);
  const projectIndex = projects.findIndex((project) => project.slug === slug);

  if (projectIndex === -1) notFound();

  const project = projects[projectIndex];
  const previousProject =
    projects[(projectIndex - 1 + projects.length) % projects.length];
  const nextProject = projects[(projectIndex + 1) % projects.length];

  return (
    <ProjectPageView
      home={home}
      nextProject={nextProject}
      previousProject={previousProject}
      project={project}
    />
  );
}
