import { PortfolioHome } from "@/components/home/PortfolioHome";
import { getHomeContent, getProjects } from "@/lib/content";

export default async function HomePage() {
  const [home, projects] = await Promise.all([getHomeContent(), getProjects()]);

  if (!projects.some((project) => project.slug === home.centerProject)) {
    throw new Error(
      `centerProject "${home.centerProject}" must match a published project slug.`,
    );
  }

  return <PortfolioHome home={home} projects={projects} />;
}
