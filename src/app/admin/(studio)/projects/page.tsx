import type { Metadata } from "next";
import { getDatabase } from "@db/client";
import { services } from "@/app/api/v1/_lib/services";
import { ProjectsBoard } from "./ProjectsBoard";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const { data } = await services(getDatabase()).projects.list({ page: 1, pageSize: 100 });
  return <ProjectsBoard projects={data} />;
}
