import type { Metadata } from "next";
import Image from "next/image";
import { Fragment } from "react";
import { getContentGateway } from "@/features/site-content/site-content.gateway";
import type { Inline } from "@/features/site-content/site-content.types";
import { Portrait } from "./Portrait";
import styles from "./about.module.css";

export const metadata: Metadata = {
  title: "About me",
};

function InlineText({ parts }: { parts: Inline[] }) {
  return parts.map((part, index) => (
    <Fragment key={index}>{typeof part === "string" ? part : <em>{part.em}</em>}</Fragment>
  ));
}

// Implements docs/design/prototypes/about/About Me 3B v2 Responsive.dc.html.
// Source order is the narrow reading order at every width — statement, portrait,
// biography, evidence — and the desktop grid places the same elements exactly
// as the locked desktop candidate does.
export default async function AboutPage() {
  const about = await getContentGateway().getAbout();
  const { portrait, evidence, process, placeholder, experience, contact } = about;

  return (
    <main className={styles.page}>
      <section className={styles.open}>
        <div className={styles.datum} />
        <div className={styles.lead}>
          <h1 className={styles.marker}>{about.marker}</h1>
          <p className={styles.leadText}>{about.lead}</p>
        </div>
        <Portrait image={portrait.image} caption={portrait.caption} />
        <div className={styles.bio}>
          {about.biography.map((paragraph, index) => (
            <p key={index} className={index === 0 ? styles.body : `${styles.body} ${styles.bodyMuted}`}>
              {paragraph}
            </p>
          ))}
          <div className={styles.closeRule} />
        </div>
        <div className={styles.ev}>
          <div className={styles.evBlock}>
            <figure className={styles.figure}>
              <Image
                src={evidence.image.src}
                width={evidence.image.width}
                height={evidence.image.height}
                alt={evidence.image.alt}
                unoptimized
              />
              <figcaption className={styles.caption}>{evidence.caption}</figcaption>
            </figure>
            <p className={styles.answer}>{evidence.answer}</p>
          </div>
        </div>
      </section>

      <section className={styles.proc}>
        <p className={styles.procText}>{process.line}</p>
        <figure className={`${styles.figure} ${styles.procFig}`}>
          <Image
            src={process.image.src}
            width={process.image.width}
            height={process.image.height}
            alt={process.image.alt}
            unoptimized
          />
          <figcaption className={styles.caption}>{process.caption}</figcaption>
        </figure>
      </section>

      <section className={styles.miss}>
        <figure className={`${styles.figure} ${styles.missFig}`}>
          <div className={styles.slot}>
            <span className={styles.slotLabel}>{placeholder.label}</span>
          </div>
          <figcaption className={styles.caption}>{placeholder.caption}</figcaption>
        </figure>
        <p className={styles.missText}>{placeholder.line}</p>
      </section>

      <section className={styles.exp}>
        <h2 className={styles.expHeading}>{experience.heading}</h2>
        <dl className={styles.expList}>
          {experience.rows.map((row) => (
            <div key={row.year} className={styles.expRow}>
              <dt className={styles.expYear}>{row.year}</dt>
              <dd className={styles.expRole}>
                <InlineText parts={row.text} />
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.contact}>
        <p className={styles.contactText}>{contact.availability}</p>
        <p className={styles.emailBox}>
          <a className={styles.email} href={`mailto:${contact.email}`}>
            {contact.email}
          </a>
        </p>
      </section>
    </main>
  );
}
