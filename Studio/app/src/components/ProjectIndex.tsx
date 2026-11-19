import { useEffect, useState } from "react";
import type { DragEvent } from "react";
import type { StudioProject } from "@/lib/studio-types";

const preferencesKey = "portfolio-studio-project-index";
const sorts = ["portfolio", "manual", "title", "newest", "oldest"] as const;
type Sort = (typeof sorts)[number];

export function ProjectIndex({ projects, selectedId, busy, onSelect }: {
  projects: StudioProject[];
  selectedId?: string;
  busy: boolean;
  onSelect: (id: string) => void;
}) {
  const [sort, setSort] = useState<Sort>("portfolio");
  const [manualIds, setManualIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; after: boolean } | null>(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(preferencesKey) ?? "null");
      if (sorts.includes(stored?.sort)) setSort(stored.sort);
      if (Array.isArray(stored?.ids)) setManualIds(stored.ids.filter((id: unknown) => typeof id === "string"));
    } catch {
      // The index still works when the browser disables local storage.
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(preferencesKey, JSON.stringify({ sort, ids: manualIds })); } catch {}
  }, [loaded, sort, manualIds]);

  const byTitle = (first: StudioProject, second: StudioProject) => first.data.title.localeCompare(second.data.title);
  const ordered = [...projects].sort((first, second) => first.data.homeOrder - second.data.homeOrder || byTitle(first, second));
  if (sort === "manual") {
    const position = new Map(manualIds.map((id, index) => [id, index]));
    ordered.sort((first, second) => (position.get(first.id) ?? manualIds.length) - (position.get(second.id) ?? manualIds.length));
  } else if (sort === "title") {
    ordered.sort(byTitle);
  } else if (sort === "newest" || sort === "oldest") {
    const direction = sort === "newest" ? -1 : 1;
    ordered.sort((first, second) => direction * (first.data.year - second.data.year) || byTitle(first, second));
  }

  function move(from: number, to: number) {
    if (busy || from < 0 || to < 0 || to >= ordered.length || from === to) return;
    const ids = ordered.map((project) => project.id);
    const [id] = ids.splice(from, 1);
    ids.splice(to, 0, id);
    setManualIds(ids);
    setAnnouncement(`${ordered[from].data.title} moved to position ${to + 1} of ${ids.length}.`);
  }

  function target(event: DragEvent, id: string) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { id, after: event.clientY >= bounds.top + bounds.height / 2 };
  }

  return (
    <aside className="studio-sidebar" data-expanded={expanded || undefined}>
      <h2>Project index</h2>
      <button className="studio-text-button studio-index-toggle" type="button" aria-controls="studio-project-index" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>Project index <span aria-hidden="true">{expanded ? "−" : "+"}</span></button>
      <div id="studio-project-index" className="studio-index-content">
        <label className="studio-index-sort">
          <span>Sort</span>
          <select aria-label="Sort projects in sidebar" disabled={busy} value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
            <option value="portfolio">Portfolio order</option>
            <option value="manual">Manual order</option>
            <option value="title">Title A–Z</option>
            <option value="newest">Newest year</option>
            <option value="oldest">Oldest year</option>
          </select>
        </label>
        <div className="studio-visually-hidden" role="status">{announcement}</div>
        <nav aria-label="Project index">
          <ul>
            {ordered.map((project, index) => (
              <li
                key={project.id}
                data-drop={drop?.id === project.id ? (drop.after ? "after" : "before") : undefined}
                onDragOver={(event) => {
                  if (!dragged || busy || sort !== "manual") return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  const next = target(event, project.id);
                  if (drop?.id !== next.id || drop.after !== next.after) setDrop(next);
                }}
                onDrop={(event) => {
                  if (!dragged || busy || sort !== "manual") return;
                  event.preventDefault();
                  const from = ordered.findIndex((entry) => entry.id === dragged);
                  const insertion = index + Number(target(event, project.id).after);
                  move(from, insertion - Number(insertion > from));
                  setDragged(null); setDrop(null);
                }}
              >
                {sort === "manual" && <span aria-hidden="true" className="studio-index-handle" title="Drag to reorder" draggable={!busy} onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", project.id);
                  setDragged(project.id);
                }} onDragEnd={() => { setDragged(null); setDrop(null); }}>⠿</span>}
                <button className="studio-index-project" type="button" aria-current={selectedId === project.id ? "page" : undefined} disabled={busy} onClick={() => { onSelect(project.id); setExpanded(false); }}>
                  <span>{project.data.title}</span>
                  {!project.data.published && <small>Hidden</small>}
                </button>
                {sort === "manual" && <div className="studio-index-moves">
                  <button type="button" aria-label={`Move ${project.data.title} up`} disabled={busy || index === 0} onClick={() => move(index, index - 1)}>↑</button>
                  <button type="button" aria-label={`Move ${project.data.title} down`} disabled={busy || index === ordered.length - 1} onClick={() => move(index, index + 1)}>↓</button>
                </div>}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
