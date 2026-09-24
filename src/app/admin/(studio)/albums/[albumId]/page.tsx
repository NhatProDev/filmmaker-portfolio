import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getDatabase } from "@db/client";
import { services } from "@/app/api/v1/_lib/services";
import { DomainError } from "@/lib/errors/domain-error";
import { AlbumEditor } from "./AlbumEditor";

type Props = { params: Promise<{ albumId: string }> };

async function load(albumId: string) {
  if (!z.uuid().safeParse(albumId).success) notFound();
  try {
    return await services(getDatabase()).albums.get(albumId);
  } catch (error) {
    if (error instanceof DomainError && error.kind === "NOT_FOUND") notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await load((await params).albumId)).title };
}

export default async function AlbumPage({ params }: Props) {
  const db = getDatabase();
  const [album, projects] = await Promise.all([load((await params).albumId), services(db).projects.list({ page: 1, pageSize: 100 })]);
  return <AlbumEditor album={album} projects={projects.data.map((p) => ({ id: p.id, title: p.title }))} />;
}
