import type { Metadata } from "next";
import { getDatabase } from "@db/client";
import { services } from "@/app/api/v1/_lib/services";
import { AlbumsBoard } from "./AlbumsBoard";

export const metadata: Metadata = { title: "Albums" };

export default async function AlbumsPage() {
  return <AlbumsBoard albums={await services(getDatabase()).albums.list()} />;
}
