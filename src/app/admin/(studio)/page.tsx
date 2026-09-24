import type { Metadata } from "next";
import Link from "next/link";
import { getDatabase } from "@db/client";
import { services } from "@/app/api/v1/_lib/services";
import type { PublicationDto } from "@/features/projects/project.mapper";
import styles from "../studio.module.css";

export const metadata: Metadata = { title: "Overview" };

// Every content type at a glance (Phase 3C-14): what is on the site, what
// has changes waiting for Publish, and where to edit it.
function State({ publication }: { publication: PublicationDto }) {
  if (!publication.isPublished) {
    return <span className={`${styles.badge} ${styles.badgeWarn}`}>Not published — the site shows its committed version</span>;
  }
  if (publication.issues.length) return <span className={`${styles.badge} ${styles.badgeWarn}`}>Changes cannot be published yet</span>;
  if (publication.hasUnpublishedChanges) return <span className={`${styles.badge} ${styles.badgeInfo}`}>Published — with unpublished changes</span>;
  return <span className={`${styles.badge} ${styles.badgeOk}`}>Published — up to date</span>;
}

export default async function OverviewPage() {
  const s = services(getDatabase());
  const [home, about, contact, site, projects, albums, media, privateMedia] = await Promise.all([
    s.pages.getComposed("HOME"),
    s.pages.getStructured("ABOUT"),
    s.pages.getStructured("CONTACT"),
    s.pages.getStructured("SITE"),
    s.projects.list({ page: 1, pageSize: 100 }),
    s.albums.list(),
    s.media.list({ page: 1, pageSize: 1 }),
    s.media.list({ page: 1, pageSize: 1, audience: "PRIVATE" }),
  ]);
  const count = <T,>(items: T[], test: (item: T) => boolean) => items.filter(test).length;
  const pages = [
    { href: "/admin/home", title: "Home", text: "The front page, built from its sections.", publication: home.publication },
    { href: "/admin/about", title: "About", text: "Statement, biography, stills and experience.", publication: about.publication },
    { href: "/admin/contact", title: "Contact", text: "Statement, rows and the identity still.", publication: contact.publication },
    { href: "/admin/settings", title: "Settings", text: "The email and footer lines several pages share.", publication: site.publication },
  ];
  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1>Overview</h1>
          <p className={styles.hint}>What is on the site now. Every edit stays in the Studio until you publish it.</p>
        </div>
      </div>
      <div className={styles.overview}>
        {pages.map((page) => (
          <Link key={page.href} href={page.href} className={styles.overviewCard}>
            <strong>{page.title}</strong>
            <span className={styles.hint}>{page.text}</span>
            <State publication={page.publication} />
          </Link>
        ))}
        <Link href="/admin/projects" className={styles.overviewCard}>
          <strong>Projects</strong>
          <span className={styles.hint}>
            {count(projects.data, (p) => p.status === "PUBLISHED")} published · {count(projects.data, (p) => p.status === "DRAFT")} draft ·{" "}
            {count(projects.data, (p) => p.visibility === "PRIVATE")} private
          </span>
        </Link>
        <Link href="/admin/albums" className={styles.overviewCard}>
          <strong>Albums</strong>
          <span className={styles.hint}>
            {albums.length ? `${count(albums, (a) => a.publication.isPublished)} published · ${count(albums, (a) => !a.publication.isPublished)} draft` : "None yet"}
            {count(albums, (a) => a.publication.hasUnpublishedChanges) ? ` · ${count(albums, (a) => a.publication.hasUnpublishedChanges)} with changes` : ""}
          </span>
        </Link>
        <Link href="/admin/media" className={styles.overviewCard}>
          <strong>Media</strong>
          <span className={styles.hint}>
            {media.meta.total} assets · {privateMedia.meta.total} private
          </span>
        </Link>
      </div>
    </>
  );
}
