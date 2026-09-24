import type { Metadata } from "next";
import { openGraph } from "@/lib/site-metadata";
import { draftMode } from "next/headers";
import Image from "next/image";
import { PreviewBanner, PreviewIssue } from "@/components/preview/PreviewBanner";
import { getCurrentAdmin } from "@/features/authentication/current-admin";
import { getContentGateway } from "@/features/site-content/site-content.gateway";
import type { ContactContent } from "@/features/site-content/site-content.types";
import { ContactRows } from "./ContactRows";
import styles from "./contact.module.css";

export const metadata: Metadata = {
  title: "Contact",
  alternates: { canonical: "/contact" },
  openGraph: openGraph("/contact"),
};

// Contact is static. Only in preview mode, for a signed-in admin, does it read
// cookies and render the working copy instead (ADR-0012, ADR-0017).
export default async function ContactPage() {
  const gateway = getContentGateway();
  if ((await draftMode()).isEnabled && (await getCurrentAdmin()).admin) {
    const { value, issue } = await gateway.previewContact();
    return (
      <>
        {value ? <ContactView contact={value} /> : <PreviewIssue issue={issue!} />}
        <PreviewBanner path="/contact" />
      </>
    );
  }
  return <ContactView contact={await gateway.getContact()} />;
}

// Implements docs/design/prototypes/contact/Contact 4B v2 Responsive.dc.html.
// No form, no message API, no message table (CLAUDE.md §19); its content is a
// structured page (ADR-0017). Source order is visual and reading order at every
// width — heading, statement, email, rows, closing note, identity still — so
// nothing is reordered between tiers. The footer is this page's own chrome, as
// on Home, and sits outside <main>.
function ContactView({ contact }: { contact: ContactContent }) {
  const { email, identity, footer } = contact;

  return (
    <div className={styles.page}>
      <main className={styles.sheet}>
        <div className={styles.datum} />

        <div className={styles.spine}>
          <h1 className={styles.heading}>{contact.heading}</h1>
          <p className={styles.statement}>{contact.statement}</p>

          <div className={styles.primary}>
            <span className={styles.label}>{email.label}</span>
            <p className={styles.emailBox}>
              <a className={styles.email} href={`mailto:${email.address}`}>
                {email.address}
              </a>
            </p>
            <p className={styles.reply}>{email.reply}</p>
          </div>

          <ContactRows rows={contact.rows} />

          <p className={styles.note}>{contact.note}</p>
        </div>

        {identity && (
          <figure className={styles.identity}>
            <Image
              src={identity.image.src}
              width={identity.image.width}
              height={identity.image.height}
              alt={identity.image.alt}
              unoptimized
            />
            <figcaption className={styles.caption}>{identity.caption}</figcaption>
          </figure>
        )}
      </main>

      <footer className={styles.footer}>
        <span className={styles.footName}>
          <span className={styles.keep}>{footer.name}</span>{" "}
          <span className={styles.keep}>{footer.role}</span>
        </span>
        <span className={styles.footCopy}>{footer.copyright}</span>
      </footer>
    </div>
  );
}
