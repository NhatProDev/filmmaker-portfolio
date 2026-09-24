import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PreviewBanner, PreviewIssue } from "@/components/preview/PreviewBanner";
import { getCurrentAdmin } from "@/features/authentication/current-admin";
import { getContentGateway } from "@/features/site-content/site-content.gateway";
import { PrivateGate } from "./PrivateGate";
import { ProjectDetailView } from "./ProjectDetailView";

type ProjectDetailProps = {
  params: Promise<{ slug: string }>;
};

// Listed projects are prerendered; a project published later renders on its
// first request. Unknown slugs never reach this page: the proxy sends them to
// the site's 404 (src/proxy.ts). Publishing revalidates.
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getContentGateway().listPublicProjectSlugs();
  return slugs.map((slug) => ({ slug }));
}

// What this address shows. It never reads cookies unless preview mode is on,
// so the page stays static; a visitor holding a private project's access
// cookie is routed to ./live by the proxy instead (src/proxy.ts).
const resolve = cache(async (slug: string) => {
  const gateway = getContentGateway();
  if ((await draftMode()).isEnabled && (await getCurrentAdmin()).admin) {
    return { kind: "preview", preview: await gateway.previewProjectPage(slug) } as const;
  }
  const page = await gateway.getProjectPage(slug);
  if (page) return { kind: "public", page } as const;
  // A private project's gate reveals nothing of the project (ADR-0003).
  if (await gateway.findPrivateProject(slug)) return { kind: "gate" } as const;
  return null;
});

const NOINDEX: Metadata["robots"] = { index: false, follow: false };

export async function generateMetadata({ params }: ProjectDetailProps): Promise<Metadata> {
  const found = await resolve((await params).slug);
  if (!found) return {};
  if (found.kind === "public") {
    const { slug, title, seo, cover } = found.page;
    return {
      title: seo?.title ?? title,
      ...(seo?.description ? { description: seo.description } : {}),
      alternates: { canonical: `/works/${slug}` },
      // Replaces the layout's openGraph object whole, so it restates it.
      openGraph: {
        type: "website",
        siteName: "Nguyen Khanh Nhat",
        title: seo?.title ?? title,
        url: `/works/${slug}`,
        images: [{ url: cover.src, width: cover.width, height: cover.height }],
      },
    };
  }
  if (found.kind === "gate") return { title: "Private project", robots: NOINDEX };
  return { title: found.preview.value ? `Preview: ${found.preview.value.title}` : "Preview", robots: NOINDEX };
}

// This route sits outside the (public) layout because the page carries no
// site header.
export default async function ProjectDetailPage({ params }: ProjectDetailProps) {
  const { slug } = await params;
  const found = await resolve(slug);
  if (!found) notFound();
  if (found.kind === "public") return <ProjectDetailView project={found.page} />;
  if (found.kind === "gate") return <PrivateGate slug={slug} />;
  const { value, issue } = found.preview;
  if (!value && !issue) notFound();
  return (
    <>
      {value ? <ProjectDetailView project={value} /> : <PreviewIssue issue={issue!} />}
      <PreviewBanner path={`/works/${slug}`} />
    </>
  );
}
