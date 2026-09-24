import styles from "./PreviewBanner.module.css";

// Marks a public page rendered from the working copy for a signed-in admin
// (ADR-0012). Visitors never see it: preview mode is honoured only together
// with an admin session.
export function PreviewBanner({ path }: { path: string }) {
  return (
    <aside className={styles.banner} aria-label="Preview">
      <span>Preview — unpublished working copy</span>
      <a href={`/api/v1/preview/exit?to=${encodeURIComponent(path)}`}>Exit preview</a>
    </aside>
  );
}

// Shown instead of the page when the working copy cannot be rendered by the
// locked template yet: the same reason Publish would give.
export function PreviewIssue({ issue }: { issue: string }) {
  return (
    <main className={styles.issue}>
      <div>
        <strong>This working copy cannot be shown yet.</strong>
        <p>Fix it in the Studio; publishing is refused for the same reason.</p>
        <code>{issue}</code>
      </div>
    </main>
  );
}
