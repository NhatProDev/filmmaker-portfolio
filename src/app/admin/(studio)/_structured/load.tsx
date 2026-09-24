import { getDatabase } from "@db/client";
import { services } from "@/app/api/v1/_lib/services";
import { committedPages } from "@/features/page-content/committed";
import { PAGE_SLOTS, type ContentPageKey } from "@/features/page-content/page-content.schema";
import { staticGateway } from "@/features/site-content/static-gateway";
import styles from "../../studio.module.css";
import { StructuredPageEditor, type StructuredPageDto } from "./StructuredPageEditor";

const INTRO: Record<ContentPageKey, { title: string; text: string }> = {
  ABOUT: { title: "About", text: "The About page's words and images. Its layout is fixed; everything here lands in its place on the page." },
  CONTACT: { title: "Contact", text: "The Contact page's words, rows and optional still. There is no contact form." },
  SITE: { title: "Site settings", text: "What several pages share: the email and the footer lines. Publishing updates every page that shows them." },
};

// A structured page's editor (ADR-0017), rendered on the server with the
// working copy and the committed content it can start from.
export async function StructuredPage({ pageKey }: { pageKey: ContentPageKey }) {
  const [page, committed] = await Promise.all([services(getDatabase()).pages.getStructured(pageKey), committedPages(staticGateway)]);
  const intro = INTRO[pageKey];
  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1>{intro.title}</h1>
          <p className={styles.hint}>{intro.text}</p>
        </div>
      </div>
      <StructuredPageEditor page={page as StructuredPageDto} committed={committed[pageKey].content} slots={[...PAGE_SLOTS[pageKey]]} />
    </>
  );
}
