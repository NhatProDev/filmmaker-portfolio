import type { Metadata } from "next";
import { getDatabase } from "@db/client";
import { services } from "@/app/api/v1/_lib/services";
import { HomeEditor } from "./HomeEditor";

export const metadata: Metadata = { title: "Home page" };

export default async function HomeEditorPage() {
  const page = await services(getDatabase()).pages.getComposed("HOME");
  return <HomeEditor blocks={page.blocks} publication={page.publication} />;
}
