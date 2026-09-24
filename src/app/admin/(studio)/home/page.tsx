import type { Metadata } from "next";
import { getDatabase } from "@db/client";
import { services } from "@/app/api/v1/_lib/services";
import { PublishingPanel } from "../../_components/PublishingPanel";
import styles from "../../studio.module.css";
import { labelOf } from "../projects/[projectId]/composer/blockInfo";
import { HOME_OWNER } from "../projects/[projectId]/composer/owner";
import { Composer } from "../projects/[projectId]/composer/ProjectComposer";

export const metadata: Metadata = { title: "Home" };

// Home in the composer (ADR-0018): the same outline, drag, insert, duplicate,
// hide and preview as a project, built from Home's closed sections.
export default async function HomeComposerPage() {
  const page = await services(getDatabase()).pages.getComposed("HOME");
  const blockLabels = Object.fromEntries(page.blocks.map((block) => [block.id, labelOf(block, "page")]));
  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1>Home</h1>
          <p className={styles.hint}>The site&apos;s front page, in the order visitors see it. The footer comes from Settings.</p>
        </div>
      </div>
      <PublishingPanel
        publication={page.publication}
        basePath="/pages/HOME"
        previewHref="/api/v1/pages/HOME/preview"
        canUnpublish={false}
        live="/"
        blockLabels={blockLabels}
      />
      <Composer owner={HOME_OWNER} blocks={page.blocks} previewHref="/api/v1/pages/HOME/preview" />
    </>
  );
}
