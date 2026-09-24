import Image from "next/image";
import Link from "next/link";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { AutoplayVideo } from "@/components/media/AutoplayVideo";
import { JustifiedRows } from "@/components/media/JustifiedRows";
import type {
  GridPlacement,
  ProjectBlock,
  ProjectFacts,
  ProjectLeafBlock,
  ProjectMedia,
  ProjectPage,
  ProjectVideo,
  TextParagraph,
} from "@/features/site-content/site-content.types";
import { ClickToPlay } from "./ClickToPlay";
import { ProjectOpening } from "./ProjectOpening";
import { titleBootstrap } from "./titlePlacement";
import blockStyles from "./blocks.module.css";
import styles from "./project.module.css";

// The generic Project Detail renderer (Phase 3A). A project's page is its
// blocks, in order (src/features/site-content/project-blocks.ts):
//
// - the opening and the Project Detail presets (ADR-0013) draw exactly the
//   locked 1B page's markup and stylesheet — project.module.css, unchanged;
// - every other block draws by type, in the page's own system
//   (blocks.module.css): its tiers, 12 columns, type roles and dark room.
//
// Source order is document order, keyboard order and the mobile stacking
// order at every width (ADR-0006 §7). Rendered for a public project, a private
// project after access is verified, and an admin's preview.

type PageData = Pick<ProjectPage, "title" | "facts" | "credits">;

// ---- Text ----

function Runs({ paragraph }: { paragraph: TextParagraph }): ReactNode {
  // A single plain run renders as bare text, exactly as a string would.
  if (paragraph.length === 1 && typeof paragraph[0] === "string") return paragraph[0];
  return paragraph.map((run, i) => {
    if (typeof run === "string") return <Fragment key={i}>{run}</Fragment>;
    if ("em" in run) return <em key={i}>{run.em}</em>;
    const { href, text } = run.link;
    return href.startsWith("/") ? (
      <Link key={i} href={href} className={blockStyles.inlineLink}>
        {text}
      </Link>
    ) : (
      <a key={i} href={href} className={blockStyles.inlineLink} rel={href.startsWith("https:") ? "noopener" : undefined}>
        {text}
      </a>
    );
  });
}

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.fact}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Facts({ facts, className }: { facts: ProjectFacts; className: string }) {
  return (
    <dl className={className}>
      <Fact label="Year" value={facts.year} />
      {facts.runtime && <Fact label="Runtime" value={facts.runtime} />}
      {facts.client && <Fact label="Client" value={facts.client} />}
      {facts.role && <Fact label="Role" value={facts.role} />}
    </dl>
  );
}

function Credits({ credits, className }: { credits: PageData["credits"]; className: string }) {
  return (
    <dl className={className}>
      {credits.map(({ role, name }) => (
        <div key={`${role}-${name}`} className={styles.credit}>
          <dt>{role}</dt>
          <dd>{name}</dd>
        </div>
      ))}
    </dl>
  );
}

// ---- Media ----

const aspectOf = (video: ProjectVideo) => (video.width && video.height ? video.width / video.height : 16 / 9);

// A video frame: its poster beneath (or the empty frame), and the playback its
// mode derives (ADR-0008). Autoplay is always muted; sound needs the visitor's
// act.
function VideoFrame({ video, fit, label }: { video: ProjectVideo; fit: "COVER" | "CONTAIN"; label: string }) {
  const fill = fit === "CONTAIN" ? `${blockStyles.fill} ${blockStyles.contain}` : blockStyles.fill;
  return (
    <>
      {video.poster && <Image className={fill} src={video.poster.src} alt={video.poster.alt} fill unoptimized />}
      {video.playback === "CLICK_TO_PLAY" ? (
        <ClickToPlay src={video.src} label={label} />
      ) : (
        <AutoplayVideo className={fill} src={video.src} mode={video.playback} />
      )}
    </>
  );
}

function MediaFrame({ media, fit, label }: { media: ProjectMedia; fit: "COVER" | "CONTAIN"; label: string }) {
  if (media.kind === "video") return <VideoFrame video={media.video} fit={fit} label={label} />;
  const fill = fit === "CONTAIN" ? `${blockStyles.fill} ${blockStyles.contain}` : blockStyles.fill;
  return <Image className={fill} src={media.image.src} alt={media.image.alt} fill unoptimized />;
}

const mediaAspect = (media: ProjectMedia) =>
  media.kind === "image" ? media.image.width / media.image.height : aspectOf(media.video);

// ---- Leaf blocks ----

function TextBody({ block, page }: { block: Extract<ProjectLeafBlock, { type: "text" }>; page: PageData }) {
  const { text } = block;
  if (text.kind === "projectFacts") return <Facts facts={page.facts} className={blockStyles.facts} />;
  if (text.kind === "projectCredits") {
    return page.credits.length ? <Credits credits={page.credits} className={blockStyles.credits} /> : null;
  }
  return (
    <div className={blockStyles.text} data-role={block.role ?? "body"}>
      {text.paragraphs.map((paragraph, i) => (
        <p key={i}>
          <Runs paragraph={paragraph} />
        </p>
      ))}
    </div>
  );
}

// A leaf block's content, sized by whatever holds it: the page at the root, a
// cell inside a GRID.
function LeafContent({ block, page }: { block: ProjectLeafBlock; page: PageData }) {
  switch (block.type) {
    case "text":
      return <TextBody block={block} page={page} />;
    case "image":
      return (
        <figure className={blockStyles.figure}>
          <Image className={blockStyles.native} src={block.image.src} width={block.image.width} height={block.image.height} alt={block.image.alt} unoptimized />
          {block.caption && <figcaption className={blockStyles.caption}>{block.caption}</figcaption>}
        </figure>
      );
    case "video":
      return (
        <div className={blockStyles.frame} style={{ "--aspect": aspectOf(block.video) } as CSSProperties}>
          <VideoFrame video={block.video} fit={block.fit} label="Play video" />
        </div>
      );
    case "hero":
      return (
        <figure className={blockStyles.figure}>
          <div className={blockStyles.frame} style={{ "--aspect": mediaAspect(block.media) } as CSSProperties}>
            <MediaFrame media={block.media} fit={block.fit} label="Play film" />
          </div>
          {block.caption && <figcaption className={blockStyles.caption}>{block.caption}</figcaption>}
        </figure>
      );
    case "spacer":
      return <div className={blockStyles.spacer} data-size={block.size} aria-hidden="true" />;
  }
}

// Logical columns become custom properties the stylesheet places by; tablet
// derives from desktop and mobile stacks unless overridden (ADR-0006 §5).
function placementVars(placement: GridPlacement | null): CSSProperties | undefined {
  if (!placement) return undefined;
  const vars: Record<string, string | number> = {
    "--d-start": placement.desktop.colStart,
    "--d-span": placement.desktop.colSpan,
  };
  if (placement.tablet) Object.assign(vars, { "--t-start": placement.tablet.colStart, "--t-span": placement.tablet.colSpan });
  if (placement.mobile) Object.assign(vars, { "--m-start": placement.mobile.colStart, "--m-span": placement.mobile.colSpan });
  if (placement.align) vars["--align"] = placement.align;
  if (placement.valign) vars["--valign"] = placement.valign;
  return vars as CSSProperties;
}

// ---- Blocks ----

function Block({ block, page }: { block: ProjectBlock; page: PageData }) {
  switch (block.type) {
    case "opening":
      return (
        <>
          <ProjectOpening title={page.title} image={block.image} film={block.film?.src} />
          <div hidden dangerouslySetInnerHTML={{ __html: titleBootstrap() }} />
        </>
      );

    case "projectMeta":
      return (
        <section className={styles.metaSec}>
          <Facts facts={page.facts} className={styles.meta} />
          {block.statement && (
            <div className={styles.statement}>
              <p className={styles.lead}>
                <Runs paragraph={block.statement.lead} />
              </p>
              <p className={styles.body}>
                <Runs paragraph={block.statement.body} />
              </p>
            </div>
          )}
        </section>
      );

    case "projectStills":
      return (
        <section className={styles.stills}>
          {block.stills.map((still, i) => (
            <Image key={i} className={styles.still} src={still.src} width={still.width} height={still.height} alt={still.alt} unoptimized />
          ))}
        </section>
      );

    case "projectLoop":
      return (
        <figure className={styles.support}>
          <div className={styles.loop}>
            <Image className={styles.fill} src={block.poster.src} alt={block.poster.alt} fill unoptimized />
            <AutoplayVideo className={styles.fill} src={block.src} mode="AUTOPLAY_VISIBLE" />
          </div>
          <figcaption className={styles.caption}>
            <Runs paragraph={block.caption} />
          </figcaption>
        </figure>
      );

    case "projectCredits":
      return page.credits.length ? (
        <section className={styles.creditsSec}>
          <Credits credits={page.credits} className={styles.credits} />
        </section>
      ) : null;

    case "projectCoda":
      return (
        <section className={styles.coda} style={{ "--coda-aspect": block.image.width / block.image.height } as CSSProperties}>
          <Image className={`${styles.fill} ${styles.codaImage}`} src={block.image.src} alt={block.image.alt} fill unoptimized />
        </section>
      );

    case "hero":
      return (
        <figure className={blockStyles.hero}>
          <div className={blockStyles.heroFrame} style={{ "--aspect": mediaAspect(block.media) } as CSSProperties}>
            <MediaFrame media={block.media} fit={block.fit} label="Play film" />
          </div>
          {block.caption && <figcaption className={`${blockStyles.caption} ${blockStyles.heroCaption}`}>{block.caption}</figcaption>}
        </figure>
      );

    case "text":
      return (
        <section className={`${blockStyles.section} ${blockStyles.columns}`}>
          <div className={blockStyles.textColumn}>
            <TextBody block={block} page={page} />
          </div>
        </section>
      );

    case "image":
    case "video":
      return (
        <section className={blockStyles.section}>
          <LeafContent block={block} page={page} />
        </section>
      );

    case "spacer":
      return <LeafContent block={block} page={page} />;

    case "grid":
      return (
        <section className={`${blockStyles.section} ${blockStyles.columns} ${blockStyles.grid}`}>
          {block.cells.map(({ placement, block: child }) => (
            <div key={child.id} className={blockStyles.cell} style={placementVars(placement)}>
              <LeafContent block={child} page={page} />
            </div>
          ))}
        </section>
      );

    case "gallery":
      return <Gallery block={block} />;
  }
}

function Gallery({ block }: { block: Extract<ProjectBlock, { type: "gallery" }> }) {
  const { layout, items, label } = block;
  const heading = label && <p className={blockStyles.galleryLabel}>{label}</p>;

  if (layout.mode === "JUSTIFIED_ROWS") {
    const images = items.flatMap((item) => (item.kind === "image" ? [item.image] : []));
    return (
      <section className={blockStyles.section}>
        {heading}
        <JustifiedRows id={`g-${block.id}`} items={images} />
      </section>
    );
  }

  if (layout.mode === "VIDEO_GRID") {
    const { columns, fit } = layout;
    return (
      <section className={blockStyles.section}>
        {heading}
        <div
          className={blockStyles.wall}
          style={{ "--cols-d": columns.desktop, "--cols-t": columns.tablet, "--cols-m": columns.mobile } as CSSProperties}
        >
          {items.map((item, i) => (
            <div key={i} className={blockStyles.tile}>
              <MediaFrame media={item} fit={fit} label="Play video" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // A strip scrolls sideways at the height of the frame; a slideshow shows
  // one item per view. Both are native scrolling — keyboard, touch and
  // trackpad — with no script.
  const strip = layout.mode === "HORIZONTAL_STRIP";
  return (
    <section className={blockStyles.section}>
      {heading}
      <div className={strip ? blockStyles.strip : blockStyles.slides} role="region" aria-label={label ?? "Gallery"} tabIndex={0}>
        {items.map((item, i) => (
          <div key={i} className={blockStyles.slide} style={{ "--aspect": mediaAspect(item) } as CSSProperties}>
            <MediaFrame media={item} fit="COVER" label="Play video" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProjectBlocksView({ project }: { project: ProjectPage }) {
  const { blocks, next } = project;
  return (
    <div className={styles.environment}>
      <div className={styles.page}>
        <main>
          {blocks.map((block) => (
            <Fragment key={block.id}>
              <Block block={block} page={project} />
            </Fragment>
          ))}
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
