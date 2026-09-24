import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { AutoplayVideo } from "@/components/media/AutoplayVideo";
import type { ProjectPage } from "@/features/site-content/site-content.types";
import { ProjectOpening } from "./ProjectOpening";
import { titleBootstrap } from "./titlePlacement";
import styles from "./project.module.css";

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.fact}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

// Implements docs/design/prototypes/project-detail/Project Detail 1B v2
// Responsive.dc.html. The project opens directly into the film; everything
// that has to be read sits below it. Blocks render in the prototype's authored
// order and a project without a block's content omits that block. Source order
// is visual order at every width. Rendered for a public project, a private
// project after access is verified, and an admin's preview.
export function ProjectDetailView({ project }: { project: ProjectPage }) {
  const { title, year, cover, detail, next } = project;
  const film = detail?.film;

  return (
    <div className={styles.environment}>
      <div className={styles.page}>
        <main>
          <ProjectOpening title={title} image={film ? film.poster : { ...cover, alt: "" }} film={film?.src} />
          <div hidden dangerouslySetInnerHTML={{ __html: titleBootstrap() }} />

          <section className={styles.metaSec}>
            <dl className={styles.meta}>
              <Fact label="Year" value={year} />
              {detail?.runtime && <Fact label="Runtime" value={detail.runtime} />}
              {detail?.client && <Fact label="Client" value={detail.client} />}
              {detail?.role && <Fact label="Role" value={detail.role} />}
            </dl>
            {detail?.statement && (
              <div className={styles.statement}>
                <p className={styles.lead}>{detail.statement.lead}</p>
                <p className={styles.body}>{detail.statement.body}</p>
              </div>
            )}
          </section>

          {detail && detail.stills.length > 0 && (
            <section className={styles.stills}>
              {detail.stills.map((still) => (
                <Image
                  key={still.src}
                  className={styles.still}
                  src={still.src}
                  width={still.width}
                  height={still.height}
                  alt={still.alt}
                  unoptimized
                />
              ))}
            </section>
          )}

          {detail?.loop && (
            <figure className={styles.support}>
              <div className={styles.loop}>
                <Image className={styles.fill} src={detail.loop.poster.src} alt={detail.loop.poster.alt} fill unoptimized />
                <AutoplayVideo className={styles.fill} src={detail.loop.src} mode="AUTOPLAY_VISIBLE" />
              </div>
              <figcaption className={styles.caption}>{detail.loop.caption}</figcaption>
            </figure>
          )}

          {detail && detail.credits.length > 0 && (
            <section className={styles.creditsSec}>
              <dl className={styles.credits}>
                {detail.credits.map(({ role, name }) => (
                  <div key={`${role}-${name}`} className={styles.credit}>
                    <dt>{role}</dt>
                    <dd>{name}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {detail?.coda && (
            <section
              className={styles.coda}
              style={{ "--coda-aspect": detail.coda.width / detail.coda.height } as CSSProperties}
            >
              <Image
                className={`${styles.fill} ${styles.codaImage}`}
                src={detail.coda.src}
                alt={detail.coda.alt}
                fill
                unoptimized
              />
            </section>
          )}
        </main>

        <footer className={styles.footer}>
          <span className={styles.nextLabel}>Next project</span>
          <div className={styles.nextBox}>
            <Link href={`/works/${next.slug}`} className={styles.next}>
              {next.title}
            </Link>
          </div>
          <Link href="/works" className={`${styles.line} ${styles.all}`}>
            All works
          </Link>
        </footer>
      </div>
    </div>
  );
}
