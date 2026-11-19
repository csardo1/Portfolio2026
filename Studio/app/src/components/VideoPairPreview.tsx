import { useEffect, useRef, useState } from "react";
import { assetUrl } from "@/lib/studio-types";
import type { MediaDraft } from "@/lib/studio-types";

export function VideoPairPreview({ projectId, pair, onClose }: {
  projectId: string;
  pair: [MediaDraft, MediaDraft];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");

  function closePreview() {
    dialogRef.current?.close();
    onClose();
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    const videos = Array.from(dialog.querySelectorAll("video"));
    const listeners = new AbortController();
    let closed = false;

    function playWhenReady() {
      if (!videos.every((video) => video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA)) return;
      listeners.abort();
      Promise.all(videos.map((video) => video.play())).catch(() => {
        if (closed) return;
        for (const video of videos) video.pause();
        setError("The browser could not play the video pair.");
      });
    }

    function reportError() {
      listeners.abort();
      setError("A video could not load for the preview.");
    }

    for (const video of videos) {
      video.addEventListener("canplay", playWhenReady, { signal: listeners.signal });
      video.addEventListener("error", reportError, { signal: listeners.signal });
    }
    if (videos.some((video) => video.error)) reportError();
    else playWhenReady();

    return () => {
      closed = true;
      listeners.abort();
      for (const video of videos) video.pause();
      dialog.close();
    };
  }, []);

  return (
    <dialog
      aria-labelledby="studio-video-pair-title"
      className="studio-modal studio-video-preview"
      ref={dialogRef}
      onCancel={(event) => { event.preventDefault(); closePreview(); }}
    >
      <h2 id="studio-video-pair-title">Synced video preview</h2>
      {error && <p role="alert">{error}</p>}
      <div className="studio-video-preview-grid">
        {pair.map((video, index) => (
          <video
            aria-label={video.alt || video.src.split("/").pop()}
            key={index}
            muted
            playsInline
            poster={video.poster ? assetUrl(projectId, video.poster) : undefined}
            preload="auto"
            src={assetUrl(projectId, video.src)}
          />
        ))}
      </div>
      <div className="studio-modal-actions">
        <button className="studio-button" type="button" onClick={closePreview}>Close</button>
      </div>
    </dialog>
  );
}
