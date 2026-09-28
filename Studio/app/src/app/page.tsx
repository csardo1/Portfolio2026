import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { allowStudio } from "@/lib/studio";
import { Studio } from "@/components/Studio";
import "./studio/studio.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Portfolio Studio — Christopher Sardo", robots: { index: false, follow: false } };

export default async function StudioPage() {
  try { allowStudio(await headers()); } catch { notFound(); }
  return <Studio />;
}
