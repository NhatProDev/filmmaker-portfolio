"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { ProjectSummaryDto } from "@/features/projects/project.mapper";
import { api } from "../../_components/api";
import { slugify } from "../../_components/slug";
import { Thumb } from "../../_components/Thumb";
import { useAction } from "../../_components/useAction";
import styles from "../../studio.module.css";

export function StatusBadge({ project }: { project: Pick<ProjectSummaryDto, "status" | "publishedAt"> }) {
  if (project.status === "PUBLISHED") return <span className={`${styles.badge} ${styles.badgeOk}`}>Published</span>;
  if (project.status === "ARCHIVED") return <span className={styles.badge}>Archived</span>;
  return <span className={`${styles.badge} ${styles.badgeWarn}`}>Draft</span>;
}

export function ProjectsBoard({ projects }: { projects: ProjectSummaryDto[] }) {
  const router = useRouter();
  const { run, pending, error } = useAction();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  async function create(event: FormEvent) {
    event.preventDefault();
    await run(
      async () => {
        const project = await api<{ id: string }>("POST", "/projects", { title, slug });
        router.push(`/admin/projects/${project.id}`);
      },
      { refresh: false },
    );
  }

  function move(index: number, delta: number) {
    const ids = projects.map((p) => p.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved);
    return run(() => api("PUT", "/projects/order", { projectIds: ids }));
  }

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1>Projects</h1>
          <p className={styles.hint}>
            The order here is the order on Art Works. Drafts and private projects never appear publicly.
          </p>
        </div>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>New project</h2>
        </div>
        <form className={styles.panelBody} onSubmit={create}>
          <div className={styles.grid2}>
            <label className={styles.field}>
              <span>Title</span>
              <input
                className={styles.input}
                required
                maxLength={200}
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (!slugEdited) setSlug(slugify(event.target.value));
                }}
              />
            </label>
            <label className={styles.field}>
              <span>URL slug — /works/{slug || "…"}</span>
              <input
                className={styles.input}
                required
                maxLength={200}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                value={slug}
                onChange={(event) => {
                  setSlugEdited(true);
                  setSlug(event.target.value);
                }}
              />
            </label>
          </div>
          <div className={styles.actions}>
            <button className={`${styles.button} ${styles.primary}`} type="submit" disabled={pending || !title || !slug}>
              Create draft
            </button>
          </div>
        </form>
      </section>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <section className={styles.panel}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 84 }}>Order</th>
              <th style={{ width: 80 }}>Cover</th>
              <th>Title</th>
              <th>Status</th>
              <th>Visibility</th>
              <th>Featured</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project, index) => (
              <tr key={project.id}>
                <td>
                  <div className={styles.row} style={{ gap: 4 }}>
                    <button
                      type="button"
                      className={`${styles.button} ${styles.small} ${styles.icon}`}
                      aria-label={`Move ${project.title} up`}
                      disabled={pending || index === 0}
                      onClick={() => move(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={`${styles.button} ${styles.small} ${styles.icon}`}
                      aria-label={`Move ${project.title} down`}
                      disabled={pending || index === projects.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      ↓
                    </button>
                  </div>
                </td>
                <td>
                  <Thumb src={project.cover?.deliveryUrl ?? null} label="No cover" />
                </td>
                <td>
                  <Link href={`/admin/projects/${project.id}`}>
                    <strong>{project.title}</strong>
                  </Link>
                  <div className={styles.mono}>
                    /works/{project.slug}
                    {project.year ? ` · ${project.year}` : ""}
                  </div>
                </td>
                <td>
                  <StatusBadge project={project} />
                </td>
                <td>
                  {project.visibility === "PRIVATE" ? (
                    <span className={`${styles.badge} ${styles.badgeInfo}`}>Private</span>
                  ) : (
                    <span className={styles.badge}>Public</span>
                  )}
                </td>
                <td>
                  <label className={styles.check}>
                    <input
                      type="checkbox"
                      checked={project.isFeatured}
                      disabled={pending}
                      onChange={(event) =>
                        run(() => api("PATCH", `/projects/${project.id}`, { isFeatured: event.target.checked }))
                      }
                    />
                    <span className={styles.hint}>{project.isFeatured ? `#${(project.featuredPosition ?? 0) + 1}` : ""}</span>
                  </label>
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.hint}>
                  No projects yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
