"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import type { ProjectDetailDto } from "@/features/projects/project.mapper";
import { api } from "../../../_components/api";
import { ChooseMediaButton, ErrorLine } from "../../../_components/composition";
import { PublishingPanel } from "../../../_components/PublishingPanel";
import { Thumb } from "../../../_components/Thumb";
import { useAction } from "../../../_components/useAction";
import styles from "../../../studio.module.css";
import { StatusBadge } from "../ProjectsBoard";
import { ProjectComposition } from "./ProjectComposition";

type Project = ProjectDetailDto;

function Panel({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>{title}</h2>
        {aside}
      </div>
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}

const DETAIL_FIELDS = [
  ["title", "Title", 200],
  ["slug", "URL slug", 200],
  ["year", "Year", 4],
  ["category", "Category", 120],
  ["client", "Client", 200],
  ["role", "Role", 200],
  ["runtime", "Runtime", 100],
] as const;

function DetailsPanel({ project }: { project: Project }) {
  const { run, pending, error } = useAction();
  const initial = {
    title: project.title,
    slug: project.slug,
    year: project.year?.toString() ?? "",
    category: project.category ?? "",
    client: project.client ?? "",
    role: project.role ?? "",
    runtime: project.runtime ?? "",
    shortDescription: project.shortDescription ?? "",
    seoTitle: project.seoTitle ?? "",
    seoDescription: project.seoDescription ?? "",
  };
  const [values, setValues] = useState(initial);
  const changed = (Object.keys(values) as (keyof typeof values)[]).filter((key) => values[key] !== initial[key]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const patch: Record<string, unknown> = {};
    for (const key of changed) {
      patch[key] = key === "year" ? (values.year.trim() ? Number(values.year) : null) : values[key];
    }
    void run(() => api("PATCH", `/projects/${project.id}`, patch));
  }

  const set = (key: keyof typeof values) => (event: { target: { value: string } }) =>
    setValues({ ...values, [key]: event.target.value });

  return (
    <Panel title="Details">
      <form onSubmit={submit}>
        <div className={styles.grid3}>
          {DETAIL_FIELDS.map(([key, label, max]) => (
            <label key={key} className={styles.field}>
              <span>{label}</span>
              <input
                className={styles.input}
                value={values[key]}
                maxLength={max}
                inputMode={key === "year" ? "numeric" : undefined}
                required={key === "title" || key === "slug"}
                onChange={set(key)}
              />
            </label>
          ))}
          <label className={`${styles.field} ${styles.span2}`}>
            <span>Short description</span>
            <input className={styles.input} value={values.shortDescription} maxLength={500} onChange={set("shortDescription")} />
          </label>
          <label className={styles.field}>
            <span>SEO title</span>
            <input className={styles.input} value={values.seoTitle} maxLength={200} onChange={set("seoTitle")} />
          </label>
          <label className={`${styles.field} ${styles.span2}`}>
            <span>SEO description</span>
            <input className={styles.input} value={values.seoDescription} maxLength={500} onChange={set("seoDescription")} />
          </label>
        </div>
        {values.slug !== initial.slug && project.status === "PUBLISHED" && (
          <p className={styles.notice}>Changing the slug changes the public address at once; the old address stops working.</p>
        )}
        <div className={styles.actions}>
          <button className={`${styles.button} ${styles.primary}`} type="submit" disabled={pending || changed.length === 0}>
            Save details
          </button>
          {changed.length > 0 && <span className={styles.hint}>{changed.length} unsaved change(s)</span>}
        </div>
        <ErrorLine error={error} />
      </form>
    </Panel>
  );
}

function MediaPanel({ project }: { project: Project }) {
  const { run, pending, error } = useAction();
  return (
    <Panel title="Cover and preview">
      <div className={styles.grid2}>
        <div className={styles.field}>
          <span>Cover — Art Works card and fallback opening</span>
          <Thumb src={project.cover?.deliveryUrl ?? null} large label="No cover" />
          <div className={styles.row}>
            <ChooseMediaButton
              label={project.cover ? "Change cover" : "Choose cover"}
              title="Choose the cover image"
              types={["IMAGE"]}
              onSelect={(media) => api("PATCH", `/projects/${project.id}`, { coverMediaId: media.id })}
            />
          </div>
        </div>
        <div className={styles.field}>
          <span>Moving preview — optional, plays on the Art Works card</span>
          <Thumb src={null} large label={project.preview ? "Video chosen" : "No preview"} />
          <div className={styles.row}>
            <ChooseMediaButton
              label={project.preview ? "Change preview" : "Choose preview"}
              title="Choose the moving preview"
              types={["VIDEO"]}
              onSelect={(media) => api("PATCH", `/projects/${project.id}`, { previewMediaId: media.id })}
            />
            {project.preview && (
              <button
                type="button"
                className={`${styles.button} ${styles.small}`}
                disabled={pending}
                onClick={() => run(() => api("PATCH", `/projects/${project.id}`, { previewMediaId: null }))}
              >
                Remove preview
              </button>
            )}
          </div>
        </div>
      </div>
      <ErrorLine error={error} />
    </Panel>
  );
}

function CreditsPanel({ project }: { project: Project }) {
  const { run, pending, error } = useAction();
  const [rows, setRows] = useState(project.credits);
  const dirty = JSON.stringify(rows) !== JSON.stringify(project.credits);
  const update = (index: number, key: "role" | "name", value: string) =>
    setRows(rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

  return (
    <Panel title="Credits">
      {rows.length === 0 && <p className={styles.hint}>No credits.</p>}
      {rows.map((row, index) => (
        <div key={index} className={styles.row} style={{ marginBottom: 8 }}>
          <input className={styles.input} style={{ flex: 1 }} aria-label="Role" placeholder="Role" value={row.role} maxLength={120} onChange={(e) => update(index, "role", e.target.value)} />
          <input className={styles.input} style={{ flex: 2 }} aria-label="Name" placeholder="Name" value={row.name} maxLength={200} onChange={(e) => update(index, "name", e.target.value)} />
          <button type="button" className={`${styles.button} ${styles.small} ${styles.icon}`} aria-label="Move credit up" disabled={index === 0} onClick={() => setRows([...rows.slice(0, index - 1), row, rows[index - 1], ...rows.slice(index + 1)])}>
            ↑
          </button>
          <button type="button" className={`${styles.button} ${styles.small} ${styles.danger}`} onClick={() => setRows(rows.filter((_, i) => i !== index))}>
            Remove
          </button>
        </div>
      ))}
      <div className={styles.actions}>
        <button type="button" className={styles.button} onClick={() => setRows([...rows, { role: "", name: "" }])} disabled={rows.length >= 100}>
          Add credit
        </button>
        <button
          type="button"
          className={`${styles.button} ${styles.primary}`}
          disabled={pending || !dirty || rows.some((row) => !row.role.trim() || !row.name.trim())}
          onClick={() => run(() => api("PATCH", `/projects/${project.id}`, { credits: rows }))}
        >
          Save credits
        </button>
      </div>
      <ErrorLine error={error} />
    </Panel>
  );
}

function AccessPanel({ project }: { project: Project }) {
  const { run, pending, error } = useAction();
  const [password, setPassword] = useState("");
  const isPrivate = project.visibility === "PRIVATE";

  return (
    <Panel title="Visibility and access">
      <div className={styles.grid2}>
        <div className={styles.field}>
          <span>Who can see it</span>
          <label className={styles.check}>
            <input
              type="radio"
              name="visibility"
              checked={!isPrivate}
              disabled={pending}
              onChange={() => run(() => api("PATCH", `/projects/${project.id}`, { visibility: "PUBLIC" }))}
            />
            Public — listed on Art Works once published
          </label>
          <label className={styles.check}>
            <input
              type="radio"
              name="visibility"
              checked={isPrivate}
              disabled={pending || !project.hasPassword}
              onChange={() => run(() => api("PATCH", `/projects/${project.id}`, { visibility: "PRIVATE" }))}
            />
            Private — never listed; opens at its address with the password
          </label>
          {!project.hasPassword && <p className={styles.hint}>Set a password to allow private.</p>}
          <label className={styles.check} style={{ marginTop: 8 }}>
            <input
              type="checkbox"
              checked={project.isFeatured}
              disabled={pending}
              onChange={(event) => run(() => api("PATCH", `/projects/${project.id}`, { isFeatured: event.target.checked }))}
            />
            Featured
          </label>
        </div>
        <form
          className={styles.field}
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await api("PUT", `/projects/${project.id}/password`, { password });
              setPassword("");
            });
          }}
        >
          <span>Project password {project.hasPassword ? "— set" : "— not set"}</span>
          <input
            className={styles.input}
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={200}
            placeholder={project.hasPassword ? "Replace the password" : "At least 8 characters"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <div className={styles.row}>
            <button type="submit" className={`${styles.button} ${styles.small}`} disabled={pending || password.length < 8}>
              {project.hasPassword ? "Replace password" : "Set password"}
            </button>
            {project.hasPassword && !isPrivate && (
              <button
                type="button"
                className={`${styles.button} ${styles.small} ${styles.danger}`}
                disabled={pending}
                onClick={() => run(() => api("DELETE", `/projects/${project.id}/password`))}
              >
                Remove password
              </button>
            )}
          </div>
          <p className={styles.hint}>Replacing the password signs out everyone who unlocked the project before.</p>
        </form>
      </div>
      <ErrorLine error={error} />
    </Panel>
  );
}

export function ProjectEditor({ project }: { project: Project }) {
  const router = useRouter();
  const { run, pending, error } = useAction();

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <p className={styles.crumbs}>
            <Link href="/admin/projects">Projects</Link> / {project.slug}
          </p>
          <h1>{project.title}</h1>
          <div className={styles.row} style={{ marginTop: 6 }}>
            <StatusBadge project={project} />
            {project.visibility === "PRIVATE" && <span className={`${styles.badge} ${styles.badgeInfo}`}>Private</span>}
          </div>
        </div>
        <button
          type="button"
          className={`${styles.button} ${styles.danger}`}
          disabled={pending}
          onClick={() => {
            if (confirm(`Delete “${project.title}”? It leaves the site at once. Its media stays in the library.`)) {
              void run(
                async () => {
                  await api("DELETE", `/projects/${project.id}`);
                  router.replace("/admin/projects");
                },
                { refresh: false },
              );
            }
          }}
        >
          Delete project
        </button>
      </div>
      <ErrorLine error={error} />
      <PublishingPanel
        publication={project.publication}
        basePath={`/projects/${project.id}`}
        previewHref={`/api/v1/projects/${project.id}/preview`}
        canUnpublish
        live={project.visibility === "PRIVATE" ? `/works/${project.slug} (password)` : `/works/${project.slug}`}
      />
      <DetailsPanel key={`details-${project.updatedAt}`} project={project} />
      <MediaPanel project={project} />
      <Panel title="Page composition">
        <ProjectComposition projectId={project.id} blocks={project.blocks} />
      </Panel>
      <CreditsPanel key={`credits-${project.updatedAt}`} project={project} />
      <AccessPanel project={project} />
    </>
  );
}
