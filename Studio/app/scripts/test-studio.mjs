// Integration checks against a running local dev server. Uses only disposable projects.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import matter from "gray-matter";

const base = "http://localhost:3001";
const previewBase = "http://localhost:3000";
const slug = `studio-test-${randomUUID().slice(0, 8)}`;
const projectRoot = path.resolve("..", "..", "Portfolio", "Content", "Projects");
const homePath = path.resolve("..", "..", "Portfolio", "Content", "HomePage", "Structure_HomePage.md");
const beforeHome = await readFile(homePath, "utf8");
let created = false;
async function post(body, expected = 200, origin = base) {
  const response = await fetch(`${base}/api/studio`, { method: "POST", headers: { Origin: origin, ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }) }, body: body instanceof FormData ? body : JSON.stringify(body) });
  const json = await response.json();
  assert.equal(response.status, expected, JSON.stringify(json));
  return json;
}
try {
  assert.equal((await fetch(`${base}/`)).status, 200);
  const oldStudioRoute = await fetch(`${base}/studio`, { redirect: "manual" });
  assert.equal(oldStudioRoute.status, 307);
  assert.equal(oldStudioRoute.headers.get("location"), "/");
  const state = await (await fetch(`${base}/api/studio`)).json();
  assert.ok(state.projects.length > 0);
  await post({ action: "create", title: "Blocked", slug }, 403, "https://example.com");
  await post({ action: "create", title: "Bad path", slug: "../outside" }, 400);
  await post({ action: "create", title: "Duplicate", slug: state.projects[0].data.slug }, 400);
  let project = await post({ action: "create", title: "Disposable Studio test", slug });
  created = true;
  assert.equal(project.data.published, false);
  assert.equal(project.data.layout, "carousel");
  assert.equal((await fetch(`${previewBase}/${slug}`)).status, 404);
  const draftRevision = project.revision;
  const png = await sharp({ create: { width: 20, height: 10, channels: 3, background: "#dbf292" } }).png().toBuffer();
  const form = new FormData();
  form.set("project", slug); form.set("file", new File([png], "test.png", { type: "image/png" }));
  const asset = await post(form);
  assert.equal(asset.type, "image");
  const preview = await fetch(`${base}/api/studio?project=${slug}&asset=${encodeURIComponent(asset.src)}`);
  assert.equal(preview.status, 200); assert.equal(preview.headers.get("content-type"), "image/png");
  assert.deepEqual(Buffer.from(await preview.arrayBuffer()), png);
  assert.equal((await fetch(`${base}/api/studio?project=${slug}&asset=${encodeURIComponent("./Images/../../HomePage/Structure_HomePage.md")}`)).status, 400);
  const data = { ...project.data, layout: "split-stack", published: true, cover: asset.src, coverAlt: "A test image", tags: ["Test"],
    content: [ { type: "image", src: asset.src, alt: "First", aspectRatio: "Default", caption: "Multiline caption\nwith punctuation: # and quotes.", captionPosition: "top", placement: "right" },
      { type: "image", src: asset.src, alt: "Second", aspectRatio: "16:9", placement: "full" } ] };
  const projectFile = path.join(projectRoot, slug, project.filename);
  await writeFile(projectFile, matter.stringify("\n# Legacy caption fixture\n", { ...data, published: false }));
  const loaded = await (await fetch(`${base}/api/studio`)).json();
  project = loaded.projects.find((entry) => entry.id === slug);
  const [caption, first, second] = project.data.content;
  assert.equal(caption.type, "caption");
  assert.equal(caption.text, data.content[0].caption);
  assert.equal(first.caption, undefined);
  project = await post({ action: "project", id: slug, revision: project.revision, data: { published: true } });
  assert.notEqual(project.revision, draftRevision);
  async function assertPageOrder(expected) {
    const page = await fetch(`${previewBase}/${slug}`);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.deepEqual([...html.matchAll(/data-project-block="(caption|media)"/g)].map((match) => match[1]), expected);
  }
  await assertPageOrder(["caption", "media", "media"]);
  assert.equal((await fetch(`${previewBase}/content/projects/${slug}/${path.basename(asset.src)}`)).status, 200);
  await post({ action: "project", id: slug, revision: draftRevision, data }, 409);
  await post({ action: "project", id: slug, revision: project.revision, data: { ...data, gridSize: "XL" } }, 400);
  await post({ action: "project", id: slug, revision: project.revision, data: { ...data, content: [{ ...data.content[0], placement: "outside" }] } }, 400);
  await post({ action: "project", id: slug, revision: project.revision, data: { content: [{ type: "caption", text: " " }] } }, 400);
  project = await post({ action: "project", id: slug, revision: project.revision, data: { layout: "carousel", content: [second, caption, first] } });
  await assertPageOrder(["media", "caption", "media"]);
  const libraryUpload = new FormData();
  libraryUpload.set("project", slug);
  libraryUpload.set("file", new File([png], "library.png", { type: "image/png" }));
  const libraryAsset = await post(libraryUpload);
  const afterUpload = (await (await fetch(`${base}/api/studio`)).json()).projects.find((entry) => entry.id === slug);
  assert.equal(afterUpload.revision, project.revision);
  assert.ok(afterUpload.assets.some((entry) => entry.src === libraryAsset.src));
  assert.ok(!afterUpload.data.content.some((entry) => entry.src === libraryAsset.src));
  const libraryBlock = { type: "image", src: libraryAsset.src, alt: "Library fixture" };
  const removeLibrary = { action: "remove-library-asset", id: slug, src: libraryAsset.src };
  project = await post({ action: "project", id: slug, revision: project.revision, data: { content: [caption, { ...libraryBlock, hidden: true }] } });
  await assertPageOrder(["caption"]);
  assert.equal((await fetch(`${previewBase}/content/projects/${slug}/${libraryAsset.name}`)).status, 404);
  await post(removeLibrary, 409);
  project = await post({ action: "project", id: slug, revision: project.revision, data: { content: [caption, libraryBlock] } });
  await assertPageOrder(["caption", "media"]);
  project = await post({ action: "project", id: slug, revision: project.revision, data: { content: [caption] } });
  assert.ok(project.assets.some((entry) => entry.src === libraryAsset.src));
  await post({ ...removeLibrary, src: asset.src }, 409); // The original upload is still the cover.
  await post(removeLibrary);
  const afterRemoval = (await (await fetch(`${base}/api/studio`)).json()).projects.find((entry) => entry.id === slug);
  assert.ok(!afterRemoval.assets.some((entry) => entry.src === libraryAsset.src));
  await assert.rejects(readFile(path.join(projectRoot, slug, libraryAsset.src)), { code: "ENOENT" });
  const backups = path.join(".content-backups", "media", slug);
  const [backup] = await readdir(backups);
  assert.deepEqual(await readFile(path.join(backups, backup, libraryAsset.name)), png);
  project = await post({ action: "project", id: slug, revision: project.revision, data: { content: [second, caption, first] } });
  const onDisk = matter(await readFile(projectFile, "utf8"));
  assert.equal(onDisk.data.content[0].alt, "Second");
  assert.equal(onDisk.data.content[1].text, data.content[0].caption);
  assert.equal(onDisk.data.content[2].placement, "right");
  assert.equal(onDisk.data.content[2].caption, undefined);
  project = await post({ action: "project", id: slug, revision: project.revision, data: { layout: "split-stack", content: [caption] } });
  await assertPageOrder(["caption"]);
  assert.ok((await readdir(".content-backups")).some((name) => name.endsWith(project.filename)));
  const featured = state.projects.find((p) => p.data.slug === state.home.data.centerProject);
  await post({ action: "project", id: featured.id, revision: featured.revision, data: { ...featured.data, published: false } }, 400);
  await post({ action: "home", revision: state.home.revision, data: { ...state.home.data, centerProject: "missing-project" } }, 400);
  assert.equal(await readFile(homePath, "utf8"), beforeHome);
  console.log("PASS: project editing, caption blocks, library upload/removal, protected references, media visibility, asset sync, and revision checks.");
} finally {
  if (created) {
    // Only these unique fixture directories created by this run may be removed.
    for (const parent of [projectRoot, path.resolve("..", "..", "Portfolio", "Site", "public", "content", "projects"), path.resolve(".content-backups", "media")]) {
      const target = path.resolve(parent, slug);
      assert.equal(path.dirname(target), parent);
      assert.ok(path.basename(target).startsWith("studio-test-"));
      await rm(target, { recursive: true, force: true });
    }
    console.log(`Removed disposable project ${slug}.`);
  }
}
