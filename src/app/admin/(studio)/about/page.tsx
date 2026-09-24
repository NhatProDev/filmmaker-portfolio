import type { Metadata } from "next";
import { StructuredPage } from "../_structured/load";

export const metadata: Metadata = { title: "About" };

export default function Page() {
  return <StructuredPage pageKey="ABOUT" />;
}
