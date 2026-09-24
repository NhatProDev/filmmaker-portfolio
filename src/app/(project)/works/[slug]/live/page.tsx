import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getDatabase } from "@db/client";
import { accessCookieName } from "@/features/project-access/access-cookie";
import { createProjectAccessService } from "@/features/project-access/project-access.service";
import { getContentGateway } from "@/features/site-content/site-content.gateway";
import { serverEnv } from "@/lib/env/server-env";
import { PrivateGate } from "../PrivateGate";
import { ProjectDetailView } from "../ProjectDetailView";

type Props = { params: Promise<{ slug: string }> };

// The access-checked render of a PRIVATE project (ADR-0003). The proxy routes
// /works/<slug> here only for a visitor holding that project's access cookie;
// the cookie is verified on every request, and nothing here is cached.
export const dynamic = "force-dynamic";

const NOINDEX: Metadata["robots"] = { index: false, follow: false };

// What this request may see: the page, the gate again, or nothing.
const resolve = cache(async (slug: string) => {
  const gateway = getContentGateway();

  // A stale cookie for a project that has since become public still reaches
  // its page.
  const publicPage = await gateway.getProjectPage(slug);
  if (publicPage) return { kind: "public", page: publicPage } as const;

  const privateProject = await gateway.findPrivateProject(slug);
  if (!privateProject) return null;

  const access = createProjectAccessService(getDatabase(), serverEnv().PROJECT_ACCESS_SECRET);
  const grant = await access.verify(slug, (await cookies()).get(accessCookieName(slug))?.value);
  // Expired, forged, or granted under a replaced password: ask again.
  if (!grant) return { kind: "gate" } as const;

  const page = await gateway.getPrivateProjectPage(slug, grant.projectId);
  return page ? ({ kind: "private", page } as const) : null;
});

// Before access is verified the title is generic and reveals nothing; after,
// the project's own title may show. A private project is never indexed.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await resolve((await params).slug);
  if (found?.kind === "public") return { title: found.page.title };
  if (found?.kind === "private") return { title: found.page.title, robots: NOINDEX };
  return { title: "Private project", robots: NOINDEX };
}

export default async function PrivateProjectPage({ params }: Props) {
  const { slug } = await params;
  const found = await resolve(slug);
  if (!found) notFound();
  if (found.kind === "gate") return <PrivateGate slug={slug} />;
  return <ProjectDetailView project={found.page} />;
}
