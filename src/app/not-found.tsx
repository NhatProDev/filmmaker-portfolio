import type { Metadata } from "next";
import PublicLayout from "./(public)/layout";
import { NotFoundContent } from "./NotFoundContent";

export const metadata: Metadata = {
  title: "Not found",
};

// Every unmatched URL, and every notFound() outside the public pages. It
// renders inside the public frame, so the shared header and the shell's tiers
// apply. A notFound() inside a public page gets (public)/not-found.tsx
// instead, which the public layout already frames.
export default function NotFound() {
  return (
    <PublicLayout>
      <NotFoundContent />
    </PublicLayout>
  );
}
