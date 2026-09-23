import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getDatabase } from "@db/client";
import { services } from "@/app/api/v1/_lib/services";
import { DomainError } from "@/lib/errors/domain-error";
import { ProjectEditor } from "./ProjectEditor";

type Props = { params: Promise<{ projectId: string }> };

async function load(projectId: string) {
  if (!z.uuid().safeParse(projectId).success) notFound();
  try {
    return await services(getDatabase()).projects.get(projectId);
  } catch (error) {
    if (error instanceof DomainError && error.kind === "NOT_FOUND") notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await load((await params).projectId)).title };
}

export default async function ProjectEditorPage({ params }: Props) {
  const project = await load((await params).projectId);
  return <ProjectEditor project={project} />;
}
