"use client";

import type { PublicationDto } from "@/features/projects/project.mapper";
import { api } from "./api";
import { ErrorLine } from "./composition";
import { useAction } from "./useAction";
import styles from "../studio.module.css";

// Publication state and actions (ADR-0012): the Studio edits the working copy;
// Publish writes the one live snapshot; nothing else reaches visitors.
export function PublishingPanel({
  publication,
  basePath,
  previewHref,
  canUnpublish,
  live,
}: {
  publication: PublicationDto;
  // e.g. /projects/<id> or /pages/HOME
  basePath: string;
  previewHref: string;
  canUnpublish: boolean;
  live?: string;
}) {
  const { run, pending, error } = useAction();
  const { isPublished, publishedAt, hasUnpublishedChanges, issues } = publication;
  const when = publishedAt ? new Date(publishedAt).toLocaleString() : null;

  let status: { text: string; className: string };
  if (!isPublished) status = { text: "Not on the site", className: styles.badgeWarn };
  else if (hasUnpublishedChanges) status = { text: "Changes not yet published", className: styles.badgeInfo };
  else status = { text: "Live and up to date", className: styles.badgeOk };

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>Publishing</h2>
        <span className={`${styles.badge} ${status.className}`}>{status.text}</span>
      </div>
      <div className={styles.panelBody}>
        <p className={styles.hint}>
          {isPublished
            ? `The site shows the version published ${when}. Edits here stay private until you publish again.`
            : "Nothing of this is on the site. Publishing checks it against its page template first."}
          {live && isPublished ? ` Address: ${live}` : ""}
        </p>
        {issues.length > 0 && (
          <>
            <p className={styles.notice}>It cannot be published yet:</p>
            <ul className={styles.issues}>
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </>
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.button} ${styles.primary}`}
            disabled={pending || issues.length > 0 || (isPublished && !hasUnpublishedChanges)}
            onClick={() => run(() => api("POST", `${basePath}/publish`))}
          >
            {isPublished ? "Publish changes" : "Publish"}
          </button>
          <a className={styles.button} href={previewHref} target="_blank" rel="noreferrer">
            Preview ↗
          </a>
          {canUnpublish && isPublished && (
            <button
              type="button"
              className={styles.button}
              disabled={pending}
              onClick={() => {
                if (confirm("Take this off the site? It stays here as a draft.")) {
                  void run(() => api("POST", `${basePath}/unpublish`));
                }
              }}
            >
              Unpublish
            </button>
          )}
        </div>
        <ErrorLine error={error} />
      </div>
    </section>
  );
}
