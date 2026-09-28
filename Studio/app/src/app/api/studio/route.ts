import { revalidatePath } from "next/cache";
import { allowStudio, createProject, readAsset, readStudio, saveHome, saveProject, StudioError, uploadAsset, withStudioWrite } from "@/lib/studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function failure(error: unknown) {
  const status = error instanceof StudioError ? error.status : 500;
  console.error("Studio:", error);
  return Response.json({ error: error instanceof Error ? error.message : "Unable to complete this action." }, { status, headers: { "Cache-Control": "no-store" } });
}
export async function GET(request: Request) {
  try {
    allowStudio(request.headers);
    const params = new URL(request.url).searchParams;
    if (params.has("asset")) {
      const asset = await readAsset(params.get("project") ?? "", params.get("asset") ?? "");
      return new Response(asset.bytes, { headers: { "Content-Type": asset.mime, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    }
    return Response.json(await readStudio(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    allowStudio(request.headers, true);
    const multipart = request.headers.get("content-type")?.startsWith("multipart/form-data");
    const limit = multipart ? 101 * 1024 * 1024 : 2 * 1024 * 1024;
    if (Number(request.headers.get("content-length")) > limit) throw new StudioError("This request is too large.", 413);
    if (multipart) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) throw new StudioError("Choose a file to upload.");
      return Response.json(await withStudioWrite(() => uploadAsset(String(form.get("project") ?? ""), file)));
    }
    const body = await request.json();
    if (!body || typeof body !== "object") throw new StudioError("Invalid request.");
    const result = await withStudioWrite(async () => {
      if (body.action === "create") return createProject(body.title, body.slug);
      if (body.action === "project" && typeof body.id === "string" && typeof body.revision === "string" && body.data && typeof body.data === "object") return saveProject(body.id, body.revision, body.data);
      if (body.action === "home" && typeof body.revision === "string" && body.data && typeof body.data === "object") return saveHome(body.revision, body.data);
      throw new StudioError("Unknown Studio action.");
    });
    revalidatePath("/", "layout");
    return Response.json(result);
  } catch (error) { return failure(error); }
}
