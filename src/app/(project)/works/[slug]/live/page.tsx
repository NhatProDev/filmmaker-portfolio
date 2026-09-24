import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
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

export const metadata: Metadata = { title: "Private project", robots: { index: false, follow: false } };

export default async function PrivateProjectPage({ params }: Props) {
  const { slug } = await params;
  const gateway = getContentGateway();

  // A stale cookie for a project that has since become public still reaches
  // its page.
  const publicPage = await gateway.getProjectPage(slug);
  if (publicPage) return <ProjectDetailView project={publicPage} />;

  const privateProject = await gateway.findPrivateProject(slug);
  if (!privateProject) notFound();

  const access = createProjectAccessService(getDatabase(), serverEnv().PROJECT_ACCESS_SECRET);
  const grant = await access.verify(slug, (await cookies()).get(accessCookieName(slug))?.value);
  // Expired, forged, or granted under a replaced password: ask again.
  if (!grant) return <PrivateGate slug={slug} />;

  const page = await gateway.getPrivateProjectPage(slug, grant.projectId);
  if (!page) notFound();
  return <ProjectDetailView project={page} />;
}
