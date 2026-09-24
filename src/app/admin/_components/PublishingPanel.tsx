"use client";

import { useSyncExternalStore } from "react";
import type { PublicationDto } from "@/features/projects/project.mapper";
import { api } from "./api";
import { ErrorLine } from "./composition";
import { useAction } from "./useAction";
import styles from "../studio.module.css";

const subscribeNever = () => () => {};

// Publication state and actions (ADR-0012): the Studio edits the working copy;
// Publish writes the one live snapshot; nothing else reaches visitors.
export function PublishingPanel({
  publication,
  basePath,
  previewHref,
  canUnpublish,
  live,
  blockLabels,
}: {
  publication: PublicationDto;
  // e.g. /projects/<id> or /pages/HOME
  basePath: string;
  previewHref: string;
  canUnpublish: boolean;
  live?: string;
  // Names blocks in the reasons, instead of their ids.
  blockLabels?: Record<string, string>;
}) {
  const { run, pending, error } = useAction();
  const { isPublished, publishedAt, hasUnpublishedChanges, issues } = publication;
  // The server (UTC in production) and the browser format dates differently,
  // so the server and hydration render UTC, then the browser its local time.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  const when = publishedAt
    ? hydrated
      ? new Date(publishedAt).toLocaleString()
      : `${publishedAt.slice(0, 16).replace("T", " ")} UTC`
    : null;

  let status: { text: string; className: string };
  if (!isPublished) status = { text: "Draft — not on the site", className: styles.badgeWarn };
  else if (hasUnpublishedChanges) status = { text: "Published — with unpublished changes", className: styles.badgeInfo };
  else status = { text: "Published — up to date", className: styles.badgeOk };

  // "project x, block <id>: reason" reads as "“Label”: reason".
  const readable = (issue: string) =>
    issue
      .replace(/^(project|page) [^,:]+(, |: )/, "")
      .replace(/block ([0-9a-f-]{36})(, block ([0-9a-f-]{36}))?/g, (match, outer: string, _inner, inner?: string) => {
        const name = (id?: string) => (id && blockLabels?.[id] ? `“${blockLabels[id]}”` : null);
        return [name(outer), name(inner)].filter(Boolean).join(" › ") || match;
      });

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>Publishing</h2>
        {/* A polite status: publishing, or unpublishing, is announced. */}
        <span role="status" className={`${styles.badge} ${status.className}`}>
          {status.text}
        </span>
      </div>
      <div className={styles.panelBody}>
        <p className={styles.hint}>
          {isPublished
            ? `The site shows the version published ${when}. Edits here stay private until you publish again.`
            : "Nothing of this is on the site yet. Publishing first checks that every visible block can be shown."}
          {live && isPublished ? ` Address: ${live}` : ""}
        </p>
        {issues.length > 0 && (
          <>
            <p className={styles.notice}>It cannot be published yet:</p>
            <ul className={styles.issues}>
              {issues.map((issue) => (
                <li key={issue}>{readable(issue)}</li>
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
