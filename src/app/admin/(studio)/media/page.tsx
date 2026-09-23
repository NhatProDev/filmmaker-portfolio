import type { Metadata } from "next";
import { getDatabase } from "@db/client";
import { services } from "@/app/api/v1/_lib/services";
import { MediaLibrary } from "./MediaLibrary";

export const metadata: Metadata = { title: "Media" };

export default async function MediaPage() {
  const { data, meta } = await services(getDatabase()).media.list({ page: 1, pageSize: 100 });
  return <MediaLibrary initial={data} total={meta.total} />;
}
