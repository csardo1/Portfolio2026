import Image from "next/image";
import { useEffect, useState } from "react";
import type { Project } from "@/lib/content";

type CoverProps = {
  project: Project;
  sizes: string;
  alt?: string;
  loading?: "eager" | "lazy";
};

function AnimatedCover({ motion, still }: {
  motion: NonNullable<Project["coverMotion"]>;
  still: Omit<CoverProps, "project"> & { src: string; alt: string };
}) {
  const [allowsMotion, setAllowsMotion] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    function update() {
      setAllowsMotion(!preference.matches);
      if (preference.matches) setReady(false);
    }
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  const playing = allowsMotion && ready;

  return (
    <>
      <Image {...still} className="object-cover" fill style={{ opacity: playing ? 0 : 1 }} />
      {allowsMotion && (motion.type === "video" ? (
        <video
          aria-hidden="true"
          autoPlay
          className="absolute inset-0 h-full w-full object-cover"
          loop
          muted
          onError={() => setReady(false)}
          onPause={() => setReady(false)}
          onPlaying={() => setReady(true)}
          playsInline
          src={motion.url}
          style={{ opacity: playing ? 1 : 0 }}
        />
      ) : (
        <Image
          alt=""
          aria-hidden="true"
          className="object-cover"
          fill
          loading={still.loading}
          onError={() => setReady(false)}
          onLoad={() => setReady(true)}
          sizes={still.sizes}
          src={motion.url}
          style={{ opacity: playing ? 1 : 0 }}
        />
      ))}
    </>
  );
}

export function ProjectCover({ project, alt = project.coverAlt, sizes, loading }: CoverProps) {
  const still = { src: project.coverUrl, alt, sizes, loading };
  if (project.coverMotion) {
    return <AnimatedCover key={project.coverMotion.url} motion={project.coverMotion} still={still} />;
  }

  return <Image {...still} className="object-cover" fill />;
}
