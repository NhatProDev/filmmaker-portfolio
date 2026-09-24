import type { Metadata } from "next";
import { draftMode } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { JustifiedRows } from "@/components/media/JustifiedRows";
import { PreviewBanner, PreviewIssue } from "@/components/preview/PreviewBanner";
import { getCurrentAdmin } from "@/features/authentication/current-admin";
import { getContentGateway } from "@/features/site-content/site-content.gateway";
import type { AlbumPage } from "@/features/site-content/site-content.types";
import { openGraph } from "@/lib/site-metadata";
import styles from "../albums.module.css";

type AlbumProps = { params: Promise<{ slug: string }> };

// Published albums are prerendered; one published later renders on its first
// request. Unknown slugs never reach this page: the proxy sends them to the
// site's 404 (src/proxy.ts). Publishing revalidates.
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getContentGateway().listPublicAlbumSlugs();
  return slugs.map((slug) => ({ slug }));
}

// Reads cookies only in preview mode, so the page stays static.
const resolve = cache(async (slug: string) => {
  const gateway = getContentGateway();
  if ((await draftMode()).isEnabled && (await getCurrentAdmin()).admin) {
    return { kind: "preview", preview: await gateway.previewAlbumPage(slug) } as const;
  }
  const album = await gateway.getAlbumPage(slug);
  return album ? ({ kind: "public", album } as const) : null;
});

export async function generateMetadata({ params }: AlbumProps): Promise<Metadata> {
  const found = await resolve((await params).slug);
  if (!found) return {};
  if (found.kind === "preview") {
    return { title: found.preview.value ? `Preview: ${found.preview.value.title}` : "Preview", robots: { index: false, follow: false } };
  }
  const { slug, title, seo, cover } = found.album;
  return {
    title: seo.title ?? title,
    ...(seo.description ? { description: seo.description } : {}),
    alternates: { canonical: `/albums/${slug}` },
    openGraph: openGraph(`/albums/${slug}`, { title: seo.title ?? title, image: cover }),
  };
}

export default async function AlbumDetailPage({ params }: AlbumProps) {
  const { slug } = await params;
  const found = await resolve(slug);
  if (!found) notFound();
  if (found.kind === "public") return <AlbumView album={found.album} />;
  const { value, issue } = found.preview;
  if (!value && !issue) notFound();
  return (
    <>
      {value ? <AlbumView album={value} /> : <PreviewIssue issue={issue!} />}
      <PreviewBanner path={`/albums/${slug}`} />
    </>
  );
}

// An album (ADR-0019): its title and description, a link to the project it
// belongs with, and its images in justified rows at their own proportions.
// Captions follow the rows, numbered in reading order.
function AlbumView({ album }: { album: AlbumPage }) {
  const captions = album.items.map((item, i) => ({ number: i + 1, caption: item.caption })).filter((item) => item.caption);
  return (
    <main className={styles.albums}>
      <div className={styles.mast}>
        <div className={styles.mastBox}>
          <h1 className={styles.heading}>{album.title}</h1>
        </div>
        <p className={styles.count}>
          {album.collection ? `${album.collection} · ` : ""}
          {album.items.length} {album.items.length === 1 ? "image" : "images"}
        </p>
      </div>
      {(album.description || album.related) && (
        <div className={styles.intro}>
          {album.description && <p className={styles.description}>{album.description}</p>}
          {album.related && (
            <p className={styles.related}>
              From <Link href={`/works/${album.related.slug}`}>{album.related.title}</Link>
            </p>
          )}
        </div>
      )}
      <JustifiedRows id="album" items={album.items.map((item) => item.image)} framing="active" />
      {captions.length > 0 && (
        <ol className={styles.captions} aria-label="Captions">
          {captions.map((item) => (
            <li key={item.number}>
              <span>{String(item.number).padStart(2, "0")}</span>
              {item.caption}
            </li>
          ))}
        </ol>
      )}
      <p className={styles.back}>
        <Link href="/albums">All albums</Link>
      </p>
    </main>
  );
}
