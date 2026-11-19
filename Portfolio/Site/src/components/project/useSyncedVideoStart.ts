import { useEffect } from "react";
import type { RefObject } from "react";
import type { ProjectMedia } from "@/lib/content";

function startWhenReady(videos: HTMLVideoElement[]) {
  const listeners = new AbortController();
  function start() {
    const playable = videos.filter((video) => !video.error);
    if (playable.some((video) => video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA)) return;

    listeners.abort();
    for (const video of playable) {
      // Autoplay can be blocked by the browser's media preferences.
      void video.play().catch(() => {});
    }
  }

  for (const video of videos) {
    video.addEventListener("canplay", start, { signal: listeners.signal });
    video.addEventListener("error", start, { signal: listeners.signal });
  }
  start();
  return () => listeners.abort();
}

export function useSyncedVideoStart(rootRef: RefObject<HTMLElement | null>, media: ProjectMedia[]) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !media.some((item) => item.syncGroup)) return;
    const groups = new Map<string, HTMLVideoElement[]>();
    for (const video of root.querySelectorAll<HTMLVideoElement>("video[data-sync-group]")) {
      // An open lightbox starts its own pair separately from the project page.
      if (video.closest("[data-video-sync-scope]") !== root) continue;
      const group = video.dataset.syncGroup;
      if (!group) continue;
      const videos = groups.get(group) ?? [];
      videos.push(video);
      groups.set(group, videos);
    }
    const cleanups = Array.from(groups.values(), startWhenReady);
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [rootRef, media]);
}
