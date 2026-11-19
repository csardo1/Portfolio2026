export async function captureCoverFrame(src: string) {
  const response = await fetch(src);
  if (!response.ok) throw new Error("Could not load the video cover.");

  const url = URL.createObjectURL(await response.blob());
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  try {
    await new Promise<void>((resolve, reject) => {
      const fail = () => reject(new Error("Could not read the first frame. Choose a video that plays in this browser."));
      const timeout = window.setTimeout(fail, 15_000);
      video.onloadeddata = () => {
        window.clearTimeout(timeout);
        resolve();
      };
      video.onerror = () => {
        window.clearTimeout(timeout);
        fail();
      };
      video.src = url;
    });

    const { videoWidth, videoHeight } = video;
    if (!videoWidth || !videoHeight) throw new Error("The video has no readable dimensions.");
    const scale = Math.min(1, 1600 / Math.max(videoWidth, videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(videoWidth * scale));
    canvas.height = Math.max(1, Math.round(videoHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not capture the first video frame.");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const still = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not save the first video frame."));
      }, "image/png");
    });
    return new File([still], "CoverFirstFrame.png", { type: still.type });
  } finally {
    video.onloadeddata = null;
    video.onerror = null;
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
