import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Fragment, type CSSProperties } from "react";
import { getContentGateway } from "@/features/site-content/site-content.gateway";
import type { WorksProject } from "@/features/site-content/site-content.types";
import { IndexSheet } from "./IndexSheet";
import { indexColumns, sheetCss } from "./worksLayout";
import styles from "./works.module.css";

export const metadata: Metadata = {
  title: "Works",
  alternates: { canonical: "/works" },
};

// The Project Detail route. No page route is documented yet; this one follows
// the contract's public identity (GET /public/projects/{slug}) and Project
// Detail's own "Back to Works" navigation. It 404s until that milestone.
const projectPath = (slug: string) => `/works/${slug}`;

// Plate numerals come from displayPosition, 1-based (art-works-2c-v2.md §7).
const numeral = (index: number) => String(index + 1).padStart(2, "0");

// The first row holds up to three frames at common widths, so those covers are
// in the first screen and load eagerly; the first is also preloaded.
const EAGER_COVERS = 3;

// Small stable hash, so a changed list never reuses a stale stylesheet.
function hash(text: string) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (h * 33) ^ text.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function countLine(projects: WorksProject[]) {
  const years = projects.map((project) => project.year);
  const first = Math.min(...years);
  const last = Math.max(...years);
  const span = first === last ? String(first) : `${first}–${last}`;
  return `${projects.length} ${projects.length === 1 ? "project" : "projects"}, ${span}`;
}

// Numeral, title, mark and year: the same parts in the desktop index entry and
// in the per-row label.
function EntryParts({ project, index }: { project: WorksProject; index: number }) {
  return (
    <>
      <span className={styles.num}>{numeral(index)}</span>
      <span className={styles.title}>{project.title}</span>
      <span className={styles.mark} aria-hidden="true" />
      <span className={styles.year}>{project.year}</span>
    </>
  );
}

// Implements docs/design/prototypes/art-works/Art Works 2C v2 Responsive.dc.html.
// A typographic index above a dense visual sheet, in displayPosition order,
// never re-sorted. From the desktop takeover the index is a list above the
// sheet; below it, each frame carries its own index entry directly above it.
// Packing only moves row breaks.
export default async function WorksPage() {
  const { projects } = await getContentGateway().getWorksIndex();
  const aspects = projects.map(({ cover }) => cover.width / cover.height);
  const css = sheetCss("[data-works-sheet]", aspects);

  return (
    <main className={styles.works}>
      <div className={styles.mast}>
        <div className={styles.mastBox}>
          <h1 className={styles.heading}>Works</h1>
        </div>
        <p className={styles.count}>{countLine(projects)}</p>
      </div>

      <IndexSheet className={styles.comp}>
        <div className={styles.index}>
          <ol className={styles.indexList} data-columns={indexColumns(projects.length)}>
            {projects.map((project, index) => (
              <li key={project.slug}>
                <Link href={projectPath(project.slug)} className={styles.entry} data-project={index}>
                  <EntryParts project={project} index={index} />
                </Link>
              </li>
            ))}
          </ol>
        </div>

        <div className={styles.sheet} data-works-sheet="">
          {css && (
            <style href={`works-sheet-${hash(css)}`} precedence="default">
              {css}
            </style>
          )}
          {projects.map((project, index) => (
            <Fragment key={project.slug}>
              {index > 0 && <span className={styles.break} data-break={index} aria-hidden="true" />}
              <div className={styles.unit} data-unit={index} style={{ "--ar": aspects[index] } as CSSProperties}>
                <Link href={projectPath(project.slug)} className={styles.label} data-project={index}>
                  <EntryParts project={project} index={index} />
                </Link>
                <Link
                  href={projectPath(project.slug)}
                  className={styles.frame}
                  data-project={index}
                  data-frame=""
                >
                  <Image
                    className={styles.cover}
                    src={project.cover.src}
                    alt={project.title}
                    fill
                    unoptimized
                    preload={index === 0}
                    loading={index > 0 && index < EAGER_COVERS ? "eager" : undefined}
                  />
                  {project.preview && (
                    <video
                      className={styles.video}
                      data-clip={project.preview}
                      muted
                      loop
                      playsInline
                      preload="none"
                      aria-hidden="true"
                    />
                  )}
                  <span className={styles.plateScrim} aria-hidden="true" />
                  <span className={styles.plate} aria-hidden="true">
                    {numeral(index)}
                  </span>
                  <span className={styles.scrim} aria-hidden="true" />
                  <span className={styles.caption} aria-hidden="true">
                    <span className={styles.captionTitle}>{project.title}</span>
                    <span className={styles.captionYear}>{project.year}</span>
                  </span>
                </Link>
              </div>
            </Fragment>
          ))}
        </div>
      </IndexSheet>
    </main>
  );
}
