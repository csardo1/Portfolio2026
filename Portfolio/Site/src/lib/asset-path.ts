// Next.js applies basePath to its own assets and Links, but not public files.
export function publicAssetPath(path: `/${string}`): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH || ""}${path}`;
}
