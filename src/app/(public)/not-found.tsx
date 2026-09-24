import type { Metadata } from "next";
import { NotFoundContent } from "../NotFoundContent";

export const metadata: Metadata = {
  title: "Not found",
};

// A notFound() inside a public page (an album index with nothing published,
// an unknown album). The public layout already draws the frame and header;
// the root not-found would draw them a second time (3D-6).
export default function PublicNotFound() {
  return <NotFoundContent />;
}
