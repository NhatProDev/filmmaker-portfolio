import type { Metadata } from "next";
import Image from "next/image";
import { getContentGateway } from "@/features/site-content/site-content.gateway";
import { ContactRows } from "./ContactRows";
import styles from "./contact.module.css";

export const metadata: Metadata = {
  title: "Contact",
  alternates: { canonical: "/contact" },
};

// Implements docs/design/prototypes/contact/Contact 4B v2 Responsive.dc.html.
// Static: no form, no API, no table (CLAUDE.md §19). Source order is visual and
// reading order at every width — heading, statement, email, rows, closing note,
// identity still — so nothing is reordered between tiers. The footer is this
// page's own chrome, as on Home, and sits outside <main>.
export default async function ContactPage() {
  const contact = await getContentGateway().getContact();
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
